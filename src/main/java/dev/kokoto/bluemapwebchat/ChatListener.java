package dev.kokoto.bluemapwebchat;

import org.bukkit.ChatColor;
import org.bukkit.entity.Player;
import org.bukkit.event.Event;
import org.bukkit.event.EventHandler;
import org.bukkit.event.EventPriority;
import org.bukkit.event.Listener;
import org.bukkit.event.player.AsyncPlayerChatEvent;
import org.bukkit.event.player.PlayerJoinEvent;
import org.bukkit.event.player.PlayerCommandPreprocessEvent;

import java.lang.reflect.Method;
import java.util.Collections;
import java.util.Map;
import java.util.WeakHashMap;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

public class ChatListener implements Listener {
    private final BlueMapWebChatPlugin plugin;
    private final Map<AsyncPlayerChatEvent, String> originalChatMessages = Collections.synchronizedMap(new WeakHashMap<>());
    private final Map<Event, String> originalPaperChatMessages = Collections.synchronizedMap(new WeakHashMap<>());
    private final Map<UUID, CapturedDirectMessageCommand> originalDirectMessageCommands = new ConcurrentHashMap<>();
    private final boolean paperAsyncChatRegistered;

    public ChatListener(BlueMapWebChatPlugin plugin) {
        this.plugin = plugin;
        this.paperAsyncChatRegistered = registerPaperAsyncChatHandlers();
    }


    @EventHandler(priority = EventPriority.LOWEST, ignoreCancelled = false)
    public void captureOriginalDirectMessageCommand(PlayerCommandPreprocessEvent event) {
        if (event == null || event.getPlayer() == null) return;
        String message = event.getMessage();
        if (!looksLikeDirectMessageCommand(message)) return;
        // Command preprocessors from emoji plugins may replace :pack/name: with a
        // private-use font glyph before the command executor sees the args. Keep
        // the raw player command so /bmchat dm stores the same token the user typed.
        // DM command handling later requires this capture; commands dispatched through
        // /execute, command blocks, console, or plugins do not pass this player-input check.
        originalDirectMessageCommands.put(event.getPlayer().getUniqueId(),
                new CapturedDirectMessageCommand(message, System.currentTimeMillis()));
    }


    @EventHandler(priority = EventPriority.MONITOR, ignoreCancelled = false)
    public void discardCancelledDirectMessageCommand(PlayerCommandPreprocessEvent event) {
        if (event == null || event.getPlayer() == null || !event.isCancelled()) return;
        originalDirectMessageCommands.remove(event.getPlayer().getUniqueId());
    }

    public String pollOriginalDirectMessageCommand(Player player) {
        if (player == null) return null;
        CapturedDirectMessageCommand captured = originalDirectMessageCommands.remove(player.getUniqueId());
        if (captured == null || captured.message == null || captured.message.isBlank()) return null;
        // A captured player command should be consumed immediately by the matching
        // command executor. Drop stale entries so they cannot be reused by a later
        // forced dispatch that only impersonates the Player sender.
        if (System.currentTimeMillis() - captured.createdAtMs > 5_000L) return null;
        return captured.message;
    }

    private boolean looksLikeDirectMessageCommand(String raw) {
        String text = String.valueOf(raw == null ? "" : raw).trim();
        if (!text.startsWith("/")) return false;
        String[] parts = text.substring(1).split("\\s+", 3);
        if (parts.length < 2) return false;
        String root = parts[0].toLowerCase(java.util.Locale.ROOT);
        String sub = parts[1].toLowerCase(java.util.Locale.ROOT);
        return isBmChatRoot(root) && sub.equals("dm");
    }

    private boolean isBmChatRoot(String root) {
        if (root == null) return false;
        return root.equals("bmchat")
                || root.equals("bluemapchat")
                || root.equals("bmc")
                || root.equals("bluemapwebchat:bmchat")
                || root.equals("bluemapwebchat:bluemapchat")
                || root.equals("bluemapwebchat:bmc");
    }

    private static class CapturedDirectMessageCommand {
        final String message;
        final long createdAtMs;

        CapturedDirectMessageCommand(String message, long createdAtMs) {
            this.message = message;
            this.createdAtMs = createdAtMs;
        }
    }

    @EventHandler(priority = EventPriority.LOWEST, ignoreCancelled = false)
    public void captureOriginalChatMessage(AsyncPlayerChatEvent event) {
        if (paperAsyncChatRegistered) return;
        // Some chat/emoji plugins replace the message later in the same event.
        // Keep the player's original template text so the web side receives
        // :pack/name: tokens instead of a later ImageEmojis font symbol.
        if (event != null) {
            originalChatMessages.put(event, event.getMessage());
        }
    }

    @EventHandler(priority = EventPriority.MONITOR, ignoreCancelled = true)
    public void onChat(AsyncPlayerChatEvent event) {
        if (paperAsyncChatRegistered) return;
        String message = originalChatMessages.remove(event);
        if (message == null && event != null) message = event.getMessage();
        publishCapturedGameChat(event == null ? null : event.getPlayer(), message);
    }

