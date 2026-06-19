package dev.kokoto.bluemapwebchat;

import org.bukkit.Bukkit;
import org.bukkit.plugin.Plugin;

import java.lang.reflect.InvocationHandler;
import java.lang.reflect.Method;
import java.lang.reflect.Proxy;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

public class DiscordBridge {
    private final BlueMapWebChatPlugin plugin;
    private Object jda;
    private Object jdaListener;
    private Thread jdaRetryThread;
    private volatile boolean started;
    private final Map<String, Long> recentDiscordInbound = new ConcurrentHashMap<>();
    private final Map<String, Long> recentDiscordEventIds = new ConcurrentHashMap<>();

    public DiscordBridge(BlueMapWebChatPlugin plugin) {
        this.plugin = plugin;
    }

    public void start() {
        stop();

        ConfigValues c = plugin.configValues();
        if (!c.discordEnabled) return;

        Plugin discordSrv = Bukkit.getPluginManager().getPlugin("DiscordSRV");
        if (discordSrv == null || !discordSrv.isEnabled()) {
            plugin.getLogger().warning("discordsrv.enabled is true, but DiscordSRV is not loaded. Discord bridge disabled.");
            return;
        }

        started = true;

        if (c.discordDiscordToWeb) {
            startJdaListenerRetry();
        }

        plugin.getLogger().info("DiscordSRV bridge enabled. channel=" + c.discordChannel
                + ", webToDiscord=" + c.discordWebToDiscord
                + ", discordToWeb=" + c.discordDiscordToWeb);
    }

    public void stop() {
        if (jdaRetryThread != null) {
            jdaRetryThread.interrupt();
            jdaRetryThread = null;
        }
        if (jda != null && jdaListener != null) {
            try {
                Method remove = jda.getClass().getMethod("removeEventListener", Object[].class);
                remove.invoke(jda, new Object[]{new Object[]{jdaListener}});
            } catch (Throwable ignored) {
            }
        }
        jda = null;
        jdaListener = null;
        recentDiscordInbound.clear();
        recentDiscordEventIds.clear();
        started = false;
    }

    public void sendWebMessage(ChatMessage msg) {
        ConfigValues c = plugin.configValues();
        if (!c.discordEnabled || !c.discordWebToDiscord) return;

        boolean allow;
        if ("guest".equalsIgnoreCase(msg.source)) {
            allow = c.discordSendWebGuest;
        } else if ("ADMIN".equalsIgnoreCase(msg.role)) {
            allow = c.discordSendWebAdmin;
        } else {
            allow = c.discordSendWebUser;
        }
        if (!allow) return;

        String text = format(c.discordWebToDiscordFormat, msg.sender, msg.role, msg.source, msg.message, c.discordChannel);
        if (text.isBlank()) return;

        sendDirectToDiscord(text);
    }

    private void startJdaListenerRetry() {
        if (jdaRetryThread != null && jdaRetryThread.isAlive()) return;

        jdaRetryThread = new Thread(() -> {
            int attempt = 0;
            while (started && !Thread.currentThread().isInterrupted()) {
                attempt++;
                try {
                    installJdaListener();
                    plugin.getLogger().info("DiscordSRV/JDA listener installed for Discord -> web chat. attempt=" + attempt);
                    return;
                } catch (Throwable t) {
                    if (attempt == 1 || attempt % 6 == 0) {
                        plugin.getLogger().warning("DiscordSRV/JDA listener is not ready yet; retrying. attempt="
                                + attempt + ", reason=" + t.getMessage());
                    }
                    try {
                        Thread.sleep(5000L);
                    } catch (InterruptedException ex) {
                        Thread.currentThread().interrupt();
                        return;
                    }
                }
            }
        }, "BlueMapWebChat-DiscordSRV-JDA-Retry");
        jdaRetryThread.setDaemon(true);
        jdaRetryThread.start();
    }

    private void installJdaListener() throws Exception {
        if (jda != null && jdaListener != null) return;

        Object jdaObject = getJda();
        if (jdaObject == null) {
            throw new IllegalStateException("DiscordSRV JDA is not ready");
        }

        ClassLoader cl = jdaObject.getClass().getClassLoader();
        Class<?> listenerClass = findClass(cl,
                "github.scarsz.discordsrv.dependencies.jda.api.hooks.EventListener",
                "net.dv8tion.jda.api.hooks.EventListener"
        );

        InvocationHandler handler = (proxy, method, args) -> {
            if ("onEvent".equals(method.getName()) && args != null && args.length == 1) {
                handleJdaEvent(args[0]);
            }
            return null;
        };

        Object listener = Proxy.newProxyInstance(cl, new Class[]{listenerClass}, handler);
        Method add = jdaObject.getClass().getMethod("addEventListener", Object[].class);
        add.invoke(jdaObject, new Object[]{new Object[]{listener}});

        this.jda = jdaObject;
        this.jdaListener = listener;
    }

