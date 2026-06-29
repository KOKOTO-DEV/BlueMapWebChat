package dev.kokoto.bluemapwebchat;

import org.bukkit.ChatColor;
import org.bukkit.command.*;
import org.bukkit.entity.Player;

import java.io.File;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public class BmChatCommand implements CommandExecutor, TabCompleter {
    private final BlueMapWebChatPlugin plugin;
    private final Map<String, DmReadCursor> dmReadCursors = new java.util.concurrent.ConcurrentHashMap<>();
    private final Map<String, DmListCursor> dmListCursors = new java.util.concurrent.ConcurrentHashMap<>();

    private static class DmListCursor {
        int page = 1;
        int pageSize = 10;
    }

    private static class DmReadCursor {
        String otherUuid;
        String otherUsername;
        String otherDisplayName;
        String inputName;
        int page = 1;
        int pageSize = 20;
    }

    public BmChatCommand(BlueMapWebChatPlugin plugin) {
        this.plugin = plugin;
    }

    @Override
    public boolean onCommand(CommandSender sender, Command command, String label, String[] args) {
        String sub = args.length == 0 ? "" : args[0].toLowerCase();
        ConfigValues config = plugin.configValues();
        if (config != null && !config.pluginEnabled && !"reload".equals(sub)) {
            sender.sendMessage(red(msg("disabledByConfig", "BlueMapWebChat is disabled in config.yml.")));
            if (sender.hasPermission("bluemapwebchat.admin")) {
                sender.sendMessage(yellow("/bmchat reload") + ChatColor.GRAY + " - " + msg("helpReload", "Reload configuration"));
            }
            return true;
        }

        if (args.length == 0) {
            help(sender);
            return true;
        }

        switch (sub) {
            case "auth":
                return auth(sender, args);
            case "password":
                return password(sender, args);
            case "reload":
                return reload(sender);
            case "admin":
                return admin(sender, args);
            case "guest":
                return guest(sender, args);
            case "dm":
                return dm(sender, args);
            case "sessions":
                return sessions(sender);
            case "revoke":
                return revoke(sender, args);
            default:
                help(sender);
                return true;
        }
    }

    private boolean auth(CommandSender sender, String[] args) {
        if (!(sender instanceof Player)) {
            sender.sendMessage(red(msg("onlyPlayers", "This command can only be used by players.")));
            return true;
        }
        if (!sender.hasPermission("bluemapwebchat.auth")) {
            sender.sendMessage(red(msg("noPermission", "You do not have permission.")));
            return true;
        }
        if (args.length < 2) {
            sender.sendMessage(yellow("/bmchat auth <code>"));
            return true;
        }
        AuthManager.LinkResult result = plugin.authManager().completeCode(args[1], (Player) sender);
        sender.sendMessage((result.ok ? green("") : red("")) + result.message);
        return true;
    }

    private boolean password(CommandSender sender, String[] args) {
        if (!(sender instanceof Player)) {
            sender.sendMessage(red(msg("onlyPlayers", "This command can only be used by players.")));
            return true;
        }
        if (args.length < 2) {
            sender.sendMessage(yellow("/bmchat password <newPassword>"));
            return true;
        }
        Player p = (Player) sender;
        Account a = plugin.storage().upsertLinkedAccount(
                p.getUniqueId().toString(),
                p.getName(),
                p.hasPermission(plugin.configValues().adminPermission) ? Role.ADMIN : Role.USER,
                plugin.displayPlayerName(p)
        );
        plugin.storage().setPassword(a, args[1]);
        sender.sendMessage(green(msg("passwordSet", "Web chat password has been set.")));
        return true;
    }

    private boolean reload(CommandSender sender) {
        if (!sender.hasPermission("bluemapwebchat.admin")) {
            sender.sendMessage(red(msg("noPermission", "You do not have permission.")));
            return true;
        }
        plugin.reloadPlugin();
        sender.sendMessage(green(msg("configReloaded", "BlueMapWebChat configuration reloaded.")));
        return true;
    }

    private boolean guest(CommandSender sender, String[] args) {
        if (!sender.hasPermission("bluemapwebchat.admin")) {
            sender.sendMessage(red(msg("noPermission", "You do not have permission.")));
            return true;
        }
        if (args.length < 2) {
            sender.sendMessage(yellow("/bmchat guest mute <guest|ip> <value> [minutes] [reason]"));
            sender.sendMessage(yellow("/bmchat guest unmute <guest|ip> <value>"));
            sender.sendMessage(yellow("/bmchat guest list"));
            return true;
        }

        String sub = args[1].toLowerCase();
        if ("list".equals(sub)) {
            List<ModerationEntry> list = plugin.moderationManager().list();
            if (list.isEmpty()) {
                sender.sendMessage(green(msg("guestNoMutes", "There are no guest/IP mutes.")));
                return true;
            }
            sender.sendMessage(ChatColor.AQUA + msg("guestMutesTitle", "BlueMapWebChat mutes:"));
            for (ModerationEntry e : list) {
                sender.sendMessage(yellow(msg("guestMuteEntry", "- {type}:{value} reason={reason} expires={expires}",
                        "type", e.type,
                        "value", e.value,
                        "reason", e.reason,
                        "expires", e.expiresAt == 0 ? msg("never", "never") : Long.toString(e.expiresAt))));
            }
            return true;
        }

        if ("mute".equals(sub)) {
            if (args.length < 4) {
                sender.sendMessage(yellow("/bmchat guest mute <guest|ip> <value> [minutes] [reason]"));
                return true;
            }
            String type = args[2];
            String value = args[3];
            long minutes = plugin.configValues().defaultMuteMinutes;
            if (args.length >= 5) {
                try {
                    minutes = Long.parseLong(args[4]);
                } catch (NumberFormatException ignored) {
                    minutes = plugin.configValues().defaultMuteMinutes;
                }
            }
            String reason = args.length >= 6 ? String.join(" ", java.util.Arrays.copyOfRange(args, 5, args.length)) : "";
            plugin.moderationManager().mute(type, value, minutes, reason, sender.getName());
            sender.sendMessage(green(msg("guestMuteAdded", "Mute added: {type}:{value} ({minutes} min)",
                    "type", type,
                    "value", value,
                    "minutes", Long.toString(minutes))));
            return true;
        }

        if ("unmute".equals(sub)) {
            if (args.length < 4) {
                sender.sendMessage(yellow("/bmchat guest unmute <guest|ip> <value>"));
                return true;
            }
            boolean ok = plugin.moderationManager().unmute(args[2], args[3]);
            sender.sendMessage(ok ? green(msg("guestMuteRemoved", "Mute removed.")) : red(msg("guestMuteNotFound", "Mute not found.")));
            return true;
        }

        sender.sendMessage(red(msg("guestUnknownSubcommand", "Unknown guest subcommand.")));
        return true;
    }



    private boolean dm(CommandSender sender, String[] args) {
        ConfigValues config = plugin.configValues();
        if (config == null || !config.directMessageEnabled || plugin.directMessages() == null || !plugin.directMessages().available()) {
            sender.sendMessage(red(msg("dmDisabled", "Direct messages are disabled.")));
            return true;
        }
        if (!(sender instanceof Player)) {
            sender.sendMessage(red(msg("onlyPlayers", "This command can only be used by players.")));
            return true;
        }
        if (!sender.hasPermission("bluemapwebchat.dm")) {
            sender.sendMessage(red(msg("noPermission", "You do not have permission.")));
            return true;
        }
        Player player = (Player) sender;
        String senderUuid = player.getUniqueId().toString();
        plugin.storage().updateLastDisplayName(senderUuid, player.getName(), plugin.displayPlayerName(player));
        String playerInputCommand = directMessageCommandFromPlayerInput(player, args);
        if (playerInputCommand == null) {
            sender.sendMessage(red(msg("dmDirectInputRequired", "Direct messages must be typed directly by the player.")));
            return true;
        }

        if (args.length < 2) {
            DmListCursor cursor = new DmListCursor();
            cursor.page = 1;
            cursor.pageSize = 10;
            dmListCursors.put(senderUuid.toLowerCase(java.util.Locale.ROOT), cursor);
            return dmListShow(sender, senderUuid, cursor);
        }

        if ("unread".equalsIgnoreCase(args[1]) || "list".equalsIgnoreCase(args[1])) {
            if (args.length >= 3 && ("next".equalsIgnoreCase(args[2]) || "prev".equalsIgnoreCase(args[2]) || "previous".equalsIgnoreCase(args[2]))) {
                return dmListMove(sender, senderUuid, args[2].toLowerCase(java.util.Locale.ROOT).startsWith("p") ? -1 : 1);
            }
            DmListCursor cursor = new DmListCursor();
            cursor.page = 1;
            cursor.pageSize = 10;
            if (args.length >= 3) {
                try { cursor.pageSize = Integer.parseInt(args[2]); } catch (NumberFormatException ignored) {}
            }
            cursor.pageSize = Math.max(1, Math.min(100, cursor.pageSize));
            dmListCursors.put(senderUuid.toLowerCase(java.util.Locale.ROOT), cursor);
            return dmListShow(sender, senderUuid, cursor);
        }

        if ("read".equalsIgnoreCase(args[1]) || "view".equalsIgnoreCase(args[1])) {
            return dmRead(sender, senderUuid, args);
        }

        if ("next".equalsIgnoreCase(args[1]) || "prev".equalsIgnoreCase(args[1]) || "previous".equalsIgnoreCase(args[1])) {
            return dmReadMove(sender, senderUuid, args[1].toLowerCase(java.util.Locale.ROOT).startsWith("p") ? -1 : 1);
        }

        if ("hide".equalsIgnoreCase(args[1]) || "delete".equalsIgnoreCase(args[1])) {
            return dmHide(sender, senderUuid, args);
        }

        if (!config.directMessageAllowGameSend) {
            sender.sendMessage(red(msg("dmGameSendDisabled", "Sending direct messages from game is disabled.")));
            return true;
        }
        if (args.length < 3) {
            sender.sendMessage(yellow("/bmchat dm <player> <message>"));
            return true;
        }
        PlayerIdentity target = plugin.storage().findKnownPlayer(args[1]);
        if (target == null || target.uuid == null || target.uuid.isBlank()) {
            sender.sendMessage(red(msg("dmPlayerNotFound", "Player not found. The player must have joined at least once.")));
            return true;
        }
        String message = directMessageBodyFromOriginalCommand(playerInputCommand, args);
        if (message == null) {
            sender.sendMessage(red(msg("dmDirectInputRequired", "Direct messages must be typed directly by the player.")));
            return true;
        }
        message = stripForDm(message, config.directMessageMaxMessageLength);
        if (message.isBlank()) {
            sender.sendMessage(red(msg("dmEmpty", "Message is empty.")));
            return true;
        }
        DirectMessageStore.SendResult result = plugin.directMessages().send(senderUuid, target.uuid, message);
        if (!result.ok) {
            sender.sendMessage(red(msg("dmFailed", "Direct message failed: {error}", "error", result.error)));
            return true;
        }
        WebChatServer server = plugin.webServer();
        if (server != null) server.publishDirectMessageUpdate(senderUuid, target.uuid, result.thread == null ? "" : result.thread.id);
        notifyOnlineRecipient(player, target, message);
        sender.sendMessage(sentEchoLineForGame(player, target.label(), message));
        return true;
    }

    private String directMessageCommandFromPlayerInput(Player player, String[] args) {
        ChatListener listener = plugin.chatListener();
        String original = listener == null ? null : listener.pollOriginalDirectMessageCommand(player);
        if (!matchesCurrentDirectMessageCommand(original, args)) return null;
        return original;
    }

    private boolean matchesCurrentDirectMessageCommand(String original, String[] args) {
        if (original == null || original.isBlank() || args == null || args.length < 1) return false;
        if (!"dm".equalsIgnoreCase(args[0])) return false;
        String text = original.trim();
        if (text.startsWith("/")) text = text.substring(1);
        String[] parts = text.split("\\s+", 4);
        if (parts.length < 2) return false;
        String root = parts[0].toLowerCase(java.util.Locale.ROOT);
        String sub = parts[1].toLowerCase(java.util.Locale.ROOT);
        if (!isBmChatCommandRoot(root) || !"dm".equals(sub)) return false;
        if (args.length == 1) return parts.length == 2;
        if (parts.length < 3 || !parts[2].equalsIgnoreCase(args[1])) return false;

        String actionOrTarget = args[1].toLowerCase(java.util.Locale.ROOT);
        if (!isDmReservedSubcommand(actionOrTarget)) {
            if (args.length == 2) return parts.length == 3;
            return args.length >= 3 && parts.length >= 4;
        }

        String[] tokens = text.split("\\s+");
        if (tokens.length < args.length + 1) return false;
        for (int i = 0; i < args.length; i++) {
            if (!tokens[i + 1].equalsIgnoreCase(args[i])) return false;
        }
        return true;
    }

    private String directMessageBodyFromOriginalCommand(String original, String[] args) {
        if (original == null || original.isBlank()) return null;
        String text = original.trim();
        if (text.startsWith("/")) text = text.substring(1);
        String[] parts = text.split("\\s+", 4);
        if (parts.length < 4) return null;
        String root = parts[0].toLowerCase(java.util.Locale.ROOT);
        String sub = parts[1].toLowerCase(java.util.Locale.ROOT);
        if (!isBmChatCommandRoot(root) || !"dm".equals(sub)) return null;
        if (args == null || args.length < 3 || !parts[2].equalsIgnoreCase(args[1])) return null;
        return parts[3];
    }

    private boolean isBmChatCommandRoot(String root) {
        if (root == null) return false;
        return root.equals("bmchat")
                || root.equals("bluemapchat")
                || root.equals("bmc")
                || root.equals("bluemapwebchat:bmchat")
                || root.equals("bluemapwebchat:bluemapchat")
                || root.equals("bluemapwebchat:bmc");
    }

    private boolean isDmReservedSubcommand(String value) {
        if (value == null) return false;
        return value.equals("read")
                || value.equals("view")
                || value.equals("list")
                || value.equals("unread")
                || value.equals("next")
                || value.equals("prev")
                || value.equals("previous")
                || value.equals("hide")
                || value.equals("delete");
    }


    private boolean dmListMove(CommandSender sender, String senderUuid, int delta) {
        DmListCursor cursor = dmListCursors.get(senderUuid.toLowerCase(java.util.Locale.ROOT));
        if (cursor == null) {
            cursor = new DmListCursor();
            cursor.page = 1;
            cursor.pageSize = 10;
        }
        int total = plugin.directMessages().countThreads(senderUuid);
        int totalPages = Math.max(1, (int) Math.ceil(total / (double) Math.max(1, cursor.pageSize)));
        int nextPage = Math.max(1, Math.min(totalPages, cursor.page + delta));
        if (nextPage == cursor.page) {
            sender.sendMessage(yellow(delta > 0
                    ? msg("dmListLastPage", "You are already on the oldest conversation list page.")
                    : msg("dmListFirstPage", "You are already on the newest conversation list page.")));
            return true;
        }
        cursor.page = nextPage;
        dmListCursors.put(senderUuid.toLowerCase(java.util.Locale.ROOT), cursor);
        return dmListShow(sender, senderUuid, cursor);
    }

    private boolean dmListShow(CommandSender sender, String senderUuid, DmListCursor cursor) {
        if (cursor == null) cursor = new DmListCursor();
        int pageSize = Math.max(1, Math.min(100, cursor.pageSize <= 0 ? 10 : cursor.pageSize));
        int total = plugin.directMessages().countThreads(senderUuid);
        int totalPages = Math.max(1, (int) Math.ceil(total / (double) pageSize));
        if (cursor.page < 1) cursor.page = 1;
        if (total > 0 && cursor.page > totalPages) cursor.page = totalPages;
        int unread = plugin.directMessages().unreadCount(senderUuid);
        sender.sendMessage(ChatColor.AQUA + msg("dmTitlePage", "Direct messages: {count} unread (page {page}/{pages})",
                "count", Integer.toString(unread),
                "page", Integer.toString(cursor.page),
                "pages", Integer.toString(totalPages)));
        List<DirectMessageThread> threads = plugin.directMessages().listThreadsPage(senderUuid, cursor.page, pageSize);
        if (threads.isEmpty()) {
            sender.sendMessage(yellow(msg("dmNoThreads", "No direct message threads.")));
        }
        for (DirectMessageThread thread : threads) {
            String unreadText = thread.unread > 0 ? " (" + thread.unread + ")" : "";
            String last = transformForCommandDisplay((sender instanceof Player) ? (Player) sender : null, thread.lastMessage, 60);
            String other = formatCommandPlayer(thread.otherDisplayName, thread.otherUsername, thread.otherUuid);
            sender.sendMessage(ChatColor.DARK_GRAY + "- "
                    + ChatColor.RESET + other
                    + ChatColor.GRAY + unreadText
                    + ChatColor.DARK_GRAY + ": "
                    + ChatColor.RESET + last);
        }
        dmListCursors.put(senderUuid.toLowerCase(java.util.Locale.ROOT), cursor);
        sender.sendMessage(yellow("/bmchat dm <player> <message>"));
        sender.sendMessage(yellow("/bmchat dm read <player> [pageSize]"));
        sender.sendMessage(ChatColor.GRAY + msg("dmListNavHint", "Use /bmchat dm list prev for newer conversations, /bmchat dm list next for older conversations."));
        return true;
    }

    private boolean dmRead(CommandSender sender, String senderUuid, String[] args) {
        if (args.length < 3) {
            sender.sendMessage(yellow("/bmchat dm read <player> [pageSize]"));
            return true;
        }
        PlayerIdentity target = plugin.storage().findKnownPlayer(args[2]);
        if (target == null || target.uuid == null || target.uuid.isBlank()) {
            sender.sendMessage(red(msg("dmPlayerNotFound", "Player not found. The player must have joined at least once.")));
            return true;
        }
        int pageSize = 20;
        if (args.length >= 4) {
            try { pageSize = Integer.parseInt(args[3]); } catch (NumberFormatException ignored) {}
        }
        pageSize = Math.max(1, Math.min(100, pageSize));
        DmReadCursor cursor = new DmReadCursor();
        cursor.otherUuid = target.uuid;
        cursor.otherUsername = target.username;
        cursor.otherDisplayName = target.displayName;
        cursor.inputName = args[2];
        cursor.page = 1;
        cursor.pageSize = pageSize;
        dmReadCursors.put(senderUuid.toLowerCase(java.util.Locale.ROOT), cursor);
        return dmReadShow(sender, senderUuid, cursor);
    }

    private boolean dmReadMove(CommandSender sender, String senderUuid, int delta) {
        DmReadCursor cursor = dmReadCursors.get(senderUuid.toLowerCase(java.util.Locale.ROOT));
        if (cursor == null || cursor.otherUuid == null || cursor.otherUuid.isBlank()) {
            sender.sendMessage(yellow(msg("dmReadNoCursor", "Open a thread first: /bmchat dm read <player>")));
            return true;
        }
        int total = plugin.directMessages().countMessagesBetween(senderUuid, cursor.otherUuid);
        int totalPages = Math.max(1, (int) Math.ceil(total / (double) Math.max(1, cursor.pageSize)));
        int nextPage = Math.max(1, Math.min(totalPages, cursor.page + delta));
        if (nextPage == cursor.page) {
            sender.sendMessage(yellow(delta > 0
                    ? msg("dmReadLastPage", "You are already on the oldest page.")
                    : msg("dmReadFirstPage", "You are already on the newest page.")));
            return true;
        }
        cursor.page = nextPage;
        dmReadCursors.put(senderUuid.toLowerCase(java.util.Locale.ROOT), cursor);
        return dmReadShow(sender, senderUuid, cursor);
    }

    private boolean dmReadShow(CommandSender sender, String senderUuid, DmReadCursor cursor) {
        if (cursor == null || cursor.otherUuid == null || cursor.otherUuid.isBlank()) {
            sender.sendMessage(yellow(msg("dmReadNoCursor", "Open a thread first: /bmchat dm read <player>")));
            return true;
        }
        int pageSize = Math.max(1, Math.min(100, cursor.pageSize <= 0 ? 20 : cursor.pageSize));
        int total = plugin.directMessages().countMessagesBetween(senderUuid, cursor.otherUuid);
        int totalPages = Math.max(1, (int) Math.ceil(total / (double) pageSize));
        if (cursor.page < 1) cursor.page = 1;
        if (total > 0 && cursor.page > totalPages) cursor.page = totalPages;
        List<DirectMessageMessage> messages = plugin.directMessages().listMessagesBetweenPage(senderUuid, cursor.otherUuid, cursor.page, pageSize);
        String playerLabel = formatCommandPlayer(cursor.otherDisplayName, cursor.otherUsername, cursor.otherUuid);
        sender.sendMessage(ChatColor.AQUA + msg("dmReadTitlePage", "Direct messages with {player} (page {page}/{pages}):",
                "player", ChatColor.RESET + playerLabel + ChatColor.AQUA,
                "page", Integer.toString(cursor.page),
                "pages", Integer.toString(totalPages)));
        if (messages.isEmpty()) {
            sender.sendMessage(yellow(msg("dmNoMessages", "No messages in this thread.")));
            return true;
        }
        for (DirectMessageMessage message : messages) {
            String senderName = message.senderUuid != null && message.senderUuid.equalsIgnoreCase(senderUuid)
                    ? msg("dmMe", "me")
                    : formatCommandPlayer(message.senderDisplayName, message.senderUsername, message.senderUuid);
            if (senderName == null || senderName.isBlank()) senderName = message.senderUuid;
            String body = transformForCommandDisplay((sender instanceof Player) ? (Player) sender : null, message.body, 0);
            sender.sendMessage(ChatColor.DARK_GRAY + "#" + message.id + " "
                    + ChatColor.RESET + senderName
                    + ChatColor.DARK_GRAY + ": "
                    + ChatColor.RESET + body);
        }
        sender.sendMessage(ChatColor.GRAY + msg("dmReadNavHint", "Use /bmchat dm prev for newer messages, /bmchat dm next for older messages."));
        sender.sendMessage(ChatColor.GRAY + msg("dmHideHint", "Hide one from your view: /bmchat dm hide <messageId>"));
        return true;
    }

    private boolean dmHide(CommandSender sender, String senderUuid, String[] args) {
        if (args.length < 3) {
            sender.sendMessage(yellow("/bmchat dm hide <messageId>"));
            return true;
        }
        long messageId;
        try {
            messageId = Long.parseLong(args[2]);
        } catch (NumberFormatException ex) {
            sender.sendMessage(red(msg("dmInvalidMessageId", "Invalid message id.")));
            return true;
        }
        String threadId = plugin.directMessages().threadIdForMessage(senderUuid, messageId);
        boolean ok = plugin.directMessages().hideMessage(senderUuid, messageId);
        if (!ok) {
            sender.sendMessage(red(msg("dmHideFailed", "Failed to hide message.")));
            return true;
        }
        WebChatServer server = plugin.webServer();
        if (server != null) server.publishDirectMessageUpdate(senderUuid, senderUuid, threadId);
        sender.sendMessage(green(msg("dmHidden", "Message hidden from your view.")));
        return true;
    }
    private String formatCommandPlayer(String displayName, String username, String uuid) {
        String display = displayName == null ? "" : displayName.trim();
        String user = username == null ? "" : username.trim();
        if (!display.isBlank() && !user.isBlank() && !display.equals(user)) return display + " (" + user + ")";
        if (!display.isBlank()) return display;
        if (!user.isBlank()) return user;
        return uuid == null ? "" : uuid;
    }

    private String transformForCommandDisplay(Player viewer, String message, int maxLength) {
        String text = maxLength > 0 ? trim(message, maxLength) : String.valueOf(message == null ? "" : message);
        // DM command output should be delivered as-is; ImageEmojis can handle
        // direct message tokens on its own side.
        return colorizeForGame(text);
    }


    private String colorizeForGame(String value) {
        String out = String.valueOf(value == null ? "" : value);
        out = ChatColor.translateAlternateColorCodes('&', out);
        return out;
    }

    private String sentEchoLine(String targetLabel, String message) {
        String rendered = msg("dmSentEcho", "to: {player} {message}",
                "player", targetLabel == null ? "" : targetLabel,
                "message", message == null ? "" : message);
        // Older installed lang files can leave the old "sent" text in place.
        // Never let the sender confirmation drop the message body.
        if (message != null && !message.isBlank() && (rendered == null || !rendered.contains(message))) {
            String lang = plugin.langManager().currentLanguage();
            String prefix = lang != null && lang.toLowerCase(java.util.Locale.ROOT).startsWith("ko") ? "보냄: " : "to: ";
            rendered = prefix + (targetLabel == null ? "" : targetLabel) + " " + message;
        }
        if (rendered == null) return "";
        rendered = rendered.replaceFirst("(?i)^to:(\\S)", "to: $1");
        rendered = rendered.replaceFirst("^보냄:(\\S)", "보냄: $1");
        return rendered;
    }

    private String sentEchoLineForGame(Player viewer, String targetLabel, String message) {
        String target = targetLabel == null ? "" : targetLabel;
        String body = message == null ? "" : message;
        String rendered = sentEchoLine(ChatColor.RESET + target + ChatColor.GRAY, ChatColor.RESET + body);
        return ChatColor.GRAY + transformForCommandDisplay(viewer, rendered, 0);
    }

    private String incomingLineForGame(String senderName, String message) {
        String playerName = senderName == null ? "" : senderName;
        String body = colorizeForGame(trim(message, 100));
        return ChatColor.LIGHT_PURPLE + msg("dmIncoming", "DM from {player}: {message}",
                "player", ChatColor.RESET + playerName + ChatColor.LIGHT_PURPLE,
                "message", ChatColor.RESET + body);
    }

    private void notifyOnlineRecipient(Player sender, PlayerIdentity target, String message) {
        ConfigValues config = plugin.configValues();
        if (config == null || !config.directMessageNotifyOnMessage) return;
        try {
            Player recipient = plugin.getServer().getPlayer(UUID.fromString(target.uuid));
            if (recipient == null || !recipient.isOnline()) return;
            String senderName = plugin.displayPlayerName(sender);
            recipient.sendMessage(incomingLineForGame(senderName, message));
        } catch (IllegalArgumentException ignored) {
        }
    }

    private String stripForDm(String raw, int maxLength) {
        String out = String.valueOf(raw == null ? "" : raw);
        // Preserve Minecraft legacy color codes and :pack/name: emoji tokens. Only
        // remove real control characters; web rendering handles colors/emojis.
        out = out.replaceAll("[\\p{Cntrl}&&[^\\r\\n\\t]]", "").trim();
        if (maxLength > 0 && out.length() > maxLength) out = out.substring(0, maxLength);
        return out;
    }

    private String trim(String value, int max) {
        String out = value == null ? "" : value.replace('\n', ' ').replace('\r', ' ').trim();
        if (max > 0 && out.length() > max) return out.substring(0, Math.max(0, max - 1)) + "…";
        return out;
    }

    private boolean sessions(CommandSender sender) {
        if (!sender.hasPermission("bluemapwebchat.admin")) {
            sender.sendMessage(red(msg("noPermission", "You do not have permission.")));
            return true;
        }
        plugin.storage().cleanupExpiredSessions();
        List<SessionContext> sessions = plugin.storage().listSessions();
        sender.sendMessage(ChatColor.AQUA + msg("sessionsTitle", "BlueMapWebChat sessions: {count}", "count", Integer.toString(sessions.size())));
        for (SessionContext ctx : sessions) {
            sender.sendMessage(yellow(msg("sessionEntry", "- {username} {role} ip={ip}",
                    "username", ctx.account.safeUsername(),
                    "role", ctx.account.role.name(),
                    "ip", ctx.session.lastIp)));
        }
        return true;
    }

    private boolean revoke(CommandSender sender, String[] args) {
        if (!sender.hasPermission("bluemapwebchat.admin")) {
            sender.sendMessage(red(msg("noPermission", "You do not have permission.")));
            return true;
        }
        if (args.length < 2) {
            sender.sendMessage(yellow("/bmchat revoke <username>"));
            return true;
        }
        int removed = plugin.storage().revokeSessionsForUsername(args[1]);
        sender.sendMessage(green(msg("revokeDone", "Revoked {count} session(s) for {username}.",
                "count", Integer.toString(removed),
                "username", args[1])));
        return true;
    }

    private boolean admin(CommandSender sender, String[] args) {
        if (!sender.hasPermission("bluemapwebchat.admin")) {
            sender.sendMessage(red(msg("noPermission", "You do not have permission.")));
            return true;
        }
        if (args.length < 2) {
            sender.sendMessage(yellow("/bmchat admin create <id>"));
            sender.sendMessage(yellow("/bmchat admin password <id> <password>"));
            sender.sendMessage(yellow("/bmchat admin role <id> <user|moderator|admin>"));
            return true;
        }

        String sub = args[1].toLowerCase();
        if ("create".equals(sub)) {
            if (args.length < 3) {
                sender.sendMessage(yellow("/bmchat admin create <id>"));
                return true;
            }
            if (!plugin.configValues().allowLocalAdminAccounts) {
                sender.sendMessage(red(msg("adminLocalDisabled", "Local admin account creation is disabled.")));
                return true;
            }
            Account a = plugin.storage().createLocalAccount(args[2], Role.ADMIN);
            sender.sendMessage(green(msg("adminCreated", "Created local admin account: {username}", "username", a.safeUsername())));
            sender.sendMessage(yellow(msg("adminSetPasswordHint", "Set password: /bmchat admin password {username} <password>", "username", a.safeUsername())));
            return true;
        }

        if ("password".equals(sub)) {
            if (args.length < 4) {
                sender.sendMessage(yellow("/bmchat admin password <id> <password>"));
                return true;
            }
            Account a = plugin.storage().findAccountByUsername(args[2]);
            if (a == null) {
                sender.sendMessage(red(msg("adminAccountNotFound", "Account not found.")));
                return true;
            }
            plugin.storage().setPassword(a, args[3]);
            sender.sendMessage(green(msg("adminPasswordSetFor", "Password has been set for: {username}", "username", a.safeUsername())));
            return true;
        }

        if ("role".equals(sub)) {
            if (args.length < 4) {
                sender.sendMessage(yellow("/bmchat admin role <id> <user|moderator|admin>"));
                return true;
            }
            Account a = plugin.storage().findAccountByUsername(args[2]);
            if (a == null) {
                sender.sendMessage(red(msg("adminAccountNotFound", "Account not found.")));
                return true;
            }
            Role role = Role.fromString(args[3], null);
            if (role == null || role == Role.GUEST) {
                sender.sendMessage(red(msg("adminRoleInvalid", "Role must be one of: user, moderator, admin.")));
                return true;
            }
            plugin.storage().setRole(a, role);
            sender.sendMessage(green(msg("adminRoleChanged", "{username} role changed to {role}.",
                    "username", a.safeUsername(),
                    "role", role.name())));
            return true;
        }

        sender.sendMessage(red(msg("adminUnknownSubcommand", "Unknown admin subcommand.")));
        return true;
    }

    private void help(CommandSender sender) {
        sender.sendMessage(ChatColor.AQUA + "BlueMapWebChat");
        sender.sendMessage(yellow("/bmchat auth <code>") + ChatColor.GRAY + " - " + msg("helpAuth", "Link web account"));
        sender.sendMessage(yellow("/bmchat password <newPassword>") + ChatColor.GRAY + " - " + msg("helpPassword", "Set web login password"));
        if (sender.hasPermission("bluemapwebchat.admin")) {
            sender.sendMessage(yellow("/bmchat reload") + ChatColor.GRAY + " - " + msg("helpReload", "Reload configuration"));
            sender.sendMessage(yellow("/bmchat admin ...") + ChatColor.GRAY + " - " + msg("helpAdmin", "Manage admin accounts and roles"));
            sender.sendMessage(yellow("/bmchat guest ...") + ChatColor.GRAY + " - " + msg("helpGuest", "Manage guest/IP mutes"));
            sender.sendMessage(yellow("/bmchat sessions") + ChatColor.GRAY + " - " + msg("helpSessions", "List web sessions"));
            sender.sendMessage(yellow("/bmchat revoke <username>") + ChatColor.GRAY + " - " + msg("helpRevoke", "Revoke web sessions"));
        }
        ConfigValues config = plugin.configValues();
        if (config != null && config.pluginEnabled && config.directMessageEnabled && sender instanceof Player) {
            sender.sendMessage(yellow("/bmchat dm <player> <message>") + ChatColor.GRAY + " - " + msg("helpDm", "Send a direct message"));
            sender.sendMessage(yellow("/bmchat dm read <player> [pageSize]") + ChatColor.GRAY + " - " + msg("helpDmRead", "Read a direct message thread"));
        }
    }

    private String msg(String key, String fallback, String... values) {
        Map<String, String> map = new LinkedHashMap<>();
        if (values != null) {
            for (int i = 0; i + 1 < values.length; i += 2) {
                map.put(values[i], values[i + 1]);
            }
        }
        LangManager lm = plugin.langManager();
        if (lm != null) {
            return lm.text("command." + key, fallback, map);
        }
        String out = String.valueOf(fallback == null ? "" : fallback);
        for (Map.Entry<String, String> entry : map.entrySet()) {
            out = out.replace("{" + entry.getKey() + "}", String.valueOf(entry.getValue() == null ? "" : entry.getValue()));
        }
        return out;
    }

    private String red(String s) { return ChatColor.RED + s; }
    private String green(String s) { return ChatColor.GREEN + s; }
    private String yellow(String s) { return ChatColor.YELLOW + s; }


    private List<String> filterPrefix(List<String> values, String partial) {
        String p = String.valueOf(partial == null ? "" : partial).toLowerCase(java.util.Locale.ROOT);
        if (p.isBlank()) return values;
        List<String> out = new ArrayList<>();
        for (String value : values) {
            if (value != null && value.toLowerCase(java.util.Locale.ROOT).startsWith(p)) out.add(value);
        }
        return out;
    }

    private boolean isDmSubcommand(String value) {
        String v = String.valueOf(value == null ? "" : value).toLowerCase(java.util.Locale.ROOT);
        return v.equals("list") || v.equals("unread") || v.equals("read") || v.equals("view")
                || v.equals("next") || v.equals("prev") || v.equals("previous") || v.equals("hide") || v.equals("delete");
    }

    private List<String> emojiTokenTabSuggestions(String partial) {
        List<String> out = new ArrayList<>();
        ConfigValues config = plugin.configValues();
        if (config == null || !config.emojiEnabled) return out;
        String prefix = String.valueOf(partial == null ? "" : partial).trim();
        if (!prefix.startsWith(":")) return out;
        if (prefix.matches("(?i)^https?://.*") || prefix.matches("^\\d{1,2}:\\d{0,2}$")) return out;
        File root = emojiDirectory(config);
        if (root == null || !root.isDirectory()) return out;
        java.util.LinkedHashSet<String> tokens = new java.util.LinkedHashSet<>();
        collectEmojiTokensFromDirectory(root, "default", tokens, config);
        File[] packs = root.listFiles(File::isDirectory);
        if (packs != null) {
            java.util.Arrays.sort(packs, (a, b) -> a.getName().compareToIgnoreCase(b.getName()));
            for (File pack : packs) {
                String packId = sanitizeEmojiTokenSegment(pack.getName());
                if (!packId.isBlank()) collectEmojiTokensFromDirectory(pack, packId, tokens, config);
            }
        }
        String q = prefix.toLowerCase(java.util.Locale.ROOT);
        int max = 80;
        for (String token : tokens) {
            if (token.toLowerCase(java.util.Locale.ROOT).startsWith(q)) {
                out.add(token);
                if (out.size() >= max) break;
            }
        }
        // If the user typed :emoji:..., allow completing the legacy/prefixed form too.
        if (out.isEmpty() && q.startsWith(":emoji:")) {
            String shortPrefix = ":" + prefix.substring(7);
            for (String token : tokens) {
                String legacy = ":emoji" + token;
                if (legacy.toLowerCase(java.util.Locale.ROOT).startsWith(q) || token.toLowerCase(java.util.Locale.ROOT).startsWith(shortPrefix.toLowerCase(java.util.Locale.ROOT))) {
                    out.add(legacy);
                    if (out.size() >= max) break;
                }
            }
        }
        return out;
    }

    private File emojiDirectory(ConfigValues config) {
        String configured = config == null ? null : config.emojiDirectory;
        if (configured == null || configured.isBlank()) configured = "emojis";
        File file = new File(configured);
        return file.isAbsolute() ? file : new File(plugin.getDataFolder(), configured);
    }

    private void collectEmojiTokensFromDirectory(File dir, String packId, java.util.LinkedHashSet<String> out, ConfigValues config) {
        File[] files = dir.listFiles(File::isFile);
        if (files == null) return;
        java.util.Arrays.sort(files, (a, b) -> a.getName().compareToIgnoreCase(b.getName()));
        java.util.HashSet<String> seenNames = new java.util.HashSet<>();
        for (File file : files) {
            String fileName = file.getName();
            int dot = fileName.lastIndexOf('.');
            String ext = dot >= 0 ? fileName.substring(dot + 1).toLowerCase(java.util.Locale.ROOT) : "";
            if (!emojiExtensionAllowedForTab(ext, config)) continue;
            String base = dot >= 0 ? fileName.substring(0, dot) : fileName;
            String name = sanitizeEmojiTokenSegment(base);
            if (name.isBlank() || !seenNames.add(name.toLowerCase(java.util.Locale.ROOT))) continue;
            out.add(":" + packId + "/" + name + ":");
        }
    }

    private boolean emojiExtensionAllowedForTab(String ext, ConfigValues config) {
        String e = String.valueOf(ext == null ? "" : ext).replace(".", "").trim().toLowerCase(java.util.Locale.ROOT);
        if (e.isBlank()) return false;
        List<String> allowed = config == null ? null : config.emojiAllowedExtensions;
        if (allowed == null || allowed.isEmpty()) return e.equals("png") || e.equals("jpg") || e.equals("jpeg") || e.equals("gif") || e.equals("webp");
        for (String a : allowed) {
            if (e.equals(String.valueOf(a).replace(".", "").trim().toLowerCase(java.util.Locale.ROOT))) return true;
        }
        return false;
    }

    private String sanitizeEmojiTokenSegment(String value) {
        String raw = String.valueOf(value == null ? "" : value).trim();
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < raw.length(); i++) {
            char ch = raw.charAt(i);
            if (Character.isLetterOrDigit(ch) || ch == '_' || ch == '-' || ch == '.') sb.append(ch);
        }
        return sb.toString();
    }

    @Override
    public List<String> onTabComplete(CommandSender sender, Command command, String alias, String[] args) {
        List<String> out = new ArrayList<>();
        ConfigValues config = plugin.configValues();
        if (config != null && !config.pluginEnabled) {
            if (args.length == 1 && sender.hasPermission("bluemapwebchat.admin")) out.add("reload");
            return filterPrefix(out, args.length == 0 ? "" : args[args.length - 1]);
        }
        if (args.length == 1) {
            out.add("auth");
            out.add("password");
            if (config != null && config.directMessageEnabled && sender instanceof Player) out.add("dm");
            if (sender.hasPermission("bluemapwebchat.admin")) {
                out.add("reload");
                out.add("admin");
                out.add("guest");
                out.add("sessions");
                out.add("revoke");
            }
        } else if (args.length == 2 && "dm".equalsIgnoreCase(args[0]) && sender instanceof Player) {
            out.add("list");
            out.add("unread");
            out.add("read");
            out.add("next");
            out.add("prev");
            out.add("hide");
            String partial = args.length > 1 ? args[1] : "";
            for (PlayerIdentity p : plugin.storage().listKnownPlayers(partial, 20)) {
                if (p.username != null && !p.username.isBlank()) out.add(p.username);
                else if (p.displayName != null && !p.displayName.isBlank()) out.add(p.displayName);
            }
        } else if (args.length == 3 && "dm".equalsIgnoreCase(args[0]) && "read".equalsIgnoreCase(args[1]) && sender instanceof Player) {
            String partial = args.length > 2 ? args[2] : "";
            for (PlayerIdentity p : plugin.storage().listKnownPlayers(partial, 20)) {
                if (p.username != null && !p.username.isBlank()) out.add(p.username);
                else if (p.displayName != null && !p.displayName.isBlank()) out.add(p.displayName);
            }
        } else if (args.length >= 3 && "dm".equalsIgnoreCase(args[0]) && sender instanceof Player && !isDmSubcommand(args[1])) {
            out.addAll(emojiTokenTabSuggestions(args[args.length - 1]));
        } else if (args.length == 2 && "admin".equalsIgnoreCase(args[0]) && sender.hasPermission("bluemapwebchat.admin")) {
            out.add("create");
            out.add("password");
            out.add("role");
        } else if (args.length == 2 && "guest".equalsIgnoreCase(args[0]) && sender.hasPermission("bluemapwebchat.admin")) {
            out.add("mute");
            out.add("unmute");
            out.add("list");
        } else if (args.length == 3 && "guest".equalsIgnoreCase(args[0]) && ("mute".equalsIgnoreCase(args[1]) || "unmute".equalsIgnoreCase(args[1])) && sender.hasPermission("bluemapwebchat.admin")) {
            out.add("guest");
            out.add("ip");
        }
        return filterPrefix(out, args.length == 0 ? "" : args[args.length - 1]);
    }
}
