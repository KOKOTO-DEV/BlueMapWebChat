package dev.kokoto.bluemapwebchat;

import org.bukkit.entity.Player;
import org.bukkit.event.Event;
import org.bukkit.event.EventHandler;
import org.bukkit.event.EventPriority;
import org.bukkit.event.Listener;
import org.bukkit.event.player.AsyncPlayerChatEvent;
import org.bukkit.event.player.PlayerJoinEvent;

import java.lang.reflect.Method;
import java.util.Collections;
import java.util.Map;
import java.util.WeakHashMap;

public class ChatListener implements Listener {
    private final BlueMapWebChatPlugin plugin;
    private final Map<AsyncPlayerChatEvent, String> originalChatMessages = Collections.synchronizedMap(new WeakHashMap<>());
    private final Map<Event, String> originalPaperChatMessages = Collections.synchronizedMap(new WeakHashMap<>());
    private final boolean paperAsyncChatRegistered;

    public ChatListener(BlueMapWebChatPlugin plugin) {
        this.plugin = plugin;
        this.paperAsyncChatRegistered = registerPaperAsyncChatHandlers();
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