    private Class<?> findClass(ClassLoader cl, String... names) throws ClassNotFoundException {
        ClassNotFoundException last = null;
        for (String name : names) {
            try {
                return Class.forName(name, false, cl);
            } catch (ClassNotFoundException ex) {
                last = ex;
            }
        }
        throw last == null ? new ClassNotFoundException("No class names supplied") : last;
    }


    private void handleJdaEvent(Object event) {
        try {
            ConfigValues c = plugin.configValues();
            if (!c.discordEnabled || !c.discordDiscordToWeb) return;

            String eventName = event.getClass().getName();
            if (!eventName.endsWith("MessageReceivedEvent")) return;

            Object channel = call(event, "getChannel");
            if (!isConfiguredChannel(channel)) return;

            Object author = call(event, "getAuthor");
            if (author == null) return;
            if (c.discordIgnoreBotMessages && asBoolean(call(author, "isBot"))) return;

            Object message = call(event, "getMessage");

            String eventId = callString(message, "getId");
            if (!eventId.isBlank() && seenRecently(recentDiscordEventIds, eventId, 60_000L)) return;
            if (!eventId.isBlank()) recentDiscordEventIds.put(eventId, System.currentTimeMillis());

            String content = firstNonBlank(callString(message, "getContentRaw"), callString(message, "getContentDisplay"));
            if (content.isBlank()) return;

            rememberDiscordInbound(content);

            String sender = discordSender(event, author);
            String webSender = format(c.discordToWebSenderFormat, sender, "DISCORD", "discord", content, c.discordChannel);
            String webMessage = format(c.discordToWebMessageFormat, sender, "DISCORD", "discord", content, c.discordChannel);

            Bukkit.getScheduler().runTask(plugin, () -> {
                WebChatServer server = plugin.webServer();
                if (server != null) {
                    server.publishFromDiscord(webSender, webMessage);
                }
            });
        } catch (Throwable t) {
            plugin.getLogger().warning("Failed to relay Discord message to web chat: " + t.getMessage());
        }
    }

    private boolean sendDirectToDiscord(String text) {
        try {
            Object channel = getDiscordSrvTextChannel();
            if (channel == null) {
                plugin.getLogger().warning("DiscordSRV channel not found: " + plugin.configValues().discordChannel);
                return false;
            }
            Object action = channel.getClass().getMethod("sendMessage", CharSequence.class).invoke(channel, text);
            action.getClass().getMethod("queue").invoke(action);
            return true;
        } catch (NoSuchMethodException ex) {
            try {
                Object channel = getDiscordSrvTextChannel();
                if (channel == null) return false;
                Object action = channel.getClass().getMethod("sendMessage", String.class).invoke(channel, text);
                action.getClass().getMethod("queue").invoke(action);
                return true;
            } catch (Throwable t) {
                plugin.getLogger().warning("Failed to send web chat to DiscordSRV channel: " + t.getMessage());
                return false;
            }
        } catch (Throwable t) {
            plugin.getLogger().warning("Failed to send web chat to DiscordSRV channel: " + t.getMessage());
            return false;
        }
    }

    public boolean shouldSuppressGameEcho(String player, String message) {
        ConfigValues c = plugin.configValues();
        if (!c.discordEnabled || !c.discordSuppressGameEcho) return false;
        if (message == null || message.isBlank()) return false;

        long ttl = Math.max(1, c.discordSuppressGameEchoSeconds) * 1000L;
        long now = System.currentTimeMillis();
        String normalizedMessage = normalizeEcho(message);

        pruneRecent(now, ttl);

        for (Map.Entry<String, Long> entry : recentDiscordInbound.entrySet()) {
            if (now - entry.getValue() > ttl) continue;
            String recent = entry.getKey();
            if (normalizedMessage.equals(recent) || normalizedMessage.contains(recent)) {
                return true;
            }
        }
        return false;
    }

