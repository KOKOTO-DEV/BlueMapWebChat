package dev.kokoto.bluemapwebchat;

import org.bukkit.ChatColor;
import org.bukkit.command.PluginCommand;
import org.bukkit.entity.Player;
import org.bukkit.plugin.java.JavaPlugin;

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
    private WebChatServer webServer;

    @Override
    public void onEnable() {
        saveDefaultConfig();
        reloadConfig();
        configValues = ConfigValues.load(getConfig());

        storage = new Storage(this);
        storage.load();

        moderationManager = new ModerationManager(this);
        moderationManager.load();

        langManager = new LangManager(this);
        langManager.reload();

        captchaManager = new CaptchaManager();
        authManager = new AuthManager(this, storage);
        discordBridge = new DiscordBridge(this);

        installAssets();
        startWebServer();
        discordBridge.start();

        getServer().getPluginManager().registerEvents(new ChatListener(this), this);
        getServer().getPluginManager().registerEvents(new EventAnnouncementListener(this), this);

        BmChatCommand cmd = new BmChatCommand(this);
        PluginCommand pluginCommand = getCommand("bmchat");
        if (pluginCommand != null) {
            pluginCommand.setExecutor(cmd);
            pluginCommand.setTabCompleter(cmd);
        }

        publishAnnouncement("server-start", Map.of("server", getServer().getName()));

        getLogger().info("BlueMapWebChat enabled.");
    }

    @Override
    public void onDisable() {
        publishAnnouncement("server-stop", Map.of("server", getServer().getName()));
        if (discordBridge != null) {
            discordBridge.stop();
        }
        if (webServer != null) {
            webServer.stop();
        }
        if (storage != null) {
            storage.saveAll();
        }
        if (moderationManager != null) {
            moderationManager.save();
        }
        getLogger().info("BlueMapWebChat disabled.");
    }

    public void reloadPlugin() {
        if (discordBridge != null) {
            discordBridge.stop();
        }
        if (webServer != null) {
            webServer.stop();
        }
        reloadConfig();
        configValues = ConfigValues.load(getConfig());
        storage.saveAll();
        moderationManager.save();
        moderationManager.load();
        if (langManager == null) {
            langManager = new LangManager(this);
        }
        langManager.reload();
        installAssets();
        startWebServer();
        if (discordBridge == null) {
            discordBridge = new DiscordBridge(this);
        }
        discordBridge.start();
    }

    private void installAssets() {
        new WebAssetsInstaller(this).install();
    }

    private void startWebServer() {
        webServer = new WebChatServer(this, storage, authManager, captchaManager);
        try {
            webServer.start();
        } catch (Exception ex) {
            getLogger().log(Level.SEVERE, "Failed to start HTTP chat server", ex);
        }
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
        if (name == null || name.isBlank()) name = player.getName();
        if (config == null || config.playerNameStripColors) {
            name = ChatColor.stripColor(ChatColor.translateAlternateColorCodes('&', name));
        }
        if (name == null || name.isBlank()) name = player.getName();
        return name;
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
                if (account.lastDisplayName == null || account.lastDisplayName.isBlank()) {
                    storage.updateLastDisplayName(account.uuid, account.safeUsername(), remembered);
                }
                return remembered;
            }
        }
        if (account.lastDisplayName != null && !account.lastDisplayName.isBlank()) {
            return account.lastDisplayName;
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

    public LangManager langManager() {
        return langManager;
    }

    public WebChatServer webServer() {
        return webServer;
    }
}
