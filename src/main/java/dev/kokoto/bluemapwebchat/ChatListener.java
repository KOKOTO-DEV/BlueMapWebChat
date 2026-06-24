package dev.kokoto.bluemapwebchat;

import org.bukkit.entity.Player;
import org.bukkit.event.EventHandler;
import org.bukkit.event.EventPriority;
import org.bukkit.event.Listener;
import org.bukkit.event.player.AsyncPlayerChatEvent;
import org.bukkit.event.player.PlayerJoinEvent;

import java.util.Collections;
import java.util.Map;
import java.util.WeakHashMap;

public class ChatListener implements Listener {
    private final BlueMapWebChatPlugin plugin;
    private final Map<AsyncPlayerChatEvent, String> originalChatMessages = Collections.synchronizedMap(new WeakHashMap<>());

    public ChatListener(BlueMapWebChatPlugin plugin) {
        this.plugin = plugin;
    }

    @EventHandler(priority = EventPriority.LOWEST, ignoreCancelled = false)
    public void captureOriginalChatMessage(AsyncPlayerChatEvent event) {
        // Some chat/emoji plugins replace the message later in the same event.
        // Keep the player's original template text so the web side can map
        // ImageEmojis aliases such as :name: back to BM Web Chat emojis.
        if (event != null) {
            originalChatMessages.put(event, event.getMessage());
        }
    }

    @EventHandler(priority = EventPriority.MONITOR, ignoreCancelled = true)
    public void onChat(AsyncPlayerChatEvent event) {
        if (!plugin.configValues().broadcastIngameChatToWeb) return;
        WebChatServer server = plugin.webServer();
        if (server != null) {
            String message = originalChatMessages.remove(event);
            if (message == null) message = event.getMessage();
            server.publishFromGame(event.getPlayer(), message);
        }
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

    private void rememberDisplayName(Player player) {
        if (player == null || !player.isOnline()) return;
        String uuid = player.getUniqueId().toString();
        String displayName = plugin.displayPlayerName(player);
        if (displayName == null || displayName.isBlank()) return;
        plugin.storage().updateLastDisplayName(uuid, player.getName(), displayName);
    }
}
