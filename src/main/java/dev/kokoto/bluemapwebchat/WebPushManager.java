package dev.kokoto.bluemapwebchat;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.math.BigInteger;
import java.net.HttpURLConnection;
import java.net.URI;
import java.net.URL;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.AlgorithmParameters;
import java.security.GeneralSecurityException;
import java.security.KeyFactory;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.PrivateKey;
import java.security.PublicKey;
import java.security.SecureRandom;
import java.security.Signature;
import java.security.interfaces.ECPrivateKey;
import java.security.interfaces.ECPublicKey;
import java.security.spec.ECGenParameterSpec;
import java.security.spec.ECParameterSpec;
import java.security.spec.ECPoint;
import java.security.spec.ECPrivateKeySpec;
import java.security.spec.ECPublicKeySpec;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Base64;
import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Properties;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import javax.crypto.Cipher;
import javax.crypto.KeyAgreement;
import javax.crypto.Mac;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;

/** Standards-based Web Push sender for browser/mobile push notifications.
 *  It intentionally uses only JDK classes so the plugin does not need another shaded dependency.
 */
public class WebPushManager {
    public static class Payload {
        public String type = "chat";
        public String title = "";
        public String body = "";
        public String url = "";
        public String tag = "bmwc";
        public String senderUuid = "";
        public String replyTargetUuid = "";
    }

    private static class Subscription {
        String endpoint = "";
        String userUuid = "";
        String p256dh = "";
        String auth = "";
        String userAgent = "";
        boolean notifyNormalChat;
        boolean notifyDm;
        boolean notifyGroupChat;
        boolean notifyMentions;
        boolean notifyReplies;
        boolean notifySystem;
        boolean notifyKeywords;
        List<String> keywords = new ArrayList<>();
        String language = "";
        String openUrl = "";
        boolean notifyOwnMessages;
        boolean showMessagePreview;
        long updatedAt;
    }

    private final BlueMapWebChatPlugin plugin;
    private final Map<String, Subscription> byEndpoint = new ConcurrentHashMap<>();
    private final Base64.Encoder b64uNoPad = Base64.getUrlEncoder().withoutPadding();
    private final Base64.Decoder b64u = Base64.getUrlDecoder();
    private final SecureRandom random = new SecureRandom();
    private final Map<String, Long> keywordCooldownUntil = new ConcurrentHashMap<>();
    private static final long KEYWORD_PUSH_COOLDOWN_MILLIS = 60_000L;
    private volatile KeyPair vapidKeyPair;
    private volatile String vapidPublicKeyBase64 = "";

    public WebPushManager(BlueMapWebChatPlugin plugin) {
        this.plugin = plugin;
    }

    public void start() {
        loadSubscriptions();
        ensureVapidKeyPair();
    }

    public String vapidPublicKey() {
        ensureVapidKeyPair();
        return vapidPublicKeyBase64 == null ? "" : vapidPublicKeyBase64;
    }

    public boolean available() {
        ConfigValues c = plugin.configValues();
        return c != null && c.webPushEnabled && !vapidPublicKey().isBlank();
    }

    public synchronized boolean subscribe(Account account, Map<String, String> body, String userAgent) {
        if (account == null || account.uuid == null || account.uuid.isBlank()) return false;
        String endpoint = clean(body.get("endpoint"), 2048);
        String p256dh = clean(body.get("p256dh"), 512);
        String auth = clean(body.get("auth"), 256);
        if (endpoint.isBlank() || p256dh.isBlank() || auth.isBlank()) return false;
        Subscription s = new Subscription();
        s.endpoint = endpoint;
        s.userUuid = account.uuid.trim().toLowerCase(Locale.ROOT);
        s.p256dh = p256dh;
        s.auth = auth;
        s.userAgent = clean(userAgent, 300);
        ConfigValues c = plugin.configValues();
        s.notifyNormalChat = (c == null || c.webPushNotifyNormalChat) && readBool(body, "notifyNormalChat", c != null && c.webPushNotifyNormalChat);
        s.notifyDm = (c == null || c.webPushNotifyDm) && readBool(body, "notifyDm", c == null || c.webPushNotifyDm);
        s.notifyGroupChat = (c == null || c.webPushNotifyGroupChat) && readBool(body, "notifyGroupChat", c == null || c.webPushNotifyGroupChat);
        s.notifyMentions = (c == null || c.webPushNotifyMentions) && readBool(body, "notifyMentions", c == null || c.webPushNotifyMentions);
        s.notifyReplies = (c == null || c.webPushNotifyReplies) && readBool(body, "notifyReplies", c == null || c.webPushNotifyReplies);
        s.notifySystem = (c == null || c.webPushNotifySystem) && readBool(body, "notifySystem", c == null || c.webPushNotifySystem);
        s.notifyKeywords = (c == null || c.webPushNotifyKeywords) && readBool(body, "notifyKeywords", c == null || c.webPushNotifyKeywords);
        s.keywords = normalizeKeywords(body == null ? "" : body.get("keywords"));
        s.language = clean(body == null ? "" : body.get("language"), 40);
        s.openUrl = clean(body == null ? "" : body.get("openUrl"), 2048);
        s.notifyOwnMessages = (c == null || c.webPushNotifyOwnMessages) && readBool(body, "notifyOwnMessages", c != null && c.webPushNotifyOwnMessages);
        s.showMessagePreview = (c == null || c.webPushShowMessagePreview) && readBool(body, "showMessagePreview", c == null || c.webPushShowMessagePreview);
        s.updatedAt = System.currentTimeMillis();
        byEndpoint.put(endpoint, s);
        saveSubscriptions();
        return true;
    }