    @EventHandler(priority = EventPriority.MONITOR)
    public void onJoin(PlayerJoinEvent event) {
        Player player = event.getPlayer();
        if (player == null) return;
        // Nickname plugins often apply the final displayName after the join event.
        // Refresh once shortly after join so offline web chat can use the latest
        // in-game display name even before the player sends a chat message.
        plugin.getServer().getScheduler().runTaskLater(plugin, () -> rememberDisplayName(player), 20L);
        plugin.getServer().getScheduler().runTaskLater(plugin, () -> rememberDisplayName(player), 60L);
        plugin.getServer().getScheduler().runTaskLater(plugin, () -> notifyUnreadDirectMessages(player), 80L);
    }

    @SuppressWarnings("unchecked")
    private boolean registerPaperAsyncChatHandlers() {
        try {
            Class<? extends Event> eventClass = (Class<? extends Event>) Class
                    .forName("io.papermc.paper.event.player.AsyncChatEvent")
                    .asSubclass(Event.class);
            plugin.getServer().getPluginManager().registerEvent(eventClass, this, EventPriority.LOWEST, (listener, event) -> {
                try {
                    capturePaperOriginalChatMessage(event);
                } catch (Throwable ignored) {
                }
            }, plugin, false);
            plugin.getServer().getPluginManager().registerEvent(eventClass, this, EventPriority.MONITOR, (listener, event) -> {
                try {
                    onPaperChat(event);
                } catch (Throwable t) {
                    plugin.getLogger().warning("Failed to relay Paper chat to web chat: " + t.getMessage());
                }
            }, plugin, true);
            return true;
        } catch (ClassNotFoundException ignored) {
            return false;
        } catch (Throwable t) {
            plugin.getLogger().warning("Failed to register Paper AsyncChatEvent listener; falling back to legacy chat event: " + t.getMessage());
            return false;
        }
    }

    private void capturePaperOriginalChatMessage(Event event) {
        if (event == null) return;
        String message = paperPlainText(callNoArg(event, "originalMessage"));
        if (message.isBlank()) message = paperPlainText(callNoArg(event, "message"));
        if (!message.isBlank()) originalPaperChatMessages.put(event, message);
    }

    private void onPaperChat(Event event) {
        if (event == null) return;
        String message = originalPaperChatMessages.remove(event);
        if (message == null || message.isBlank()) {
            message = paperPlainText(callNoArg(event, "originalMessage"));
        }
        if (message == null || message.isBlank()) {
            message = paperPlainText(callNoArg(event, "message"));
        }
        publishCapturedGameChat(paperPlayer(event), message);
    }

    private void publishCapturedGameChat(Player player, String message) {
        if (!plugin.configValues().broadcastIngameChatToWeb) return;
        WebChatServer server = plugin.webServer();
        if (server == null) return;
        server.publishFromGame(player, message == null ? "" : message);
    }


    private void notifyUnreadDirectMessages(Player player) {
        if (player == null || !player.isOnline()) return;
        ConfigValues config = plugin.configValues();
        if (config == null || !config.directMessageEnabled || !config.directMessageNotifyOnLogin) return;
        DirectMessageStore store = plugin.directMessages();
        if (store == null || !store.available()) return;
        int unread = store.unreadCount(player.getUniqueId().toString());
        if (unread <= 0) return;
        java.util.Map<String, String> vars = new java.util.HashMap<>();
        vars.put("count", Integer.toString(unread));
        player.sendMessage(ChatColor.LIGHT_PURPLE + plugin.langManager().text("command.dmUnreadNotice", "You have {count} unread direct message(s). Open the web chat message box or use /bmchat dm list.", vars));
    }

    private Player paperPlayer(Event event) {
        Object value = callNoArg(event, "getPlayer");
        if (!(value instanceof Player)) value = callNoArg(event, "player");
        return value instanceof Player player ? player : null;
    }

    private Object callNoArg(Object target, String methodName) {
        if (target == null || methodName == null || methodName.isBlank()) return null;
        try {
            Method method = target.getClass().getMethod(methodName);
            method.setAccessible(true);
            return method.invoke(target);
        } catch (Throwable ignored) {
            return null;
        }
    }

    private String paperPlainText(Object component) {
        if (component == null) return "";
        if (component instanceof String text) return text;
        try {
            Class<?> serializerClass = Class.forName("net.kyori.adventure.text.serializer.plain.PlainTextComponentSerializer");
            Object serializer = serializerClass.getMethod("plainText").invoke(null);
            Class<?> componentClass = Class.forName("net.kyori.adventure.text.Component");
            Object text = serializer.getClass().getMethod("serialize", componentClass).invoke(serializer, component);
            return text == null ? "" : String.valueOf(text);
        } catch (Throwable ignored) {
            return "";
        }
    }

    private void rememberDisplayName(Player player) {
        if (player == null || !player.isOnline()) return;
        String uuid = player.getUniqueId().toString();
        String displayName = plugin.displayPlayerName(player);
        if (displayName == null || displayName.isBlank()) return;
        plugin.storage().updateLastDisplayName(uuid, player.getName(), displayName);
    }
}
