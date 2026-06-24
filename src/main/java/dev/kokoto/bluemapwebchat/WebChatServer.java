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
import javax.imageio.ImageIO;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.math.BigInteger;
import java.security.MessageDigest;
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
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;
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
    private static final Pattern EMOJI_TOKEN_PATTERN = Pattern.compile("(?<![A-Za-z0-9+.-]):(?:emoji:)?([^:\\s\\r\\n]{1,200}):");
    private static final Pattern IMAGEEMOJIS_ALIAS_TOKEN_PATTERN = Pattern.compile(":([^:/\\r\\n]{1,128}):");
    private static final Set<String> DANGEROUS_UPLOAD_EXTENSIONS = Set.of(
            "exe", "msi", "bat", "cmd", "com", "scr", "ps1", "vbs",
            "sh", "bash", "jar", "war", "class",
            "php", "phtml", "asp", "aspx", "jsp",
            "html", "htm", "js", "mjs", "css", "svg"
    );

    private HttpServer server;
    private ExecutorService executor;
    private volatile boolean running;
    private volatile ImageEmojisFontCache imageEmojisFontCache;

    private static class ImageEmojisFontCache {
        final Path path;
        final long modifiedAt;
        final long size;
        final Map<String, String> symbols;

        ImageEmojisFontCache(Path path, long modifiedAt, long size, Map<String, String> symbols) {
            this.path = path;
            this.modifiedAt = modifiedAt;
            this.size = size;
            this.symbols = symbols == null ? Map.of() : symbols;
        }
    }

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

        if (config.standaloneWebEnabled) {
            for (String standalonePath : standaloneContextPaths(config)) {
                server.createContext(standalonePath, this::handleStandaloneWeb);
            }
        }
        for (String apiPrefix : apiContextPrefixes(config)) {
            createApiContexts(apiPrefix);
        }

        loadPersistedHistory();
        cleanupOldUploads();
        cleanupOldExternalMediaCache();
        syncExistingImageEmojisPngSidecarsOnStartup();

        running = true;
        server.start();
        plugin.getLogger().info("HTTP chat server started on " + config.httpHost + ":" + config.httpPort + config.pathPrefix);
    }

    private void createApiContexts(String p) {
        server.createContext(p + "/config", this::handleConfig);
        server.createContext(p + "/lang", this::handleLang);
        server.createContext(p + "/history", this::handleHistory);
        server.createContext(p + "/history/around", this::handleHistoryAround);
        server.createContext(p + "/pins", this::handlePins);
        server.createContext(p + "/stream", this::handleStream);
        server.createContext(p + "/send", this::handleSend);
        server.createContext(p + "/commands", this::handleCommands);
        server.createContext(p + "/commands/run", this::handleCommandRun);
        server.createContext(p + "/upload", this::handleUpload);
        server.createContext(p + "/emojis", this::handleEmojis);
        server.createContext(p + "/e", this::handleShortEmoji);
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
        server.createContext(p + "/admin/emojis", this::handleAdminEmojis);
        server.createContext(p + "/admin/emojis/create-pack", this::handleAdminEmojiCreatePack);
        server.createContext(p + "/admin/emojis/upload", this::handleAdminEmojiUpload);
        server.createContext(p + "/admin/emojis/delete", this::handleAdminEmojiDelete);
        server.createContext(p + "/admin/emojis/rename", this::handleAdminEmojiRename);
    }

    private Set<String> apiContextPrefixes(ConfigValues config) {
        Set<String> out = new LinkedHashSet<>();
        String internalPrefix = normalizeContextPrefix(config.pathPrefix, "/api");
        out.add(internalPrefix);
        addApiContextPrefix(out, config, config.apiBaseUrl);
        addApiContextPrefix(out, config, config.standaloneWebApiBaseUrl);
        addApiContextPrefix(out, config, config.uploadPublicBaseUrl);
        addApiContextPrefix(out, config, config.emojiPublicBaseUrl);
        return out;
    }

    private void addApiContextPrefix(Set<String> out, ConfigValues config, String configured) {
        String prefix = apiContextPrefixFromConfigured(config, configured);
        if (!prefix.isBlank()) out.add(prefix);
    }

    private Set<String> standaloneContextPaths(ConfigValues config) {
        Set<String> out = new LinkedHashSet<>();
        String standalonePath = normalizeContextPrefix(config.standaloneWebPath, "/chat");
        out.add(standalonePath);

        String internalApiPrefix = normalizeContextPrefix(config.pathPrefix, "/api");
        for (String apiPrefix : apiContextPrefixes(config)) {
            if (apiPrefix.equals(internalApiPrefix) || !apiPrefix.endsWith(internalApiPrefix)) continue;
            String publicPrefix = trimTrailingSlash(apiPrefix.substring(0, apiPrefix.length() - internalApiPrefix.length()));
            if (publicPrefix.isBlank()) continue;
            if (standalonePath.equals(publicPrefix) || standalonePath.startsWith(publicPrefix + "/")) continue;
            out.add(normalizeContextPrefix(publicPrefix + standalonePath, standalonePath));
        }
        return out;
    }

    private String matchingStandaloneContextPath(ConfigValues config, String path) {
        for (String base : standaloneContextPaths(config)) {
            if (path.equals(base) || path.startsWith(base + "/")) return base;
        }
        return "";
    }

    private String matchingApiContextPrefix(ConfigValues config, String path) {
        String best = "";
        for (String prefix : apiContextPrefixes(config)) {
            if ((path.equals(prefix) || path.startsWith(prefix + "/")) && prefix.length() > best.length()) {
                best = prefix;
            }
        }
        return best.isBlank() ? normalizeContextPrefix(config.pathPrefix, "/api") : best;
    }

    private String apiContextPrefixFromConfigured(ConfigValues config, String configured) {
        String path = pathFromConfiguredPublicUrl(configured);
        if (path.isBlank()) return "";
        path = stripKnownResourceSuffix(trimTrailingSlash(path));
        String internalPrefix = normalizeContextPrefix(config.pathPrefix, "/api");
        if (path.equals(internalPrefix) || path.endsWith(internalPrefix) || path.equals("/api") || path.endsWith("/api")) {
            return normalizeContextPrefix(path, internalPrefix);
        }
        return "";
    }

    private String pathFromConfiguredPublicUrl(String configured) {
        String value = String.valueOf(configured == null ? "" : configured).trim();
        if (value.isBlank()) return "";
        try {
            URI uri = URI.create(value);
            if (uri.getScheme() != null || value.startsWith("//")) {
                String path = uri.getPath();
                return path == null ? "" : path;
            }
        } catch (IllegalArgumentException ignored) {
        }
        if (!value.startsWith("/")) value = "/" + value;
        int query = value.indexOf('?');
        if (query >= 0) value = value.substring(0, query);
        int hash = value.indexOf('#');
        if (hash >= 0) value = value.substring(0, hash);
        return value;
    }

    private String stripKnownResourceSuffix(String path) {
        String out = trimTrailingSlash(String.valueOf(path == null ? "" : path));
        for (String suffix : new String[]{"/uploads", "/emojis", "/external-media", "/fonts"}) {
            if (out.equals(suffix) || out.endsWith(suffix)) {
                return trimTrailingSlash(out.substring(0, out.length() - suffix.length()));
            }
        }
        return out;
    }

    private String normalizeContextPrefix(String value, String fallback) {
        String out = String.valueOf(value == null || value.isBlank() ? fallback : value).trim();
        if (!out.startsWith("/")) out = "/" + out;
        out = trimTrailingSlash(out);
        return out.isBlank() ? fallback : out;
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
        String path = ex.getRequestURI().getPath();
        String base = matchingStandaloneContextPath(config, path);
        if (base.isBlank()) {
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
        String webAddonApiBase = config.apiBaseUrl == null ? "" : config.apiBaseUrl.trim();
        String apiBaseJs;
        if (!apiBase.isEmpty()) {
            String resolved = stripKnownResourceSuffix(normalizePublicBaseUrl(ex, apiBase));
            apiBaseJs = JsonUtil.quote(resolved);
        } else if (!webAddonApiBase.isEmpty()) {
            // Empty standalone-web.api-base-url follows web-addon.api-base-url.
            String resolved = stripKnownResourceSuffix(normalizePublicBaseUrl(ex, webAddonApiBase));
            apiBaseJs = JsonUtil.quote(resolved);
        } else {
            String inferred = inferPublicStandaloneApiBasePath(ex, config);
            if (!inferred.isBlank()) {
                apiBaseJs = JsonUtil.quote(inferred);
            } else {
                String directApiBase = "location.origin + " + JsonUtil.quote(config.pathPrefix);
                // Fallback for unusual standalone paths. Direct HTTP /chat uses /api;
                // proxied /bmwc/chat infers /bmwc/api from the current path.
                apiBaseJs = "(function(){"
                        + "function clean(v){v=String(v||'').trim();if(!v)return '';v=v.replace(/\\/+$/,'');v=v.replace(/\\/(?:uploads|emojis)$/i,'');return v;}"
                        + "function slash(v){v=String(v||'').trim();if(!v)return '';return v.charAt(0)==='/'?v:'/'+v;}"
                        + "function samePath(a,b){return String(a||'').replace(/\\/+$/,'')===String(b||'').replace(/\\/+$/,'');}"
                        + "var standalonePath=slash(" + JsonUtil.quote(config.standaloneWebPath) + ");"
                        + "var apiPath=slash(" + JsonUtil.quote(config.pathPrefix) + ");"
                        + "var directBase=" + directApiBase + ";"
                        + "var path=location.pathname||'';"
                        + "if(samePath(path,standalonePath)||path.indexOf(standalonePath+'/')===0)return clean(directBase);"
                        + "var prefix=path;"
                        + "if(standalonePath&&path.endsWith(standalonePath))prefix=path.slice(0,path.length-standalonePath.length);"
                        + "else{var idx=path.lastIndexOf('/');prefix=idx>=0?path.slice(0,idx):'';}"
                        + "return clean(location.origin + slash(prefix).replace(/\\/+$/,'') + apiPath);"
                        + "})()";
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
                + "  <script>window.BlueMapWebChatConfig={apiBase:" + apiBaseJs + ",apiBaseUrl:" + apiBaseJs + ",standalone:true,standalonePath:" + JsonUtil.quote(config.standaloneWebPath) + "};</script>\n"
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
        String normalizedMessage = normalizeGameEmojiForWeb(message, config);
        String text = stripChatMessage(normalizedMessage, config);
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
        m.put("socialEmbedsEnabled", c.socialEmbedsEnabled);
        m.put("socialEmbedsClickToLoad", c.socialEmbedsClickToLoad);
        m.put("socialEmbedsMaxPerMessage", c.socialEmbedsMaxPerMessage);
        m.put("tiktokEmbedEnabled", c.tiktokEmbedEnabled);
        m.put("xEmbedEnabled", c.xEmbedEnabled);
        m.put("xEmbedTheme", c.xEmbedTheme);
        m.put("xEmbedDnt", c.xEmbedDnt);
        m.put("xEmbedHideMedia", c.xEmbedHideMedia);
        m.put("xEmbedHideThread", c.xEmbedHideThread);
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

        m.put("emojiEnabled", c.emojiEnabled);
        m.put("emojiShowButton", c.emojiShowButton);
        m.put("emojiRenderSizePx", c.emojiRenderSizePx);
        m.put("emojiPickerSizePx", c.emojiPickerSizePx);
        m.put("emojiMessageTokenLimit", c.emojiMessageTokenLimit);
        m.put("emojiTokenFormat", c.emojiTokenFormat == null ? "short" : c.emojiTokenFormat);
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
        String after = q.get("after");
        if (after != null && after.isBlank()) after = null;

        List<ChatMessage> page = new ArrayList<>();
        boolean hasBefore;
        boolean hasAfter;
        String oldestId = "";
        String newestId = "";

        boolean pruned;
        synchronized (history) {
            pruned = pruneHistoryLocked();
            List<ChatMessage> all = new ArrayList<>(history);

            int startIndex;
            int endIndex;
            if (after != null) {
                startIndex = all.size();
                for (int i = 0; i < all.size(); i++) {
                    if (after.equals(all.get(i).id)) {
                        startIndex = i + 1;
                        break;
                    }
                }
                endIndex = limit <= 0 ? all.size() : Math.min(all.size(), startIndex + limit);
            } else {
                endIndex = all.size();
                if (before != null) {
                    for (int i = all.size() - 1; i >= 0; i--) {
                        if (before.equals(all.get(i).id)) {
                            endIndex = i;
                            break;
                        }
                    }
                }
                startIndex = limit <= 0 ? 0 : Math.max(0, endIndex - limit);
            }

            startIndex = Math.max(0, Math.min(startIndex, all.size()));
            endIndex = Math.max(startIndex, Math.min(endIndex, all.size()));
            for (int i = startIndex; i < endIndex; i++) {
                page.add(all.get(i));
            }

            hasBefore = startIndex > 0;
            hasAfter = endIndex < all.size();
            if (!page.isEmpty()) {
                oldestId = page.get(0).id;
                newestId = page.get(page.size() - 1).id;
            }
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
        res.put("hasMore", hasBefore);
        res.put("hasBefore", hasBefore);
        res.put("hasAfter", hasAfter);
        res.put("oldestId", oldestId);
        res.put("newestId", newestId);

        // messages are already JSON strings, so build this response manually.
        sendJson(ex, 200, "{\"ok\":true,\"messages\":[" + String.join(",", items) + "]"
                + ",\"hasMore\":" + hasBefore
                + ",\"hasBefore\":" + hasBefore
                + ",\"hasAfter\":" + hasAfter
                + ",\"oldestId\":" + JsonUtil.quote(oldestId)
                + ",\"newestId\":" + JsonUtil.quote(newestId)
                + "}");
    }

    private void handleHistoryAround(HttpExchange ex) throws IOException {
        if (preflight(ex)) return;
        if (!"GET".equalsIgnoreCase(ex.getRequestMethod())) {
            sendJson(ex, 405, "{\"ok\":false,\"error\":\"method_not_allowed\"}");
            return;
        }

        ConfigValues config = plugin.configValues();
        Map<String, String> q = JsonUtil.parseQuery(ex.getRequestURI().getRawQuery());
        String targetId = stripControl(q.get("id"), 96);
        if (targetId.isBlank()) {
            sendJson(ex, 400, "{\"ok\":false,\"error\":\"missing_id\"}");
            return;
        }

        int before = boundedInt(q.get("before"), 40, 0, 200);
        int after = boundedInt(q.get("after"), 40, 0, 200);
        AroundHistoryResult around = findHistoryAround(targetId, before, after);
        if (around.pruned && config.historyPersist) {
            savePersistedHistory();
        }
        if (around.targetIndex < 0) {
            sendJson(ex, 404, "{\"ok\":false,\"error\":\"not_found\",\"targetId\":" + JsonUtil.quote(targetId) + "}");
            return;
        }

        List<String> items = new ArrayList<>();
        for (ChatMessage m : around.messages) {
            items.add(m.toJson());
        }
        String oldestId = around.messages.isEmpty() ? "" : around.messages.get(0).id;
        String newestId = around.messages.isEmpty() ? "" : around.messages.get(around.messages.size() - 1).id;
        sendJson(ex, 200, "{\"ok\":true"
                + ",\"targetId\":" + JsonUtil.quote(targetId)
                + ",\"messages\":[" + String.join(",", items) + "]"
                + ",\"hasBefore\":" + around.hasBefore
                + ",\"hasAfter\":" + around.hasAfter
                + ",\"oldestId\":" + JsonUtil.quote(oldestId)
                + ",\"newestId\":" + JsonUtil.quote(newestId)
                + "}");
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
        String replyToId = body.get("replyToId");
        String replyToSender = body.get("replyToSender");
        String replyToPreview = body.get("replyToPreview");
        if (ctx != null) {
            handleUserSend(ex, ctx, message, replyToId, replyToSender, replyToPreview);
            return;
        }

        handleGuestSend(ex, body, ip, message, replyToId, replyToSender, replyToPreview);
    }


    private boolean emojiTokenLimitExceeded(String message, ConfigValues config) {
        if (config == null || !config.emojiEnabled || config.emojiMessageTokenLimit <= 0) return false;
        EmojiCatalog catalog = scanEmojiCatalog(config);
        Map<String, EmojiItem> emojiById = new HashMap<>();
        for (EmojiItem item : catalog.items) {
            emojiById.put(item.id, item);
        }
        Map<String, String> aliasToId = emojiAliasToWebId(catalog, config);
        int count = 0;
        Matcher matcher = EMOJI_TOKEN_PATTERN.matcher(String.valueOf(message == null ? "" : message));
        while (matcher.find()) {
            if (emojiItemForToken(matcher.group(1), emojiById, aliasToId) == null) continue;
            count++;
            if (count > config.emojiMessageTokenLimit) return true;
        }
        return false;
    }

    private void handleUserSend(HttpExchange ex, SessionContext ctx, String message, String replyToId, String replyToSender, String replyToPreview) throws IOException {
        if (emojiTokenLimitExceeded(message, plugin.configValues())) {
            sendJson(ex, 400, "{\"ok\":false,\"error\":\"emoji_limit\"}");
            return;
        }
        if (!ctx.account.role.atLeast(Role.USER)) {
            sendJson(ex, 403, "{\"ok\":false,\"error\":\"permission_denied\"}");
            return;
        }
        prewarmExternalMediaCache(message);
        ChatMessage msg = new ChatMessage(System.currentTimeMillis(), "web", plugin.displayNameForAccount(ctx.account), ctx.account.role.name(), message)
                .withRealSender(stripControl(ctx.account.safeUsername(), 64), stripControl(ctx.account.uuid, 64));
        attachReplyIfPresent(msg, replyToId, replyToSender, replyToPreview);
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

    private void handleGuestSend(HttpExchange ex, Map<String, String> body, String ip, String message, String replyToId, String replyToSender, String replyToPreview) throws IOException {
        ConfigValues config = plugin.configValues();
        if (emojiTokenLimitExceeded(message, config)) {
            sendJson(ex, 400, "{\"ok\":false,\"error\":\"emoji_limit\"}");
            return;
        }
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
        attachReplyIfPresent(msg, replyToId, replyToSender, replyToPreview);
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
            String executor = commandExecutorLabel(ctx.account);
            Map<String, String> values = new LinkedHashMap<>();
            values.put("label", resultLabel);
            values.put("executor", executor);
            String message = plugin.langManager().text("system.command-executed-by",
                    executor + " executed web command: " + resultLabel, values);
            publishSystemEvent("Command", message, "system.command-executed-by", JsonUtil.obj(values));
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

    private String commandExecutorLabel(Account account) {
        if (account == null) return "Unknown";
        String display = stripControl(plugin.displayNameForAccount(account), 64).trim();
        String username = stripControl(account.safeUsername(), 64).trim();
        if (display.isBlank()) display = username;
        if (display.isBlank()) display = "Unknown";
        if (!username.isBlank() && !username.equals(display)) {
            return display + " (" + username + ")";
        }
        return display;
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



    private Path emojiDir() {
        String dir = plugin.configValues().emojiDirectory;
        if (dir == null || dir.isBlank()) dir = "emojis";
        Path path = Path.of(dir);
        if (!path.isAbsolute()) path = plugin.getDataFolder().toPath().resolve(path);
        return path.normalize();
    }


    private void ensureEmojiDirectoryExists() throws IOException {
        ConfigValues config = plugin.configValues();
        if (config == null || !config.emojiEnabled) return;
        Files.createDirectories(emojiDir());
    }

    private Path emojiPackDir(String packId) {
        Path dir = emojiDir();
        String pack = sanitizeEmojiSegment(packId);
        if (pack.isBlank() || "default".equalsIgnoreCase(pack)) return dir;
        return dir.resolve(pack).normalize();
    }

    private String normalizeEmojiPackId(String packId) {
        String pack = sanitizeEmojiSegment(packId);
        return pack.isBlank() ? "default" : pack;
    }

    private boolean validEmojiPackTarget(Path dir, Path target) {
        return target != null && target.normalize().startsWith(dir.normalize());
    }

    private long emojiTotalSize(ConfigValues config) {
        Path dir = emojiDir();
        if (!Files.isDirectory(dir)) return 0L;
        final long[] total = new long[]{0L};
        try (java.util.stream.Stream<Path> stream = Files.walk(dir, 2)) {
            stream.filter(Files::isRegularFile).forEach(path -> {
                String ext = extension(path.getFileName().toString()).toLowerCase(Locale.ROOT);
                if (!emojiExtensionAllowed(ext, config)) return;
                try { total[0] += Files.size(path); } catch (IOException ignored) {}
            });
        } catch (IOException ignored) {
        }
        return total[0];
    }

    private String uniqueEmojiFilename(Path dir, String base, String ext) {
        String safeBase = sanitizeEmojiFilenameBase(base);
        if (safeBase.isBlank()) safeBase = "emoji";
        safeBase = limitCodePoints(safeBase, 80);
        String suffix = "." + ext.toLowerCase(Locale.ROOT);
        Path candidate = dir.resolve(safeBase + suffix).normalize();
        if (!Files.exists(candidate)) return safeBase + suffix;
        for (int i = 1; i < 10000; i++) {
            String name = safeBase + "-" + i + suffix;
            if (!Files.exists(dir.resolve(name).normalize())) return name;
        }
        return safeBase + "-" + System.currentTimeMillis() + suffix;
    }

    private String emojiRenameFilename(String requested, String currentExt) {
        String cleaned = safeUploadedFilename(requested, "emoji");
        String ext = extension(cleaned).toLowerCase(Locale.ROOT);
        String base = cleaned;
        if (!ext.isBlank() && ext.equalsIgnoreCase(currentExt)) {
            base = cleaned.substring(0, cleaned.lastIndexOf('.'));
        } else if (!ext.isBlank() && emojiExtensionAllowed(ext, plugin.configValues())) {
            // Renaming changes the file name only; changing the actual file format
            // extension is intentionally not supported from the admin panel.
            return "";
        }
        String safeBase = sanitizeEmojiFilenameBase(base);
        if (safeBase.isBlank()) return "";
        return safeBase + "." + currentExt.toLowerCase(Locale.ROOT);
    }


    private void handleEmojis(HttpExchange ex) throws IOException {
        if (preflight(ex)) return;
        if (!"GET".equalsIgnoreCase(ex.getRequestMethod()) && !"HEAD".equalsIgnoreCase(ex.getRequestMethod())) {
            sendJson(ex, 405, "{\"ok\":false,\"error\":\"method_not_allowed\"}");
            return;
        }

        ConfigValues config = plugin.configValues();
        if (!config.emojiEnabled) {
            sendJson(ex, 200, "{\"ok\":true,\"enabled\":false,\"packs\":[],\"items\":[]}");
            return;
        }

        String path = ex.getRequestURI().getPath();
        String prefix = matchingApiContextPrefix(config, path) + "/emojis";
        if (path.equals(prefix) || path.equals(prefix + "/")) {
            handleEmojiList(ex, config);
            return;
        }
        handleEmojiFile(ex, config, prefix, path);
    }

    private void handleEmojiList(HttpExchange ex, ConfigValues config) throws IOException {
        EmojiCatalog catalog = scanEmojiCatalog(config);
        Map<String, List<String>> imageEmojiSymbolsById = imageEmojiSymbolsByWebId(catalog, config);
        List<Object> packObjects = new ArrayList<>();
        for (EmojiPack pack : catalog.packs) {
            Map<String, Object> pm = new LinkedHashMap<>();
            pm.put("id", pack.id);
            pm.put("label", pack.label);
            pm.put("count", pack.items.size());
            packObjects.add(pm);
        }
        String emojiBaseUrl = publicEmojiBaseUrl(ex);
        List<Object> itemObjects = new ArrayList<>();
        for (EmojiItem item : catalog.items) {
            Map<String, Object> im = new LinkedHashMap<>();
            im.put("id", item.id);
            im.put("pack", item.pack);
            im.put("name", item.name);
            im.put("label", item.label);
            im.put("path", item.relativePath);
            im.put("filename", Path.of(item.relativePath).getFileName().toString());
            im.put("url", emojiBaseUrl + "/" + urlPath(item.relativePath));
            im.put("aliases", emojiPublicAliases(item, config));
            im.put("symbols", imageEmojiSymbolsById.getOrDefault(item.id, List.of()));
            im.put("ext", item.ext);
            im.put("size", item.size);
            im.put("animated", "gif".equalsIgnoreCase(item.ext));
            itemObjects.add(im);
        }
        Map<String, Object> res = new LinkedHashMap<>();
        res.put("ok", true);
        res.put("enabled", true);
        res.put("renderSizePx", config.emojiRenderSizePx);
        res.put("pickerSizePx", config.emojiPickerSizePx);
        res.put("messageTokenLimit", config.emojiMessageTokenLimit);
        res.put("tokenFormat", config.emojiTokenFormat == null ? "short" : config.emojiTokenFormat);
        res.put("packs", packObjects);
        res.put("items", itemObjects);
        sendJson(ex, 200, JsonUtil.obj(res));
    }

    private List<String> emojiPublicAliases(EmojiItem item, ConfigValues config) {
        if (item == null) return List.of();
        LinkedHashSet<String> aliases = new LinkedHashSet<>();
        for (String alias : new String[]{
                item.id,
                item.name,
                item.label,
                emojiTokenFallbackLabel(item.id),
                emojiGameLabel(item, config),
                item.pack == null || item.pack.isBlank() ? "" : item.pack + "/" + item.name,
                item.pack == null || item.pack.isBlank() ? "" : item.pack + "/" + item.label
        }) {
            for (String key : emojiAliasKeys(alias)) {
                if (!key.isBlank()) aliases.add(key);
            }
        }
        return new ArrayList<>(aliases);
    }

    private void handleEmojiFile(HttpExchange ex, ConfigValues config, String prefix, String path) throws IOException {
        String raw = path.startsWith(prefix + "/") ? path.substring((prefix + "/").length()) : "";
        String name = URLDecoder.decode(raw, StandardCharsets.UTF_8).replace("\\", "/");
        if (name.isBlank() || name.startsWith("/") || name.contains("..") || name.contains("\0")) {
            sendJson(ex, 400, "{\"ok\":false,\"error\":\"invalid_file\"}");
            return;
        }
        String ext = extension(name).toLowerCase(Locale.ROOT);
        if (!emojiExtensionAllowed(ext, config)) {
            sendJson(ex, 400, "{\"ok\":false,\"error\":\"invalid_file\"}");
            return;
        }
        Path dir = emojiDir();
        Path file = dir.resolve(name).normalize();
        if (!file.startsWith(dir) || !Files.exists(file) || !Files.isRegularFile(file)) {
            sendJson(ex, 404, "{\"ok\":false,\"error\":\"not_found\"}");
            return;
        }
        long len = Files.size(file);
        long max = config.emojiMaxFileSizeKb > 0 ? config.emojiMaxFileSizeKb * 1024L : 0L;
        if (max > 0 && len > max) {
            sendJson(ex, 413, "{\"ok\":false,\"error\":\"file_too_large\"}");
            return;
        }

        Headers h = ex.getResponseHeaders();
        addCors(ex);
        addSecurityHeaders(ex);
        h.set("Content-Type", contentTypeForExtension(ext));
        h.set("X-Content-Type-Options", "nosniff");
        h.set("Cache-Control", "public, max-age=604800");
        setInlineContentDisposition(h, Path.of(name).getFileName().toString());
        h.set("Content-Length", String.valueOf(len));

        boolean head = "HEAD".equalsIgnoreCase(ex.getRequestMethod());
        ex.sendResponseHeaders(200, head ? -1 : len);
        if (!head) {
            try (OutputStream os = ex.getResponseBody()) {
                Files.copy(file, os);
            }
        } else {
            ex.close();
        }
    }


    private void handleShortEmoji(HttpExchange ex) throws IOException {
        if (preflight(ex)) return;
        if (!"GET".equalsIgnoreCase(ex.getRequestMethod()) && !"HEAD".equalsIgnoreCase(ex.getRequestMethod())) {
            sendJson(ex, 405, "{\"ok\":false,\"error\":\"method_not_allowed\"}");
            return;
        }
        ConfigValues config = plugin.configValues();
        if (!config.emojiEnabled) {
            sendJson(ex, 404, "{\"ok\":false,\"error\":\"not_found\"}");
            return;
        }

        String path = ex.getRequestURI().getPath();
        String prefix = matchingApiContextPrefix(config, path) + "/e/";
        if (!path.startsWith(prefix)) {
            sendJson(ex, 404, "{\"ok\":false,\"error\":\"not_found\"}");
            return;
        }
        String id = URLDecoder.decode(path.substring(prefix.length()), StandardCharsets.UTF_8).trim().toLowerCase(Locale.ROOT);
        if (!id.matches("[0-9a-f]{8}")) {
            sendJson(ex, 404, "{\"ok\":false,\"error\":\"not_found\"}");
            return;
        }

        EmojiItem found = null;
        for (EmojiItem item : scanEmojiCatalog(config).items) {
            if (id.equals(shortEmojiId(item.id))) {
                found = item;
                break;
            }
        }
        if (found == null) {
            sendJson(ex, 404, "{\"ok\":false,\"error\":\"not_found\"}");
            return;
        }
        sendEmojiItemFile(ex, config, found);
    }

    private void sendEmojiItemFile(HttpExchange ex, ConfigValues config, EmojiItem item) throws IOException {
        Path dir = emojiDir();
        Path file = dir.resolve(item.relativePath).normalize();
        if (!file.startsWith(dir) || !Files.exists(file) || !Files.isRegularFile(file)) {
            sendJson(ex, 404, "{\"ok\":false,\"error\":\"not_found\"}");
            return;
        }
        String ext = item.ext.toLowerCase(Locale.ROOT);
        if (!emojiExtensionAllowed(ext, config)) {
            sendJson(ex, 400, "{\"ok\":false,\"error\":\"invalid_file\"}");
            return;
        }
        long len = Files.size(file);
        long max = config.emojiMaxFileSizeKb > 0 ? config.emojiMaxFileSizeKb * 1024L : 0L;
        if (max > 0 && len > max) {
            sendJson(ex, 413, "{\"ok\":false,\"error\":\"file_too_large\"}");
            return;
        }

        Headers h = ex.getResponseHeaders();
        addCors(ex);
        addSecurityHeaders(ex);
        h.set("Content-Type", contentTypeForExtension(ext));
        h.set("X-Content-Type-Options", "nosniff");
        h.set("Cache-Control", "public, max-age=604800");
        setInlineContentDisposition(h, Path.of(item.relativePath).getFileName().toString());
        h.set("Content-Length", String.valueOf(len));

        boolean head = "HEAD".equalsIgnoreCase(ex.getRequestMethod());
        ex.sendResponseHeaders(200, head ? -1 : len);
        if (!head) {
            try (OutputStream os = ex.getResponseBody()) {
                Files.copy(file, os);
            }
        } else {
            ex.close();
        }
    }

    private EmojiCatalog scanEmojiCatalog(ConfigValues config) {
        EmojiCatalog catalog = new EmojiCatalog();
        Path dir = emojiDir();
        if (!Files.isDirectory(dir)) return catalog;

        long maxOne = config.emojiMaxFileSizeKb > 0 ? config.emojiMaxFileSizeKb * 1024L : 0L;
        long maxTotal = config.emojiMaxTotalSizeMb > 0 ? config.emojiMaxTotalSizeMb * 1024L * 1024L : 0L;
        long[] total = new long[]{0L};

        try {
            // Root files are individual/default emojis.
            EmojiPack rootPack = scanEmojiPack(config, dir, "default", "Default", "", maxOne, maxTotal, total);
            if (!rootPack.items.isEmpty()) {
                catalog.packs.add(rootPack);
                catalog.items.addAll(rootPack.items);
            }

            List<Path> packs = new ArrayList<>();
            try (java.util.stream.Stream<Path> stream = Files.list(dir)) {
                stream.filter(Files::isDirectory).forEach(packs::add);
            }
            packs.sort((a, b) -> compareNatural(a.getFileName().toString(), b.getFileName().toString()));
            for (Path packDir : packs) {
                String rawName = packDir.getFileName().toString();
                String packId = sanitizeEmojiSegment(rawName);
                if (packId.isBlank()) continue;
                EmojiPack pack = scanEmojiPack(config, packDir, packId, rawName, packId + "/", maxOne, maxTotal, total);
                if (!pack.items.isEmpty()) {
                    catalog.packs.add(pack);
                    catalog.items.addAll(pack.items);
                }
            }
        } catch (IOException ignored) {
        }
        return catalog;
    }

    private int emojiWebPreferenceRank(String ext) {
        String e = String.valueOf(ext == null ? "" : ext).replace(".", "").trim().toLowerCase(Locale.ROOT);
        if (e.equals("gif")) return 0;
        if (e.equals("webp")) return 1;
        if (e.equals("jpg") || e.equals("jpeg")) return 2;
        if (e.equals("png")) return 3;
        return 9;
    }

    private boolean shouldReplaceEmojiCatalogChoice(Path current, Path candidate) {
        String currentExt = extension(current.getFileName().toString()).toLowerCase(Locale.ROOT);
        String candidateExt = extension(candidate.getFileName().toString()).toLowerCase(Locale.ROOT);
        int currentRank = emojiWebPreferenceRank(currentExt);
        int candidateRank = emojiWebPreferenceRank(candidateExt);
        if (candidateRank != currentRank) return candidateRank < currentRank;
        return compareNatural(candidate.getFileName().toString(), current.getFileName().toString()) < 0;
    }

    private String uniqueEmojiBase(Path packDir, String desiredBase) {
        String clean = sanitizeEmojiFilenameBase(desiredBase);
        if (clean.isBlank()) clean = "emoji";
        String base = clean;
        int i = 1;
        while (emojiBaseExists(packDir, base)) {
            base = clean + "-" + i++;
        }
        return base;
    }

    private boolean emojiBaseExists(Path packDir, String base) {
        if (packDir == null || base == null || base.isBlank()) return false;
        String prefix = base + ".";
        try (java.util.stream.Stream<Path> stream = Files.list(packDir)) {
            return stream
                    .filter(Files::isRegularFile)
                    .map(p -> p.getFileName() == null ? "" : p.getFileName().toString())
                    .anyMatch(name -> name.equals(base) || name.startsWith(prefix));
        } catch (IOException ignored) {
            return false;
        }
    }

    private EmojiPack scanEmojiPack(ConfigValues config, Path packDir, String packId, String label, String relativePrefix, long maxOne, long maxTotal, long[] total) throws IOException {
        EmojiPack pack = new EmojiPack(packId, label);
        Map<String, Path> chosenByBase = new LinkedHashMap<>();
        List<Path> files = new ArrayList<>();
        try (java.util.stream.Stream<Path> stream = Files.list(packDir)) {
            stream.filter(Files::isRegularFile).forEach(files::add);
        }
        files.sort((a, b) -> compareNatural(a.getFileName().toString(), b.getFileName().toString()));

        for (Path file : files) {
            String fileName = file.getFileName().toString();
            String ext = extension(fileName).toLowerCase(Locale.ROOT);
            if (!emojiExtensionAllowed(ext, config)) continue;
            String base = fileName.contains(".") ? fileName.substring(0, fileName.lastIndexOf('.')) : fileName;
            String itemName = sanitizeEmojiSegment(base);
            if (itemName.isBlank()) continue;

            Path current = chosenByBase.get(itemName);
            if (current == null || shouldReplaceEmojiCatalogChoice(current, file)) {
                chosenByBase.put(itemName, file);
            }
        }

        for (Path file : chosenByBase.values()) {
            String fileName = file.getFileName().toString();
            String ext = extension(fileName).toLowerCase(Locale.ROOT);
            long len;
            try { len = Files.size(file); } catch (IOException e) { continue; }
            if (maxOne > 0 && len > maxOne) continue;
            if (maxTotal > 0 && total[0] + len > maxTotal) continue;
            String base = fileName.contains(".") ? fileName.substring(0, fileName.lastIndexOf('.')) : fileName;
            String itemName = sanitizeEmojiSegment(base);
            if (itemName.isBlank()) continue;
            String id = packId + "/" + itemName;
            String rel = relativePrefix + fileName;
            EmojiItem item = new EmojiItem(id, packId, itemName, base, rel, ext, len);
            pack.items.add(item);
            total[0] += len;
        }
        return pack;
    }

    private boolean emojiExtensionAllowed(String ext, ConfigValues config) {
        if (ext == null || ext.isBlank()) return false;
        if (config.emojiAllowedExtensions == null || config.emojiAllowedExtensions.isEmpty()) {
            return Set.of("png", "jpg", "jpeg", "gif", "webp").contains(ext.toLowerCase(Locale.ROOT));
        }
        String e = ext.toLowerCase(Locale.ROOT);
        for (String allowed : config.emojiAllowedExtensions) {
            if (e.equals(String.valueOf(allowed).replace(".", "").trim().toLowerCase(Locale.ROOT))) return true;
        }
        return false;
    }

    private boolean emojiNeedsGamePng(String ext) {
        String e = String.valueOf(ext == null ? "" : ext).replace(".", "").trim().toLowerCase(Locale.ROOT);
        return e.equals("png") || e.equals("gif") || e.equals("jpg") || e.equals("jpeg") || e.equals("webp");
    }

    private boolean imageEmojisSidecarActive(ConfigValues config) {
        if (config == null || !config.emojiEnabled || !config.emojiGameLinkEnabled) return false;
        String mode = String.valueOf(config.emojiGameLinkMode == null ? "" : config.emojiGameLinkMode).trim().toLowerCase(Locale.ROOT);
        return mode.equals("imageemojis") || mode.equals("imageemojis-link");
    }

    private boolean emojiHasPngSidecarSource(String ext) {
        String e = String.valueOf(ext == null ? "" : ext).replace(".", "").trim().toLowerCase(Locale.ROOT);
        return e.equals("gif") || e.equals("jpg") || e.equals("jpeg") || e.equals("webp");
    }

    private byte[] convertImageBytesToPng(byte[] data) throws IOException {
        if (data == null || data.length == 0) return null;
        BufferedImage image;
        try (InputStream in = new java.io.ByteArrayInputStream(data)) {
            image = ImageIO.read(in);
        }
        if (image == null) return null;
        BufferedImage out = new BufferedImage(image.getWidth(), image.getHeight(), BufferedImage.TYPE_INT_ARGB);
        Graphics2D g = out.createGraphics();
        try {
            g.drawImage(image, 0, 0, null);
        } finally {
            g.dispose();
        }
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        if (!ImageIO.write(out, "png", baos)) return null;
        return baos.toByteArray();
    }

    private Path emojiPngSidecarPath(Path originalFile) {
        if (originalFile == null) return null;
        Path root = emojiDir();
        Path normalized = originalFile.normalize();
        if (!normalized.startsWith(root)) return null;
        String fileName = normalized.getFileName() == null ? "" : normalized.getFileName().toString();
        int dot = fileName.lastIndexOf('.');
        String base = dot >= 0 ? fileName.substring(0, dot) : fileName;
        if (base.isBlank() || normalized.getParent() == null) return null;
        Path sidecar = normalized.getParent().resolve(base + ".png").normalize();
        return sidecar.startsWith(root) ? sidecar : null;
    }

    private boolean createPngSidecarForFile(Path originalFile, byte[] sourceData, boolean overwrite) {
        if (originalFile == null) return false;
        String ext = extension(originalFile.getFileName() == null ? "" : originalFile.getFileName().toString()).toLowerCase(Locale.ROOT);
        if (!emojiHasPngSidecarSource(ext)) return false;
        Path sidecar = emojiPngSidecarPath(originalFile);
        if (sidecar == null) return false;
        try {
            if (Files.exists(sidecar) && !overwrite) return true;
            byte[] input = sourceData != null ? sourceData : Files.readAllBytes(originalFile);
            byte[] pngData = convertImageBytesToPng(input);
            if (pngData == null || pngData.length == 0) return false;
            Files.write(sidecar, pngData, StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING, StandardOpenOption.WRITE);
            imageEmojisFontCache = null;
            return true;
        } catch (Exception ex) {
            plugin.getLogger().warning("Failed to create PNG sidecar for emoji " + originalFile + ": " + ex.getMessage());
            return false;
        }
    }

    private void syncExistingImageEmojisPngSidecarsOnStartup() {
        ConfigValues config = plugin.configValues();
        if (!imageEmojisSidecarActive(config)) return;
        Path root = emojiDir();
        if (!Files.isDirectory(root)) return;
        int created = 0;
        int already = 0;
        int failed = 0;
        try (java.util.stream.Stream<Path> stream = Files.walk(root)) {
            for (Path file : stream.filter(Files::isRegularFile).toList()) {
                String ext = extension(file.getFileName() == null ? "" : file.getFileName().toString()).toLowerCase(Locale.ROOT);
                if (!emojiHasPngSidecarSource(ext)) continue;
                Path sidecar = emojiPngSidecarPath(file);
                if (sidecar != null && Files.isRegularFile(sidecar)) {
                    already++;
                    continue;
                }
                if (createPngSidecarForFile(file, null, false)) created++;
                else failed++;
            }
        } catch (IOException ex) {
            plugin.getLogger().warning("Failed to scan emoji directory for PNG sidecars: " + ex.getMessage());
        }
        plugin.getLogger().info("ImageEmojis PNG sidecar sync complete: created " + created
                + ", already present " + already + ", failed " + failed + ".");
    }

    private String sanitizeEmojiSegment(String value) {
        String raw = java.text.Normalizer.normalize(String.valueOf(value == null ? "" : value), java.text.Normalizer.Form.NFC).trim();
        if (raw.isBlank()) return "";
        StringBuilder out = new StringBuilder();
        boolean lastSpace = false;
        for (int i = 0; i < raw.length(); ) {
            int cp = raw.codePointAt(i);
            i += Character.charCount(cp);
            if (cp == '/' || cp == '\\' || cp == ':' || cp == 0 || Character.isISOControl(cp)) {
                if (!lastSpace) {
                    out.append('-');
                    lastSpace = true;
                }
                continue;
            }
            if (Character.isWhitespace(cp)) {
                if (!lastSpace) {
                    out.append(' ');
                    lastSpace = true;
                }
                continue;
            }
            out.appendCodePoint(cp);
            lastSpace = false;
        }
        String result = out.toString().trim();
        while (result.startsWith("-")) result = result.substring(1).trim();
        while (result.endsWith("-")) result = result.substring(0, result.length() - 1).trim();
        return limitCodePoints(result, 96);
    }

    private String sanitizeEmojiFilenameBase(String value) {
        String raw = java.text.Normalizer.normalize(String.valueOf(value == null ? "" : value), java.text.Normalizer.Form.NFC).trim();
        if (raw.isBlank()) return "";
        StringBuilder out = new StringBuilder();
        boolean lastSpace = false;
        for (int i = 0; i < raw.length(); ) {
            int cp = raw.codePointAt(i);
            i += Character.charCount(cp);
            boolean invalidPathChar = cp == '/' || cp == '\\' || cp == ':' || cp == '*' || cp == '?' || cp == '"' || cp == '<' || cp == '>' || cp == '|' || cp == 0 || Character.isISOControl(cp);
            if (invalidPathChar) {
                if (!lastSpace) {
                    out.append('-');
                    lastSpace = true;
                }
                continue;
            }
            if (Character.isWhitespace(cp)) {
                if (!lastSpace) {
                    out.append(' ');
                    lastSpace = true;
                }
                continue;
            }
            out.appendCodePoint(cp);
            lastSpace = false;
        }
        String result = out.toString().trim();
        while (result.startsWith("-")) result = result.substring(1).trim();
        while (result.endsWith("-")) result = result.substring(0, result.length() - 1).trim();
        return limitCodePoints(result, 80);
    }

    private int compareNatural(String a, String b) {
        String aa = String.valueOf(a == null ? "" : a);
        String bb = String.valueOf(b == null ? "" : b);
        int ia = 0, ib = 0;
        while (ia < aa.length() && ib < bb.length()) {
            int ca = aa.codePointAt(ia);
            int cb = bb.codePointAt(ib);
            if (Character.isDigit(ca) && Character.isDigit(cb)) {
                int sa = ia;
                int sb = ib;
                while (ia < aa.length() && Character.isDigit(aa.codePointAt(ia))) ia += Character.charCount(aa.codePointAt(ia));
                while (ib < bb.length() && Character.isDigit(bb.codePointAt(ib))) ib += Character.charCount(bb.codePointAt(ib));
                String na = aa.substring(sa, ia).replaceFirst("^0+(?!$)", "");
                String nb = bb.substring(sb, ib).replaceFirst("^0+(?!$)", "");
                int len = Integer.compare(na.length(), nb.length());
                if (len != 0) return len;
                int cmp = na.compareTo(nb);
                if (cmp != 0) return cmp;
                continue;
            }
            String la = new String(Character.toChars(ca)).toLowerCase(Locale.ROOT);
            String lb = new String(Character.toChars(cb)).toLowerCase(Locale.ROOT);
            int cmp = la.compareTo(lb);
            if (cmp != 0) return cmp;
            ia += Character.charCount(ca);
            ib += Character.charCount(cb);
        }
        return Integer.compare(aa.length(), bb.length());
    }

    private String limitCodePoints(String value, int maxCodePoints) {
        String text = String.valueOf(value == null ? "" : value);
        if (maxCodePoints <= 0 || text.codePointCount(0, text.length()) <= maxCodePoints) return text;
        return text.substring(0, text.offsetByCodePoints(0, maxCodePoints));
    }

    private void setInlineContentDisposition(Headers headers, String filename) {
        String safeAscii = String.valueOf(filename == null ? "emoji" : filename).replace("\"", "").replace("\r", "").replace("\n", "");
        String encoded = java.net.URLEncoder.encode(safeAscii, StandardCharsets.UTF_8).replace("+", "%20");
        headers.set("Content-Disposition", "inline; filename=\"" + safeAscii.replaceAll("[^\\x20-\\x7e]", "_") + "\"; filename*=UTF-8''" + encoded);
    }

    private String urlPath(String path) {
        return Arrays.stream(String.valueOf(path == null ? "" : path).replace("\\", "/").split("/"))
                .filter(part -> !part.isBlank())
                .map(part -> java.net.URLEncoder.encode(part, StandardCharsets.UTF_8).replace("+", "%20"))
                .reduce((a, b) -> a + "/" + b)
                .orElse("");
    }

    private static final class EmojiCatalog {
        final List<EmojiPack> packs = new ArrayList<>();
        final List<EmojiItem> items = new ArrayList<>();
    }

    private static final class EmojiPack {
        final String id;
        final String label;
        final List<EmojiItem> items = new ArrayList<>();
        EmojiPack(String id, String label) {
            this.id = id == null ? "" : id;
            this.label = label == null ? this.id : label;
        }
    }

    private static final class EmojiItem {
        final String id;
        final String pack;
        final String name;
        final String label;
        final String relativePath;
        final String ext;
        final long size;
        EmojiItem(String id, String pack, String name, String label, String relativePath, String ext, long size) {
            this.id = id == null ? "" : id;
            this.pack = pack == null ? "" : pack;
            this.name = name == null ? "" : name;
            this.label = label == null ? this.name : label;
            this.relativePath = relativePath == null ? "" : relativePath;
            this.ext = ext == null ? "" : ext;
            this.size = size;
        }
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

        String path = ex.getRequestURI().getPath();
        String prefix = matchingApiContextPrefix(config, path) + "/fonts/";
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

        String path = ex.getRequestURI().getPath();
        String prefix = matchingApiContextPrefix(config, path) + "/uploads/";
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
        ConfigValues config = plugin.configValues();
        String configured = config.uploadPublicBaseUrl;
        if (configured != null && !configured.isBlank()) {
            return normalizeResourceBaseUrl(ex, configured, "uploads");
        }
        return publicApiBaseUrl(ex) + "/uploads";
    }

    private String publicEmojiBaseUrl(HttpExchange ex) {
        ConfigValues config = plugin.configValues();
        String configured = config.emojiPublicBaseUrl;
        if (configured != null && !configured.isBlank()) {
            return normalizeResourceBaseUrl(ex, configured, "emojis");
        }
        return publicApiBaseUrl(ex) + "/emojis";
    }

    private String normalizeResourceBaseUrl(HttpExchange ex, String configured, String resource) {
        String base = normalizePublicBaseUrl(ex, configured);
        String suffix = "/" + resource;
        if (base.equals(suffix) || base.endsWith(suffix)) return base;
        if (looksLikeApiBase(base, plugin.configValues())) return base + suffix;
        return base;
    }

    private boolean looksLikeApiBase(String value, ConfigValues config) {
        String v = trimTrailingSlash(String.valueOf(value == null ? "" : value).trim());
        if (v.isBlank()) return false;
        String path = v;
        try {
            URI uri = URI.create(v);
            if (uri.getScheme() != null && uri.getPath() != null) path = uri.getPath();
        } catch (IllegalArgumentException ignored) {
        }
        path = trimTrailingSlash(path);
        String pathPrefix = trimTrailingSlash(config.pathPrefix == null || config.pathPrefix.isBlank() ? "/api" : config.pathPrefix);
        if (path.equals(pathPrefix) || path.endsWith(pathPrefix)) return true;
        String webBase = trimTrailingSlash(config.apiBaseUrl == null ? "" : config.apiBaseUrl.trim());
        String standaloneBase = trimTrailingSlash(config.standaloneWebApiBaseUrl == null ? "" : config.standaloneWebApiBaseUrl.trim());
        return (!webBase.isBlank() && v.equals(webBase)) || (!standaloneBase.isBlank() && v.equals(standaloneBase));
    }

    private String publicApiBaseUrl(HttpExchange ex) {
        ConfigValues config = plugin.configValues();
        String configured = config.apiBaseUrl;
        if (configured == null || configured.isBlank()) configured = config.standaloneWebApiBaseUrl;
        if (configured != null && !configured.isBlank()) {
            return stripKnownResourceSuffix(normalizePublicBaseUrl(ex, configured));
        }

        String proto = forwardedProto(ex);
        String host = forwardedHost(ex, config);

        String inferredPath = inferPublicApiBasePath(ex, config);
        if (!inferredPath.isBlank()) return trimTrailingSlash(proto + "://" + host + inferredPath);

        return trimTrailingSlash(proto + "://" + host + config.pathPrefix);
    }

    private String inferPublicApiBasePath(HttpExchange ex, ConfigValues config) {
        String requestPath = ex.getRequestURI().getPath();
        String internalPrefix = normalizeContextPrefix(config.pathPrefix, "/api");
        int idx = requestPath.indexOf(internalPrefix);
        if (idx < 0) return "";
        return trimTrailingSlash(requestPath.substring(0, idx) + internalPrefix);
    }

    private String inferPublicStandaloneApiBasePath(HttpExchange ex, ConfigValues config) {
        String requestPath = ex.getRequestURI().getPath();
        String standalonePath = normalizeContextPrefix(config.standaloneWebPath, "/chat");
        String internalPrefix = normalizeContextPrefix(config.pathPrefix, "/api");
        if (requestPath.equals(standalonePath) || requestPath.startsWith(standalonePath + "/")) {
            return internalPrefix;
        }
        if (requestPath.endsWith(standalonePath)) {
            String publicPrefix = requestPath.substring(0, requestPath.length() - standalonePath.length());
            return trimTrailingSlash(publicPrefix + internalPrefix);
        }
        return "";
    }

    private String normalizePublicBaseUrl(HttpExchange ex, String configured) {
        String value = String.valueOf(configured == null ? "" : configured).trim();
        if (value.isBlank()) return publicApiBaseUrl(ex);

        String proto = forwardedProto(ex);

        if (value.startsWith("http://") || value.startsWith("https://")) {
            return trimTrailingSlash(value);
        }
        if (value.startsWith("//")) {
            return trimTrailingSlash(proto + ":" + value);
        }
        if (value.startsWith("/")) {
            // Same-origin absolute browser path for reverse proxies, e.g. /bmwc/api.
            return trimTrailingSlash(value);
        }

        // Relative values without a leading slash are compatibility shorthand.
        // Use http.cors-origin when it names a real origin; otherwise fall back to
        // a same-origin absolute path so direct HTTP remains usable.
        String origin = configuredCorsOrigin(plugin.configValues());
        if (!origin.isBlank()) return trimTrailingSlash(origin + "/" + value.replaceFirst("^/+", ""));
        return trimTrailingSlash("/" + value);
    }

    private String forwardedProto(HttpExchange ex) {
        String proto = ex.getRequestHeaders().getFirst("X-Forwarded-Proto");
        if (proto == null || proto.isBlank()) proto = "http";
        return proto;
    }

    private String forwardedHost(HttpExchange ex, ConfigValues config) {
        String host = ex.getRequestHeaders().getFirst("X-Forwarded-Host");
        if (host == null || host.isBlank()) host = ex.getRequestHeaders().getFirst("Host");
        if (host == null || host.isBlank()) host = config.httpHost + ":" + config.httpPort;
        return host;
    }

    private String configuredCorsOrigin(ConfigValues config) {
        String origin = String.valueOf(config == null || config.corsOrigin == null ? "" : config.corsOrigin).trim();
        if (origin.isBlank() || "*".equals(origin)) return "";
        if (origin.startsWith("http://") || origin.startsWith("https://")) return trimTrailingSlash(origin);
        return "";
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
        if (headers == null || key == null) return null;
        Pattern star = Pattern.compile("(?i)" + Pattern.quote(key + "*") + "=([^;\\r\\n]+)");
        Matcher sm = star.matcher(headers);
        if (sm.find()) {
            String raw = sm.group(1).trim();
            if (raw.startsWith("\"") && raw.endsWith("\"") && raw.length() >= 2) raw = raw.substring(1, raw.length() - 1);
            int marker = raw.indexOf("''");
            if (marker >= 0) raw = raw.substring(marker + 2);
            try { return URLDecoder.decode(raw, StandardCharsets.UTF_8); } catch (Exception ignored) {}
        }
        Pattern p = Pattern.compile("(?i)" + Pattern.quote(key) + "=\"([^\"]*)\"");
        Matcher m = p.matcher(headers);
        if (!m.find()) return null;
        String raw = m.group(1);
        try {
            return new String(raw.getBytes(StandardCharsets.ISO_8859_1), StandardCharsets.UTF_8);
        } catch (Exception ignored) {
            return raw;
        }
    }

    private String safeUploadedFilename(String filename, String fallback) {
        String raw = java.text.Normalizer.normalize(String.valueOf(filename == null ? "" : filename), java.text.Normalizer.Form.NFC).replace("\\", "/");
        int slash = raw.lastIndexOf('/');
        if (slash >= 0) raw = raw.substring(slash + 1);
        raw = raw.replace("\0", "").trim();
        if (raw.isBlank()) raw = fallback == null || fallback.isBlank() ? "file" : fallback;
        String ext = extension(raw).toLowerCase(Locale.ROOT);
        String base = raw.contains(".") ? raw.substring(0, raw.lastIndexOf('.')) : raw;
        String safeBase = sanitizeEmojiFilenameBase(base);
        if (safeBase.isBlank()) safeBase = fallback == null || fallback.isBlank() ? "file" : fallback;
        return ext.isBlank() ? safeBase : safeBase + "." + ext;
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


    private void handleAdminEmojis(HttpExchange ex) throws IOException {
        if (preflight(ex)) return;
        SessionContext ctx = requireRole(ex, Role.ADMIN);
        if (ctx == null) return;
        if (!"GET".equalsIgnoreCase(ex.getRequestMethod())) {
            sendJson(ex, 405, "{\"ok\":false,\"error\":\"method_not_allowed\"}");
            return;
        }
        ConfigValues config = plugin.configValues();
        if (!config.emojiEnabled) {
            sendJson(ex, 200, "{\"ok\":true,\"enabled\":false,\"packs\":[],\"items\":[]}");
            return;
        }
        ensureEmojiDirectoryExists();
        EmojiCatalog catalog = scanEmojiCatalog(config);
        Map<String, EmojiPack> byId = new LinkedHashMap<>();
        byId.put("default", new EmojiPack("default", "Default"));
        for (EmojiPack pack : catalog.packs) byId.put(pack.id, pack);
        Path dir = emojiDir();
        if (Files.isDirectory(dir)) {
            try (java.util.stream.Stream<Path> stream = Files.list(dir)) {
                stream.filter(Files::isDirectory).sorted((a, b) -> compareNatural(a.getFileName().toString(), b.getFileName().toString())).forEach(p -> {
                    String raw = p.getFileName().toString();
                    String id = sanitizeEmojiSegment(raw);
                    if (!id.isBlank()) byId.putIfAbsent(id, new EmojiPack(id, raw));
                });
            } catch (IOException ignored) {}
        }
        List<Object> packs = new ArrayList<>();
        for (EmojiPack pack : byId.values()) {
            Map<String, Object> pm = new LinkedHashMap<>();
            pm.put("id", pack.id);
            pm.put("label", pack.label);
            pm.put("count", pack.items.size());
            pm.put("default", "default".equals(pack.id));
            packs.add(pm);
        }
        List<Object> items = new ArrayList<>();
        for (EmojiItem item : catalog.items) {
            Map<String, Object> im = new LinkedHashMap<>();
            im.put("id", item.id);
            im.put("pack", item.pack);
            im.put("name", item.name);
            im.put("label", item.label);
            im.put("path", item.relativePath);
            im.put("filename", Path.of(item.relativePath).getFileName().toString());
            im.put("ext", item.ext);
            im.put("size", item.size);
            items.add(im);
        }
        Map<String, Object> res = new LinkedHashMap<>();
        res.put("ok", true);
        res.put("enabled", true);
        res.put("packs", packs);
        res.put("items", items);
        res.put("maxFileSizeKb", config.emojiMaxFileSizeKb);
        res.put("maxTotalSizeMb", config.emojiMaxTotalSizeMb);
        res.put("maxTotalSize", config.emojiMaxTotalSizeMb > 0 ? config.emojiMaxTotalSizeMb * 1024L * 1024L : 0L);
        res.put("showStorageUsage", config.emojiShowStorageUsage);
        res.put("showStorageLimit", config.emojiShowStorageLimit);
        res.put("totalSize", emojiTotalSize(config));
        sendJson(ex, 200, JsonUtil.obj(res));
    }

    private void handleAdminEmojiCreatePack(HttpExchange ex) throws IOException {
        if (preflight(ex)) return;
        SessionContext ctx = requireRole(ex, Role.ADMIN);
        if (ctx == null) return;
        if (!"POST".equalsIgnoreCase(ex.getRequestMethod())) {
            sendJson(ex, 405, "{\"ok\":false,\"error\":\"method_not_allowed\"}");
            return;
        }
        ConfigValues config = plugin.configValues();
        if (!config.emojiEnabled) {
            sendJson(ex, 403, "{\"ok\":false,\"error\":\"emoji_disabled\"}");
            return;
        }
        @SuppressWarnings("unchecked")
        Map<String, String> body = (Map<String, String>) ex.getAttribute("parsedBody");
        if (body == null) body = JsonUtil.parseFlatObject(JsonUtil.readBody(ex.getRequestBody()));
        String requested = body.getOrDefault("pack", body.getOrDefault("name", ""));
        String packId = normalizeEmojiPackId(requested);
        if ("default".equals(packId)) {
            ensureEmojiDirectoryExists();
            sendJson(ex, 200, "{\"ok\":true,\"pack\":\"default\"}");
            return;
        }
        Path root = emojiDir();
        Path dir = emojiPackDir(packId);
        if (!validEmojiPackTarget(root, dir)) {
            sendJson(ex, 400, "{\"ok\":false,\"error\":\"invalid_pack\"}");
            return;
        }
        Files.createDirectories(dir);
        sendJson(ex, 200, "{\"ok\":true,\"pack\":" + JsonUtil.quote(packId) + "}");
    }

    private void handleAdminEmojiUpload(HttpExchange ex) throws IOException {
        if (preflight(ex)) return;
        SessionContext ctx = requireRole(ex, Role.ADMIN);
        if (ctx == null) return;
        if (!"POST".equalsIgnoreCase(ex.getRequestMethod())) {
            sendJson(ex, 405, "{\"ok\":false,\"error\":\"method_not_allowed\"}");
            return;
        }
        ConfigValues config = plugin.configValues();
        if (!config.emojiEnabled) {
            sendJson(ex, 403, "{\"ok\":false,\"error\":\"emoji_disabled\"}");
            return;
        }
        String contentType = ex.getRequestHeaders().getFirst("Content-Type");
        String boundary = multipartBoundary(contentType);
        if (boundary == null || boundary.isBlank()) {
            sendJson(ex, 400, "{\"ok\":false,\"error\":\"multipart_required\"}");
            return;
        }
        long maxOne = config.emojiMaxFileSizeKb > 0 ? config.emojiMaxFileSizeKb * 1024L : 0L;
        long maxBody = maxOne > 0 ? maxOne + 256 * 1024L : 64L * 1024L * 1024L;
        byte[] body;
        try {
            body = readLimitedBytes(ex.getRequestBody(), maxBody);
        } catch (UploadTooLargeException e) {
            sendJson(ex, 413, "{\"ok\":false,\"error\":\"file_too_large\"}");
            return;
        }
        MultipartData multipart = parseMultipart(body, boundary);
        UploadedPart file = multipart.file;
        if (file == null || file.data == null || file.data.length == 0) {
            sendJson(ex, 400, "{\"ok\":false,\"error\":\"missing_file\"}");
            return;
        }
        if (maxOne > 0 && file.data.length > maxOne) {
            sendJson(ex, 413, "{\"ok\":false,\"error\":\"file_too_large\"}");
            return;
        }
        String original = safeUploadedFilename(file.filename, "emoji");
        String ext = extension(original).toLowerCase(Locale.ROOT);
        if (!emojiExtensionAllowed(ext, config)) {
            sendJson(ex, 400, "{\"ok\":false,\"error\":\"invalid_extension\"}");
            return;
        }
        byte[] sidecarPngData = null;
        if (imageEmojisSidecarActive(config) && emojiHasPngSidecarSource(ext)) {
            sidecarPngData = convertImageBytesToPng(file.data);
            if (sidecarPngData == null || sidecarPngData.length == 0) {
                sendJson(ex, 400, "{\"ok\":false,\"error\":\"png_conversion_failed\"}");
                return;
            }
        }

        long sidecarSize = sidecarPngData == null ? 0L : sidecarPngData.length;
        long maxTotal = config.emojiMaxTotalSizeMb > 0 ? config.emojiMaxTotalSizeMb * 1024L * 1024L : 0L;
        long currentTotal = emojiTotalSize(config);
        if (maxTotal > 0 && currentTotal + file.data.length + sidecarSize > maxTotal) {
            Map<String, Object> err = new LinkedHashMap<>();
            err.put("ok", false);
            err.put("error", "total_size_exceeded");
            err.put("currentSize", currentTotal);
            err.put("fileSize", file.data.length);
            err.put("sidecarSize", sidecarSize);
            err.put("maxTotalSize", maxTotal);
            err.put("maxTotalSizeMb", config.emojiMaxTotalSizeMb);
            sendJson(ex, 413, JsonUtil.obj(err));
            return;
        }
        String packId = normalizeEmojiPackId(multipart.fields.getOrDefault("pack", "default"));
        Path root = emojiDir();
        Path packDir = emojiPackDir(packId);
        if (!validEmojiPackTarget(root, packDir)) {
            sendJson(ex, 400, "{\"ok\":false,\"error\":\"invalid_pack\"}");
            return;
        }
        Files.createDirectories(packDir);
        String base = original.contains(".") ? original.substring(0, original.lastIndexOf('.')) : original;
        String uniqueBase = uniqueEmojiBase(packDir, base);
        String stored = uniqueBase + "." + ext;
        Path target = packDir.resolve(stored).normalize();
        if (!target.startsWith(root)) {
            sendJson(ex, 400, "{\"ok\":false,\"error\":\"invalid_path\"}");
            return;
        }
        Files.write(target, file.data, StandardOpenOption.CREATE_NEW, StandardOpenOption.WRITE);
        Path sidecar = null;
        if (sidecarPngData != null) {
            sidecar = emojiPngSidecarPath(target);
            if (sidecar != null) {
                Files.write(sidecar, sidecarPngData, StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING, StandardOpenOption.WRITE);
                imageEmojisFontCache = null;
            }
        }
        Map<String, Object> res = new LinkedHashMap<>();
        res.put("ok", true);
        res.put("pack", packId);
        res.put("filename", stored);
        res.put("originalFilename", original);
        res.put("size", file.data.length);
        res.put("pngSidecar", sidecar != null);
        res.put("pngSidecarFilename", sidecar == null ? "" : sidecar.getFileName().toString());
        sendJson(ex, 200, JsonUtil.obj(res));
    }


    private void handleAdminEmojiRename(HttpExchange ex) throws IOException {
        if (preflight(ex)) return;
        SessionContext ctx = requireRole(ex, Role.ADMIN);
        if (ctx == null) return;
        if (!"POST".equalsIgnoreCase(ex.getRequestMethod())) {
            sendJson(ex, 405, "{\"ok\":false,\"error\":\"method_not_allowed\"}");
            return;
        }
        ConfigValues config = plugin.configValues();
        if (!config.emojiEnabled) {
            sendJson(ex, 403, "{\"ok\":false,\"error\":\"emoji_disabled\"}");
            return;
        }
        @SuppressWarnings("unchecked")
        Map<String, String> body = (Map<String, String>) ex.getAttribute("parsedBody");
        if (body == null) body = JsonUtil.parseFlatObject(JsonUtil.readBody(ex.getRequestBody()));
        String type = String.valueOf(body.getOrDefault("type", "item")).trim().toLowerCase(Locale.ROOT);
        String newName = String.valueOf(body.getOrDefault("name", body.getOrDefault("newName", ""))).trim();
        if (newName.isBlank()) {
            sendJson(ex, 400, "{\"ok\":false,\"error\":\"invalid_name\"}");
            return;
        }

        Path root = emojiDir();
        Files.createDirectories(root);

        if ("pack".equals(type)) {
            String oldPack = normalizeEmojiPackId(body.getOrDefault("pack", ""));
            String newPack = normalizeEmojiPackId(newName);
            if (oldPack.isBlank() || newPack.isBlank() || "default".equalsIgnoreCase(oldPack) || "default".equalsIgnoreCase(newPack)) {
                sendJson(ex, 400, "{\"ok\":false,\"error\":\"invalid_pack\"}");
                return;
            }
            Path oldDir = emojiPackDir(oldPack);
            Path newDir = emojiPackDir(newPack);
            if (!validEmojiPackTarget(root, oldDir) || !validEmojiPackTarget(root, newDir)) {
                sendJson(ex, 400, "{\"ok\":false,\"error\":\"invalid_pack\"}");
                return;
            }
            if (!Files.isDirectory(oldDir)) {
                sendJson(ex, 404, "{\"ok\":false,\"error\":\"not_found\"}");
                return;
            }
            if (oldDir.equals(newDir)) {
                sendJson(ex, 200, "{\"ok\":true,\"pack\":" + JsonUtil.quote(newPack) + "}");
                return;
            }
            if (Files.exists(newDir)) {
                sendJson(ex, 409, "{\"ok\":false,\"error\":\"already_exists\"}");
                return;
            }
            Files.move(oldDir, newDir);
            sendJson(ex, 200, "{\"ok\":true,\"pack\":" + JsonUtil.quote(newPack) + "}");
            return;
        }

        String id = String.valueOf(body.getOrDefault("id", "")).trim();
        if (id.isBlank()) {
            sendJson(ex, 400, "{\"ok\":false,\"error\":\"invalid_file\"}");
            return;
        }
        EmojiCatalog catalog = scanEmojiCatalog(config);
        EmojiItem found = null;
        for (EmojiItem item : catalog.items) {
            if (id.equals(item.id)) {
                found = item;
                break;
            }
        }
        if (found == null) {
            sendJson(ex, 404, "{\"ok\":false,\"error\":\"not_found\"}");
            return;
        }
        String renamed = emojiRenameFilename(newName, found.ext);
        if (renamed.isBlank()) {
            sendJson(ex, 400, "{\"ok\":false,\"error\":\"invalid_name\"}");
            return;
        }
        Path oldFile = root.resolve(found.relativePath).normalize();
        if (!oldFile.startsWith(root) || !Files.isRegularFile(oldFile)) {
            sendJson(ex, 404, "{\"ok\":false,\"error\":\"not_found\"}");
            return;
        }
        Path target = oldFile.getParent().resolve(renamed).normalize();
        if (!target.startsWith(root)) {
            sendJson(ex, 400, "{\"ok\":false,\"error\":\"invalid_path\"}");
            return;
        }
        if (oldFile.equals(target)) {
            sendJson(ex, 200, "{\"ok\":true,\"id\":" + JsonUtil.quote(found.id) + "}");
            return;
        }
        if (Files.exists(target)) {
            sendJson(ex, 409, "{\"ok\":false,\"error\":\"already_exists\"}");
            return;
        }
        Path oldSidecar = emojiPngSidecarPath(oldFile);
        Files.move(oldFile, target);
        if (oldSidecar != null && Files.isRegularFile(oldSidecar)) {
            Path newSidecar = emojiPngSidecarPath(target);
            if (newSidecar != null && !oldSidecar.equals(newSidecar) && !Files.exists(newSidecar)) {
                Files.move(oldSidecar, newSidecar);
            }
        }
        String base = renamed.contains(".") ? renamed.substring(0, renamed.lastIndexOf('.')) : renamed;
        String newItemName = sanitizeEmojiSegment(base);
        String newId = found.pack + "/" + newItemName;
        sendJson(ex, 200, "{\"ok\":true,\"id\":" + JsonUtil.quote(newId) + ",\"filename\":" + JsonUtil.quote(renamed) + "}");
    }


    private void handleAdminEmojiDelete(HttpExchange ex) throws IOException {
        if (preflight(ex)) return;
        SessionContext ctx = requireRole(ex, Role.ADMIN);
        if (ctx == null) return;
        if (!"POST".equalsIgnoreCase(ex.getRequestMethod())) {
            sendJson(ex, 405, "{\"ok\":false,\"error\":\"method_not_allowed\"}");
            return;
        }
        ConfigValues config = plugin.configValues();
        if (!config.emojiEnabled) {
            sendJson(ex, 403, "{\"ok\":false,\"error\":\"emoji_disabled\"}");
            return;
        }
        Map<String, String> body = JsonUtil.parseFlatObject(JsonUtil.readBody(ex.getRequestBody()));
        String type = String.valueOf(body.getOrDefault("type", "item")).trim().toLowerCase(Locale.ROOT);
        Path root = emojiDir();

        if ("pack".equals(type) || body.containsKey("pack")) {
            String packId = normalizeEmojiPackId(body.getOrDefault("pack", ""));
            if (packId.isBlank() || "default".equalsIgnoreCase(packId)) {
                sendJson(ex, 400, "{\"ok\":false,\"error\":\"invalid_pack\"}");
                return;
            }
            Path packDir = emojiPackDir(packId);
            if (!validEmojiPackTarget(root, packDir) || !Files.isDirectory(packDir)) {
                sendJson(ex, 404, "{\"ok\":false,\"error\":\"not_found\"}");
                return;
            }
            try (java.util.stream.Stream<Path> stream = Files.walk(packDir)) {
                List<Path> paths = stream.sorted(Comparator.reverseOrder()).toList();
                for (Path path : paths) {
                    Path normalized = path.normalize();
                    if (!normalized.startsWith(root)) continue;
                    Files.deleteIfExists(normalized);
                }
            }
            sendJson(ex, 200, "{\"ok\":true}");
            return;
        }

        String id = String.valueOf(body.getOrDefault("id", "")).trim();
        if (id.isBlank()) {
            sendJson(ex, 400, "{\"ok\":false,\"error\":\"invalid_file\"}");
            return;
        }
        EmojiCatalog catalog = scanEmojiCatalog(config);
        EmojiItem found = null;
        for (EmojiItem item : catalog.items) {
            if (id.equals(item.id)) {
                found = item;
                break;
            }
        }
        if (found == null) {
            sendJson(ex, 404, "{\"ok\":false,\"error\":\"not_found\"}");
            return;
        }
        Path file = root.resolve(found.relativePath).normalize();
        if (!file.startsWith(root) || !Files.isRegularFile(file)) {
            sendJson(ex, 404, "{\"ok\":false,\"error\":\"not_found\"}");
            return;
        }
        Path sidecar = emojiPngSidecarPath(file);
        boolean ok = Files.deleteIfExists(file);
        if (ok && sidecar != null && Files.isRegularFile(sidecar)) Files.deleteIfExists(sidecar);
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


    private String messageForGameChat(String message, ConfigValues config) {
        return messageForGameChat(message, config, false);
    }

    private String messageForGameChat(String message, ConfigValues config, boolean forceImageEmojisSymbolOutput) {
        String text = String.valueOf(message == null ? "" : message);
        if (config == null || !config.emojiEnabled || !config.emojiGameLinkEnabled) return text;
        Matcher matcher = EMOJI_TOKEN_PATTERN.matcher(text);
        if (!matcher.find()) return text;

        EmojiCatalog catalog = scanEmojiCatalog(config);
        Map<String, EmojiItem> emojiById = new HashMap<>();
        for (EmojiItem item : catalog.items) {
            emojiById.put(item.id, item);
        }
        Map<String, String> aliasToId = emojiAliasToWebId(catalog, config);
        matcher.reset();

        String mode = String.valueOf(config.emojiGameLinkMode == null ? "link" : config.emojiGameLinkMode).trim().toLowerCase(Locale.ROOT);
        boolean imageEmojisMode = mode.equals("imageemojis") || mode.equals("imageemojis-link");
        boolean imageEmojisLinkMode = mode.equals("imageemojis-link");
        boolean fallbackLink = imageEmojisMode && config.emojiImageEmojisFallbackToLink;
        String imageEmojisOutput = normalizedImageEmojisOutput(config);
        String effectiveImageEmojisOutput = (imageEmojisMode && forceImageEmojisSymbolOutput) ? "symbol" : imageEmojisOutput;
        boolean needImageEmojisSymbols = imageEmojisMode && (effectiveImageEmojisOutput.equals("symbol") || effectiveImageEmojisOutput.equals("auto"));
        Map<String, String> imageEmojiSymbols = needImageEmojisSymbols ? loadImageEmojisSymbols(config) : Map.of();

        String shortBase = publicShortEmojiBaseUrlForGame(config);
        int maxLinks = Math.max(0, config.emojiGameLinkMaxLinksPerMessage);
        int linked = 0;
        StringBuffer out = new StringBuffer();
        while (matcher.find()) {
            String token = matcher.group(1);
            EmojiItem item = emojiItemForToken(token, emojiById, aliasToId);
            if (item == null) {
                // Unknown :name: tokens might belong to another plugin. Keep them unchanged.
                matcher.appendReplacement(out, Matcher.quoteReplacement(matcher.group(0)));
                continue;
            }

            String label = emojiGameLabel(item, config);
            String imageEmojisTemplate = emojiImageEmojisTemplateLabel(item, config);
            String replacement = imageEmojisMode ? imageEmojisTemplate : label;
            boolean convertedByImageEmojis = false;
            boolean canUseImageEmojisTemplate = imageEmojisTemplateCompatible(item);

            if (imageEmojisMode) {
                String symbol = (effectiveImageEmojisOutput.equals("symbol") || effectiveImageEmojisOutput.equals("auto"))
                        ? imageEmojiSymbolFor(item.id, item, imageEmojiSymbols)
                        : "";
                if (!symbol.isBlank()) {
                    replacement = symbol;
                    convertedByImageEmojis = true;
                } else if ((effectiveImageEmojisOutput.equals("template") || effectiveImageEmojisOutput.equals("auto")) && canUseImageEmojisTemplate) {
                    // ImageEmojis' public template format is :<emoji>:. Do not append a URL here;
                    // a trailing link can prevent the external formatter from recognizing the template.
                    replacement = imageEmojisTemplate;
                    convertedByImageEmojis = true;
                } else {
                    replacement = imageEmojisTemplate;
                }
            }

            boolean shouldAppendLink = item != null
                    && !shortBase.isBlank()
                    && (maxLinks <= 0 || linked < maxLinks)
                    && (mode.equals("link")
                        || imageEmojisLinkMode
                        || (fallbackLink && !convertedByImageEmojis && !forceImageEmojisSymbolOutput));
            if (shouldAppendLink) {
                replacement = replacement + " " + shortBase + "/" + shortEmojiId(item.id);
                linked++;
            }
            matcher.appendReplacement(out, Matcher.quoteReplacement(replacement));
        }
        matcher.appendTail(out);
        return out.toString();
    }

    private EmojiItem emojiItemForToken(String token, Map<String, EmojiItem> emojiById, Map<String, String> aliasToId) {
        String raw = String.valueOf(token == null ? "" : token).trim();
        if (raw.isBlank()) return null;
        EmojiItem item = emojiById == null ? null : emojiById.get(raw);
        if (item != null) return item;
        String id = emojiAliasLookup(aliasToId, raw);
        if (id != null && emojiById != null) return emojiById.get(id);
        return null;
    }

    private String normalizedImageEmojisOutput(ConfigValues config) {
        String v = String.valueOf(config == null || config.emojiImageEmojisOutput == null ? "template" : config.emojiImageEmojisOutput)
                .trim().toLowerCase(Locale.ROOT);
        if (v.equals("symbol") || v.equals("actual") || v.equals("unicode")) return "symbol";
        if (v.equals("auto")) return "auto";
        return "template";
    }

    private boolean imageEmojisTemplateCompatible(EmojiItem item) {
        if (item == null) return false;
        return emojiNeedsGamePng(item.ext);
    }

    private String normalizeGameEmojiForWeb(String message, ConfigValues config) {
        String text = String.valueOf(message == null ? "" : message);
        if (config == null || !config.emojiEnabled || text.isBlank()) return text;
        EmojiCatalog catalog = scanEmojiCatalog(config);
        if (catalog.items.isEmpty()) return text;

        Map<String, String> aliasToId = emojiAliasToWebId(catalog, config);
        if (!aliasToId.isEmpty()) {
            Map<String, String> symbols = loadImageEmojisSymbols(config);
            text = replaceImageEmojiSymbolsWithWebTokens(text, catalog, symbols, config, aliasToId);
            text = replaceImageEmojiAliasTokensWithWebTokens(text, aliasToId);
        }
        return text;
    }

    private Map<String, String> emojiAliasToWebId(EmojiCatalog catalog, ConfigValues config) {
        Map<String, String> out = new LinkedHashMap<>();
        if (catalog == null) return out;

        // Explicit mapping has the highest priority. This is important when ImageEmojis uses
        // flat :name: aliases while BM Web Chat keeps emojis in pack/name folders.
        if (config != null && config.emojiImageEmojisAliases != null) {
            for (Map.Entry<String, String> entry : config.emojiImageEmojisAliases.entrySet()) {
                String alias = String.valueOf(entry.getKey() == null ? "" : entry.getKey()).trim();
                String id = String.valueOf(entry.getValue() == null ? "" : entry.getValue()).trim();
                if (alias.isBlank() || id.isBlank()) continue;
                EmojiItem item = emojiItemById(catalog, id);
                if (item != null) addEmojiAlias(out, alias, item.id);
            }
        }

        // Fully-qualified IDs are always unambiguous.
        for (EmojiItem item : catalog.items) {
            addEmojiAlias(out, item.id, item.id);
            addEmojiAlias(out, emojiTokenFallbackLabel(item.id), item.id);
            if (item.pack != null && !item.pack.isBlank()) {
                addEmojiAlias(out, item.pack + "/" + item.name, item.id);
                addEmojiAlias(out, item.pack + "/" + item.label, item.id);
            }
        }

        // If a default ImageEmojis pack is configured, prefer that pack for flat :name: aliases.
        String defaultPack = normalizedEmojiPackName(config == null ? "" : config.emojiImageEmojisDefaultPack);
        if (!defaultPack.isBlank()) {
            for (EmojiItem item : catalog.items) {
                if (!normalizedEmojiPackName(item.pack).equals(defaultPack)
                        && !normalizedEmojiPackName(item.label).equals(defaultPack)) continue;
                addEmojiAlias(out, item.name, item.id);
                addEmojiAlias(out, item.label, item.id);
                addEmojiAlias(out, emojiGameLabel(item, config), item.id);
            }
        }

        // For non-conflicting names, let :name: work automatically. Ambiguous aliases are
        // intentionally skipped to avoid mapping ImageEmojis glyphs to the wrong web emoji.
        Map<String, List<EmojiItem>> byAlias = new LinkedHashMap<>();
        for (EmojiItem item : catalog.items) {
            collectEmojiAliasCandidate(byAlias, item.name, item);
            collectEmojiAliasCandidate(byAlias, item.label, item);
            collectEmojiAliasCandidate(byAlias, emojiGameLabel(item, config), item);
        }
        for (Map.Entry<String, List<EmojiItem>> entry : byAlias.entrySet()) {
            List<EmojiItem> matches = entry.getValue();
            if (matches.size() == 1) addEmojiAlias(out, entry.getKey(), matches.get(0).id);
        }
        return out;
    }

    private EmojiItem emojiItemById(EmojiCatalog catalog, String id) {
        String raw = stripControl(id, 200).trim();
        if (catalog == null || raw.isBlank()) return null;
        for (EmojiItem item : catalog.items) {
            if (item.id.equals(raw)) return item;
        }
        return null;
    }

    private String normalizedEmojiPackName(String value) {
        String raw = stripControl(value, 200).trim();
        if (raw.isBlank()) return "";
        try {
            raw = java.text.Normalizer.normalize(raw, java.text.Normalizer.Form.NFC);
        } catch (Throwable ignored) {
        }
        return raw.toLowerCase(Locale.ROOT);
    }

    private void collectEmojiAliasCandidate(Map<String, List<EmojiItem>> byAlias, String alias, EmojiItem item) {
        if (byAlias == null || item == null) return;
        for (String key : emojiAliasKeys(alias)) {
            String cleaned = key.trim();
            if (cleaned.isBlank()) continue;
            byAlias.computeIfAbsent(cleaned, ignored -> new ArrayList<>()).add(item);
            String lower = cleaned.toLowerCase(Locale.ROOT);
            if (!lower.equals(cleaned)) byAlias.computeIfAbsent(lower, ignored -> new ArrayList<>()).add(item);
        }
    }

    private void addEmojiAlias(Map<String, String> out, String alias, String id) {
        String value = stripControl(id, 200).trim();
        if (value.isBlank()) return;
        for (String key : emojiAliasKeys(alias)) {
            if (key.isBlank()) continue;
            out.putIfAbsent(key, value);
            out.putIfAbsent(key.toLowerCase(Locale.ROOT), value);
        }
    }

    private List<String> emojiAliasKeys(String alias) {
        String raw = stripControl(alias, 200).trim();
        if (raw.isBlank()) return List.of();
        List<String> keys = new ArrayList<>();
        addEmojiAliasKey(keys, raw);
        if (raw.startsWith(":") && raw.endsWith(":") && raw.length() > 2) {
            String inner = raw.substring(1, raw.length() - 1).trim();
            if (inner.startsWith("emoji:") && inner.length() > "emoji:".length()) {
                inner = inner.substring("emoji:".length()).trim();
            }
            addEmojiAliasKey(keys, inner);
        }
        if (raw.startsWith("emoji:") && raw.length() > "emoji:".length()) {
            addEmojiAliasKey(keys, raw.substring("emoji:".length()).trim());
        }
        return keys;
    }

    private void addEmojiAliasKey(List<String> keys, String value) {
        String key = String.valueOf(value == null ? "" : value).trim();
        if (key.isBlank()) return;
        keys.add(key);
        try {
            String nfc = java.text.Normalizer.normalize(key, java.text.Normalizer.Form.NFC);
            String nfkc = java.text.Normalizer.normalize(key, java.text.Normalizer.Form.NFKC);
            if (!nfc.equals(key)) keys.add(nfc);
            if (!nfkc.equals(key) && !nfkc.equals(nfc)) keys.add(nfkc);
        } catch (Throwable ignored) {
        }
    }


    private String emojiAliasLookup(Map<String, String> aliasToId, String alias) {
        if (aliasToId == null || aliasToId.isEmpty()) return null;
        for (String key : emojiAliasKeys(alias)) {
            String id = aliasToId.get(key);
            if (id == null) id = aliasToId.get(key.toLowerCase(Locale.ROOT));
            if (id != null && !id.isBlank()) return id;
        }
        return null;
    }

    private String replaceImageEmojiAliasTokensWithWebTokens(String text, Map<String, String> aliasToId) {
        Matcher matcher = IMAGEEMOJIS_ALIAS_TOKEN_PATTERN.matcher(text);
        StringBuffer out = new StringBuffer();
        while (matcher.find()) {
            String alias = String.valueOf(matcher.group(1));
            String id = emojiAliasLookup(aliasToId, alias);
            if (id == null || id.isBlank()) {
                matcher.appendReplacement(out, Matcher.quoteReplacement(matcher.group(0)));
            } else {
                matcher.appendReplacement(out, Matcher.quoteReplacement(":" + id + ":"));
            }
        }
        matcher.appendTail(out);
        return out.toString();
    }

    private String replaceImageEmojiSymbolsWithWebTokens(String text, EmojiCatalog catalog, Map<String, String> symbols,
                                                          ConfigValues config, Map<String, String> aliasToId) {
        Map<String, String> symbolToId = imageEmojiSymbolToWebId(catalog, symbols, config, aliasToId);
        if (symbolToId.isEmpty()) return text;
        List<Map.Entry<String, String>> entries = new ArrayList<>(symbolToId.entrySet());
        entries.sort((a, b) -> Integer.compare(b.getKey().length(), a.getKey().length()));
        String out = text;
        for (Map.Entry<String, String> entry : entries) {
            String symbol = entry.getKey();
            String id = entry.getValue();
            if (symbol == null || symbol.isBlank() || id == null || id.isBlank()) continue;
            out = out.replace(symbol, ":" + id + ":");
        }
        return out;
    }

    private Map<String, List<String>> imageEmojiSymbolsByWebId(EmojiCatalog catalog, ConfigValues config) {
        LinkedHashMap<String, LinkedHashSet<String>> grouped = new LinkedHashMap<>();
        if (catalog == null || catalog.items.isEmpty()) return Map.of();
        Map<String, String> aliasToId = emojiAliasToWebId(catalog, config);
        Map<String, String> symbols = loadImageEmojisSymbols(config);
        Map<String, String> symbolToId = imageEmojiSymbolToWebId(catalog, symbols, config, aliasToId);
        for (Map.Entry<String, String> entry : symbolToId.entrySet()) {
            String symbol = firstUnicodeSymbol(entry.getKey());
            String id = String.valueOf(entry.getValue() == null ? "" : entry.getValue()).trim();
            if (symbol.isBlank() || id.isBlank()) continue;
            grouped.computeIfAbsent(id, ignored -> new LinkedHashSet<>()).add(symbol);
        }
        LinkedHashMap<String, List<String>> out = new LinkedHashMap<>();
        for (Map.Entry<String, LinkedHashSet<String>> entry : grouped.entrySet()) {
            out.put(entry.getKey(), new ArrayList<>(entry.getValue()));
        }
        return out;
    }

    private Map<String, String> imageEmojiSymbolToWebId(EmojiCatalog catalog, Map<String, String> symbols,
                                                        ConfigValues config, Map<String, String> aliasToId) {
        LinkedHashMap<String, String> out = new LinkedHashMap<>();
        if (catalog == null || catalog.items.isEmpty()) return out;
        Map<String, String> aliases = aliasToId == null || aliasToId.isEmpty() ? emojiAliasToWebId(catalog, config) : aliasToId;

        // 1) Prefer the generated resource-pack font map when available.
        // ImageEmojis writes providers like minecraft:font/<filename>.png -> ["\\u...."].
        // The key can be "font/name", "textures/font/name", or just "name" depending on the parser/source.
        if (symbols != null && !symbols.isEmpty()) {
            for (Map.Entry<String, String> entry : symbols.entrySet()) {
                String symbol = firstUnicodeSymbol(entry.getValue());
                if (symbol.isBlank()) continue;
                for (String key : imageEmojiSymbolKeyAliases(entry.getKey())) {
                    String id = emojiAliasLookup(aliases, key);
                    if (id != null && !id.isBlank()) {
                        putImageEmojiSymbolToId(out, symbol, id);
                    }
                }
            }
            for (EmojiItem item : catalog.items) {
                String symbol = firstUnicodeSymbol(imageEmojiSymbolFor(item.id, item, symbols));
                if (!symbol.isBlank()) putImageEmojiSymbolToId(out, symbol, item.id);
            }
        }

        // 2) Optional unsafe fallback: reproduce ImageEmojis' hash algorithm from file names.
        // This is disabled by default because the ImageEmojis range can collide, and BM Web Chat
        // may have duplicate file names across packs. When it guesses wrong, the web UI shows a
        // different emoji than Minecraft. Prefer runtime/zip mappings plus explicit aliases.
        if (config != null && config.emojiImageEmojisGeneratedSymbolFallback) {
            for (EmojiItem item : catalog.items) {
                for (String fileName : imageEmojiFileNameCandidates(item)) {
                    for (String symbol : imageEmojiGeneratedSymbols(fileName)) {
                        putImageEmojiSymbolToId(out, symbol, item.id);
                    }
                }
            }

            Path emojiDir = imageEmojisEmojiDirectory(config);
            if (emojiDir != null && Files.isDirectory(emojiDir)) {
                try (java.util.stream.Stream<Path> stream = Files.list(emojiDir)) {
                    stream.filter(Files::isRegularFile).forEach(path -> {
                        String fileName = path.getFileName() == null ? "" : path.getFileName().toString();
                        if (!"png".equalsIgnoreCase(extension(fileName))) return;
                        String base = fileName.contains(".") ? fileName.substring(0, fileName.lastIndexOf('.')) : fileName;
                        String id = emojiAliasLookup(aliases, base);
                        if (id == null || id.isBlank()) return;
                        for (String symbol : imageEmojiGeneratedSymbols(fileName)) {
                            putImageEmojiSymbolToId(out, symbol, id);
                        }
                    });
                } catch (IOException ignored) {
                }
            }
        }

        return out;
    }

    private void putImageEmojiSymbolToId(Map<String, String> out, String symbol, String id) {
        String s = firstUnicodeSymbol(symbol);
        if (s.isBlank() || id == null || id.isBlank()) return;
        out.putIfAbsent(s, id);
    }

    private List<String> imageEmojiSymbolKeyAliases(String key) {
        LinkedHashSet<String> keys = new LinkedHashSet<>();
        String raw = String.valueOf(key == null ? "" : key).replace('\\', '/').trim();
        if (raw.isBlank()) return new ArrayList<>(keys);
        addImageEmojiAliasCandidate(keys, raw);
        int colon = raw.indexOf(':');
        if (colon >= 0 && colon + 1 < raw.length()) addImageEmojiAliasCandidate(keys, raw.substring(colon + 1));
        String noNamespace = colon >= 0 && colon + 1 < raw.length() ? raw.substring(colon + 1) : raw;
        String noExt = noNamespace.replaceFirst("(?i)\\.(png|webp|gif|jpg|jpeg)$", "");
        addImageEmojiAliasCandidate(keys, noExt);
        for (String prefix : new String[]{"textures/font/", "textures/", "font/", "emojis/"}) {
            if (noExt.regionMatches(true, 0, prefix, 0, prefix.length())) {
                addImageEmojiAliasCandidate(keys, noExt.substring(prefix.length()));
            }
            String marker = "/" + prefix;
            int idx = noExt.toLowerCase(Locale.ROOT).indexOf(marker.toLowerCase(Locale.ROOT));
            if (idx >= 0 && idx + marker.length() < noExt.length()) {
                addImageEmojiAliasCandidate(keys, noExt.substring(idx + marker.length()));
            }
        }
        int slash = noExt.lastIndexOf('/');
        if (slash >= 0 && slash + 1 < noExt.length()) addImageEmojiAliasCandidate(keys, noExt.substring(slash + 1));
        return new ArrayList<>(keys);
    }

    private void addImageEmojiAliasCandidate(Set<String> keys, String value) {
        String v = stripControl(String.valueOf(value == null ? "" : value), 200).trim();
        if (v.isBlank()) return;
        keys.add(v);
        String noExt = v.replaceFirst("(?i)\\.(png|webp|gif|jpg|jpeg)$", "");
        if (!noExt.isBlank()) keys.add(noExt);
    }

    private List<String> imageEmojiFileNameCandidates(EmojiItem item) {
        LinkedHashSet<String> files = new LinkedHashSet<>();
        if (item == null) return new ArrayList<>(files);
        for (String candidate : new String[]{item.name, item.label, emojiTokenFallbackLabel(item.id).replace(":", "")}) {
            String base = stripControl(candidate, 160).trim();
            if (base.isBlank()) continue;
            base = base.replace('\\', '/');
            int slash = base.lastIndexOf('/');
            if (slash >= 0 && slash + 1 < base.length()) base = base.substring(slash + 1);
            if (base.isBlank()) continue;
            files.add(base + ".png");
            files.add(base.toLowerCase(Locale.ROOT) + ".png");
        }
        return new ArrayList<>(files);
    }

    private List<String> imageEmojiGeneratedSymbols(String fileName) {
        String name = String.valueOf(fileName == null ? "" : fileName).trim();
        if (name.isBlank()) return List.of();
        if (!name.toLowerCase(Locale.ROOT).endsWith(".png")) name = name + ".png";
        name = name.toLowerCase(Locale.ROOT);
        LinkedHashSet<String> out = new LinkedHashSet<>();
        String fileNameHash = sha256Hex(name);
        if (!fileNameHash.isBlank()) {
            out.add(String.valueOf((char) hashToRange(fileNameHash, 0xEFF2L, 0xEFF2L + 2000L)));
            out.add(String.valueOf((char) hashToRange(fileNameHash, 0xE000L, 0xE000L + 6400L)));
        }
        return new ArrayList<>(out);
    }

    private long hashToRange(String input, long start, long end) {
        if (start >= end) return start;
        String hex = sha256Hex(input);
        if (hex.isBlank()) return start;
        BigInteger hashValue = new BigInteger(hex, 16);
        return start + hashValue.mod(BigInteger.valueOf(end - start)).longValue();
    }

    private String sha256Hex(String input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashBytes = digest.digest(String.valueOf(input == null ? "" : input).getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder(hashBytes.length * 2);
            for (byte b : hashBytes) hex.append(String.format("%02x", b));
            return hex.toString();
        } catch (Throwable t) {
            return "";
        }
    }

    private String firstUnicodeSymbol(String value) {
        String s = String.valueOf(value == null ? "" : value);
        if (s.isBlank()) return "";
        int cp = s.codePointAt(0);
        if (cp <= 0) return "";
        return new String(Character.toChars(cp));
    }

    private Path imageEmojisEmojiDirectory(ConfigValues config) {
        Path zip = imageEmojisResourcePackPath(config);
        if (zip != null && zip.getParent() != null) return zip.getParent().resolve("emojis").normalize();
        return plugin.getDataFolder().toPath().resolve("../ImageEmojis/emojis").normalize();
    }

    private String emojiGameLabel(EmojiItem item, ConfigValues config) {
        String name = stripControl(item == null ? "" : item.name, 40).trim();
        if (name.isBlank() && item != null) name = stripControl(item.label, 40).trim();
        if (name.isBlank()) name = "emoji";
        String pack = stripControl(item == null ? "" : item.pack, 40).trim();
        String format = config == null ? "" : String.valueOf(config.emojiGameLinkLabelFormat == null ? "" : config.emojiGameLinkLabelFormat);
        if (format.isBlank()) format = ":{id}:";
        return stripControl(format
                .replace("{name}", name)
                .replace("{pack}", pack)
                .replace("{id}", item == null ? name : item.id), 96).trim();
    }


    private String emojiImageEmojisTemplateLabel(EmojiItem item, ConfigValues config) {
        String format = config == null ? "" : String.valueOf(config.emojiImageEmojisTemplateFormat == null ? "" : config.emojiImageEmojisTemplateFormat);
        if (format.isBlank()) format = ":{id}:";
        String name = stripControl(item == null ? "" : item.name, 80).trim();
        if (name.isBlank() && item != null) name = stripControl(item.label, 80).trim();
        if (name.isBlank()) name = "emoji";
        String pack = stripControl(item == null ? "" : item.pack, 80).trim();
        String id = stripControl(item == null ? name : item.id, 160).trim();
        if (id.isBlank()) id = pack.isBlank() ? name : pack + "/" + name;
        return stripControl(format
                .replace("{name}", name)
                .replace("{pack}", pack)
                .replace("{id}", id), 192).trim();
    }

    private String emojiTokenFallbackLabel(String id) {
        String raw = String.valueOf(id == null ? "" : id).replace("\\", "/");
        int slash = raw.lastIndexOf('/');
        String name = slash >= 0 ? raw.substring(slash + 1) : raw;
        name = stripControl(name, 40).trim();
        if (name.isBlank()) name = "emoji";
        return ":" + name + ":";
    }

    private String imageEmojiSymbolFor(String id, EmojiItem item, Map<String, String> symbols) {
        if (symbols == null || symbols.isEmpty()) return "";
        List<String> keys = new ArrayList<>();
        String rawId = String.valueOf(id == null ? "" : id).replace("\\", "/").trim();
        if (!rawId.isBlank()) keys.add(rawId);
        int slash = rawId.lastIndexOf('/');
        if (slash >= 0 && slash + 1 < rawId.length()) keys.add(rawId.substring(slash + 1));
        if (item != null) {
            if (item.id != null && !item.id.isBlank()) keys.add(item.id);
            if (item.name != null && !item.name.isBlank()) keys.add(item.name);
            if (item.label != null && !item.label.isBlank()) keys.add(item.label);
        }
        for (String key : keys) {
            String symbol = symbols.get(key);
            if (symbol == null) symbol = symbols.get(key.toLowerCase(Locale.ROOT));
            if (symbol != null && !symbol.isBlank()) return symbol;
        }
        return "";
    }

    private Map<String, String> loadImageEmojisSymbols(ConfigValues config) {
        LinkedHashMap<String, String> merged = new LinkedHashMap<>();

        // Best source: the running ImageEmojis plugin already knows the exact name -> glyph mapping.
        // This avoids guessing the character from file hashes and also works when ImageEmojis settings
        // such as extendedUnicodeRange differ from BM Web Chat's defaults.
        Map<String, String> runtimeSymbols = readImageEmojisRuntimeSymbols();
        if (runtimeSymbols != null && !runtimeSymbols.isEmpty()) merged.putAll(runtimeSymbols);

        Path path = imageEmojisResourcePackPath(config);
        if (path != null) {
            try {
                if (Files.isRegularFile(path)) {
                    long modifiedAt = Files.getLastModifiedTime(path).toMillis();
                    long size = Files.size(path);
                    ImageEmojisFontCache cache = imageEmojisFontCache;
                    Map<String, String> zipSymbols;
                    if (cache != null && path.equals(cache.path) && modifiedAt == cache.modifiedAt && size == cache.size) {
                        zipSymbols = cache.symbols;
                    } else {
                        zipSymbols = readImageEmojisSymbols(path);
                        imageEmojisFontCache = new ImageEmojisFontCache(path, modifiedAt, size, zipSymbols);
                    }
                    if (zipSymbols != null && !zipSymbols.isEmpty()) {
                        for (Map.Entry<String, String> entry : zipSymbols.entrySet()) {
                            merged.putIfAbsent(entry.getKey(), entry.getValue());
                        }
                    }
                }
            } catch (Throwable ignored) {
            }
        }

        return merged.isEmpty() ? Map.of() : java.util.Collections.unmodifiableMap(new LinkedHashMap<>(merged));
    }

    private Map<String, String> readImageEmojisRuntimeSymbols() {
        LinkedHashMap<String, String> out = new LinkedHashMap<>();
        try {
            Object imageEmojisPlugin = Bukkit.getPluginManager().getPlugin("ImageEmojis");
            if (imageEmojisPlugin == null) return Map.of();
            Object repository = invokeNoArg(imageEmojisPlugin, "getEmojiRepository");
            if (repository == null) return Map.of();
            Object emojisObject = invokeNoArg(repository, "getEmojis");
            if (!(emojisObject instanceof Iterable<?> emojis)) return Map.of();
            for (Object emoji : emojis) {
                if (emoji == null) continue;
                String symbol = firstUnicodeSymbol(reflectString(emoji, "getAsUtf8Symbol"));
                if (symbol.isBlank()) symbol = firstImageEmojiRuntimeSymbol(invokeNoArg(emoji, "getChars"));
                if (symbol.isBlank()) continue;
                String name = reflectString(emoji, "getName");
                String fileName = reflectString(emoji, "getFileName");
                String template = reflectString(emoji, "getTemplate");
                putImageEmojiSymbolKey(out, name, symbol);
                putImageEmojiSymbolKey(out, template, symbol);
                if (!fileName.isBlank()) addImageEmojiSymbolKeys(out, fileName, symbol);
            }
        } catch (Throwable ignored) {
            return Map.of();
        }
        return out.isEmpty() ? Map.of() : java.util.Collections.unmodifiableMap(new LinkedHashMap<>(out));
    }

    private Object invokeNoArg(Object target, String methodName) {
        if (target == null || methodName == null || methodName.isBlank()) return null;
        try {
            java.lang.reflect.Method method = target.getClass().getMethod(methodName);
            method.setAccessible(true);
            return method.invoke(target);
        } catch (Throwable ignored) {
            return null;
        }
    }

    private String reflectString(Object target, String methodName) {
        Object value = invokeNoArg(target, methodName);
        return stripControl(String.valueOf(value == null ? "" : value), 200).trim();
    }

    private String firstImageEmojiRuntimeSymbol(Object charsObject) {
        if (charsObject instanceof Iterable<?> chars) {
            for (Object value : chars) {
                String symbol = decodeImageEmojiSymbol(String.valueOf(value == null ? "" : value));
                if (!symbol.isBlank()) return symbol;
            }
            return "";
        }
        return decodeImageEmojiSymbol(String.valueOf(charsObject == null ? "" : charsObject));
    }

    private String decodeImageEmojiSymbol(String value) {
        String raw = String.valueOf(value == null ? "" : value).trim();
        if (raw.isBlank()) return "";
        // ImageEmojis stores chars as strings like "\uF234" in EmojiModel,
        // while already-serialized JSON may contain the actual PUA glyph.
        String decoded = decodeJsonString(raw);
        return firstUnicodeSymbol(decoded);
    }

    private Path imageEmojisResourcePackPath(ConfigValues config) {
        String configured = config == null ? "" : String.valueOf(config.emojiImageEmojisResourcePackZip == null ? "" : config.emojiImageEmojisResourcePackZip).trim();
        if (configured.isBlank()) configured = "../ImageEmojis/emojis.zip";
        Path path = Path.of(configured);
        if (!path.isAbsolute()) path = plugin.getDataFolder().toPath().resolve(path);
        return path.normalize();
    }

    private Map<String, String> readImageEmojisSymbols(Path zipPath) throws IOException {
        Map<String, String> out = new HashMap<>();
        Pattern providerBlockPattern = Pattern.compile("\\{[\\s\\S]{0,8000}?\"type\"\\s*:\\s*\"bitmap\"[\\s\\S]{0,8000}?\\}", Pattern.CASE_INSENSITIVE);
        Pattern filePattern = Pattern.compile("\"file\"\\s*:\\s*\"([^\"]+)\"", Pattern.CASE_INSENSITIVE);
        Pattern charsPattern = Pattern.compile("\"chars\"\\s*:\\s*\\[\\s*\"([^\"]+)\"", Pattern.CASE_INSENSITIVE);
        try (ZipInputStream zin = new ZipInputStream(Files.newInputStream(zipPath))) {
            ZipEntry entry;
            while ((entry = zin.getNextEntry()) != null) {
                String name = entry.getName();
                if (entry.isDirectory() || name == null || !name.endsWith(".json") || !name.contains("/font/")) continue;
                String json = new String(readAllBytesLimited(zin, 16 * 1024 * 1024), StandardCharsets.UTF_8);
                Matcher blockMatcher = providerBlockPattern.matcher(json);
                while (blockMatcher.find()) {
                    String block = blockMatcher.group(0);
                    Matcher fileMatcher = filePattern.matcher(block);
                    Matcher charsMatcher = charsPattern.matcher(block);
                    if (!fileMatcher.find() || !charsMatcher.find()) continue;
                    String file = decodeJsonString(fileMatcher.group(1));
                    String symbol = firstUnicodeSymbol(decodeJsonString(charsMatcher.group(1)));
                    if (file.isBlank() || symbol.isBlank()) continue;
                    addImageEmojiSymbolKeys(out, file, symbol);
                }
            }
        }
        return out.isEmpty() ? Map.of() : java.util.Collections.unmodifiableMap(new LinkedHashMap<>(out));
    }

    private byte[] readAllBytesLimited(InputStream in, int maxBytes) throws IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        byte[] buf = new byte[8192];
        int total = 0;
        int n;
        while ((n = in.read(buf)) >= 0) {
            total += n;
            if (total > maxBytes) break;
            out.write(buf, 0, n);
        }
        return out.toByteArray();
    }

    private void addImageEmojiSymbolKeys(Map<String, String> out, String file, String symbol) {
        String normalized = String.valueOf(file == null ? "" : file).replace('\\', '/');
        int colon = normalized.indexOf(':');
        if (colon >= 0 && colon + 1 < normalized.length()) normalized = normalized.substring(colon + 1);
        normalized = normalized.replaceFirst("(?i)\\.(png|webp|gif|jpg|jpeg)$", "");
        normalized = normalized.replaceFirst("^/", "");
        normalized = normalized.replaceFirst("^(?:assets/minecraft/)?", "");
        normalized = normalized.replaceFirst("^(?:textures/)?", "");
        normalized = normalized.replaceFirst("^(?:font/)?", "");
        if (normalized.isBlank()) return;
        putImageEmojiSymbolKey(out, normalized, symbol);
        int slash = normalized.lastIndexOf('/');
        if (slash >= 0 && slash + 1 < normalized.length()) {
            putImageEmojiSymbolKey(out, normalized.substring(slash + 1), symbol);
        }
        String marker = "/emojis/";
        int idx = normalized.indexOf(marker);
        if (idx >= 0 && idx + marker.length() < normalized.length()) {
            putImageEmojiSymbolKey(out, normalized.substring(idx + marker.length()), symbol);
        }
    }

    private void putImageEmojiSymbolKey(Map<String, String> out, String key, String symbol) {
        String cleaned = stripControl(String.valueOf(key == null ? "" : key), 160).trim();
        if (cleaned.isBlank() || symbol == null || symbol.isBlank()) return;
        out.putIfAbsent(cleaned, symbol);
        out.putIfAbsent(cleaned.toLowerCase(Locale.ROOT), symbol);
    }

    private String decodeJsonString(String value) {
        String s = String.valueOf(value == null ? "" : value);
        StringBuilder out = new StringBuilder(s.length());
        for (int i = 0; i < s.length(); i++) {
            char ch = s.charAt(i);
            if (ch != '\\' || i + 1 >= s.length()) {
                out.append(ch);
                continue;
            }
            char n = s.charAt(++i);
            switch (n) {
                case 'n' -> out.append('\n');
                case 'r' -> out.append('\r');
                case 't' -> out.append('\t');
                case 'b' -> out.append('\b');
                case 'f' -> out.append('\f');
                case '\\' -> out.append('\\');
                case '"' -> out.append('"');
                case '/' -> out.append('/');
                case 'u' -> {
                    if (i + 4 <= s.length() - 1) {
                        String hex = s.substring(i + 1, i + 5);
                        try {
                            out.append((char) Integer.parseInt(hex, 16));
                            i += 4;
                        } catch (NumberFormatException ex) {
                            out.append("\\u").append(hex);
                            i += 4;
                        }
                    } else {
                        out.append("\\u");
                    }
                }
                default -> out.append(n);
            }
        }
        return out.toString();
    }

    private String applyReplyGamePrefix(ChatMessage msg, String gameMessage, ConfigValues config) {
        String text = String.valueOf(gameMessage == null ? "" : gameMessage);
        if (msg == null || config == null || !config.replyGamePrefixEnabled) return text;
        if (msg.replyToId == null || msg.replyToId.isBlank()) return text;
        String prefix = String.valueOf(config.replyGamePrefixText == null ? "" : config.replyGamePrefixText);
        if (prefix.isBlank()) return text;
        String sender = stripControl(msg.replyToSender, 64);
        String preview = stripControl(msg.replyToPreview, 120);
        prefix = prefix
                .replace("{sender}", sender)
                .replace("{preview}", preview)
                .replace("{id}", stripControl(msg.replyToId, 96));
        // Keep intentional trailing spaces in values such as "[Reply] ". stripControl()
        // trims, so sanitize the prefix locally instead.
        StringBuilder sanitizedPrefix = new StringBuilder(prefix.length());
        for (int i = 0; i < prefix.length(); i++) {
            char ch = prefix.charAt(i);
            if (ch == '\n' || ch == '\r') {
                sanitizedPrefix.append(' ');
            } else if (ch == '\t' || !Character.isISOControl(ch)) {
                sanitizedPrefix.append(ch);
            }
        }
        prefix = sanitizedPrefix.toString();
        if (prefix.length() > 160) prefix = prefix.substring(0, 160);
        return prefix.isBlank() ? text : prefix + text;
    }

    private String publicShortEmojiBaseUrlForGame(ConfigValues config) {
        String api = publicApiBaseUrlForGame(config);
        return api.isBlank() ? "" : api + "/e";
    }

    private String publicApiBaseUrlForGame(ConfigValues config) {
        if (config == null) return "";
        for (String candidate : new String[]{
                config.emojiGameLinkPublicApiBaseUrl,
                config.apiBaseUrl,
                config.standaloneWebApiBaseUrl,
                config.emojiPublicBaseUrl
        }) {
            String resolved = normalizeGamePublicApiBaseUrl(candidate, config);
            if (!resolved.isBlank()) return stripKnownResourceSuffix(resolved);
        }
        String origin = configuredCorsOrigin(config);
        if (!origin.isBlank()) {
            return trimTrailingSlash(origin + normalizeContextPrefix(config.pathPrefix, "/api"));
        }
        return "";
    }

    private String normalizeGamePublicApiBaseUrl(String configured, ConfigValues config) {
        String value = String.valueOf(configured == null ? "" : configured).trim();
        if (value.isBlank()) return "";
        if (value.startsWith("http://") || value.startsWith("https://")) {
            return trimTrailingSlash(value);
        }
        if (value.startsWith("//")) {
            return trimTrailingSlash("https:" + value);
        }
        String origin = configuredCorsOrigin(config);
        if (origin.isBlank()) return "";
        if (value.startsWith("/")) return trimTrailingSlash(origin + value);
        return trimTrailingSlash(origin + "/" + value.replaceFirst("^/+", ""));
    }

    private String shortEmojiId(String emojiId) {
        return SecurityUtil.sha256Hex(String.valueOf(emojiId == null ? "" : emojiId)).substring(0, 8);
    }


    private boolean shouldTryClickableUrlsAfterImageEmojisConversion(ChatMessage msg, ConfigValues config) {
        if (config == null || !config.emojiEnabled || !config.emojiGameLinkEnabled) return false;
        if (!config.emojiImageEmojisClickableUrlsAfterConversion) return false;
        if (!config.clickableUrlsInGame) return false;
        String rawMessage = String.valueOf(msg == null || msg.message == null ? "" : msg.message);
        if (!containsUrl(rawMessage)) return false;
        String mode = String.valueOf(config.emojiGameLinkMode == null ? "" : config.emojiGameLinkMode).trim().toLowerCase(Locale.ROOT);
        if (!mode.equals("imageemojis") && !mode.equals("imageemojis-link")) return false;
        return containsKnownImageEmojisTemplate(rawMessage, config);
    }

    private boolean shouldPreservePlainBroadcastForImageEmojis(ChatMessage msg, String renderedLine, ConfigValues config) {
        if (config == null || !config.emojiEnabled || !config.emojiGameLinkEnabled) return false;
        if (!config.emojiImageEmojisPlainBroadcastWithUrls) return false;
        if (!config.clickableUrlsInGame || !containsUrl(renderedLine)) return false;
        String mode = String.valueOf(config.emojiGameLinkMode == null ? "" : config.emojiGameLinkMode).trim().toLowerCase(Locale.ROOT);
        if (!mode.equals("imageemojis") && !mode.equals("imageemojis-link")) return false;
        String output = normalizedImageEmojisOutput(config);
        if (!output.equals("template") && !output.equals("auto")) return false;
        // When clickable-urls-after-conversion is enabled, messageForGameChat() already
        // tried to replace ImageEmojis templates with the actual generated symbols before
        // this check. Only fall back to plain broadcast if a known template still remains
        // in the final rendered line. Checking the original web message here would force
        // plain broadcast even after successful conversion, which prevents clickable URLs.
        if (config.emojiImageEmojisClickableUrlsAfterConversion) {
            return containsKnownImageEmojisTemplate(String.valueOf(renderedLine == null ? "" : renderedLine), config);
        }
        return containsKnownImageEmojisTemplate(String.valueOf(msg == null ? "" : msg.message), config)
                || containsKnownImageEmojisTemplate(String.valueOf(renderedLine == null ? "" : renderedLine), config);
    }

    private boolean containsKnownImageEmojisTemplate(String text, ConfigValues config) {
        String raw = String.valueOf(text == null ? "" : text);
        if (raw.isBlank()) return false;
        Matcher matcher = EMOJI_TOKEN_PATTERN.matcher(raw);
        if (!matcher.find()) return false;
        EmojiCatalog catalog = scanEmojiCatalog(config);
        if (catalog.items.isEmpty()) return false;
        Map<String, EmojiItem> emojiById = new HashMap<>();
        for (EmojiItem item : catalog.items) {
            emojiById.put(item.id, item);
        }
        Map<String, String> aliasToId = emojiAliasToWebId(catalog, config);
        matcher.reset();
        while (matcher.find()) {
            EmojiItem item = emojiItemForToken(matcher.group(1), emojiById, aliasToId);
            if (item != null && imageEmojisTemplateCompatible(item)) return true;
        }
        return false;
    }

    private void sendToGame(ChatMessage msg, String format) {
        ConfigValues config = plugin.configValues();
        if (!config.sendWebChatToGame) return;

        // Translate color/format codes only in the configured template, not in user text.
        // This keeps user-provided literals such as "&n", "&l", "&a" intact when relayed to game chat.
        String template = ChatColor.translateAlternateColorCodes('&', format);
        boolean forceImageEmojisSymbolOutput = shouldTryClickableUrlsAfterImageEmojisConversion(msg, config);
        String gameMessage = applyReplyGamePrefix(msg, messageForGameChat(msg.message, config, forceImageEmojisSymbolOutput), config);
        String line = template
                .replace("{player}", msg.sender)
                .replace("{guest}", msg.sender)
                .replace("{message}", gameMessage);

        final String finalLine = line;
        boolean preservePlainForImageEmojis = shouldPreservePlainBroadcastForImageEmojis(msg, finalLine, config);
        Bukkit.getScheduler().runTask(plugin, () -> {
            if (config.clickableUrlsInGame && containsUrl(finalLine) && !preservePlainForImageEmojis) {
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

    private static final class AroundHistoryResult {
        final List<ChatMessage> messages = new ArrayList<>();
        int targetIndex = -1;
        boolean hasBefore;
        boolean hasAfter;
        boolean pruned;
    }

    private AroundHistoryResult findHistoryAround(String targetId, int before, int after) {
        AroundHistoryResult result = new AroundHistoryResult();
        if (targetId == null || targetId.isBlank()) return result;

        synchronized (history) {
            result.pruned = pruneHistoryLocked();
            List<ChatMessage> all = new ArrayList<>(history);
            fillAroundResult(result, all, targetId, before, after);
            if (result.targetIndex >= 0) return result;
        }

        ConfigValues config = plugin.configValues();
        if (!config.historyPersist) return result;
        Path path = historyPath();
        if (!Files.exists(path)) return result;

        long persistCutoff = retentionCutoffMillis(config.historyPersistRetentionDays);
        List<ChatMessage> all = new ArrayList<>();
        try {
            for (String line : Files.readAllLines(path, StandardCharsets.UTF_8)) {
                if (line == null || line.isBlank()) continue;
                ChatMessage msg = ChatMessage.fromMap(JsonUtil.parseFlatObject(line));
                if (msg.message == null || msg.message.isBlank()) continue;
                if (isOlderThan(msg, persistCutoff)) continue;
                all.add(msg);
            }
        } catch (IOException ex) {
            plugin.getLogger().warning("Failed to search chat history file " + path + ": " + ex.getMessage());
            return result;
        }
        fillAroundResult(result, all, targetId, before, after);
        return result;
    }

    private void fillAroundResult(AroundHistoryResult result, List<ChatMessage> all, String targetId, int before, int after) {
        if (result == null || all == null || targetId == null || targetId.isBlank()) return;
        result.messages.clear();
        result.targetIndex = -1;
        result.hasBefore = false;
        result.hasAfter = false;
        for (int i = 0; i < all.size(); i++) {
            ChatMessage msg = all.get(i);
            if (msg != null && targetId.equals(msg.id)) {
                result.targetIndex = i;
                break;
            }
        }
        if (result.targetIndex < 0) return;
        int start = Math.max(0, result.targetIndex - Math.max(0, before));
        int endExclusive = Math.min(all.size(), result.targetIndex + Math.max(0, after) + 1);
        result.hasBefore = start > 0;
        result.hasAfter = endExclusive < all.size();
        for (int i = start; i < endExclusive; i++) {
            ChatMessage msg = all.get(i);
            if (msg != null) result.messages.add(msg);
        }
    }

    private ChatMessage findHistoryMessageById(String id) {
        if (id == null || id.isBlank()) return null;
        synchronized (history) {
            for (ChatMessage msg : history) {
                if (msg != null && id.equals(msg.id)) return msg;
            }
        }
        AroundHistoryResult around = findHistoryAround(id, 0, 0);
        if (around.targetIndex >= 0 && !around.messages.isEmpty()) return around.messages.get(0);
        return null;
    }

    private String messageReplyPreview(ChatMessage msg) {
        if (msg == null) return "";
        String text = msg.hidden ? "[deleted]" : String.valueOf(msg.message == null ? "" : msg.message);
        text = stripControl(text, 180).replace('\n', ' ').replace('\r', ' ').trim();
        if (text.length() > 120) text = text.substring(0, 117) + "...";
        return text;
    }

    private void attachReplyIfPresent(ChatMessage msg, String replyToId, String fallbackSender, String fallbackPreview) {
        if (msg == null || replyToId == null || replyToId.isBlank()) return;
        String id = stripControl(replyToId, 96);
        if (id.isBlank()) return;
        ChatMessage target = findHistoryMessageById(id);
        String sender = "";
        String preview = "";
        if (target != null) {
            id = target.id;
            sender = stripControl(target.sender, 64);
            preview = messageReplyPreview(target);
        } else {
            // The frontend only allows replying to messages it has already loaded,
            // but the server-side in-memory history may not always contain that
            // exact target yet (for example after pruning/reload or when a proxy
            // reconnect races with history refresh). Preserve the reply relation
            // using the client-provided preview instead of silently dropping it.
            sender = stripControl(fallbackSender, 64);
            preview = stripControl(fallbackPreview, 180).replace("\n", " ").replace("\r", " ").trim();
            if (preview.length() > 120) preview = preview.substring(0, 117) + "...";
        }
        if (sender.isBlank()) sender = "Unknown";
        if (preview.isBlank()) preview = "...";
        msg.withReply(id, sender, preview);
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
        h.set("Referrer-Policy", "strict-origin-when-cross-origin");
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