    public synchronized boolean unsubscribe(Account account, String endpoint) {
        String ep = clean(endpoint, 2048);
        if (ep.isBlank()) return false;
        Subscription s = byEndpoint.get(ep);
        if (s != null && account != null && account.uuid != null && !s.userUuid.equalsIgnoreCase(account.uuid)) return false;
        boolean removed = byEndpoint.remove(ep) != null;
        if (removed) saveSubscriptions();
        return removed;
    }

    public void sendToUser(String userUuid, Payload payload) {
        if (userUuid == null || userUuid.isBlank()) return;
        sendToUsers(Set.of(userUuid.trim().toLowerCase(Locale.ROOT)), payload);
    }

    public void sendToAll(Payload payload) {
        Set<String> all = ConcurrentHashMap.newKeySet();
        for (Subscription s : byEndpoint.values()) {
            if (s != null && s.userUuid != null && !s.userUuid.isBlank()) all.add(s.userUuid);
        }
        sendToUsers(all, payload);
    }

    public void sendToUsers(Set<String> userUuids, Payload payload) {
        ConfigValues c = plugin.configValues();
        if (c == null || !c.webPushEnabled || payload == null || userUuids == null || userUuids.isEmpty()) return;
        ensureVapidKeyPair();
        if (vapidKeyPair == null || vapidPublicKeyBase64 == null || vapidPublicKeyBase64.isBlank()) return;
        Set<String> normalized = ConcurrentHashMap.newKeySet();
        for (String uuid : userUuids) {
            if (uuid != null && !uuid.isBlank()) normalized.add(uuid.trim().toLowerCase(Locale.ROOT));
        }
        if (normalized.isEmpty()) return;
        List<Subscription> targets = new ArrayList<>();
        for (Subscription s : byEndpoint.values()) {
            if (s == null || !normalized.contains(s.userUuid)) continue;
            if (!allowsSubscription(s, payload, c)) continue;
            targets.add(s);
        }
        if (targets.isEmpty()) return;
        for (Subscription s : targets) {
            try {
                String matchedKeyword = matchedKeyword(s, payload);
                if (!matchedKeyword.isBlank() && keywordCooldownActive(s, payload, matchedKeyword)) continue;
                String json = payloadJson(s, payload, c.webPushShowMessagePreview && s.showMessagePreview, matchedKeyword);
                sendOne(s, json, Math.max(30, c.webPushTtlSeconds));
                if (!matchedKeyword.isBlank()) markKeywordCooldown(s, payload, matchedKeyword);
            } catch (Exception ex) {
                String msg = ex.getMessage() == null ? ex.getClass().getSimpleName() : ex.getMessage();
                plugin.getLogger().fine("Web Push delivery failed: " + msg);
            }
        }
    }

    private boolean allowsSubscription(Subscription s, Payload payload, ConfigValues c) {
        if (s == null || payload == null || c == null) return false;
        String type = payload.type == null ? "" : payload.type.trim().toLowerCase(Locale.ROOT);
        if ("test".equals(type)) return true;
        String sender = payload.senderUuid == null ? "" : payload.senderUuid.trim().toLowerCase(Locale.ROOT);
        if (!sender.isBlank() && sender.equalsIgnoreCase(s.userUuid)) {
            if (!c.webPushNotifyOwnMessages || !s.notifyOwnMessages) return false;
        }
        if (c.webPushNotifyKeywords && s.notifyKeywords && !matchedKeyword(s, payload).isBlank()) return true;
        String replyTarget = payload.replyTargetUuid == null ? "" : payload.replyTargetUuid.trim().toLowerCase(Locale.ROOT);
        boolean isReplyTarget = !replyTarget.isBlank() && replyTarget.equalsIgnoreCase(s.userUuid);
        if ("reply".equals(type)) {
            return c.webPushNotifyReplies && s.notifyReplies;
        }
        if (isReplyTarget && c.webPushNotifyReplies && s.notifyReplies) return false;
        if ("dm".equals(type)) {
            if (!c.webPushNotifyDm || !s.notifyDm) return false;
        } else if ("group".equals(type) || "group-chat".equals(type)) {
            if (!c.webPushNotifyGroupChat || !s.notifyGroupChat) return false;
        } else if ("system".equals(type) || "server".equals(type)) {
            if (!c.webPushNotifySystem || !s.notifySystem) return false;
        } else {
            if (!c.webPushNotifyNormalChat || !s.notifyNormalChat) return false;
        }
        return true;
    }

