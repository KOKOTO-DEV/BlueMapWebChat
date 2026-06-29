package dev.kokoto.bluemapwebchat;

import org.bukkit.ChatColor;
import org.bukkit.command.PluginCommand;
import org.bukkit.entity.Player;
import org.bukkit.event.HandlerList;
import org.bukkit.plugin.java.JavaPlugin;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.logging.Level;

public class BlueMapWebChatPlugin extends JavaPlugin {
    private ConfigValues configValues;
    private Storage storage;
    private AuthManager authManager;
    private CaptchaManager captchaManager;
    private ModerationManager moderationManager;
    private LangManager langManager;
    private DiscordBridge discordBridge;
    private DirectMessageStore directMessages;
    private WebChatServer webServer;
    private ChatListener chatListener;

    @Override
    public void onEnable() {
        saveDefaultConfig();
        reloadConfig();
        configValues = ConfigValues.load(getConfig());
        registerCommandExecutor();
        if (!configValues.pluginEnabled) {
            getLogger().info("BlueMapWebChat is disabled by config. Set enabled: true in config.yml to start web/chat services. /bmchat reload remains available.");
            return;
        }

        storage = new Storage(this);
        storage.load();

        moderationManager = new ModerationManager(this);
        moderationManager.load();

        langManager = new LangManager(this);
        langManager.reload();

        captchaManager = new CaptchaManager();
        authManager = new AuthManager(this, storage);
        discordBridge = new DiscordBridge(this);
        directMessages = new DirectMessageStore(this);
        directMessages.open();

        installAssets();
        ensureEmojiDirectory();
        startWebServer();
        discordBridge.start();

        registerRuntimeListeners();

        publishAnnouncement("server-start", Map.of("server", getServer().getName()));

        getLogger().info("BlueMapWebChat enabled.");
    }

    @Override
    public void onDisable() {
        if (configValues != null && configValues.pluginEnabled) {
            publishAnnouncement("server-stop", Map.of("server", getServer().getName()));
        }
        stopRuntimeServices();
        saveRuntimeState();
        getLogger().info("BlueMapWebChat disabled.");
    }

    public void reloadPlugin() {
        stopRuntimeServices();
        saveRuntimeState();
        reloadConfig();
        configValues = ConfigValues.load(getConfig());
        if (!configValues.pluginEnabled) {
            registerCommandExecutor();
            getLogger().info("BlueMapWebChat is disabled by config. Web/chat services are stopped. /bmchat reload remains available.");
            return;
        }
        registerCommandExecutor();
        if (storage == null) {
            storage = new Storage(this);
            storage.load();
        } else {
            storage.saveAll();
        }
        if (moderationManager == null) {
            moderationManager = new ModerationManager(this);
        } else {
            moderationManager.save();
        }
        moderationManager.load();
        if (captchaManager == null) {
            captchaManager = new CaptchaManager();
        }
        if (authManager == null) {
            authManager = new AuthManager(this, storage);
        }
        if (directMessages == null) {
            directMessages = new DirectMessageStore(this);
        }
        directMessages.open();
        if (langManager == null) {
            langManager = new LangManager(this);
        }
        langManager.reload();
        installAssets();
        ensureEmojiDirectory();
        startWebServer();
        if (discordBridge == null) {
            discordBridge = new DiscordBridge(this);
        }
        discordBridge.start();
        registerRuntimeListeners();
    }


    private void registerCommandExecutor() {
        BmChatCommand cmd = new BmChatCommand(this);
        PluginCommand pluginCommand = getCommand("bmchat");
        if (pluginCommand != null) {
            pluginCommand.setExecutor(cmd);
            pluginCommand.setTabCompleter(cmd);
        }
    }

    private void registerRuntimeListeners() {
        chatListener = new ChatListener(this);
        getServer().getPluginManager().registerEvents(chatListener, this);
        getServer().getPluginManager().registerEvents(new EventAnnouncementListener(this), this);
    }

    private void stopRuntimeServices() {
        if (discordBridge != null) {
            discordBridge.stop();
            discordBridge = null;
        }
        if (webServer != null) {
            webServer.stop();
            webServer = null;
        }
        if (directMessages != null) {
            directMessages.close();
            directMessages = null;
        }
        HandlerList.unregisterAll(this);
        chatListener = null;
    }

    private void saveRuntimeState() {
        if (storage != null) {
            storage.saveAll();
        }
        if (moderationManager != null) {
            moderationManager.save();
        }
    }

    private void installAssets() {
        new WebAssetsInstaller(this).install();
    }

