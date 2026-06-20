package dev.kokoto.bluemapwebchat;

import net.md_5.bungee.api.chat.BaseComponent;
import net.md_5.bungee.api.chat.ClickEvent;
import net.md_5.bungee.api.chat.TextComponent;
import com.sun.net.httpserver.Headers;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import org.bukkit.Bukkit;
import org.bukkit.ChatColor;
import org.bukkit.entity.Player;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.InetSocketAddress;
import java.net.URI;
import java.net.URL;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.nio.file.StandardOpenOption;
import java.util.*;
import java.util.concurrent.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class WebChatServer {
    private final BlueMapWebChatPlugin plugin;
    private final Storage storage;
    private final AuthManager auth;
    private final CaptchaManager captcha;
    private final RateLimiter rateLimiter = new RateLimiter();
    private final Deque<ChatMessage> history = new ArrayDeque<>();
    private final Set<SseClient> clients = ConcurrentHashMap.newKeySet();
    private static final Pattern URL_PATTERN = Pattern.compile("(?i)\\b((?:https?://|www\\.)[^\\s<>\"]+)");
    private static final Set<String> DANGEROUS_UPLOAD_EXTENSIONS = Set.of(
            "exe", "msi", "bat", "cmd", "com", "scr", "ps1", "vbs",
            "sh", "bash", "jar", "war", "class",
            "php", "phtml", "asp", "aspx", "jsp",
            "html", "htm", "js", "mjs", "css", "svg"
    );

    private HttpServer server;
    private ExecutorService executor;
    private volatile boolean running;

    public WebChatServer(BlueMapWebChatPlugin plugin, Storage storage, AuthManager auth, CaptchaManager captcha) {
        this.plugin = plugin;
        this.storage = storage;
        this.auth = auth;
        this.captcha = captcha;
    }

    public void start() throws IOException {
        ConfigValues config = plugin.configValues();
        server = HttpServer.create(new InetSocketAddress(config.httpHost, config.httpPort), 0);
        executor = Executors.newCachedThreadPool(r -> {
            Thread t = new Thread(r, "BlueMapWebChat-HTTP");
            t.setDaemon(true);
            return t;
        });
        server.setExecutor(executor);

        String p = config.pathPrefix;
        if (config.standaloneWebEnabled) {
            server.createContext(config.standaloneWebPath, this::handleStandaloneWeb);
        }
        server.createContext(p + "/config", this::handleConfig);
        server.createContext(p + "/lang", this::handleLang);
        server.createContext(p + "/history", this::handleHistory);
        server.createContext(p + "/pins", this::handlePins);
        server.createContext(p + "/stream", this::handleStream);
        server.createContext(p + "/send", this::handleSend);
        server.createContext(p + "/commands", this::handleCommands);
        server.createContext(p + "/commands/run", this::handleCommandRun);
        server.createContext(p + "/upload", this::handleUpload);
        server.createContext(p + "/uploads", this::handleUploadedFile);
        server.createContext(p + "/fonts", this::handleFontFile);
        server.createContext(p + "/external-media", this::handleExternalMedia);
        server.createContext(p + "/captcha", this::handleCaptcha);
        server.createContext(p + "/auth/code", this::handleAuthCode);
        server.createContext(p + "/auth/status", this::handleAuthStatus);
        server.createContext(p + "/auth/login", this::handleAuthLogin);
        server.createContext(p + "/auth/set-password", this::handleSetPassword);
        server.createContext(p + "/auth/me", this::handleMe);
        server.createContext(p + "/auth/logout", this::handleLogout);
        server.createContext(p + "/admin/summary", this::handleAdminSummary);
        server.createContext(p + "/admin/online", this::handleAdminOnline);
        server.createContext(p + "/admin/sessions", this::handleAdminSessions);
        server.createContext(p + "/admin/accounts", this::handleAdminAccounts);
        server.createContext(p + "/admin/revoke", this::handleAdminRevoke);
        server.createContext(p + "/admin/mutes", this::handleAdminMutes);
        server.createContext(p + "/admin/mute", this::handleAdminMute);
        server.createContext(p + "/admin/unmute", this::handleAdminUnmute);
        server.createContext(p + "/admin/delete-message", this::handleAdminDeleteMessage);
        server.createContext(p + "/admin/pin-message", this::handleAdminPinMessage);
        server.createContext(p + "/admin/unpin-message", this::handleAdminUnpinMessage);
        server.createContext(p + "/admin/clear-history", this::handleAdminClearHistory);

        loadPersistedHistory();
        cleanupOldUploads();
        cleanupOldExternalMediaCache();

        running = true;
        server.start();
        plugin.getLogger().info("HTTP chat server started on " + config.httpHost + ":" + config.httpPort + config.pathPrefix);
    }

    public void stop() {
        savePersistedHistory();
        running = false;
        for (SseClient c : clients) {
            c.close();
        }
        clients.clear();
        if (server != null) {
            server.stop(1);
            server = null;
        }
        if (executor != null) {
            executor.shutdownNow();
            executor = null;
        }
    }

    private void handleStandaloneWeb(HttpExchange ex) throws IOException {
        if (preflight(ex)) return;
        if (!"GET".equalsIgnoreCase(ex.getRequestMethod())) {
            sendBytes(ex, 405, "text/plain; charset=utf-8", "method_not_allowed".getBytes(StandardCharsets.UTF_8));
            return;
        }

        ConfigValues config = plugin.configValues();
        String base = config.standaloneWebPath;
        String path = ex.getRequestURI().getPath();
        if (!path.equals(base) && !path.startsWith(base + "/")) {
            sendBytes(ex, 404, "text/plain; charset=utf-8", "not_found".getBytes(StandardCharsets.UTF_8));
            return;
        }

        String suffix = path.equals(base) ? "" : path.substring(base.length());
        if (suffix.isEmpty() || "/".equals(suffix)) {
            sendStandaloneIndex(ex, config);
        } else if ("/chat.js".equals(suffix)) {
            sendClasspathResource(ex, "web/chat.js", "application/javascript; charset=utf-8");
        } else if ("/chat.css".equals(suffix)) {
            sendClasspathResource(ex, "web/chat.css", "text/css; charset=utf-8");
        } else {
            sendBytes(ex, 404, "text/plain; charset=utf-8", "not_found".getBytes(StandardCharsets.UTF_8));
        }
    }

    private void sendStandaloneIndex(HttpExchange ex, ConfigValues config) throws IOException {
        String version = plugin.getDescription().getVersion();
        String apiBase = config.standaloneWebApiBaseUrl == null ? "" : config.standaloneWebApiBaseUrl.trim();
        String apiBaseJs;
        if (!apiBase.isEmpty()) {
            apiBaseJs = JsonUtil.quote(apiBase);
        } else {
            String webAddonApiBase = config.apiBaseUrl == null ? "" : config.apiBaseUrl.trim();
            if (!webAddonApiBase.isEmpty()) {
                // In a same-domain HTTPS reverse proxy deployment, users commonly
                // configure only web-addon.api-base-url, for example /bmwc/api.
                // Reuse it for HTTPS standalone pages, while keeping direct
                // http://host:8899/chat usable without the proxy.
                apiBaseJs = "((location.protocol === 'https:') ? "
                        + JsonUtil.quote(webAddonApiBase)
                        + " : (location.origin + " + JsonUtil.quote(config.pathPrefix) + "))";
            } else {
                apiBaseJs = "location.origin + " + JsonUtil.quote(config.pathPrefix);
            }
        }

        String standaloneScript;
        try (InputStream in = plugin.getResource("web/chat.js")) {
            if (in == null) {
                sendBytes(ex, 500, "text/plain; charset=utf-8", "standalone_script_missing".getBytes(StandardCharsets.UTF_8));
                return;
            }
            standaloneScript = new String(in.readAllBytes(), StandardCharsets.UTF_8)
                    .replace("</script", "<\\/script");
        }

        String html = "<!doctype html>\n"
                + "<html lang=\"en\">\n"
                + "<head>\n"
                + "  <meta charset=\"utf-8\">\n"
                + "  <meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">\n"
                + "  <title>BlueMapWebChat</title>\n"
                + "  <style>html,body{margin:0;width:100%;height:100%;background:#111318;color:#eee;font-family:system-ui,-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;overflow:hidden;} .bmwc-standalone-note{position:fixed;left:14px;bottom:12px;opacity:.55;font-size:12px;}</style>\n"
                + "</head>\n"
                + "<body data-bmwc-version=\"" + htmlEsc(version) + "\">\n"
                + "  <noscript>JavaScript is required to use the web chat.</noscript>\n"
                + "  <div class=\"bmwc-standalone-note\">BlueMapWebChat standalone mode</div>\n"
                + "  <script>window.BlueMapWebChatConfig={apiBase:" + apiBaseJs + ",apiBaseUrl:" + apiBaseJs + ",standalone:true};</script>\n"
                + "  <script>\n" + standaloneScript + "\n  </script>\n"
                + "</body>\n"
                + "</html>\n";
        sendBytes(ex, 200, "text/html; charset=utf-8", html.getBytes(StandardCharsets.UTF_8));
    }

    private void sendClasspathResource(HttpExchange ex, String resource, String contentType) throws IOException {
        try (InputStream in = plugin.getResource(resource)) {
            if (in == null) {
                sendBytes(ex, 404, "text/plain; charset=utf-8", "not_found".getBytes(StandardCharsets.UTF_8));
                return;
            }
            byte[] data = in.readAllBytes();
            sendBytes(ex, 200, contentType, data);
        }
    }

    public void publishFromGame(Player player, String message) {
        String displayName = plugin.displayPlayerName(player);
        String realName = player == null ? displayName : player.getName();
        String uuid = player == null ? "" : player.getUniqueId().toString();
        if (!uuid.isBlank() && displayName != null && !displayName.isBlank()) {
            plugin.storage().updateLastDisplayName(uuid, realName, displayName);
        }
        publishFromGame(displayName, realName, uuid, message);
    }

    public void publishFromGame(String player, String message) {
        publishFromGame(player, "", "", message);
    }

    public void publishFromGame(String player, String realPlayerName, String playerUuid, String message) {
        ConfigValues config = plugin.configValues();
        String text = stripChatMessage(message, config);
        if (text.isBlank()) return;
        if (plugin.discordBridge() != null && plugin.discordBridge().shouldSuppressGameEcho(player, text)) {
            return;
        }
        prewarmExternalMediaCache(text);
        ChatMessage msg = new ChatMessage(System.currentTimeMillis(), "game", player, "USER", text)
                .withRealSender(stripControl(realPlayerName, 64), stripControl(playerUuid, 64));
        addHistory(msg);
        broadcast(msg);
    }

    public void publishFromDiscord(String sender, String message) {
        ConfigValues config = plugin.configValues();
        String text = stripChatMessage(message, config);
        String safeSender = stripControl(sender, 64);
        if (text.isBlank()) return;
        if (safeSender.isBlank()) safeSender = "Discord";
        prewarmExternalMediaCache(text);
        ChatMessage msg = new ChatMessage(System.currentTimeMillis(), "discord", safeSender, "DISCORD", text);
        addHistory(msg);
        broadcast(msg);
    }

    public void publishSystemEvent(String sender, String message) {
        publishSystemEvent(sender, message, "", "");
    }

    public void publishSystemEvent(String sender, String message, String i18nKey, String i18nArgsJson) {
        String safeSender = stripControl(sender, 64);
        int eventMax = plugin.configValues().maxUrlMessageLength > 0 ? Math.max(256, plugin.configValues().maxUrlMessageLength) : 0;
        String text = stripControl(message, eventMax);
        if (safeSender.isBlank()) safeSender = "Server";
        if (text.isBlank()) return;
        ChatMessage msg = new ChatMessage(System.currentTimeMillis(), "event", safeSender, "SYSTEM", text);
        msg.withI18n(i18nKey, i18nArgsJson);
        addHistory(msg);
        broadcast(msg);
    }

    private void handleConfig(HttpExchange ex) throws IOException {
        if (preflight(ex)) return;
        ConfigValues c = plugin.configValues();
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("ok", true);
        m.put("serverVersion", plugin.getDescription().getVersion());
        m.put("guestEnabled", c.guestEnabled);
        m.put("guestAllowCustomName", c.guestAllowCustomName);
        m.put("guestNamePrefix", c.guestNamePrefix);
        m.put("hideChatForGuestsWhenGuestDisabled", c.hideChatForGuestsWhenGuestDisabled);
        m.put("showLoginOnlyWhenHidden", c.showLoginOnlyWhenHidden);
        m.put("uiResizable", c.uiResizable);
        m.put("uiRememberWindowSize", c.uiRememberWindowSize);
        m.put("uiDefaultWidth", c.uiDefaultWidth);
        m.put("uiDefaultHeight", c.uiDefaultHeight);
        m.put("uiMinWidth", c.uiMinWidth);
        m.put("uiMinHeight", c.uiMinHeight);
        m.put("uiMaxWidth", c.uiMaxWidth);
        m.put("uiMaxHeight", c.uiMaxHeight);
        m.put("uiFontSize", c.uiFontSize);
        m.put("uiMessageFontSize", c.uiMessageFontSize);
        m.put("uiInputFontSize", c.uiInputFontSize);
        m.put("uiTextColor", c.uiTextColor);
        m.put("uiUiTextColor", c.uiUiTextColor);
        m.put("uiTextShadowMode", c.uiTextShadowMode);
        m.put("uiTextShadowCustom", c.uiTextShadowCustom);
        m.put("uiInputBackgroundColor", c.uiInputBackgroundColor);
        m.put("uiButtonFontSize", c.uiButtonFontSize);
        m.put("uiBadgeFontSize", c.uiBadgeFontSize);
        m.put("uiVirtualScrollEnabled", c.uiVirtualScrollEnabled);
        m.put("uiVirtualScrollOverscanScreens", c.uiVirtualScrollOverscanScreens);
        m.put("uiVirtualScrollMinRenderedMessages", c.uiVirtualScrollMinRenderedMessages);
        m.put("uiVirtualScrollPreserveVisibleMedia", c.uiVirtualScrollPreserveVisibleMedia);
        m.put("uiVirtualScrollPreservePlayingMedia", c.uiVirtualScrollPreservePlayingMedia);
        m.put("uiHistoryPreloadScreens", c.uiHistoryPreloadScreens);
        m.put("uiHistoryPreloadMinPx", c.uiHistoryPreloadMinPx);
        m.put("uiAutoFollowBottomThresholdPx", c.uiAutoFollowBottomThresholdPx);
        m.put("uiScrollInteractionIdleMs", c.uiScrollInteractionIdleMs);
        m.put("uiResumeRefreshEnabled", c.uiResumeRefreshEnabled);
        m.put("uiResumeRefreshMinIntervalSeconds", c.uiResumeRefreshMinIntervalSeconds);
        m.put("uiResumeRefreshSkipWhileMediaActive", c.uiResumeRefreshSkipWhileMediaActive);
        m.put("uiResumeRefreshSkipUnchanged", c.uiResumeRefreshSkipUnchanged);
        m.put("uiTheme", c.uiTheme);
        m.put("uiSyncBlueMapTheme", c.uiSyncBlueMapTheme);
        m.put("uiOpacity", c.uiOpacity);
        m.put("uiUserPreferencesControl", c.uiUserPreferencesControl);
        m.put("uiUserFontOptions", c.uiUserFontOptions);
        m.put("uiFontFamily", c.uiFontFamily);
        m.put("uiPictureInPictureEnabled", c.uiPictureInPictureEnabled);
        m.put("playerNameMode", c.playerNameMode);
        m.put("playerNameStripColors", c.playerNameStripColors);
        m.put("webFontsEnabled", c.webFontsEnabled);
        m.put("webFontsItems", c.webFontsItems);
        m.put("captchaMode", c.captchaMode);
        m.put("captchaEnabled", captcha.enabled(c));
        m.put("captchaRequireOnEachMessage", c.captchaRequireOnEachMessage);
        m.put("captchaPassValidMinutes", c.captchaPassValidMinutes);
        m.put("maxMessageLength", c.maxMessageLength);
        m.put("maxUrlMessageLength", c.maxUrlMessageLength);
        m.put("maxMessageInputLength", effectiveInputLengthLimit(c));
        m.put("historySize", c.historySize);
        m.put("historyRetentionDays", c.historyRetentionDays);
        m.put("historyPersistRetentionDays", c.historyPersistRetentionDays);
        m.put("historyPersist", c.historyPersist);
        m.put("historyPageSize", c.historyPageSize);
        m.put("language", c.uiLanguage);
        m.put("uiTimeZone", c.uiTimeZone);
        m.put("linkifyUrls", c.linkifyUrls);
        m.put("clickableUrlsInGame", c.clickableUrlsInGame);
        m.put("imagePreviewEnabled", c.imagePreviewEnabled);
        m.put("imagePreviewMaxPerMessage", c.imagePreviewMaxPerMessage);
        m.put("imagePreviewMaxHeight", c.imagePreviewMaxHeight);
        m.put("googleDriveImagePreview", c.googleDriveImagePreview);
        m.put("googleDrivePreviewMode", c.googleDrivePreviewMode);
        m.put("externalMediaCacheEnabled", c.externalMediaCacheEnabled);
        m.put("cacheDiscordCdn", c.cacheDiscordCdn);
        m.put("youtubeEmbedEnabled", c.youtubeEmbedEnabled);
        m.put("youtubeClickToLoad", c.youtubeClickToLoad);
        m.put("mediaClickToLoad", c.mediaClickToLoad);
        m.put("youtubeNoCookie", c.youtubeNoCookie);
        m.put("youtubeRememberExpanded", c.youtubeRememberExpanded);
        m.put("youtubeAutoplayOnOpen", c.youtubeAutoplayOnOpen);
        m.put("youtubeMaxEmbedsPerMessage", c.youtubeMaxEmbedsPerMessage);
        m.put("uploadEnabled", c.uploadEnabled);
        m.put("uploadAllowGuest", c.uploadAllowGuest);
        m.put("uploadAllowUser", c.uploadAllowUser);
        m.put("uploadAllowModerator", c.uploadAllowModerator);
        m.put("uploadAllowAdmin", c.uploadAllowAdmin);
        m.put("uploadMaxFileSizeMb", c.uploadMaxFileSizeMb);
        m.put("uploadMaxFilesPerMessage", c.uploadMaxFilesPerMessage);
        m.put("uploadAllowedExtensions", c.uploadAllowedExtensions);
        m.put("uploadClipboardEnabled", c.uploadClipboardEnabled);
        m.put("uploadClipboardSendMode", c.uploadClipboardSendMode);
        m.put("uploadClipboardImageDefaultExtension", c.uploadClipboardImageDefaultExtension);
        m.put("uploadPreviewImages", c.uploadPreviewImages);
        m.put("uploadPreviewVideos", c.uploadPreviewVideos);
        m.put("uploadPreviewAudio", c.uploadPreviewAudio);
        m.put("pinnedEnabled", c.pinnedEnabled);
        m.put("pinnedMaxPins", c.pinnedMaxPins);
        m.put("pinnedShowToLoggedOut", c.pinnedShowToLoggedOut);
        m.put("commandsEnabled", c.commandsEnabled);
        m.put("commandsAllowAll", c.commandsAllowAll);
        m.put("commandsMinRole", c.commandsMinRole == null ? "ADMIN" : c.commandsMinRole.name());
        m.put("commandsShowButton", c.commandsShowButton);
        m.put("commandsShowSlashPanel", c.commandsShowSlashPanel);
        m.put("commandsRunFromChatInput", c.commandsRunFromChatInput);
        m.put("commandsRequireConfirm", c.commandsRequireConfirm);
        m.put("commandsMaxLength", c.commandsMaxLength);
        m.put("cooldownSeconds", c.guestCooldownSeconds);
        m.put("moderationEnabled", c.moderationEnabled);
        m.put("allowWebAdminPanel", c.allowWebAdminPanel);
        m.put("allowModeratorMessageDelete", c.allowModeratorMessageDelete);
        m.put("allowModeratorGuestMute", c.allowModeratorGuestMute);
        m.put("defaultMuteMinutes", c.defaultMuteMinutes);
        m.put("discordEnabled", c.discordEnabled);
        m.put("discordChannel", c.discordChannel);
        m.put("discordWebToDiscord", c.discordWebToDiscord);
        m.put("discordDiscordToWeb", c.discordDiscordToWeb);
        sendJson(ex, 200, JsonUtil.obj(m));
    }


    private void handleLang(HttpExchange ex) throws IOException {
        if (preflight(ex)) return;
        Map<String, String> q = JsonUtil.parseQuery(ex.getRequestURI().getRawQuery());
        String requested = q.get("lang");

        Map<String, Object> m = new LinkedHashMap<>();
        m.put("ok", true);
        m.put("language", requested == null || requested.isBlank() ? plugin.langManager().currentLanguage() : requested.trim());
        m.put("fallback", plugin.langManager().fallbackLanguage());
        m.put("available", Arrays.asList(plugin.langManager().availableLanguages()));
        m.put("strings", requested == null || requested.isBlank() ? plugin.langManager().webStrings() : plugin.langManager().webStringsFor(requested));
        sendJson(ex, 200, JsonUtil.obj(m));
    }

    private void handleHistory(HttpExchange ex) throws IOException {
        if (preflight(ex)) return;

        ConfigValues config = plugin.configValues();
        Map<String, String> q = JsonUtil.parseQuery(ex.getRequestURI().getRawQuery());
        int limit = boundedInt(q.get("limit"), config.historyPageSize, 0, 0);
        String before = q.get("before");
        if (before != null && before.isBlank()) before = null;

        List<ChatMessage> page = new ArrayList<>();
        boolean hasMore;
        String oldestId = "";

        boolean pruned;
        synchronized (history) {
            pruned = pruneHistoryLocked();
            List<ChatMessage> all = new ArrayList<>(history);

            int end = all.size();
            if (before != null) {
                for (int i = all.size() - 1; i >= 0; i--) {
                    if (before.equals(all.get(i).id)) {
                        end = i;
                        break;
                    }
                }
            }

            int start = limit <= 0 ? 0 : Math.max(0, end - limit);
            for (int i = start; i < end; i++) {
                page.add(all.get(i));
            }

            hasMore = start > 0;
            if (!page.isEmpty()) oldestId = page.get(0).id;
        }

        if (pruned && config.historyPersist) {
            savePersistedHistory();
        }

        List<String> items = new ArrayList<>();
        for (ChatMessage m : page) {
            items.add(m.toJson());
        }

        Map<String, Object> res = new LinkedHashMap<>();
        res.put("ok", true);
        res.put("messages", items);
        res.put("hasMore", hasMore);
        res.put("oldestId", oldestId);

        // messages are already JSON strings, so build this response manually.
        sendJson(ex, 200, "{\"ok\":true,\"messages\":[" + String.join(",", items) + "],\"hasMore\":" + hasMore + ",\"oldestId\":" + JsonUtil.quote(oldestId) + "}");
    }

    private void handlePins(HttpExchange ex) throws IOException {
        if (preflight(ex)) return;
        if (!"GET".equalsIgnoreCase(ex.getRequestMethod())) {
            sendJson(ex, 405, "{\"ok\":false,\"error\":\"method_not_allowed\"}");
            return;
        }

        ConfigValues config = plugin.configValues();
        Map<String, String> q = JsonUtil.parseQuery(ex.getRequestURI().getRawQuery());
        SessionContext ctx = storage.getSession(q.get("token"));
        boolean visible = config.pinnedShowToLoggedOut || ctx != null;

        List<String> items = new ArrayList<>();
        if (config.pinnedEnabled && visible) {
            for (PinnedMessage pin : storage.listPinnedMessages()) {
                items.add(pin.toJson());
            }
        }

        boolean canPin = config.pinnedEnabled && config.allowWebAdminPanel && ctx != null && ctx.account.role.atLeast(Role.MODERATOR);

        sendJson(ex, 200, "{\"ok\":true,\"enabled\":" + config.pinnedEnabled
                + ",\"visible\":" + visible
                + ",\"canPin\":" + canPin
                + ",\"maxPins\":" + config.pinnedMaxPins
                + ",\"pins\":[" + String.join(",", items) + "]}");

    }

    private void handleStream(HttpExchange ex) throws IOException {
        if (preflight(ex)) return;
        String ip = remoteIp(ex);
        ConfigValues config = plugin.configValues();
        if (!canOpenSse(ip, config)) {
            addCors(ex);
            addSecurityHeaders(ex);
            sendJson(ex, 429, "{\"ok\":false,\"error\":\"too_many_stream_connections\"}");
            return;
        }

        addCors(ex);
        addSecurityHeaders(ex);
        Headers h = ex.getResponseHeaders();
        h.set("Content-Type", "text/event-stream; charset=utf-8");
        h.set("Cache-Control", "no-cache");
        h.set("Connection", "keep-alive");
        ex.sendResponseHeaders(200, 0);

        SseClient client = new SseClient(ex.getResponseBody(), ip);
        clients.add(client);
        try {
            client.sendRaw("event: ready\ndata: {\"ok\":true}\n\n");
            while (running && client.open) {
                try {
                    Thread.sleep(25_000L);
                    client.sendRaw(": ping\n\n");
                } catch (InterruptedException interrupted) {
                    Thread.currentThread().interrupt();
                    break;
                }
            }
        } catch (IOException ignored) {
        } finally {
            clients.remove(client);
            client.close();
            ex.close();
        }
    }

    private boolean canOpenSse(String ip, ConfigValues config) {
        int totalLimit = Math.max(0, config.maxSseConnectionsTotal);
        if (totalLimit > 0 && clients.size() >= totalLimit) return false;

        int perIpLimit = Math.max(0, config.maxSseConnectionsPerIp);
        if (perIpLimit > 0) {
            int current = 0;
            for (SseClient client : clients) {
                if (Objects.equals(client.ip, ip)) current++;
                if (current >= perIpLimit) return false;
            }
        }
        return true;
    }

    private void handleSend(HttpExchange ex) throws IOException {
        if (preflight(ex)) return;
        if (!"POST".equalsIgnoreCase(ex.getRequestMethod())) {
            sendJson(ex, 405, "{\"ok\":false,\"error\":\"method_not_allowed\"}");
            return;
        }

        Map<String, String> body = JsonUtil.parseFlatObject(JsonUtil.readBody(ex.getRequestBody()));
        String ip = remoteIp(ex);
        ConfigValues config = plugin.configValues();
        String message = stripChatMessage(body.get("message"), config);
        if (message.isBlank()) {
            sendJson(ex, 400, "{\"ok\":false,\"error\":\"empty_message\"}");
            return;
        }

        SessionContext ctx = storage.getSession(body.get("token"));
        if (ctx != null) {
            handleUserSend(ex, ctx, message);
            return;
        }

        handleGuestSend(ex, body, ip, message);
    }

    private void handleUserSend(HttpExchange ex, SessionContext ctx, String message) throws IOException {
        if (!ctx.account.role.atLeast(Role.USER)) {
            sendJson(ex, 403, "{\"ok\":false,\"error\":\"permission_denied\"}");
            return;
        }
        prewarmExternalMediaCache(message);
        ChatMessage msg = new ChatMessage(System.currentTimeMillis(), "web", plugin.displayNameForAccount(ctx.account), ctx.account.role.name(), message)
                .withRealSender(stripControl(ctx.account.safeUsername(), 64), stripControl(ctx.account.uuid, 64));
        sendToGame(msg, ctx.account.role == Role.ADMIN
                ? plugin.configValues().webAdminToGameFormat
                : plugin.configValues().webUserToGameFormat);
        if (plugin.configValues().broadcastWebChatToWeb) {
            addHistory(msg);
            broadcast(msg);
        }
        plugin.discordBridge().sendWebMessage(msg);
        sendJson(ex, 200, "{\"ok\":true}");
    }

    private void handleGuestSend(HttpExchange ex, Map<String, String> body, String ip, String message) throws IOException {
        ConfigValues config = plugin.configValues();
        if (!config.guestEnabled) {
            sendJson(ex, 403, "{\"ok\":false,\"error\":\"guest_disabled\"}");
            return;
        }

        String captchaPass = null;
        if (captcha.enabled(config)) {
            boolean passed = false;
            if (!config.captchaRequireOnEachMessage) {
                passed = captcha.verifyPass(body.get("captchaPass")) || captcha.verifyIpPass(ip);
            }
            if (!passed) {
                passed = captcha.verify(body.get("captchaId"), body.get("captchaAnswer"));
                if (passed && !config.captchaRequireOnEachMessage) {
                    captchaPass = captcha.issuePass(config.captchaPassValidMinutes);
                    captcha.issueIpPass(ip, config.captchaPassValidMinutes);
                }
            }
            if (!passed) {
                sendJson(ex, 403, "{\"ok\":false,\"error\":\"captcha_failed\"}");
                return;
            }
        }

        String guestName = sanitizeGuestName(body.get("guestName"));
        if (guestName.isBlank()) {
            guestName = generatedGuestNameForIp(ip);
        }
        if (!isGuestNameAllowed(guestName)) {
            sendJson(ex, 403, "{\"ok\":false,\"error\":\"blocked_name\"}");
            return;
        }
        if (config.moderationEnabled && plugin.moderationManager().isMuted(guestName, ip)) {
            ModerationEntry mute = plugin.moderationManager().findMatch(guestName, ip);
            String reason = mute == null ? "" : mute.reason;
            sendJson(ex, 403, "{\"ok\":false,\"error\":\"guest_muted\",\"reason\":" + JsonUtil.quote(reason) + "}");
            return;
        }

        String limiterKey = "guest:" + ip + ":" + guestName.toLowerCase(Locale.ROOT);
        if (!rateLimiter.allow(limiterKey, config.guestCooldownSeconds, config.guestMaxMessagesPerMinute)) {
            String extra = captchaPass == null ? "" : ",\"captchaPass\":" + JsonUtil.quote(captchaPass);
            sendJson(ex, 429, "{\"ok\":false,\"error\":\"rate_limited\"" + extra + "}");
            return;
        }

        prewarmExternalMediaCache(message);
        ChatMessage msg = new ChatMessage(System.currentTimeMillis(), "guest", guestName, "GUEST", message);
        sendToGame(msg, config.webGuestToGameFormat);
        if (config.broadcastWebChatToWeb) {
            addHistory(msg);
            broadcast(msg);
        }
        plugin.discordBridge().sendWebMessage(msg);
        String extra = captchaPass == null ? "" : ",\"captchaPass\":" + JsonUtil.quote(captchaPass);
        sendJson(ex, 200, "{\"ok\":true" + extra + "}");
    }


    private void handleCommands(HttpExchange ex) throws IOException {
        if (preflight(ex)) return;
        if (!"GET".equalsIgnoreCase(ex.getRequestMethod())) {
            sendJson(ex, 405, "{\"ok\":false,\"error\":\"method_not_allowed\"}");
            return;
        }

        ConfigValues config = plugin.configValues();
        Map<String, String> q = JsonUtil.parseQuery(ex.getRequestURI().getRawQuery());
        SessionContext ctx = storage.getSession(q.get("token"));
        Role minRole = config.commandsMinRole == null ? Role.ADMIN : config.commandsMinRole;
        boolean canRun = config.commandsEnabled && ctx != null && ctx.account.role.atLeast(minRole);

        List<String> presets = new ArrayList<>();
        if (canRun && config.commandPresets != null) {
            for (ConfigValues.CommandPreset preset : config.commandPresets) {
                if (preset == null || !preset.enabled || preset.id.isBlank() || preset.command.isBlank()) continue;
                presets.add(commandPresetJson(preset));
            }
        }

        sendJson(ex, 200, "{\"ok\":true"
                + ",\"enabled\":" + config.commandsEnabled
                + ",\"canRun\":" + canRun
                + ",\"allowAll\":" + config.commandsAllowAll
                + ",\"minRole\":" + JsonUtil.quote(minRole.name())
                + ",\"showButton\":" + config.commandsShowButton
                + ",\"showSlashPanel\":" + config.commandsShowSlashPanel
                + ",\"runFromChatInput\":" + config.commandsRunFromChatInput
                + ",\"requireConfirm\":" + config.commandsRequireConfirm
                + ",\"maxLength\":" + config.commandsMaxLength
                + ",\"presets\":[" + String.join(",", presets) + "]}");
    }

    private void handleCommandRun(HttpExchange ex) throws IOException {
        if (preflight(ex)) return;
        if (!"POST".equalsIgnoreCase(ex.getRequestMethod())) {
            sendJson(ex, 405, "{\"ok\":false,\"error\":\"method_not_allowed\"}");
            return;
        }

        ConfigValues config = plugin.configValues();
        if (!config.commandsEnabled) {
            sendJson(ex, 403, "{\"ok\":false,\"error\":\"commands_disabled\"}");
            return;
        }

        Map<String, String> body = JsonUtil.parseFlatObject(JsonUtil.readBody(ex.getRequestBody()));
        String token = body.get("token");
        if (token == null || token.isBlank()) {
            token = JsonUtil.parseQuery(ex.getRequestURI().getRawQuery()).get("token");
        }
        SessionContext ctx = storage.getSession(token);
        Role minRole = config.commandsMinRole == null ? Role.ADMIN : config.commandsMinRole;
        if (ctx == null || !ctx.account.role.atLeast(minRole)) {
            sendJson(ex, 403, "{\"ok\":false,\"error\":\"permission_denied\"}");
            return;
        }

        String id = String.valueOf(body.getOrDefault("id", "")).trim();
        String command;
        String resultLabel;
        ConfigValues.CommandPreset preset = null;

        if (config.commandsAllowAll && body.containsKey("command")) {
            command = String.valueOf(body.getOrDefault("command", "")).trim();
            resultLabel = command;
        } else {
            preset = findCommandPreset(id, config.commandPresets);
            if (preset == null) {
                sendJson(ex, 404, "{\"ok\":false,\"error\":\"command_not_found\"}");
                return;
            }
            command = preset.command == null ? "" : preset.command.trim();
            resultLabel = preset.label;
        }

        if (command.startsWith("/")) command = command.substring(1).trim();
        if (config.commandsMaxLength > 0 && command.length() > config.commandsMaxLength) {
            sendJson(ex, 400, "{\"ok\":false,\"error\":\"command_too_long\",\"maxLength\":" + config.commandsMaxLength + "}");
            return;
        }
        if (command.isBlank() || command.contains("\n") || command.contains("\r") || command.indexOf('\0') >= 0) {
            sendJson(ex, 400, "{\"ok\":false,\"error\":\"invalid_command\"}");
            return;
        }

        final String finalCommand = command;
        CompletableFuture<Boolean> future = new CompletableFuture<>();
        Bukkit.getScheduler().runTask(plugin, () -> {
            try {
                future.complete(Bukkit.dispatchCommand(Bukkit.getConsoleSender(), finalCommand));
            } catch (Throwable t) {
                future.completeExceptionally(t);
            }
        });

        boolean accepted;
        try {
            accepted = future.get(5, TimeUnit.SECONDS);
        } catch (TimeoutException timeout) {
            sendJson(ex, 202, "{\"ok\":true,\"submitted\":true,\"timeout\":true}");
            return;
        } catch (Exception err) {
            plugin.getLogger().warning("Web command failed: " + err.getMessage());
            sendJson(ex, 500, "{\"ok\":false,\"error\":\"command_failed\"}");
            return;
        }

        if (config.commandsBroadcastToWebChat) {
            Map<String, String> values = new LinkedHashMap<>();
            values.put("label", resultLabel);
            publishSystemEvent("Command", "Executed web command: " + resultLabel, "system.command-executed", JsonUtil.obj(values));
        }

        sendJson(ex, 200, "{\"ok\":true,\"accepted\":" + accepted
                + ",\"label\":" + JsonUtil.quote(resultLabel)
                + ",\"id\":" + JsonUtil.quote(preset == null ? "" : preset.id) + "}");
    }

    private ConfigValues.CommandPreset findCommandPreset(String id, List<ConfigValues.CommandPreset> presets) {
        if (id == null || presets == null) return null;
        for (ConfigValues.CommandPreset preset : presets) {
            if (preset != null && preset.enabled && id.equals(preset.id)) return preset;
        }
        return null;
    }

    private String commandPresetJson(ConfigValues.CommandPreset preset) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", preset.id);
        m.put("label", preset.label);
        m.put("description", preset.description);
        m.put("command", preset.command);
        m.put("confirm", preset.requireConfirm);
        return JsonUtil.obj(m);
    }

    private void handleUpload(HttpExchange ex) throws IOException {
        if (preflight(ex)) return;
        ConfigValues config = plugin.configValues();

        if (!"POST".equalsIgnoreCase(ex.getRequestMethod())) {
            sendJson(ex, 405, "{\"ok\":false,\"error\":\"method_not_allowed\"}");
            return;
        }
        if (!config.uploadEnabled) {
            sendJson(ex, 403, "{\"ok\":false,\"error\":\"upload_disabled\"}");
            return;
        }

        long maxBytes = config.uploadMaxFileSizeMb > 0 ? config.uploadMaxFileSizeMb * 1024L * 1024L : 0L;
        String contentType = ex.getRequestHeaders().getFirst("Content-Type");
        String boundary = multipartBoundary(contentType);
        if (boundary == null || boundary.isBlank()) {
            sendJson(ex, 400, "{\"ok\":false,\"error\":\"multipart_required\"}");
            return;
        }

        long contentLength = parseLong(ex.getRequestHeaders().getFirst("Content-Length"), -1);
        if (maxBytes > 0 && contentLength > 0 && contentLength > maxBytes + 1024L * 1024L) {
            sendJson(ex, 413, "{\"ok\":false,\"error\":\"file_too_large\"}");
            return;
        }

        byte[] body;
        try {
            body = readLimitedBytes(ex.getRequestBody(), maxBytes > 0 ? maxBytes + 1024L * 1024L : 0L);
        } catch (UploadTooLargeException tooLarge) {
            sendJson(ex, 413, "{\"ok\":false,\"error\":\"file_too_large\"}");
            return;
        }

        MultipartData multipart = parseMultipart(body, boundary);
        UploadedPart file = multipart.file;
        if (file == null || file.data == null || file.data.length == 0) {
            sendJson(ex, 400, "{\"ok\":false,\"error\":\"file_missing\"}");
            return;
        }
        if (maxBytes > 0 && file.data.length > maxBytes) {
            sendJson(ex, 413, "{\"ok\":false,\"error\":\"file_too_large\"}");
            return;
        }

        String ip = remoteIp(ex);
        if (!rateLimiter.allow("upload:" + ip, config.uploadCooldownSeconds, config.uploadMaxUploadsPerMinute)) {
            sendJson(ex, 429, "{\"ok\":false,\"error\":\"rate_limited\"}");
            return;
        }

        SessionContext ctx = storage.getSession(multipart.fields.get("token"));
        if (!canUpload(ctx, config)) {
            if (ctx == null && config.uploadAllowGuest && !config.guestEnabled) {
                sendJson(ex, 403, "{\"ok\":false,\"error\":\"guest_disabled\"}");
            } else {
                sendJson(ex, 403, "{\"ok\":false,\"error\":\"upload_permission_denied\"}");
            }
            return;
        }

        String original = sanitizeFileName(file.filename);
        String ext = extension(original);
        if (!isAllowedUploadExtension(ext, config)) {
            sendJson(ex, 403, "{\"ok\":false,\"error\":\"extension_not_allowed\"}");
            return;
        }

        cleanupOldUploads();

        String stored = System.currentTimeMillis() + "-" + SecurityUtil.randomToken(10) + "." + ext;
        Path dir = uploadDir();
        Path target = dir.resolve(stored).normalize();
        if (!target.startsWith(dir)) {
            sendJson(ex, 400, "{\"ok\":false,\"error\":\"invalid_path\"}");
            return;
        }

        Files.createDirectories(dir);
        Files.write(target, file.data, StandardOpenOption.CREATE_NEW, StandardOpenOption.WRITE);

        String url = publicUploadBaseUrl(ex) + "/" + stored;
        Map<String, Object> res = new LinkedHashMap<>();
        res.put("ok", true);
        res.put("url", url);
        res.put("filename", original);
        res.put("storedName", stored);
        res.put("size", file.data.length);
        res.put("extension", ext);
        res.put("mediaType", uploadMediaType(ext));
        sendJson(ex, 200, JsonUtil.obj(res));
    }


    private Path webFontDir() {
        String dir = plugin.configValues().webFontsDirectory;
        if (dir == null || dir.isBlank()) dir = "fonts";
        Path path = Path.of(dir);
        if (!path.isAbsolute()) path = plugin.getDataFolder().toPath().resolve(path);
        return path.normalize();
    }

    private void handleFontFile(HttpExchange ex) throws IOException {
        if (preflight(ex)) return;
        if (!"GET".equalsIgnoreCase(ex.getRequestMethod()) && !"HEAD".equalsIgnoreCase(ex.getRequestMethod())) {
            sendJson(ex, 405, "{\"ok\":false,\"error\":\"method_not_allowed\"}");
            return;
        }

        ConfigValues config = plugin.configValues();
        if (!config.webFontsEnabled) {
            sendJson(ex, 404, "{\"ok\":false,\"error\":\"not_found\"}");
            return;
        }

        String prefix = config.pathPrefix + "/fonts/";
        String path = ex.getRequestURI().getPath();
        if (!path.startsWith(prefix)) {
            sendJson(ex, 404, "{\"ok\":false,\"error\":\"not_found\"}");
            return;
        }

        String name = URLDecoder.decode(path.substring(prefix.length()), StandardCharsets.UTF_8).replace("\\", "/");
        if (name.isBlank() || name.startsWith("/") || name.contains("..") || name.contains("\0")) {
            sendJson(ex, 400, "{\"ok\":false,\"error\":\"invalid_file\"}");
            return;
        }

        String ext = extension(name).toLowerCase(Locale.ROOT);
        if (!List.of("woff2", "woff", "ttf", "otf").contains(ext)) {
            sendJson(ex, 400, "{\"ok\":false,\"error\":\"invalid_file\"}");
            return;
        }

        Path dir = webFontDir();
        Path file = dir.resolve(name).normalize();
        if (!file.startsWith(dir) || !Files.exists(file) || !Files.isRegularFile(file)) {
            sendJson(ex, 404, "{\"ok\":false,\"error\":\"not_found\"}");
            return;
        }

        long len = Files.size(file);
        boolean head = "HEAD".equalsIgnoreCase(ex.getRequestMethod());

        Headers h = ex.getResponseHeaders();
        addCors(ex);
        addSecurityHeaders(ex);
        h.set("Content-Type", contentTypeForFontExtension(ext));
        h.set("X-Content-Type-Options", "nosniff");
        h.set("Cache-Control", "public, max-age=604800");
        h.set("Content-Length", String.valueOf(len));
        h.set("Content-Disposition", "inline; filename=\"" + Path.of(name).getFileName().toString().replace("\"", "") + "\"");

        ex.sendResponseHeaders(200, head ? -1 : len);
        if (!head) {
            try (OutputStream os = ex.getResponseBody()) {
                Files.copy(file, os);
            }
        } else {
            ex.close();
        }
    }

    private String contentTypeForFontExtension(String ext) {
        switch (ext.toLowerCase(Locale.ROOT)) {
            case "woff2": return "font/woff2";
            case "woff": return "font/woff";
            case "ttf": return "font/ttf";
            case "otf": return "font/otf";
            default: return "application/octet-stream";
        }
    }

    private void handleUploadedFile(HttpExchange ex) throws IOException {
        if (preflight(ex)) return;
        if (!"GET".equalsIgnoreCase(ex.getRequestMethod()) && !"HEAD".equalsIgnoreCase(ex.getRequestMethod())) {
            sendJson(ex, 405, "{\"ok\":false,\"error\":\"method_not_allowed\"}");
            return;
        }

        ConfigValues config = plugin.configValues();
        if (!config.uploadEnabled) {
            sendJson(ex, 404, "{\"ok\":false,\"error\":\"not_found\"}");
            return;
        }

        String prefix = config.pathPrefix + "/uploads/";
        String path = ex.getRequestURI().getPath();
        int idx = path.indexOf(prefix);
        if (idx < 0) {
            sendJson(ex, 404, "{\"ok\":false,\"error\":\"not_found\"}");
            return;
        }

        String name = path.substring(idx + prefix.length());
        name = URLDecoder.decode(name, StandardCharsets.UTF_8);
        if (!name.matches("[A-Za-z0-9._-]+")) {
            sendJson(ex, 400, "{\"ok\":false,\"error\":\"invalid_file\"}");
            return;
        }

        Path dir = uploadDir();
        Path file = dir.resolve(name).normalize();
        if (!file.startsWith(dir) || !Files.exists(file) || !Files.isRegularFile(file)) {
            sendJson(ex, 404, "{\"ok\":false,\"error\":\"not_found\"}");
            return;
        }

        String ext = extension(name);
        long len = Files.size(file);

        Headers h = ex.getResponseHeaders();
        addCors(ex);
        addSecurityHeaders(ex);
        h.set("Content-Type", contentTypeForExtension(ext));
        h.set("X-Content-Type-Options", "nosniff");
        h.set("Accept-Ranges", "bytes");
        h.set("Cache-Control", "public, max-age=3600");
        String disposition = isInlineUploadExtension(ext) ? "inline" : "attachment";
        h.set("Content-Disposition", disposition + "; filename=\"" + name.replace("\"", "") + "\"");

        ByteRange range = parseRange(ex.getRequestHeaders().getFirst("Range"), len);
        boolean head = "HEAD".equalsIgnoreCase(ex.getRequestMethod());

        if (range == ByteRange.INVALID) {
            h.set("Content-Range", "bytes */" + len);
            ex.sendResponseHeaders(416, -1);
            ex.close();
            return;
        }

        if (range != null) {
            long count = range.end - range.start + 1;
            h.set("Content-Range", "bytes " + range.start + "-" + range.end + "/" + len);
            h.set("Content-Length", String.valueOf(count));
            ex.sendResponseHeaders(206, head ? -1 : count);
            if (!head) {
                try (OutputStream os = ex.getResponseBody()) {
                    copyRange(file, os, range.start, count);
                }
            } else {
                ex.close();
            }
            return;
        }

        h.set("Content-Length", String.valueOf(len));
        ex.sendResponseHeaders(200, head ? -1 : len);
        if (!head) {
            try (OutputStream os = ex.getResponseBody()) {
                Files.copy(file, os);
            }
        } else {
            ex.close();
        }
    }

    private ByteRange parseRange(String header, long length) {
        if (header == null || header.isBlank()) return null;
        if (length <= 0) return ByteRange.INVALID;

        String value = header.trim().toLowerCase(Locale.ROOT);
        if (!value.startsWith("bytes=")) return null;

        // Only support a single byte range. Browsers normally use one range for media seeking.
        String spec = value.substring("bytes=".length()).trim();
        int comma = spec.indexOf(',');
        if (comma >= 0) spec = spec.substring(0, comma).trim();

        int dash = spec.indexOf('-');
        if (dash < 0) return ByteRange.INVALID;

        try {
            String left = spec.substring(0, dash).trim();
            String right = spec.substring(dash + 1).trim();

            long start;
            long end;

            if (left.isEmpty()) {
                // Suffix range, e.g. bytes=-500
                long suffix = Long.parseLong(right);
                if (suffix <= 0) return ByteRange.INVALID;
                start = Math.max(0, length - suffix);
                end = length - 1;
            } else {
                start = Long.parseLong(left);
                end = right.isEmpty() ? length - 1 : Long.parseLong(right);
            }

            if (start < 0 || end < start || start >= length) return ByteRange.INVALID;
            end = Math.min(end, length - 1);
            return new ByteRange(start, end);
        } catch (RuntimeException ex) {
            return ByteRange.INVALID;
        }
    }

    private void copyRange(Path file, OutputStream os, long start, long count) throws IOException {
        try (InputStream in = Files.newInputStream(file)) {
            long skipped = 0;
            while (skipped < start) {
                long s = in.skip(start - skipped);
                if (s <= 0) {
                    if (in.read() == -1) return;
                    s = 1;
                }
                skipped += s;
            }

            byte[] buffer = new byte[8192];
            long remaining = count;
            while (remaining > 0) {
                int read = in.read(buffer, 0, (int) Math.min(buffer.length, remaining));
                if (read < 0) break;
                os.write(buffer, 0, read);
                remaining -= read;
            }
        }
    }

    private static final class ByteRange {
        static final ByteRange INVALID = new ByteRange(-1, -1);

        final long start;
        final long end;

        ByteRange(long start, long end) {
            this.start = start;
            this.end = end;
        }
    }


    private void handleExternalMedia(HttpExchange ex) throws IOException {
        if (preflight(ex)) return;
        if (!"GET".equalsIgnoreCase(ex.getRequestMethod()) && !"HEAD".equalsIgnoreCase(ex.getRequestMethod())) {
            sendJson(ex, 405, "{\"ok\":false,\"error\":\"method_not_allowed\"}");
            return;
        }

        ConfigValues config = plugin.configValues();
        if (!config.externalMediaCacheEnabled || !config.cacheDiscordCdn) {
            sendJson(ex, 404, "{\"ok\":false,\"error\":\"not_found\"}");
            return;
        }

        Map<String, String> q = JsonUtil.parseQuery(ex.getRequestURI().getRawQuery());
        String url = q.get("url");
        if (url == null || url.isBlank() || !isDiscordCdnPreviewUrl(url)) {
            sendJson(ex, 400, "{\"ok\":false,\"error\":\"invalid_url\"}");
            return;
        }

        Path file = cacheDiscordCdnResource(url);
        if (file == null || !Files.exists(file) || !Files.isRegularFile(file)) {
            sendJson(ex, 404, "{\"ok\":false,\"error\":\"not_available\"}");
            return;
        }

        String ext = extension(file.getFileName().toString());
        long len = Files.size(file);
        boolean head = "HEAD".equalsIgnoreCase(ex.getRequestMethod());

        Headers h = ex.getResponseHeaders();
        addCors(ex);
        addSecurityHeaders(ex);
        h.set("Content-Type", contentTypeForExtension(ext));
        h.set("X-Content-Type-Options", "nosniff");
        h.set("Accept-Ranges", "bytes");
        h.set("Cache-Control", "public, max-age=604800");
        h.set("Content-Disposition", "inline; filename=\"" + file.getFileName().toString().replace("\"", "") + "\"");

        ByteRange range = parseRange(ex.getRequestHeaders().getFirst("Range"), len);
        if (range == ByteRange.INVALID) {
            h.set("Content-Range", "bytes */" + len);
            ex.sendResponseHeaders(416, -1);
            ex.close();
            return;
        }

        if (range != null) {
            long count = range.end - range.start + 1;
            h.set("Content-Range", "bytes " + range.start + "-" + range.end + "/" + len);
            h.set("Content-Length", String.valueOf(count));
            ex.sendResponseHeaders(206, head ? -1 : count);
            if (!head) {
                try (OutputStream os = ex.getResponseBody()) {
                    copyRange(file, os, range.start, count);
                }
            } else {
                ex.close();
            }
            return;
        }

        h.set("Content-Length", String.valueOf(len));
        ex.sendResponseHeaders(200, head ? -1 : len);
        if (!head) {
            try (OutputStream os = ex.getResponseBody()) {
                Files.copy(file, os);
            }
        } else {
            ex.close();
        }
    }

    private void prewarmExternalMediaCache(String message) {
        ConfigValues config = plugin.configValues();
        if (!config.externalMediaCacheEnabled || !config.cacheDiscordCdn || message == null || message.isBlank()) return;
        if (executor == null) return;

        List<String> urls = new ArrayList<>();
        Matcher matcher = URL_PATTERN.matcher(message);
        while (matcher.find() && urls.size() < 4) {
            String raw = matcher.group(1);
            String[] split = splitUrlTrailing(raw);
            String url = normalizeClickUrl(split[0]);
            if (isDiscordCdnPreviewUrl(url)) urls.add(url);
        }
        if (urls.isEmpty()) return;

        executor.submit(() -> {
            for (String url : urls) {
                try {
                    cacheDiscordCdnResource(url);
                } catch (Throwable ignored) {
                }
            }
        });
    }

    private Path externalMediaCacheDir() {
        String dir = plugin.configValues().externalMediaCacheDirectory;
        if (dir == null || dir.isBlank()) dir = "uploads/external-media-cache";
        Path path = Path.of(dir);
        if (!path.isAbsolute()) path = plugin.getDataFolder().toPath().resolve(path);
        return path.normalize();
    }

    private void cleanupOldExternalMediaCache() {
        ConfigValues config = plugin.configValues();
        if (!config.externalMediaCacheEnabled || config.externalMediaCacheRetentionDays <= 0) return;

        Path dir = externalMediaCacheDir();
        if (!Files.isDirectory(dir)) return;

        long cutoff = System.currentTimeMillis() - (config.externalMediaCacheRetentionDays * 24L * 60L * 60L * 1000L);
        Set<String> protectedPinnedExternal = config.pinnedPreserveUploads ? protectedPinnedExternalCacheNames() : Collections.emptySet();
        try (java.util.stream.Stream<Path> stream = Files.list(dir)) {
            stream.filter(Files::isRegularFile).forEach(file -> {
                try {
                    if (protectedPinnedExternal.contains(file.getFileName().toString())) return;
                    if (Files.getLastModifiedTime(file).toMillis() < cutoff) {
                        Files.deleteIfExists(file);
                    }
                } catch (IOException ignored) {
                }
            });
        } catch (IOException ex) {
            plugin.getLogger().warning("Failed to cleanup external media cache: " + ex.getMessage());
        }
    }

    private Path cacheDiscordCdnResource(String url) {
        ConfigValues config = plugin.configValues();
        if (!config.externalMediaCacheEnabled || !config.cacheDiscordCdn || !isDiscordCdnPreviewUrl(url)) return null;

        String ext = extensionFromUrlPath(url);
        if (ext.isBlank()) ext = "bin";
        ext = ext.toLowerCase(Locale.ROOT);

        // Hash by host+path, not the expiring Discord query string. This way, if Discord renews
        // ex/is/hm parameters, the same attachment maps to the same cached file.
        String cacheKey = discordCdnCacheKey(url);
        String name = "discord-" + SecurityUtil.sha256Hex(cacheKey).substring(0, 32) + "." + ext;

        Path dir = externalMediaCacheDir();
        Path target = dir.resolve(name).normalize();
        if (!target.startsWith(dir)) return null;
        if (Files.exists(target) && Files.isRegularFile(target)) return target;

        long maxBytes = config.externalMediaCacheMaxSizeMb > 0 ? config.externalMediaCacheMaxSizeMb * 1024L * 1024L : 0L;
        int timeoutMs = Math.max(1, config.externalMediaCacheTimeoutSeconds) * 1000;

        try {
            Files.createDirectories(dir);

            HttpURLConnection conn = openExternalMediaConnection(url, timeoutMs, 4);
            if (conn == null) {
                return null;
            }

            int code = conn.getResponseCode();
            if (code < 200 || code >= 300) {
                return null;
            }

            String type = conn.getContentType();
            if (type != null) type = type.split(";", 2)[0].trim().toLowerCase(Locale.ROOT);

            String typeExt = extensionFromContentType(type);
            if (type != null && !type.isBlank() && !isAllowedExternalContentType(type)) {
                return null;
            }
            if (!isExternalMediaExtension(ext) && typeExt.isBlank()) {
                return null;
            }

            long length = conn.getContentLengthLong();
            if (maxBytes > 0 && length > maxBytes) {
                return null;
            }

            byte[] data;
            try (InputStream in = conn.getInputStream()) {
                data = readLimitedBytes(in, maxBytes);
            }
            if (data.length == 0 || (maxBytes > 0 && data.length > maxBytes)) return null;

            // If Discord serves a better concrete media type than the URL extension, adjust extension.
            if (!typeExt.isBlank() && !typeExt.equals(ext)) {
                ext = typeExt;
                name = "discord-" + SecurityUtil.sha256Hex(cacheKey).substring(0, 32) + "." + ext;
                target = dir.resolve(name).normalize();
                if (!target.startsWith(dir)) return null;
                if (Files.exists(target) && Files.isRegularFile(target)) return target;
            }

            Path temp = dir.resolve(name + ".tmp-" + SecurityUtil.randomToken(6)).normalize();
            if (!temp.startsWith(dir)) return null;
            Files.write(temp, data, StandardOpenOption.CREATE_NEW, StandardOpenOption.WRITE);
            try {
                Files.move(temp, target, StandardCopyOption.ATOMIC_MOVE);
            } catch (IOException ex) {
                Files.move(temp, target, StandardCopyOption.REPLACE_EXISTING);
            }
            return target;
        } catch (Exception ex) {
            return Files.exists(target) ? target : null;
        }
    }

    private HttpURLConnection openExternalMediaConnection(String url, int timeoutMs, int redirects) throws IOException {
        URI current = URI.create(normalizeClickUrl(url));

        for (int i = 0; i <= redirects; i++) {
            if (!"https".equalsIgnoreCase(current.getScheme())) return null;

            URL remote = current.toURL();
            HttpURLConnection conn = (HttpURLConnection) remote.openConnection();
            conn.setInstanceFollowRedirects(false);
            conn.setConnectTimeout(timeoutMs);
            conn.setReadTimeout(timeoutMs);
            conn.setRequestProperty("User-Agent", "Mozilla/5.0 BlueMapWebChat/" + plugin.getDescription().getVersion());
            conn.setRequestProperty("Accept", "image/avif,image/webp,image/apng,image/*,video/mp4,video/webm,audio/mpeg,audio/mp4,audio/ogg,audio/*,*/*;q=0.8");

            int code = conn.getResponseCode();
            if (code == 301 || code == 302 || code == 303 || code == 307 || code == 308) {
                String location = conn.getHeaderField("Location");
                conn.disconnect();
                if (location == null || location.isBlank()) return null;
                current = current.resolve(location);
                continue;
            }

            return conn;
        }

        return null;
    }

    private boolean isDiscordCdnPreviewUrl(String raw) {
        try {
            String normalized = normalizeClickUrl(raw);
            URI uri = URI.create(normalized);
            if (!"https".equalsIgnoreCase(uri.getScheme())) return false;

            String host = uri.getHost();
            if (host == null) return false;
            host = host.toLowerCase(Locale.ROOT);

            boolean discordHost = host.equals("cdn.discordapp.com")
                    || host.equals("media.discordapp.net")
                    || host.equals("cdn.discordapp.net")
                    || host.matches("images-ext-\\d+\\.discordapp\\.net");
            if (!discordHost) return false;

            String path = uri.getPath();
            if (path == null || path.isBlank()) return false;

            String lowerPath = path.toLowerCase(Locale.ROOT);
            String ext = extension(path);
            if (isExternalMediaExtension(ext)) return true;

            String q = uri.getQuery();
            if (q != null && Pattern.compile("(?i)(^|[&?])format=(png|jpe?g|gif|webp|avif|bmp|mp4|webm|mp3|m4a|ogg|oga|wav|flac|aac)($|&)").matcher(q).find()) {
                return true;
            }

            // Discord sometimes gives proxy or attachment URLs whose final content type is the
            // only reliable signal. Treat these as preview candidates and verify Content-Type
            // during download. If it is not allowed media, the cache request is rejected.
            return lowerPath.contains("/attachments/")
                    || lowerPath.contains("/ephemeral-attachments/")
                    || lowerPath.startsWith("/external/");
        } catch (RuntimeException ex) {
            return false;
        }
    }


    private String discordCdnCacheKey(String raw) {
        try {
            URI uri = URI.create(normalizeClickUrl(raw));
            String host = uri.getHost() == null ? "" : uri.getHost().toLowerCase(Locale.ROOT);
            String path = uri.getPath() == null ? "" : uri.getPath();
            return host + path;
        } catch (RuntimeException ex) {
            return normalizeClickUrl(raw);
        }
    }

    private String extensionFromUrlPath(String raw) {
        try {
            URI uri = URI.create(normalizeClickUrl(raw));
            String ext = extension(uri.getPath());
            if (!ext.isBlank()) return ext;

            String q = uri.getQuery();
            if (q != null) {
                Matcher m = Pattern.compile("(?i)(^|[&?])format=(png|jpe?g|gif|webp|avif|bmp|mp4|webm|mp3|m4a|ogg|oga|wav|flac|aac)($|&)").matcher(q);
                if (m.find()) {
                    String v = m.group(2).toLowerCase(Locale.ROOT);
                    return "jpeg".equals(v) ? "jpg" : v;
                }
            }
        } catch (RuntimeException ignored) {
        }
        return extension(raw);
    }

    private String extensionFromContentType(String type) {
        if (type == null) return "";
        switch (type.toLowerCase(Locale.ROOT)) {
            case "image/png": return "png";
            case "image/jpeg": return "jpg";
            case "image/gif": return "gif";
            case "image/webp": return "webp";
            case "image/avif": return "avif";
            case "image/bmp": return "bmp";
            case "video/mp4": return "mp4";
            case "video/webm": return "webm";
            case "video/quicktime": return "mov";
            case "audio/mpeg": return "mp3";
            case "audio/mp4": return "m4a";
            case "audio/ogg": return "ogg";
            case "audio/wav": return "wav";
            case "audio/flac": return "flac";
            case "audio/aac": return "aac";
            default: return "";
        }
    }

    private boolean isExternalMediaExtension(String ext) {
        return isImageExtension(ext) || isVideoExtension(ext) || isAudioExtension(ext);
    }

    private boolean isAllowedExternalContentType(String type) {
        if (type == null || type.isBlank()) return false;
        String normalized = type.toLowerCase(Locale.ROOT);
        return normalized.startsWith("image/") || normalized.startsWith("video/") || normalized.startsWith("audio/");
    }


    private boolean canUpload(SessionContext ctx, ConfigValues config) {
        if (ctx == null) return config.uploadAllowGuest;
        if (ctx.account.role == Role.ADMIN) return config.uploadAllowAdmin;
        if (ctx.account.role == Role.MODERATOR) return config.uploadAllowModerator;
        return ctx.account.role.atLeast(Role.USER) && config.uploadAllowUser;
    }

    private Path uploadDir() {
        String dir = plugin.configValues().uploadDirectory;
        if (dir == null || dir.isBlank()) dir = "uploads";
        Path path = Path.of(dir);
        if (!path.isAbsolute()) path = plugin.getDataFolder().toPath().resolve(path);
        return path.normalize();
    }

    private void cleanupOldUploads() {
        ConfigValues config = plugin.configValues();
        if (!config.uploadEnabled || config.uploadRetentionDays <= 0) return;

        Path dir = uploadDir();
        if (!Files.isDirectory(dir)) return;

        long cutoff = System.currentTimeMillis() - (config.uploadRetentionDays * 24L * 60L * 60L * 1000L);
        Set<String> protectedPinnedUploads = config.pinnedPreserveUploads ? protectedPinnedUploadNames() : Collections.emptySet();
        try (java.util.stream.Stream<Path> stream = Files.list(dir)) {
            stream.filter(Files::isRegularFile).forEach(file -> {
                try {
                    if (protectedPinnedUploads.contains(file.getFileName().toString())) return;
                    if (Files.getLastModifiedTime(file).toMillis() < cutoff) {
                        Files.deleteIfExists(file);
                    }
                } catch (IOException ignored) {
                }
            });
        } catch (IOException ex) {
            plugin.getLogger().warning("Failed to cleanup uploaded files: " + ex.getMessage());
        }
    }

    private Set<String> protectedPinnedUploadNames() {
        Set<String> out = new HashSet<>();
        Pattern relativeUpload = Pattern.compile("(?i)(?:^|[\\s<>'\\\"])(/[^\\s<>'\\\"]*/uploads/([A-Za-z0-9._-]+))");
        for (String text : storage.pinnedMessageTexts()) {
            if (text == null || text.isBlank()) continue;
            Matcher urlMatcher = URL_PATTERN.matcher(text);
            while (urlMatcher.find()) {
                String raw = splitUrlTrailing(urlMatcher.group(1))[0];
                String name = uploadNameFromUrl(raw);
                if (!name.isBlank()) out.add(name);
            }
            Matcher relative = relativeUpload.matcher(text);
            while (relative.find()) {
                String name = relative.group(2);
                if (name != null && name.matches("[A-Za-z0-9._-]+")) out.add(name);
            }
        }
        return out;
    }

    private String uploadNameFromUrl(String raw) {
        try {
            URI uri = URI.create(normalizeClickUrl(raw));
            String path = uri.getPath() == null ? "" : uri.getPath();
            int idx = path.lastIndexOf("/uploads/");
            if (idx < 0) return "";
            String name = path.substring(idx + "/uploads/".length());
            int slash = name.indexOf('/');
            if (slash >= 0) name = name.substring(0, slash);
            return name.matches("[A-Za-z0-9._-]+") ? name : "";
        } catch (RuntimeException ex) {
            return "";
        }
    }

    private Set<String> protectedPinnedExternalCacheNames() {
        Set<String> out = new HashSet<>();
        for (String text : storage.pinnedMessageTexts()) {
            if (text == null || text.isBlank()) continue;
            Matcher urlMatcher = URL_PATTERN.matcher(text);
            while (urlMatcher.find()) {
                String raw = splitUrlTrailing(urlMatcher.group(1))[0];
                String url = normalizeClickUrl(raw);
                if (!isDiscordCdnPreviewUrl(url)) continue;
                String ext = extensionFromUrlPath(url);
                if (ext.isBlank()) ext = "bin";
                ext = ext.toLowerCase(Locale.ROOT);
                String cacheKey = discordCdnCacheKey(url);
                out.add("discord-" + SecurityUtil.sha256Hex(cacheKey).substring(0, 32) + "." + ext);
            }
        }
        return out;
    }

    private String publicUploadBaseUrl(HttpExchange ex) {
        String configured = plugin.configValues().uploadPublicBaseUrl;
        String proto = ex.getRequestHeaders().getFirst("X-Forwarded-Proto");
        if (proto == null || proto.isBlank()) proto = "http";

        String host = ex.getRequestHeaders().getFirst("X-Forwarded-Host");
        if (host == null || host.isBlank()) host = ex.getRequestHeaders().getFirst("Host");
        if (host == null || host.isBlank()) host = plugin.configValues().httpHost + ":" + plugin.configValues().httpPort;

        if (configured != null && !configured.isBlank()) {
            configured = configured.trim();
            if (configured.startsWith("http://") || configured.startsWith("https://")) {
                return trimTrailingSlash(configured);
            }
            if (configured.startsWith("//")) {
                return trimTrailingSlash(proto + ":" + configured);
            }
            if (configured.startsWith("/")) {
                // Same-origin path for reverse proxies, e.g. /bmwc/api/uploads.
                // Return the path as-is instead of expanding it to http://host/...
                // so HTTPS deployments do not depend on X-Forwarded-Proto.
                return trimTrailingSlash(configured);
            }
            return trimTrailingSlash("/" + configured);
        }

        return trimTrailingSlash(proto + "://" + host + plugin.configValues().pathPrefix + "/uploads");
    }

    private String trimTrailingSlash(String s) {
        while (s.endsWith("/")) s = s.substring(0, s.length() - 1);
        return s;
    }

    private String sanitizeFileName(String name) {
        if (name == null || name.isBlank()) return "upload.bin";
        name = name.replace("\\", "/");
        int slash = name.lastIndexOf('/');
        if (slash >= 0) name = name.substring(slash + 1);
        name = name.replaceAll("[^A-Za-z0-9가-힣._-]", "_");
        if (name.length() > 96) name = name.substring(name.length() - 96);
        if (name.isBlank() || name.equals(".") || name.equals("..")) return "upload.bin";
        return name;
    }

    private String extension(String name) {
        if (name == null) return "";
        int dot = name.lastIndexOf('.');
        if (dot < 0 || dot == name.length() - 1) return "";
        return name.substring(dot + 1).toLowerCase(Locale.ROOT);
    }

    private boolean isAllowedUploadExtension(String ext, ConfigValues config) {
        if (ext == null || ext.isBlank()) return false;
        ext = ext.toLowerCase(Locale.ROOT);
        if (DANGEROUS_UPLOAD_EXTENSIONS.contains(ext)) return false;
        List<String> allowed = config.uploadAllowedExtensions;
        if (allowed == null || allowed.isEmpty()) return false;
        for (String item : allowed) {
            if (ext.equals(String.valueOf(item).trim().toLowerCase(Locale.ROOT))) return true;
        }
        return false;
    }

    private String uploadMediaType(String ext) {
        if (isImageExtension(ext)) return "image";
        if (isVideoExtension(ext)) return "video";
        return "file";
    }

    private boolean isImageExtension(String ext) {
        return Set.of("png", "jpg", "jpeg", "gif", "webp", "avif", "bmp").contains(ext);
    }

    private boolean isVideoExtension(String ext) {
        return Set.of("mp4", "webm", "mov").contains(ext);
    }

    private boolean isAudioExtension(String ext) {
        return Set.of("mp3", "m4a", "ogg", "oga", "wav", "flac", "aac").contains(ext);
    }

    private boolean isInlineUploadExtension(String ext) {
        return isImageExtension(ext) || isVideoExtension(ext) || isAudioExtension(ext) || "pdf".equals(ext) || "txt".equals(ext);
    }

    private String contentTypeForExtension(String ext) {
        switch (ext == null ? "" : ext.toLowerCase(Locale.ROOT)) {
            case "png": return "image/png";
            case "jpg":
            case "jpeg": return "image/jpeg";
            case "gif": return "image/gif";
            case "webp": return "image/webp";
            case "avif": return "image/avif";
            case "bmp": return "image/bmp";
            case "mp4": return "video/mp4";
            case "webm": return "video/webm";
            case "mov": return "video/quicktime";
            case "mp3": return "audio/mpeg";
            case "m4a": return "audio/mp4";
            case "ogg":
            case "oga": return "audio/ogg";
            case "wav": return "audio/wav";
            case "flac": return "audio/flac";
            case "aac": return "audio/aac";
            case "zip": return "application/zip";
            case "pdf": return "application/pdf";
            case "txt": return "text/plain; charset=utf-8";
            default: return "application/octet-stream";
        }
    }

    private String multipartBoundary(String contentType) {
        if (contentType == null) return null;
        for (String part : contentType.split(";")) {
            part = part.trim();
            if (part.toLowerCase(Locale.ROOT).startsWith("boundary=")) {
                String b = part.substring("boundary=".length()).trim();
                if (b.startsWith("\"") && b.endsWith("\"") && b.length() >= 2) {
                    b = b.substring(1, b.length() - 1);
                }
                return b;
            }
        }
        return null;
    }

    private byte[] readLimitedBytes(InputStream in, long limit) throws IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        byte[] buf = new byte[8192];
        long total = 0;
        int read;
        while ((read = in.read(buf)) != -1) {
            total += read;
            if (limit > 0 && total > limit) throw new UploadTooLargeException();
            out.write(buf, 0, read);
        }
        return out.toByteArray();
    }

    private MultipartData parseMultipart(byte[] body, String boundary) {
        MultipartData result = new MultipartData();
        String text = new String(body, java.nio.charset.StandardCharsets.ISO_8859_1);
        String delimiter = "--" + boundary;
        int pos = 0;

        while (true) {
            int start = text.indexOf(delimiter, pos);
            if (start < 0) break;
            start += delimiter.length();
            if (start < text.length() && text.startsWith("--", start)) break;
            if (text.startsWith("\r\n", start)) start += 2;

            int headerEnd = text.indexOf("\r\n\r\n", start);
            if (headerEnd < 0) break;

            String headers = text.substring(start, headerEnd);
            int dataStart = headerEnd + 4;
            int next = text.indexOf("\r\n" + delimiter, dataStart);
            if (next < 0) next = text.indexOf(delimiter, dataStart);
            if (next < 0) break;

            byte[] data = Arrays.copyOfRange(body, dataStart, next);
            String fieldName = dispositionValue(headers, "name");
            String filename = dispositionValue(headers, "filename");

            if (filename != null && !filename.isBlank()) {
                result.file = new UploadedPart(fieldName, filename, data);
            } else if (fieldName != null) {
                result.fields.put(fieldName, new String(data, StandardCharsets.UTF_8).trim());
            }

            pos = next + 2;
        }

        return result;
    }

    private String dispositionValue(String headers, String key) {
        Pattern p = Pattern.compile("(?i)" + Pattern.quote(key) + "=\"([^\"]*)\"");
        Matcher m = p.matcher(headers);
        return m.find() ? m.group(1) : null;
    }

    private static final class MultipartData {
        final Map<String, String> fields = new LinkedHashMap<>();
        UploadedPart file;
    }

    private static final class UploadedPart {
        final String fieldName;
        final String filename;
        final byte[] data;

        UploadedPart(String fieldName, String filename, byte[] data) {
            this.fieldName = fieldName;
            this.filename = filename;
            this.data = data;
        }
    }

    private static final class UploadTooLargeException extends IOException {
    }

    private void handleCaptcha(HttpExchange ex) throws IOException {
        if (preflight(ex)) return;
        ConfigValues config = plugin.configValues();
        if (!captcha.enabled(config)) {
            sendJson(ex, 200, "{\"ok\":true,\"enabled\":false}");
            return;
        }
        CaptchaManager.Captcha c = captcha.issueMath(config.captchaExpireSeconds);
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("ok", true);
        m.put("enabled", true);
        m.put("id", c.id);
        m.put("question", c.question);
        sendJson(ex, 200, JsonUtil.obj(m));
    }

    private void handleAuthCode(HttpExchange ex) throws IOException {
        if (preflight(ex)) return;
        ConfigValues config = plugin.configValues();
        if (!config.authEnabled) {
            sendJson(ex, 403, "{\"ok\":false,\"error\":\"auth_disabled\"}");
            return;
        }
        String ip = remoteIp(ex);
        if (!rateLimiter.allow("auth-code:" + ip, config.authCodeCooldownSeconds, config.authCodeMaxPerMinute)) {
            sendJson(ex, 429, "{\"ok\":false,\"error\":\"rate_limited\"}");
            return;
        }
        AuthManager.LinkCode c = auth.issueCode();
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("ok", true);
        m.put("code", c.code);
        m.put("poll", c.pollToken);
        m.put("expiresAt", c.expiresAt);
        sendJson(ex, 200, JsonUtil.obj(m));
    }

    private void handleAuthStatus(HttpExchange ex) throws IOException {
        if (preflight(ex)) return;
        Map<String, String> q = JsonUtil.parseQuery(ex.getRequestURI().getRawQuery());
        String json = auth.pollStatusJson(q.get("poll"), remoteIp(ex));
        Map<String, String> result = JsonUtil.parseFlatObject(json);
        if ("true".equalsIgnoreCase(result.get("ok")) && "linked".equalsIgnoreCase(result.get("status"))) {
            String name = result.getOrDefault("username", "");
            if (name == null) name = "";
            plugin.publishAnnouncement("web-login", Map.of("name", name, "player", name));
        }
        sendJson(ex, 200, json);
    }

    private void handleAuthLogin(HttpExchange ex) throws IOException {
        if (preflight(ex)) return;
        Map<String, String> body = JsonUtil.parseFlatObject(JsonUtil.readBody(ex.getRequestBody()));
        String json = auth.login(body.get("username"), body.get("password"), remoteIp(ex));
        Map<String, String> result = JsonUtil.parseFlatObject(json);
        if ("true".equalsIgnoreCase(result.get("ok"))) {
            String name = result.getOrDefault("username", "");
            if (name == null) name = "";
            plugin.publishAnnouncement("web-login", Map.of("name", name, "player", name));
        }
        sendJson(ex, 200, json);
    }

    private void handleSetPassword(HttpExchange ex) throws IOException {
        if (preflight(ex)) return;
        Map<String, String> body = JsonUtil.parseFlatObject(JsonUtil.readBody(ex.getRequestBody()));
        sendJson(ex, 200, auth.setPassword(body.get("token"), body.get("password")));
    }

    private void handleMe(HttpExchange ex) throws IOException {
        if (preflight(ex)) return;
        Map<String, String> q = JsonUtil.parseQuery(ex.getRequestURI().getRawQuery());
        sendJson(ex, 200, auth.me(q.get("token")));
    }

    private void handleLogout(HttpExchange ex) throws IOException {
        if (preflight(ex)) return;
        Map<String, String> body = JsonUtil.parseFlatObject(JsonUtil.readBody(ex.getRequestBody()));
        SessionContext ctx = storage.getSession(body.get("token"));
        boolean ok = storage.revokeSession(body.get("token"));
        if (ok && ctx != null && ctx.account != null) {
            String name = ctx.account.safeUsername();
            if (name == null) name = "";
            plugin.publishAnnouncement("web-logout", Map.of("name", name, "player", name));
        }
        sendJson(ex, 200, "{\"ok\":" + ok + "}");
    }


    private void handleAdminSummary(HttpExchange ex) throws IOException {
        if (preflight(ex)) return;
        SessionContext ctx = requireRole(ex, Role.MODERATOR);
        if (ctx == null) return;
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("ok", true);
        m.put("onlineCount", Bukkit.getOnlinePlayers().size());
        m.put("accountCount", storage.listAccounts().size());
        m.put("sessionCount", storage.listSessions().size());
        m.put("muteCount", plugin.moderationManager().list().size());
        sendJson(ex, 200, JsonUtil.obj(m));
    }

    private void handleAdminOnline(HttpExchange ex) throws IOException {
        if (preflight(ex)) return;
        SessionContext ctx = requireRole(ex, Role.MODERATOR);
        if (ctx == null) return;
        List<String> items = new ArrayList<>();
        for (org.bukkit.entity.Player p : Bukkit.getOnlinePlayers()) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("name", p.getName());
            m.put("displayName", plugin.displayPlayerName(p));
            m.put("uuid", p.getUniqueId().toString());
            items.add(JsonUtil.obj(m));
        }
        sendJson(ex, 200, "{\"ok\":true,\"players\":[" + String.join(",", items) + "]}");
    }

    private void handleAdminSessions(HttpExchange ex) throws IOException {
        if (preflight(ex)) return;
        SessionContext ctx = requireRole(ex, Role.ADMIN);
        if (ctx == null) return;
        storage.cleanupExpiredSessions();
        List<String> items = new ArrayList<>();
        for (SessionContext sc : storage.listSessions()) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("username", sc.account.safeUsername());
            m.put("role", sc.account.role.name());
            m.put("createdAt", sc.session.createdAt);
            m.put("expiresAt", sc.session.expiresAt);
            m.put("lastIp", sc.session.lastIp);
            items.add(JsonUtil.obj(m));
        }
        sendJson(ex, 200, "{\"ok\":true,\"sessions\":[" + String.join(",", items) + "]}");
    }

    private void handleAdminAccounts(HttpExchange ex) throws IOException {
        if (preflight(ex)) return;
        SessionContext ctx = requireRole(ex, Role.ADMIN);
        if (ctx == null) return;
        List<String> items = new ArrayList<>();
        for (Account a : storage.listAccounts()) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("username", a.safeUsername());
            m.put("role", a.role.name());
            m.put("local", a.local);
            m.put("uuid", a.uuid == null ? "" : a.uuid);
            m.put("passwordSet", a.hasPassword());
            m.put("createdAt", a.createdAt);
            m.put("lastLogin", a.lastLogin);
            items.add(JsonUtil.obj(m));
        }
        sendJson(ex, 200, "{\"ok\":true,\"accounts\":[" + String.join(",", items) + "]}");
    }

    private void handleAdminRevoke(HttpExchange ex) throws IOException {
        if (preflight(ex)) return;
        SessionContext ctx = requireRole(ex, Role.ADMIN);
        if (ctx == null) return;
        Map<String, String> body = JsonUtil.parseFlatObject(JsonUtil.readBody(ex.getRequestBody()));
        String username = body.get("username");
        int removed = storage.revokeSessionsForUsername(username);
        sendJson(ex, 200, "{\"ok\":true,\"removed\":" + removed + "}");
    }

    private void handleAdminMutes(HttpExchange ex) throws IOException {
        if (preflight(ex)) return;
        SessionContext ctx = requireRole(ex, Role.MODERATOR);
        if (ctx == null) return;
        if (!plugin.configValues().moderationEnabled) {
            sendJson(ex, 200, "{\"ok\":true,\"mutes\":[]}");
            return;
        }
        List<String> items = new ArrayList<>();
        for (ModerationEntry e : plugin.moderationManager().list()) {
            items.add(JsonUtil.obj(e.toMap()));
        }
        sendJson(ex, 200, "{\"ok\":true,\"mutes\":[" + String.join(",", items) + "]}");
    }

    private void handleAdminMute(HttpExchange ex) throws IOException {
        if (preflight(ex)) return;
        SessionContext ctx = requireRole(ex, Role.MODERATOR);
        if (ctx == null) return;
        if (!plugin.configValues().moderationEnabled) {
            sendJson(ex, 403, "{\"ok\":false,\"error\":\"moderation_disabled\"}");
            return;
        }
        if (!plugin.configValues().allowModeratorGuestMute && !ctx.account.role.atLeast(Role.ADMIN)) {
            sendJson(ex, 403, "{\"ok\":false,\"error\":\"permission_denied\"}");
            return;
        }
        Map<String, String> body = JsonUtil.parseFlatObject(JsonUtil.readBody(ex.getRequestBody()));
        String type = body.getOrDefault("type", "guest");
        String value = body.getOrDefault("value", "");
        long minutes = parseLong(body.get("minutes"), plugin.configValues().defaultMuteMinutes);
        String reason = body.getOrDefault("reason", "");
        if (value.isBlank()) {
            sendJson(ex, 400, "{\"ok\":false,\"error\":\"empty_value\"}");
            return;
        }
        ModerationEntry e = plugin.moderationManager().mute(type, value, minutes, reason, ctx.account.safeUsername());
        sendJson(ex, 200, "{\"ok\":true,\"mute\":" + JsonUtil.obj(e.toMap()) + "}");
    }

    private void handleAdminUnmute(HttpExchange ex) throws IOException {
        if (preflight(ex)) return;
        SessionContext ctx = requireRole(ex, Role.MODERATOR);
        if (ctx == null) return;
        if (!plugin.configValues().moderationEnabled) {
            sendJson(ex, 403, "{\"ok\":false,\"error\":\"moderation_disabled\"}");
            return;
        }
        if (!plugin.configValues().allowModeratorGuestMute && !ctx.account.role.atLeast(Role.ADMIN)) {
            sendJson(ex, 403, "{\"ok\":false,\"error\":\"permission_denied\"}");
            return;
        }
        Map<String, String> body = JsonUtil.parseFlatObject(JsonUtil.readBody(ex.getRequestBody()));
        boolean removed = plugin.moderationManager().unmute(body.getOrDefault("type", "guest"), body.getOrDefault("value", ""));
        sendJson(ex, 200, "{\"ok\":" + removed + "}");
    }

    private void handleAdminDeleteMessage(HttpExchange ex) throws IOException {
        if (preflight(ex)) return;
        SessionContext ctx = requireRole(ex, Role.MODERATOR);
        if (ctx == null) return;
        if (!plugin.configValues().moderationEnabled) {
            sendJson(ex, 403, "{\"ok\":false,\"error\":\"moderation_disabled\"}");
            return;
        }
        if (!plugin.configValues().allowModeratorMessageDelete && !ctx.account.role.atLeast(Role.ADMIN)) {
            sendJson(ex, 403, "{\"ok\":false,\"error\":\"permission_denied\"}");
            return;
        }
        Map<String, String> body = JsonUtil.parseFlatObject(JsonUtil.readBody(ex.getRequestBody()));
        String id = body.get("id");
        boolean ok = false;
        synchronized (history) {
            for (ChatMessage m : history) {
                if (m.id != null && m.id.equals(id)) {
                    m.hidden = true;
                    ok = true;
                    break;
                }
            }
        }
        if (ok) {
            savePersistedHistory();
            broadcastEvent("delete", "{\"id\":" + JsonUtil.quote(id) + "}");
        }
        sendJson(ex, 200, "{\"ok\":" + ok + "}");
    }

    private void handleAdminPinMessage(HttpExchange ex) throws IOException {
        if (preflight(ex)) return;
        SessionContext ctx = requireRole(ex, Role.MODERATOR);
        if (ctx == null) return;
        ConfigValues config = plugin.configValues();
        if (!config.pinnedEnabled) {
            sendJson(ex, 403, "{\"ok\":false,\"error\":\"pinned_disabled\"}");
            return;
        }
        Map<String, String> body = JsonUtil.parseFlatObject(JsonUtil.readBody(ex.getRequestBody()));
        String id = body.get("id");
        ChatMessage found = null;
        synchronized (history) {
            for (ChatMessage m : history) {
                if (m.id != null && m.id.equals(id) && !m.hidden) {
                    found = m;
                    break;
                }
            }
        }
        if (found == null) {
            sendJson(ex, 404, "{\"ok\":false,\"error\":\"message_not_found\"}");
            return;
        }
        PinnedMessage pin = storage.pinMessage(found, ctx.account.safeUsername(), config.pinnedMaxPins);
        if (pin == null) {
            sendJson(ex, 409, "{\"ok\":false,\"error\":\"pin_limit_reached\"}");
            return;
        }
        broadcastPinsChanged();
        sendJson(ex, 200, "{\"ok\":true,\"pin\":" + pin.toJson() + "}");
    }

    private void handleAdminUnpinMessage(HttpExchange ex) throws IOException {
        if (preflight(ex)) return;
        SessionContext ctx = requireRole(ex, Role.MODERATOR);
        if (ctx == null) return;
        Map<String, String> body = JsonUtil.parseFlatObject(JsonUtil.readBody(ex.getRequestBody()));
        String pinId = body.get("pinId");
        boolean ok = storage.unpinMessage(pinId);
        if (ok) broadcastPinsChanged();
        sendJson(ex, 200, "{\"ok\":" + ok + "}");
    }

    private void handleAdminClearHistory(HttpExchange ex) throws IOException {
        if (preflight(ex)) return;
        SessionContext ctx = requireRole(ex, Role.ADMIN);
        if (ctx == null) return;
        synchronized (history) {
            history.clear();
        }
        savePersistedHistory();
        broadcastEvent("clear", "{\"ok\":true}");
        sendJson(ex, 200, "{\"ok\":true}");
    }

    private SessionContext requireRole(HttpExchange ex, Role role) throws IOException {
        Map<String, String> q = JsonUtil.parseQuery(ex.getRequestURI().getRawQuery());
        String token = q.get("token");
        if (token == null || token.isBlank()) {
            Map<String, String> body = new LinkedHashMap<>();
            if ("POST".equalsIgnoreCase(ex.getRequestMethod())) {
                body = JsonUtil.parseFlatObject(JsonUtil.readBody(ex.getRequestBody()));
            }
            token = body.get("token");
            ex.setAttribute("parsedBody", body);
        }
        SessionContext ctx = storage.getSession(token);
        if (ctx == null || !ctx.account.role.atLeast(role)) {
            sendJson(ex, 403, "{\"ok\":false,\"error\":\"permission_denied\"}");
            return null;
        }
        if (!plugin.configValues().allowWebAdminPanel) {
            sendJson(ex, 403, "{\"ok\":false,\"error\":\"admin_panel_disabled\"}");
            return null;
        }
        return ctx;
    }

    private long parseLong(String value, long fallback) {
        try {
            return value == null ? fallback : Long.parseLong(value.trim());
        } catch (NumberFormatException ex) {
            return fallback;
        }
    }

    private void sendToGame(ChatMessage msg, String format) {
        ConfigValues config = plugin.configValues();
        if (!config.sendWebChatToGame) return;

        // Translate color/format codes only in the configured template, not in user text.
        // This keeps user-provided literals such as "&n", "&l", "&a" intact when relayed to game chat.
        String template = ChatColor.translateAlternateColorCodes('&', format);
        String line = template
                .replace("{player}", msg.sender)
                .replace("{guest}", msg.sender)
                .replace("{message}", msg.message);

        final String finalLine = line;
        Bukkit.getScheduler().runTask(plugin, () -> {
            if (config.clickableUrlsInGame && containsUrl(finalLine)) {
                broadcastClickableLine(finalLine);
            } else {
                Bukkit.broadcastMessage(finalLine);
            }
        });
    }

    private boolean containsUrl(String line) {
        return line != null && URL_PATTERN.matcher(line).find();
    }

    private void broadcastClickableLine(String line) {
        try {
            TextComponent component = buildClickableLine(line);
            for (Player player : Bukkit.getOnlinePlayers()) {
                player.spigot().sendMessage(component);
            }
            if (Bukkit.getConsoleSender() != null) {
                Bukkit.getConsoleSender().sendMessage(line);
            }
        } catch (Throwable t) {
            plugin.getLogger().warning("Clickable URL chat failed; falling back to plain broadcast: " + t.getMessage());
            Bukkit.broadcastMessage(line);
        }
    }

    private TextComponent buildClickableLine(String line) {
        TextComponent root = new TextComponent("");
        Matcher matcher = URL_PATTERN.matcher(line);
        int last = 0;
        while (matcher.find()) {
            addLegacyExtra(root, line.substring(last, matcher.start()));

            String raw = matcher.group(1);
            String[] split = splitUrlTrailing(raw);
            String url = split[0];
            String trailing = split[1];

            if (!url.isBlank()) {
                String clickUrl = normalizeClickUrl(url);
                BaseComponent[] parts = TextComponent.fromLegacyText(url);
                for (BaseComponent part : parts) {
                    part.setClickEvent(new ClickEvent(ClickEvent.Action.OPEN_URL, clickUrl));
                    root.addExtra(part);
                }
            }
            if (!trailing.isBlank()) {
                addLegacyExtra(root, trailing);
            }
            last = matcher.end();
        }
        addLegacyExtra(root, line.substring(last));
        return root;
    }

    private void addLegacyExtra(TextComponent root, String text) {
        if (text == null || text.isEmpty()) return;
        for (BaseComponent part : TextComponent.fromLegacyText(text)) {
            root.addExtra(part);
        }
    }

    private String normalizeClickUrl(String url) {
        return url.toLowerCase(Locale.ROOT).startsWith("http://") || url.toLowerCase(Locale.ROOT).startsWith("https://")
                ? url
                : "https://" + url;
    }

    private String[] splitUrlTrailing(String raw) {
        String url = raw == null ? "" : raw;
        StringBuilder trailing = new StringBuilder();
        while (!url.isEmpty()) {
            char ch = url.charAt(url.length() - 1);
            if (ch == '.' || ch == ',' || ch == '!' || ch == '?' || ch == ';' || ch == ':'
                    || ch == ')' || ch == ']' || ch == '}') {
                trailing.insert(0, ch);
                url = url.substring(0, url.length() - 1);
            } else {
                break;
            }
        }
        return new String[]{url, trailing.toString()};
    }

    private void addHistory(ChatMessage msg) {
        boolean pruned;
        synchronized (history) {
            history.addLast(msg);
            pruned = pruneHistoryLocked();
        }

        ConfigValues config = plugin.configValues();
        if (config.historyPersist) {
            if (pruned || config.historySize > 0 || config.historyRetentionDays > 0) {
                savePersistedHistory();
            } else {
                appendPersistedHistory(msg);
            }
        }
    }

    private long retentionCutoffMillis(int retentionDays) {
        if (retentionDays <= 0) return Long.MIN_VALUE;
        return System.currentTimeMillis() - (retentionDays * 24L * 60L * 60L * 1000L);
    }

    private boolean isOlderThan(ChatMessage msg, long cutoff) {
        return msg != null && cutoff != Long.MIN_VALUE && msg.time < cutoff;
    }

    private boolean pruneHistoryLocked() {
        ConfigValues config = plugin.configValues();
        boolean changed = false;

        if (config.historyRetentionDays > 0) {
            long cutoff = retentionCutoffMillis(config.historyRetentionDays);
            while (!history.isEmpty() && history.peekFirst().time < cutoff) {
                history.removeFirst();
                changed = true;
            }
        }

        // history-size: 0 means unlimited by count.
        if (config.historySize > 0) {
            while (history.size() > config.historySize) {
                history.removeFirst();
                changed = true;
            }
        }

        return changed;
    }

    private Path historyPath() {
        ConfigValues config = plugin.configValues();
        String file = config.historyFile == null || config.historyFile.isBlank()
                ? "history.jsonl"
                : config.historyFile.trim();
        Path path = Path.of(file);
        if (!path.isAbsolute()) {
            path = plugin.getDataFolder().toPath().resolve(path);
        }
        return path.normalize();
    }

    private void loadPersistedHistory() {
        ConfigValues config = plugin.configValues();
        if (!config.historyPersist) return;

        Path path = historyPath();
        if (!Files.exists(path)) return;

        int loaded = 0;
        int skippedExpired = 0;
        long persistCutoff = retentionCutoffMillis(config.historyPersistRetentionDays);
        synchronized (history) {
            history.clear();
            try {
                for (String line : Files.readAllLines(path, StandardCharsets.UTF_8)) {
                    if (line == null || line.isBlank()) continue;
                    ChatMessage msg = ChatMessage.fromMap(JsonUtil.parseFlatObject(line));
                    if (msg.message == null || msg.message.isBlank()) continue;
                    if (isOlderThan(msg, persistCutoff)) {
                        skippedExpired++;
                        continue;
                    }
                    history.addLast(msg);
                    loaded++;
                }
                pruneHistoryLocked();
            } catch (IOException ex) {
                plugin.getLogger().warning("Failed to load chat history file " + path + ": " + ex.getMessage());
            }
        }
        savePersistedHistory();
        plugin.getLogger().info("Loaded " + loaded + " persisted web chat history messages" + (skippedExpired > 0 ? " and pruned " + skippedExpired + " expired persisted messages." : "."));
    }

    private void appendPersistedHistory(ChatMessage msg) {
        ConfigValues config = plugin.configValues();
        if (!config.historyPersist) return;
        Path path = historyPath();
        try {
            Files.createDirectories(path.getParent());
            Files.writeString(path, msg.toPersistJson() + System.lineSeparator(), StandardCharsets.UTF_8,
                    StandardOpenOption.CREATE, StandardOpenOption.APPEND);
        } catch (IOException ex) {
            plugin.getLogger().warning("Failed to append chat history file " + path + ": " + ex.getMessage());
        }
    }

    private void savePersistedHistory() {
        ConfigValues config = plugin.configValues();
        if (!config.historyPersist) return;

        Path path = historyPath();
        StringBuilder sb = new StringBuilder();
        long persistCutoff = retentionCutoffMillis(config.historyPersistRetentionDays);
        synchronized (history) {
            pruneHistoryLocked();
            for (ChatMessage msg : history) {
                if (isOlderThan(msg, persistCutoff)) continue;
                sb.append(msg.toPersistJson()).append(System.lineSeparator());
            }
        }

        try {
            Files.createDirectories(path.getParent());
            Files.writeString(path, sb.toString(), StandardCharsets.UTF_8,
                    StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING, StandardOpenOption.WRITE);
        } catch (IOException ex) {
            plugin.getLogger().warning("Failed to save chat history file " + path + ": " + ex.getMessage());
        }
    }

    private void broadcastPinsChanged() {
        List<String> items = new ArrayList<>();
        if (plugin.configValues().pinnedEnabled) {
            for (PinnedMessage pin : storage.listPinnedMessages()) {
                items.add(pin.toJson());
            }
        }
        broadcastEvent("pins", "{\"ok\":true,\"pins\":[" + String.join(",", items) + "]}");
    }

    private void broadcast(ChatMessage msg) {
        broadcastEvent("chat", msg.toJson());
    }

    private void broadcastEvent(String event, String json) {
        String data = "event: " + event + "\ndata: " + json + "\n\n";
        for (SseClient client : new ArrayList<>(clients)) {
            try {
                client.sendRaw(data);
            } catch (IOException ex) {
                clients.remove(client);
                client.close();
            }
        }
    }

    private boolean isGuestNameAllowed(String name) {
        String n = name.trim().toLowerCase(Locale.ROOT);
        for (String blocked : plugin.configValues().guestBlockedNames) {
            if (blocked != null && n.equals(blocked.trim().toLowerCase(Locale.ROOT))) {
                return false;
            }
        }
        if (plugin.configValues().guestBlockPlayerNameSpoofing) {
            for (org.bukkit.OfflinePlayer p : Bukkit.getOfflinePlayers()) {
                if (p.getName() != null && n.equals(p.getName().toLowerCase(Locale.ROOT))) {
                    return false;
                }
            }
        }
        return true;
    }

    private String sanitizeGuestName(String name) {
        if (name == null) return "";
        name = name.trim();
        ConfigValues config = plugin.configValues();
        if (!config.guestAllowCustomName) {
            return sanitizeGeneratedGuestName(name);
        }
        name = name.replaceAll("[^A-Za-z0-9가-힣_\\-]", "");
        if (name.length() > 16) name = name.substring(0, 16);
        return name;
    }

    private String safeGuestNamePrefix() {
        String prefix = plugin.configValues().guestNamePrefix;
        if (prefix == null || prefix.isBlank()) prefix = "Guest-";
        prefix = prefix.replaceAll("[^A-Za-z0-9가-힣_\\-]", "");
        return prefix.isBlank() ? "Guest-" : prefix;
    }

    private String sanitizeGeneratedGuestName(String name) {
        if (name == null) return "";
        String prefix = safeGuestNamePrefix();
        name = name.trim().replaceAll("[^A-Za-z0-9가-힣_\\-]", "");
        if (!name.startsWith(prefix)) return "";
        String suffix = name.substring(prefix.length());
        if (!suffix.matches("\\d{4,8}")) return "";
        return prefix + suffix;
    }

    private String generatedGuestNameForIp(String ip) {
        String prefix = safeGuestNamePrefix();
        String seed = ip == null ? "" : ip;
        int number = 1000 + Math.floorMod(seed.hashCode(), 9000);
        return prefix + number;
    }

    private int boundedInt(String raw, int fallback, int min, int max) {
        int value = fallback;
        try {
            if (raw != null && !raw.isBlank()) value = Integer.parseInt(raw.trim());
        } catch (NumberFormatException ignored) {
        }
        if (value < min) value = min;
        if (max > 0 && value > max) value = max;
        return value;
    }

    private int effectiveInputLengthLimit(ConfigValues c) {
        if (c == null) return 120;
        if (c.maxMessageLength <= 0 || c.maxUrlMessageLength <= 0) return 0;
        return Math.max(c.maxMessageLength, c.maxUrlMessageLength);
    }

    private String stripChatMessage(String s, ConfigValues config) {
        int max = effectiveMessageLengthLimit(s, config);
        return stripControl(s, max);
    }

    private int effectiveMessageLengthLimit(String s, ConfigValues config) {
        if (config == null) return 120;
        if (s != null && URL_PATTERN.matcher(s).find()) {
            if (config.maxUrlMessageLength <= 0) return 0;
            if (config.maxMessageLength <= 0) return config.maxUrlMessageLength;
            return Math.max(config.maxMessageLength, config.maxUrlMessageLength);
        }
        return Math.max(0, config.maxMessageLength);
    }

    private String stripControl(String s, int maxLen) {
        if (s == null) return "";
        s = s.replaceAll("[\\p{Cntrl}&&[^\n\t]]", "").replace('\n', ' ').replace('\r', ' ').trim();
        if (maxLen > 0 && s.length() > maxLen) {
            s = s.substring(0, maxLen);
        }
        return s;
    }

    private boolean preflight(HttpExchange ex) throws IOException {
        addCors(ex);
        if ("OPTIONS".equalsIgnoreCase(ex.getRequestMethod())) {
            ex.sendResponseHeaders(204, -1);
            ex.close();
            return true;
        }
        return false;
    }

    private void sendJson(HttpExchange ex, int status, String json) throws IOException {
        addCors(ex);
        addSecurityHeaders(ex);
        byte[] data = json.getBytes(StandardCharsets.UTF_8);
        ex.getResponseHeaders().set("Content-Type", "application/json; charset=utf-8");
        ex.sendResponseHeaders(status, data.length);
        try (OutputStream os = ex.getResponseBody()) {
            os.write(data);
        }
    }

    private void sendBytes(HttpExchange ex, int status, String contentType, byte[] data) throws IOException {
        addCors(ex);
        addSecurityHeaders(ex);
        ex.getResponseHeaders().set("Content-Type", contentType);
        ex.getResponseHeaders().set("Cache-Control", "no-cache");
        ex.sendResponseHeaders(status, data.length);
        try (OutputStream os = ex.getResponseBody()) {
            os.write(data);
        }
    }

    private static String htmlEsc(String s) {
        return String.valueOf(s == null ? "" : s)
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&#039;");
    }

    private void addSecurityHeaders(HttpExchange ex) {
        Headers h = ex.getResponseHeaders();
        h.set("X-Content-Type-Options", "nosniff");
        h.set("Referrer-Policy", "no-referrer");
        h.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=()");
    }

    private void addCors(HttpExchange ex) {
        Headers h = ex.getResponseHeaders();
        h.set("Access-Control-Allow-Origin", plugin.configValues().corsOrigin);
        h.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        h.set("Access-Control-Allow-Headers", "Content-Type");
    }

    private String remoteIp(HttpExchange ex) {
        String actual = socketRemoteIp(ex);
        ConfigValues config = plugin.configValues();
        String fwd = ex.getRequestHeaders().getFirst("X-Forwarded-For");
        boolean trustedProxy = IpAddressMatcher.matchesAny(actual, config.trustedProxies);
        String resolved = actual;

        if (trustedProxy && fwd != null && !fwd.isBlank()) {
            String first = IpAddressMatcher.normalizeIpLiteral(fwd.split(",", 2)[0]);
            if (IpAddressMatcher.isValidAddress(first)) resolved = first;
        }

        if (config.logClientIpResolution) {
            plugin.getLogger().info("Client IP resolved: socket=" + actual
                    + ", trustedProxy=" + trustedProxy
                    + ", xForwardedFor=" + (fwd == null ? "" : fwd)
                    + ", result=" + resolved
                    + ", path=" + ex.getRequestURI().getPath());
        }
        return resolved;
    }

    private String socketRemoteIp(HttpExchange ex) {
        return ex.getRemoteAddress() == null || ex.getRemoteAddress().getAddress() == null
                ? ""
                : ex.getRemoteAddress().getAddress().getHostAddress();
    }

    private static final class SseClient {
        private final OutputStream out;
        private final String ip;
        private volatile boolean open = true;

        private SseClient(OutputStream out, String ip) {
            this.out = out;
            this.ip = ip == null ? "" : ip;
        }

        synchronized void sendRaw(String s) throws IOException {
            if (!open) throw new IOException("closed");
            out.write(s.getBytes(StandardCharsets.UTF_8));
            out.flush();
        }

        void close() {
            open = false;
            try {
                out.close();
            } catch (IOException ignored) {}
        }
    }
}