    private List<String> normalizeKeywords(String raw) {
        String text = String.valueOf(raw == null ? "" : raw);
        List<String> out = new ArrayList<>();
        Set<String> seen = ConcurrentHashMap.newKeySet();
        for (String part : text.split("[\r\n,]+")) {
            String keyword = clean(part, 80);
            if (keyword.isBlank()) continue;
            String lower = keyword.toLowerCase(Locale.ROOT);
            if (!seen.add(lower)) continue;
            out.add(keyword);
            if (out.size() >= 40) break;
        }
        return out;
    }

    private String matchedKeyword(Subscription s, Payload payload) {
        if (s == null || payload == null || s.keywords == null || s.keywords.isEmpty()) return "";
        String haystack = (String.valueOf(payload.title == null ? "" : payload.title) + " " + String.valueOf(payload.body == null ? "" : payload.body)).toLowerCase(Locale.ROOT);
        for (String keyword : s.keywords) {
            String kw = String.valueOf(keyword == null ? "" : keyword).trim();
            if (kw.isBlank()) continue;
            if (haystack.contains(kw.toLowerCase(Locale.ROOT))) return kw;
        }
        return "";
    }

    private String keywordCooldownKey(Subscription s, Payload payload, String keyword) {
        String endpoint = s == null ? "" : clean(s.endpoint, 512);
        String type = payload == null ? "" : clean(payload.type, 40).toLowerCase(Locale.ROOT);
        String tag = payload == null ? "" : clean(payload.tag, 120).toLowerCase(Locale.ROOT);
        String kw = clean(keyword, 80).toLowerCase(Locale.ROOT);
        return endpoint + "|" + type + "|" + tag + "|" + kw;
    }

    private boolean keywordCooldownActive(Subscription s, Payload payload, String keyword) {
        String key = keywordCooldownKey(s, payload, keyword);
        if (key.isBlank()) return false;
        long now = System.currentTimeMillis();
        Long until = keywordCooldownUntil.get(key);
        if (until != null && until > now) return true;
        if (until != null) keywordCooldownUntil.remove(key, until);
        return false;
    }

    private void markKeywordCooldown(Subscription s, Payload payload, String keyword) {
        String key = keywordCooldownKey(s, payload, keyword);
        if (!key.isBlank()) keywordCooldownUntil.put(key, System.currentTimeMillis() + KEYWORD_PUSH_COOLDOWN_MILLIS);
    }


    private boolean readBool(Map<String, String> body, String key, boolean fallback) {
        String value = body == null ? "" : String.valueOf(body.getOrDefault(key, "")).trim().toLowerCase(Locale.ROOT);
        if (value.equals("true") || value.equals("1") || value.equals("yes") || value.equals("on")) return true;
        if (value.equals("false") || value.equals("0") || value.equals("no") || value.equals("off")) return false;
        return fallback;
    }

    private String configuredNotificationTitle() {
        ConfigValues c = plugin.configValues();
        String title = c == null ? "" : clean(c.webPushNotificationTitle, 80);
        if (title != null && !title.isBlank()) return title;
        String appName = c == null ? "" : clean(c.standaloneWebAppName, 80);
        return appName == null || appName.isBlank() ? "Web Chat" : appName;
    }

    private String subscriptionText(Subscription s, String key, String fallback) {
        try {
            String lang = s == null ? "" : clean(s.language, 40);
            Map<String, String> strings = plugin.langManager().webStringsFor(lang);
            String value = strings == null ? null : strings.get(key);
            return value == null || value.isBlank() ? fallback : value;
        } catch (Exception ignored) {
            return fallback;
        }
    }

