package dev.kokoto.bluemapwebchat;

import org.bukkit.ChatColor;
import org.bukkit.command.*;
import org.bukkit.entity.Player;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public class BmChatCommand implements CommandExecutor, TabCompleter {
    private final BlueMapWebChatPlugin plugin;

    public BmChatCommand(BlueMapWebChatPlugin plugin) {
        this.plugin = plugin;
    }

    @Override
    public boolean onCommand(CommandSender sender, Command command, String label, String[] args) {
        if (args.length == 0) {
            help(sender);
            return true;
        }

        switch (args[0].toLowerCase()) {
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
    }

    private String msg(String key, String fallback, String... values) {
        Map<String, String> map = new LinkedHashMap<>();
        if (values != null) {
            for (int i = 0; i + 1 < values.length; i += 2) {
                map.put(values[i], values[i + 1]);
            }
        }
        return plugin.langManager().text("command." + key, fallback, map);
    }

    private String red(String s) { return ChatColor.RED + s; }
    private String green(String s) { return ChatColor.GREEN + s; }
    private String yellow(String s) { return ChatColor.YELLOW + s; }

    @Override
    public List<String> onTabComplete(CommandSender sender, Command command, String alias, String[] args) {
        List<String> out = new ArrayList<>();
        if (args.length == 1) {
            out.add("auth");
            out.add("password");
            if (sender.hasPermission("bluemapwebchat.admin")) {
                out.add("reload");
                out.add("admin");
                out.add("guest");
                out.add("sessions");
                out.add("revoke");
            }
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
        return out;
    }
}