    private void rememberDiscordInbound(String message) {
        ConfigValues c = plugin.configValues();
        if (!c.discordSuppressGameEcho) return;
        String key = normalizeEcho(message);
        if (key.isBlank()) return;
        recentDiscordInbound.put(key, System.currentTimeMillis());
        pruneRecent(System.currentTimeMillis(), Math.max(1, c.discordSuppressGameEchoSeconds) * 1000L);
    }

    private boolean seenRecently(Map<String, Long> map, String key, long ttlMillis) {
        long now = System.currentTimeMillis();
        Long old = map.get(key);
        if (old != null && now - old <= ttlMillis) return true;
        map.entrySet().removeIf(e -> now - e.getValue() > ttlMillis);
        return false;
    }

    private void pruneRecent(long now, long ttlMillis) {
        recentDiscordInbound.entrySet().removeIf(e -> now - e.getValue() > ttlMillis);
        recentDiscordEventIds.entrySet().removeIf(e -> now - e.getValue() > 60_000L);
    }

    private String normalizeEcho(String value) {
        if (value == null) return "";
        return value
                .replaceAll("§.", "")
                .replaceAll("[\\r\\n\\t]+", " ")
                .replaceAll("\\s+", " ")
                .trim()
                .toLowerCase(Locale.ROOT);
    }

    private Object getDiscordSrvTextChannel() throws Exception {
        Class<?> discordSrv = Class.forName("github.scarsz.discordsrv.DiscordSRV");
        Object srvPlugin = discordSrv.getMethod("getPlugin").invoke(null);
        if (srvPlugin == null) return null;
        return srvPlugin.getClass()
                .getMethod("getDestinationTextChannelForGameChannelName", String.class)
                .invoke(srvPlugin, plugin.configValues().discordChannel);
    }

    private Object getJda() throws Exception {
        try {
            Class<?> discordUtil = Class.forName("github.scarsz.discordsrv.util.DiscordUtil");
            Object value = discordUtil.getMethod("getJda").invoke(null);
            if (value != null) return value;
        } catch (ClassNotFoundException ignored) {
        }

        Class<?> discordSrv = Class.forName("github.scarsz.discordsrv.DiscordSRV");
        Object srvPlugin = discordSrv.getMethod("getPlugin").invoke(null);
        if (srvPlugin == null) return null;

        Object value = call(srvPlugin, "getJda");
        if (value != null) return value;

        value = call(srvPlugin, "getJDA");
        if (value != null) return value;

        return null;
    }


    private boolean isConfiguredChannel(Object channel) throws Exception {
        Object configured = getDiscordSrvTextChannel();
        if (configured == null || channel == null) return false;

        String a = callString(channel, "getId");
        String b = callString(configured, "getId");
        if (!a.isBlank() && a.equals(b)) return true;

        String an = callString(channel, "getName");
        String bn = callString(configured, "getName");
        return !an.isBlank() && an.equalsIgnoreCase(bn);
    }

    private String discordSender(Object event, Object author) {
        try {
            Object member = call(event, "getMember");
            String effective = callString(member, "getEffectiveName");
            if (!effective.isBlank()) return effective;
        } catch (Throwable ignored) {
        }
        String global = callString(author, "getGlobalName");
        if (!global.isBlank()) return global;
        String name = callString(author, "getName");
        return name.isBlank() ? "Discord" : name;
    }

    private String format(String template, String sender, String role, String source, String message, String channel) {
        if (template == null || template.isBlank()) template = "{message}";
        return template
                .replace("{sender}", safeText(sender))
                .replace("{name}", safeText(sender))
                .replace("{role}", safeText(role))
                .replace("{source}", safeText(source))
                .replace("{message}", safeText(message))
                .replace("{channel}", safeText(channel));
    }

    private Object call(Object target, String method) {
        if (target == null) return null;
        try {
            return target.getClass().getMethod(method).invoke(target);
        } catch (Throwable ignored) {
            return null;
        }
    }

    private String callString(Object target, String method) {
        Object v = call(target, method);
        return v == null ? "" : String.valueOf(v);
    }

    private boolean asBoolean(Object v) {
        return v instanceof Boolean && (Boolean) v;
    }

    private String firstNonBlank(String... values) {
        for (String v : values) {
            if (v != null && !v.isBlank()) return v;
        }
        return "";
    }

    private String safeText(String s) {
        if (s == null) return "";
        return s.replace("\r", " ").replace("\n", " ").trim();
    }

    private String sanitizeCommand(String s) {
        return safeText(s).replace("\"", "\\\"");
    }
}