    private String payloadJson(Subscription sub, Payload p, boolean preview, String matchedKeyword) {
        Map<String, Object> m = new LinkedHashMap<>();
        String keyword = clean(matchedKeyword, 80);
        boolean keywordHit = !keyword.isBlank();
        String baseTitle = configuredNotificationTitle();
        String type = clean(p.type, 40).toLowerCase(Locale.ROOT);
        String title = p.title == null || p.title.isBlank() ? baseTitle : p.title;
        String rawBody = p.body == null ? "" : p.body;
        if ("test".equals(type) && rawBody.isBlank()) rawBody = subscriptionText(sub, "notification.testBody", "Test push sent.");
        String body = preview ? clean(rawBody, 240) : "";
        if (keywordHit) {
            String keywordLabel = subscriptionText(sub, "notification.keyword", "Keyword");
            m.put("title", baseTitle);
            m.put("body", preview ? clean(keywordLabel + ": " + keyword + " · " + title + (body.isBlank() ? "" : " · " + body), 240) : clean(keywordLabel + ": " + keyword + " · " + title, 120));
            m.put("type", "keyword");
            m.put("tag", clean("bmwc-keyword-" + keyword.replaceAll("[^A-Za-z0-9가-힣ぁ-んァ-ン一-龥_-]", ""), 120));
        } else {
            m.put("title", baseTitle);
            String detailPrefix = title.equals(baseTitle) ? "" : title;
            if ("reply".equals(type)) {
                String replyLabel = subscriptionText(sub, "notification.reply", "Reply");
                detailPrefix = replyLabel + (detailPrefix.isBlank() ? "" : ": " + detailPrefix);
            }
            if ("dm".equals(type) && !detailPrefix.isBlank()) {
                detailPrefix = subscriptionText(sub, "notification.dm", "DM") + ": " + detailPrefix;
            }
            m.put("body", preview ? clean(detailPrefix + (detailPrefix.isBlank() || body.isBlank() ? "" : " · ") + body, 240) : "");
            m.put("type", clean(p.type, 40));
            m.put("tag", clean(p.tag, 120));
        }
        m.put("url", notificationOpenUrl(sub, p == null ? "" : p.url));
        m.put("time", System.currentTimeMillis());
        return JsonUtil.obj(m);
    }

    private String notificationOpenUrl(Subscription sub, String payloadUrl) {
        String payload = clean(payloadUrl, 2048);
        String base = sub == null ? "" : clean(sub.openUrl, 2048);
        if (base.isBlank()) return payload;
        Map<String, String> nav = extractNavigationParams(payload);
        // The subscription openUrl is the canonical page where the user enabled
        // Web Push. Payload URLs are kept only as navigation hints/fallbacks.
        // Without this, no-target notifications such as test/system pushes could
        // still open the configured standalone path (/chat) even for BlueMap addon
        // subscriptions.
        if (nav.isEmpty()) return base;
        return withNavigationParams(base, nav);
    }

    private Map<String, String> extractNavigationParams(String value) {
        Map<String, String> out = new LinkedHashMap<>();
        String raw = clean(value, 2048);
        if (raw.isBlank()) return out;
        try {
            URI uri;
            if (raw.startsWith("http://") || raw.startsWith("https://")) uri = URI.create(raw);
            else uri = URI.create("https://bmwc.local" + (raw.startsWith("/") ? raw : "/" + raw));
            String q = uri.getRawQuery();
            if (q == null || q.isBlank()) return out;
            for (String part : q.split("&")) {
                if (part == null || part.isBlank()) continue;
                int eq = part.indexOf('=');
                String k = eq >= 0 ? part.substring(0, eq) : part;
                String v = eq >= 0 ? part.substring(eq + 1) : "";
                k = java.net.URLDecoder.decode(k, StandardCharsets.UTF_8);
                if (!isNavigationParam(k)) continue;
                v = java.net.URLDecoder.decode(v, StandardCharsets.UTF_8);
                if (!v.isBlank()) out.put(k, v);
            }
        } catch (Exception ignored) {
        }
        return out;
    }

    private boolean isNavigationParam(String key) {
        return "bmwcMessage".equals(key) || "bmwcDmThread".equals(key) || "bmwcDmMessage".equals(key)
                || "bmwcGroupRoom".equals(key) || "bmwcGroupMessage".equals(key);
    }