    private void ensureEmojiDirectory() {
        ConfigValues config = configValues;
        if (config == null || !config.emojiEnabled) return;

        String configured = config.emojiDirectory;
        if (configured == null || configured.isBlank()) configured = "emojis";

        try {
            Path dir = Path.of(configured);
            if (!dir.isAbsolute()) {
                dir = getDataFolder().toPath().resolve(dir);
            }
            Files.createDirectories(dir.normalize());
        } catch (Exception ex) {
            getLogger().log(Level.WARNING, "Failed to create emoji directory: " + configured, ex);
        }
    }

    private void startWebServer() {
        webServer = new WebChatServer(this, storage, authManager, captchaManager);
        try {
            webServer.start();
        } catch (Exception ex) {
            getLogger().log(Level.SEVERE, "Failed to start HTTP chat server", ex);
        }
    }


    public ChatListener chatListener() {
        return chatListener;
    }

    public void publishAnnouncement(String key, Map<String, String> placeholders) {
        ConfigValues config = configValues;
        if (config == null || !config.announcementEnabled(key)) return;

        String message = config.announcementMessage(key);
        if (message == null || message.isBlank()) return;

        Map<String, String> values = new LinkedHashMap<>();
        values.put("server", getServer().getName());
        values.put("event", key == null ? "" : key);
        if (placeholders != null) values.putAll(placeholders);

        for (Map.Entry<String, String> entry : values.entrySet()) {
            String value = entry.getValue() == null ? "" : entry.getValue();
            message = message.replace("{" + entry.getKey() + "}", value);
        }

        message = ChatColor.translateAlternateColorCodes('&', message);
        message = ChatColor.stripColor(message);
        if (message == null || message.isBlank()) return;

        WebChatServer server = webServer;
        if (server != null) {
            server.publishSystemEvent("Server", message, "announcement." + key, JsonUtil.obj(values));
        }
    }

    public void publishAnnouncement(String key, String... placeholders) {
        Map<String, String> values = new LinkedHashMap<>();
        if (placeholders != null) {
            for (int i = 0; i + 1 < placeholders.length; i += 2) {
                values.put(placeholders[i], placeholders[i + 1]);
            }
        }
        publishAnnouncement(key, values);
    }


    public String displayPlayerName(Player player) {
        if (player == null) return "";
        ConfigValues config = configValues;
        String mode = config == null ? "name" : config.playerNameMode;
        String name;
        if ("display-name".equalsIgnoreCase(mode)) {
            name = player.getDisplayName();
        } else if ("custom-name".equalsIgnoreCase(mode)) {
            name = player.getCustomName();
            if (name == null || name.isBlank()) name = player.getDisplayName();
        } else {
            name = player.getName();
        }
        return normalizePlayerDisplayName(name, player.getName());
    }

    public String normalizePlayerDisplayName(String name, String fallback) {
        String out = name == null || name.isBlank() ? String.valueOf(fallback == null ? "" : fallback) : name;
        ConfigValues config = configValues;
        if (config == null || config.playerNameStripColors) {
            out = ChatColor.stripColor(ChatColor.translateAlternateColorCodes('&', out));
        }
        if (out == null || out.isBlank()) out = String.valueOf(fallback == null ? "" : fallback);
        return out == null ? "" : out;
    }

    public String displayNameForAccount(Account account) {
        if (account == null) return "";
        if (account.uuid != null && !account.uuid.isBlank()) {
            try {
                Player player = getServer().getPlayer(java.util.UUID.fromString(account.uuid));
                if (player != null) {
                    String name = displayPlayerName(player);
                    if (name != null && !name.isBlank()) {
                        storage.updateLastDisplayName(account.uuid, player.getName(), name);
                        return name;
                    }
                }
            } catch (IllegalArgumentException ignored) {
            }
            String remembered = storage.knownDisplayName(account.uuid);
            if (remembered != null && !remembered.isBlank()) {
                String normalized = normalizePlayerDisplayName(remembered, account.safeUsername());
                if (account.lastDisplayName == null || account.lastDisplayName.isBlank() || !account.lastDisplayName.equals(normalized)) {
                    storage.updateLastDisplayName(account.uuid, account.safeUsername(), normalized);
                }
                return normalized;
            }
        }
        if (account.lastDisplayName != null && !account.lastDisplayName.isBlank()) {
            return normalizePlayerDisplayName(account.lastDisplayName, account.safeUsername());
        }
        return account.safeUsername();
    }

    public ConfigValues configValues() {
        return configValues;
    }

    public Storage storage() {
        return storage;
    }

    public AuthManager authManager() {
        return authManager;
    }

    public ModerationManager moderationManager() {
        return moderationManager;
    }

    public DiscordBridge discordBridge() {
        return discordBridge;
    }

    public DirectMessageStore directMessages() {
        return directMessages;
    }

    public LangManager langManager() {
        return langManager;
    }

    public WebChatServer webServer() {
        return webServer;
    }
}