    private String withNavigationParams(String baseUrl, Map<String, String> nav) {
        String base = clean(baseUrl, 2048);
        if (base.isBlank() || nav == null || nav.isEmpty()) return base;
        try {
            String hash = "";
            int hashIdx = base.indexOf('#');
            if (hashIdx >= 0) {
                hash = base.substring(hashIdx);
                base = base.substring(0, hashIdx);
            }
            String path = base;
            String query = "";
            int qIdx = base.indexOf('?');
            if (qIdx >= 0) {
                path = base.substring(0, qIdx);
                query = base.substring(qIdx + 1);
            }
            List<String> parts = new ArrayList<>();
            if (!query.isBlank()) {
                for (String part : query.split("&")) {
                    if (part == null || part.isBlank()) continue;
                    String k = part;
                    int eq = part.indexOf('=');
                    if (eq >= 0) k = part.substring(0, eq);
                    try { k = java.net.URLDecoder.decode(k, StandardCharsets.UTF_8); } catch (Exception ignored) {}
                    if (!isNavigationParam(k)) parts.add(part);
                }
            }
            for (Map.Entry<String, String> e : nav.entrySet()) {
                String k = e.getKey() == null ? "" : e.getKey();
                String v = e.getValue() == null ? "" : e.getValue();
                if (!isNavigationParam(k) || v.isBlank()) continue;
                parts.add(java.net.URLEncoder.encode(k, StandardCharsets.UTF_8) + "=" + java.net.URLEncoder.encode(v, StandardCharsets.UTF_8));
            }
            return path + (parts.isEmpty() ? "" : "?" + String.join("&", parts)) + hash;
        } catch (Exception ignored) {
            return base;
        }
    }

    private void sendOne(Subscription sub, String jsonPayload, int ttlSeconds) throws Exception {
        byte[] userPublicKey = b64u.decode(sub.p256dh);
        byte[] authSecret = b64u.decode(sub.auth);
        byte[] plain = jsonPayload.getBytes(StandardCharsets.UTF_8);
        byte[] encrypted = encryptAes128Gcm(userPublicKey, authSecret, plain);
        URL url = URI.create(sub.endpoint).toURL();
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
        conn.setRequestMethod("POST");
        conn.setConnectTimeout(6000);
        conn.setReadTimeout(8000);
        conn.setDoOutput(true);
        conn.setRequestProperty("TTL", String.valueOf(ttlSeconds));
        conn.setRequestProperty("Urgency", "normal");
        conn.setRequestProperty("Content-Encoding", "aes128gcm");
        conn.setRequestProperty("Content-Type", "application/octet-stream");
        conn.setRequestProperty("Authorization", vapidAuthorizationHeader(sub.endpoint));
        conn.setRequestProperty("Content-Length", String.valueOf(encrypted.length));
        try (OutputStream out = conn.getOutputStream()) {
            out.write(encrypted);
        }
        int code = conn.getResponseCode();
        if (code == 404 || code == 410) {
            byEndpoint.remove(sub.endpoint);
            saveSubscriptions();
            return;
        }
        if (code < 200 || code >= 300) {
            String error = "HTTP " + code;
            try (BufferedReader br = new BufferedReader(new InputStreamReader(conn.getErrorStream() == null ? conn.getInputStream() : conn.getErrorStream(), StandardCharsets.UTF_8))) {
                String line = br.readLine();
                if (line != null && !line.isBlank()) error += " " + line;
            } catch (Exception ignored) {}
            throw new IOException(error);
        }
    }

    private byte[] encryptAes128Gcm(byte[] userPublicKey, byte[] authSecret, byte[] payload) throws Exception {
        KeyPairGenerator kpg = KeyPairGenerator.getInstance("EC");
        kpg.initialize(new ECGenParameterSpec("secp256r1"), random);
        KeyPair serverKey = kpg.generateKeyPair();
        byte[] serverPublicKey = uncompressedPublicKey((ECPublicKey) serverKey.getPublic());

        PublicKey receiverPublic = publicKeyFromUncompressed(userPublicKey);
        KeyAgreement ka = KeyAgreement.getInstance("ECDH");
        ka.init(serverKey.getPrivate());
        ka.doPhase(receiverPublic, true);
        byte[] ecdhSecret = ka.generateSecret();

        byte[] prkKey = hmac(authSecret, ecdhSecret);
        byte[] info = concat("WebPush: info\0".getBytes(StandardCharsets.US_ASCII), userPublicKey, serverPublicKey);
        byte[] ikm = hkdfExpand(prkKey, info, 32);
        byte[] salt = new byte[16];
        random.nextBytes(salt);
        byte[] prk = hmac(salt, ikm);
        byte[] cek = hkdfExpand(prk, "Content-Encoding: aes128gcm\0".getBytes(StandardCharsets.US_ASCII), 16);
        byte[] nonce = hkdfExpand(prk, "Content-Encoding: nonce\0".getBytes(StandardCharsets.US_ASCII), 12);

        byte[] recordPlaintext = new byte[payload.length + 1];
        System.arraycopy(payload, 0, recordPlaintext, 0, payload.length);
        recordPlaintext[recordPlaintext.length - 1] = 0x02;

        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.ENCRYPT_MODE, new SecretKeySpec(cek, "AES"), new GCMParameterSpec(128, nonce));
        byte[] cipherText = cipher.doFinal(recordPlaintext);

        ByteBuffer header = ByteBuffer.allocate(16 + 4 + 1 + serverPublicKey.length + cipherText.length);
        header.put(salt);
        header.putInt(4096);
        header.put((byte) serverPublicKey.length);
        header.put(serverPublicKey);
        header.put(cipherText);
        return header.array();
    }

    private String vapidAuthorizationHeader(String endpoint) throws Exception {
        ConfigValues c = plugin.configValues();
        String subject = c == null || c.webPushSubject == null || c.webPushSubject.isBlank() ? "mailto:admin@example.com" : c.webPushSubject.trim();
        URI uri = URI.create(endpoint);
        String aud = uri.getScheme() + "://" + uri.getHost() + (uri.getPort() > 0 ? ":" + uri.getPort() : "");
        long exp = Instant.now().getEpochSecond() + 12 * 60 * 60;
        String header = b64uNoPad.encodeToString("{\"typ\":\"JWT\",\"alg\":\"ES256\"}".getBytes(StandardCharsets.UTF_8));
        String claims = JsonUtil.obj(Map.of("aud", aud, "exp", exp, "sub", subject));
        String body = b64uNoPad.encodeToString(claims.getBytes(StandardCharsets.UTF_8));
        String signingInput = header + "." + body;
        Signature sig = Signature.getInstance("SHA256withECDSA");
        sig.initSign(vapidKeyPair.getPrivate());
        sig.update(signingInput.getBytes(StandardCharsets.US_ASCII));
        String signature = b64uNoPad.encodeToString(derEcdsaToJose(sig.sign(), 64));
        return "vapid t=" + signingInput + "." + signature + ", k=" + vapidPublicKeyBase64;
    }

    private synchronized void ensureVapidKeyPair() {
        if (vapidKeyPair != null && vapidPublicKeyBase64 != null && !vapidPublicKeyBase64.isBlank()) return;
        ConfigValues c = plugin.configValues();
        try {
            String publicKey = c == null ? "" : clean(c.webPushVapidPublicKey, 512);
            String privateKey = c == null ? "" : clean(c.webPushVapidPrivateKey, 512);
            if (!publicKey.isBlank() && !privateKey.isBlank()) {
                vapidKeyPair = keyPairFromBase64(publicKey, privateKey);
                vapidPublicKeyBase64 = publicKey;
                return;
            }
            Path file = plugin.getDataFolder().toPath().resolve("web-push-vapid.properties");
            Properties props = new Properties();
            if (Files.exists(file)) {
                try (var in = Files.newInputStream(file)) { props.load(in); }
                publicKey = clean(props.getProperty("publicKey"), 512);
                privateKey = clean(props.getProperty("privateKey"), 512);
                if (!publicKey.isBlank() && !privateKey.isBlank()) {
                    vapidKeyPair = keyPairFromBase64(publicKey, privateKey);
                    vapidPublicKeyBase64 = publicKey;
                    return;
                }
            }
            KeyPairGenerator kpg = KeyPairGenerator.getInstance("EC");
            kpg.initialize(new ECGenParameterSpec("secp256r1"), random);
            KeyPair generated = kpg.generateKeyPair();
            String generatedPublic = b64uNoPad.encodeToString(uncompressedPublicKey((ECPublicKey) generated.getPublic()));
            String generatedPrivate = b64uNoPad.encodeToString(toUnsignedFixed(((ECPrivateKey) generated.getPrivate()).getS(), 32));
            Files.createDirectories(file.getParent());
            props.setProperty("publicKey", generatedPublic);
            props.setProperty("privateKey", generatedPrivate);
            try (var out = Files.newOutputStream(file)) { props.store(out, "BlueMapWebChat auto-generated Web Push VAPID keys"); }
            vapidKeyPair = generated;
            vapidPublicKeyBase64 = generatedPublic;
        } catch (Exception ex) {
            plugin.getLogger().warning("Failed to initialize Web Push VAPID keys: " + ex.getMessage());
            vapidKeyPair = null;
            vapidPublicKeyBase64 = "";
        }
    }

    private KeyPair keyPairFromBase64(String publicKeyBase64, String privateKeyBase64) throws Exception {
        byte[] pub = b64u.decode(publicKeyBase64);
        byte[] priv = b64u.decode(privateKeyBase64);
        PublicKey publicKey = publicKeyFromUncompressed(pub);
        ECParameterSpec params = ((ECPublicKey) publicKey).getParams();
        BigInteger d = new BigInteger(1, priv);
        PrivateKey privateKey = KeyFactory.getInstance("EC").generatePrivate(new ECPrivateKeySpec(d, params));
        return new KeyPair(publicKey, privateKey);
    }

    private PublicKey publicKeyFromUncompressed(byte[] key) throws Exception {
        if (key == null || key.length != 65 || key[0] != 0x04) throw new GeneralSecurityException("invalid P-256 public key");
        AlgorithmParameters parameters = AlgorithmParameters.getInstance("EC");
        parameters.init(new ECGenParameterSpec("secp256r1"));
        ECParameterSpec params = parameters.getParameterSpec(ECParameterSpec.class);
        byte[] xb = new byte[32];
        byte[] yb = new byte[32];
        System.arraycopy(key, 1, xb, 0, 32);
        System.arraycopy(key, 33, yb, 0, 32);
        ECPoint point = new ECPoint(new BigInteger(1, xb), new BigInteger(1, yb));
        return KeyFactory.getInstance("EC").generatePublic(new ECPublicKeySpec(point, params));
    }

    private byte[] uncompressedPublicKey(ECPublicKey key) {
        byte[] x = toUnsignedFixed(key.getW().getAffineX(), 32);
        byte[] y = toUnsignedFixed(key.getW().getAffineY(), 32);
        byte[] out = new byte[65];
        out[0] = 0x04;
        System.arraycopy(x, 0, out, 1, 32);
        System.arraycopy(y, 0, out, 33, 32);
        return out;
    }

    private byte[] toUnsignedFixed(BigInteger value, int len) {
        byte[] raw = value.toByteArray();
        byte[] out = new byte[len];
        int src = Math.max(0, raw.length - len);
        int count = Math.min(raw.length, len);
        System.arraycopy(raw, src, out, len - count, count);
        return out;
    }

    private byte[] hmac(byte[] key, byte[] data) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(key, "HmacSHA256"));
        return mac.doFinal(data);
    }

    private byte[] hkdfExpand(byte[] prk, byte[] info, int length) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(prk, "HmacSHA256"));
        byte[] out = new byte[length];
        byte[] t = new byte[0];
        int pos = 0;
        int counter = 1;
        while (pos < length) {
            mac.reset();
            mac.update(t);
            mac.update(info);
            mac.update((byte) counter++);
            t = mac.doFinal();
            int copy = Math.min(t.length, length - pos);
            System.arraycopy(t, 0, out, pos, copy);
            pos += copy;
        }
        return out;
    }

    private byte[] concat(byte[]... items) {
        int len = 0;
        for (byte[] b : items) len += b == null ? 0 : b.length;
        byte[] out = new byte[len];
        int pos = 0;
        for (byte[] b : items) {
            if (b == null) continue;
            System.arraycopy(b, 0, out, pos, b.length);
            pos += b.length;
        }
        return out;
    }

    private byte[] derEcdsaToJose(byte[] der, int outputLength) throws IOException {
        if (der == null || der.length < 8 || der[0] != 0x30) throw new IOException("invalid ECDSA signature");
        int offset = 2;
        if ((der[1] & 0xff) > 0x80) offset = 2 + (der[1] & 0x7f);
        if (der[offset++] != 0x02) throw new IOException("invalid ECDSA R");
        int rLen = der[offset++] & 0xff;
        byte[] r = new byte[rLen];
        System.arraycopy(der, offset, r, 0, rLen);
        offset += rLen;
        if (der[offset++] != 0x02) throw new IOException("invalid ECDSA S");
        int sLen = der[offset++] & 0xff;
        byte[] s = new byte[sLen];
        System.arraycopy(der, offset, s, 0, sLen);
        byte[] out = new byte[outputLength];
        copyDerInteger(r, out, 0, outputLength / 2);
        copyDerInteger(s, out, outputLength / 2, outputLength / 2);
        return out;
    }

    private void copyDerInteger(byte[] src, byte[] out, int offset, int len) {
        int start = 0;
        while (start < src.length - 1 && src[start] == 0) start++;
        int count = Math.min(src.length - start, len);
        System.arraycopy(src, start + (src.length - start - count), out, offset + len - count, count);
    }

    private Path subscriptionsFile() {
        ConfigValues c = plugin.configValues();
        String name = c == null || c.webPushSubscriptionsFile == null || c.webPushSubscriptionsFile.isBlank() ? "web-push-subscriptions.jsonl" : c.webPushSubscriptionsFile;
        Path path = Path.of(name);
        if (!path.isAbsolute()) path = plugin.getDataFolder().toPath().resolve(path);
        return path;
    }

    private synchronized void loadSubscriptions() {
        byEndpoint.clear();
        Path file = subscriptionsFile();
        if (!Files.exists(file)) return;
        try {
            for (String line : Files.readAllLines(file, StandardCharsets.UTF_8)) {
                Map<String, String> m = JsonUtil.parseFlatObject(line);
                String endpoint = clean(m.get("endpoint"), 2048);
                if (endpoint.isBlank()) continue;
                Subscription s = new Subscription();
                s.endpoint = endpoint;
                s.userUuid = clean(m.get("userUuid"), 80).toLowerCase(Locale.ROOT);
                s.p256dh = clean(m.get("p256dh"), 512);
                s.auth = clean(m.get("auth"), 256);
                s.userAgent = clean(m.get("userAgent"), 300);
                ConfigValues c = plugin.configValues();
                s.notifyNormalChat = (c == null || c.webPushNotifyNormalChat) && readBool(m, "notifyNormalChat", c != null && c.webPushNotifyNormalChat);
                s.notifyDm = (c == null || c.webPushNotifyDm) && readBool(m, "notifyDm", c == null || c.webPushNotifyDm);
                s.notifyGroupChat = (c == null || c.webPushNotifyGroupChat) && readBool(m, "notifyGroupChat", c == null || c.webPushNotifyGroupChat);
                s.notifyMentions = (c == null || c.webPushNotifyMentions) && readBool(m, "notifyMentions", c == null || c.webPushNotifyMentions);
                s.notifyReplies = (c == null || c.webPushNotifyReplies) && readBool(m, "notifyReplies", c == null || c.webPushNotifyReplies);
                s.notifySystem = (c == null || c.webPushNotifySystem) && readBool(m, "notifySystem", c == null || c.webPushNotifySystem);
                s.notifyKeywords = (c == null || c.webPushNotifyKeywords) && readBool(m, "notifyKeywords", c == null || c.webPushNotifyKeywords);
                s.keywords = normalizeKeywords(m.get("keywords"));
                s.language = clean(m.get("language"), 40);
                s.openUrl = clean(m.get("openUrl"), 2048);
                s.notifyOwnMessages = (c == null || c.webPushNotifyOwnMessages) && readBool(m, "notifyOwnMessages", c != null && c.webPushNotifyOwnMessages);
                s.showMessagePreview = (c == null || c.webPushShowMessagePreview) && readBool(m, "showMessagePreview", c == null || c.webPushShowMessagePreview);
                try { s.updatedAt = Long.parseLong(String.valueOf(m.getOrDefault("updatedAt", "0"))); } catch (Exception ignored) {}
                if (!s.userUuid.isBlank() && !s.p256dh.isBlank() && !s.auth.isBlank()) byEndpoint.put(endpoint, s);
            }
        } catch (Exception ex) {
            plugin.getLogger().warning("Failed to load Web Push subscriptions: " + ex.getMessage());
        }
    }

    private synchronized void saveSubscriptions() {
        Path file = subscriptionsFile();
        try {
            Files.createDirectories(file.getParent());
            List<String> lines = new ArrayList<>();
            for (Subscription s : byEndpoint.values()) {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("endpoint", s.endpoint);
                m.put("userUuid", s.userUuid);
                m.put("p256dh", s.p256dh);
                m.put("auth", s.auth);
                m.put("userAgent", s.userAgent);
                m.put("notifyNormalChat", s.notifyNormalChat);
                m.put("notifyDm", s.notifyDm);
                m.put("notifyGroupChat", s.notifyGroupChat);
                m.put("notifyMentions", s.notifyMentions);
                m.put("notifyReplies", s.notifyReplies);
                m.put("notifySystem", s.notifySystem);
                m.put("notifyKeywords", s.notifyKeywords);
                m.put("keywords", String.join("\n", s.keywords == null ? Collections.emptyList() : s.keywords));
                m.put("language", s.language);
                m.put("openUrl", s.openUrl);
                m.put("notifyOwnMessages", s.notifyOwnMessages);
                m.put("showMessagePreview", s.showMessagePreview);
                m.put("updatedAt", s.updatedAt);
                lines.add(JsonUtil.obj(m));
            }
            Files.write(file, lines, StandardCharsets.UTF_8);
        } catch (Exception ex) {
            plugin.getLogger().warning("Failed to save Web Push subscriptions: " + ex.getMessage());
        }
    }

    private String clean(String value, int max) {
        String text = String.valueOf(value == null ? "" : value).replaceAll("[\\r\\n\\u0000-\\u001f]", "").trim();
        if (max > 0 && text.length() > max) return text.substring(0, max);
        return text;
    }
}
