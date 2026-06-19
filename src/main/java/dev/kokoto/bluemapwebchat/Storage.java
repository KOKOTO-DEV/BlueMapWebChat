package dev.kokoto.bluemapwebchat;

import org.bukkit.configuration.ConfigurationSection;
import org.bukkit.configuration.file.YamlConfiguration;

import java.io.File;
import java.io.IOException;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

public class Storage {
    private final BlueMapWebChatPlugin plugin;
    private final File accountsFile;
    private final File sessionsFile;
    private final File pinnedFile;
    private final File knownDisplayNamesFile;

    private final Map<String, Account> accountsById = new ConcurrentHashMap<>();
    private final Map<String, String> usernameIndex = new ConcurrentHashMap<>();
    private final Map<String, Session> sessionsByTokenHash = new ConcurrentHashMap<>();
    private final Map<String, PinnedMessage> pinnedById = new ConcurrentHashMap<>();
    private final Map<String, String> knownDisplayNamesByUuid = new ConcurrentHashMap<>();
    private final Map<String, String> knownUsernamesByUuid = new ConcurrentHashMap<>();

    public Storage(BlueMapWebChatPlugin plugin) {
        this.plugin = plugin;
        File dataDir = plugin.getDataFolder();
        this.accountsFile = new File(dataDir, "accounts.yml");
        this.sessionsFile = new File(dataDir, "sessions.yml");
        this.pinnedFile = new File(dataDir, "pinned.yml");
        this.knownDisplayNamesFile = new File(dataDir, "known-display-names.yml");
    }

    public synchronized void load() {
        accountsById.clear();
        usernameIndex.clear();
        sessionsByTokenHash.clear();
        pinnedById.clear();
        knownDisplayNamesByUuid.clear();
        knownUsernamesByUuid.clear();

        loadKnownDisplayNames();

        YamlConfiguration accounts = YamlConfiguration.loadConfiguration(accountsFile);
        ConfigurationSection root = accounts.getConfigurationSection("accounts");
        if (root != null) {
            for (String id : root.getKeys(false)) {
                ConfigurationSection s = root.getConfigurationSection(id);
                if (s == null) continue;
                Account a = new Account();
                a.id = id;
                a.username = s.getString("username", id);
                a.uuid = s.getString("uuid", null);
                a.lastDisplayName = s.getString("lastDisplayName", "");
                if ((a.lastDisplayName == null || a.lastDisplayName.isBlank()) && a.uuid != null && !a.uuid.isBlank()) {
                    a.lastDisplayName = knownDisplayNamesByUuid.getOrDefault(a.uuid, "");
                }
                a.role = Role.fromString(s.getString("role", "USER"), Role.USER);
                a.passwordHash = s.getString("passwordHash", null);
                a.local = s.getBoolean("local", false);
                a.createdAt = s.getLong("createdAt", System.currentTimeMillis());
                a.lastLogin = s.getLong("lastLogin", 0);
                putAccountInMemory(a);
            }
        }

        YamlConfiguration sessions = YamlConfiguration.loadConfiguration(sessionsFile);
        ConfigurationSection sr = sessions.getConfigurationSection("sessions");
        if (sr != null) {
            for (String hash : sr.getKeys(false)) {
                ConfigurationSection s = sr.getConfigurationSection(hash);
                if (s == null) continue;
                Session session = new Session();
                session.tokenHash = hash;
                session.accountId = s.getString("accountId", "");
                session.createdAt = s.getLong("createdAt", 0);
                session.expiresAt = s.getLong("expiresAt", 0);
                session.lastIp = s.getString("lastIp", "");
                if (!session.expired() && accountsById.containsKey(session.accountId)) {
                    sessionsByTokenHash.put(hash, session);
                }
            }
        }
        saveSessions();
        loadPinnedMessages();
    }

    public synchronized void saveAll() {
        saveAccounts();
        saveSessions();
        saveKnownDisplayNames();
        savePinnedMessages();
    }

    public synchronized void saveAccounts() {
        YamlConfiguration yml = new YamlConfiguration();
        for (Account a : accountsById.values()) {
            String p = "accounts." + a.id + ".";
            yml.set(p + "username", a.username);
            yml.set(p + "uuid", a.uuid);
            yml.set(p + "lastDisplayName", a.lastDisplayName);
            yml.set(p + "role", a.role.name());
            yml.set(p + "passwordHash", a.passwordHash);
            yml.set(p + "local", a.local);
            yml.set(p + "createdAt", a.createdAt);
            yml.set(p + "lastLogin", a.lastLogin);
        }
        try {
            yml.save(accountsFile);
        } catch (IOException ex) {
            plugin.getLogger().warning("Failed to save accounts.yml: " + ex.getMessage());
        }
    }

    public synchronized void saveSessions() {
        YamlConfiguration yml = new YamlConfiguration();
        for (Session s : sessionsByTokenHash.values()) {
            if (s.expired()) continue;
            String p = "sessions." + s.tokenHash + ".";
            yml.set(p + "accountId", s.accountId);
            yml.set(p + "createdAt", s.createdAt);
            yml.set(p + "expiresAt", s.expiresAt);
            yml.set(p + "lastIp", s.lastIp);
        }
        try {
            yml.save(sessionsFile);
        } catch (IOException ex) {
            plugin.getLogger().warning("Failed to save sessions.yml: " + ex.getMessage());
        }
    }


    private synchronized void loadKnownDisplayNames() {
        knownDisplayNamesByUuid.clear();
        knownUsernamesByUuid.clear();
        YamlConfiguration yml = YamlConfiguration.loadConfiguration(knownDisplayNamesFile);
        ConfigurationSection root = yml.getConfigurationSection("players");
        if (root == null) return;
        for (String uuid : root.getKeys(false)) {
            ConfigurationSection s = root.getConfigurationSection(uuid);
            if (s == null) continue;
            String displayName = s.getString("lastDisplayName", "");
            String username = s.getString("username", "");
            if (displayName != null && !displayName.isBlank()) knownDisplayNamesByUuid.put(uuid, displayName);
            if (username != null && !username.isBlank()) knownUsernamesByUuid.put(uuid, username);
        }
    }

    private synchronized void saveKnownDisplayNames() {
        YamlConfiguration yml = new YamlConfiguration();
        for (String uuid : knownDisplayNamesByUuid.keySet()) {
            if (uuid == null || uuid.isBlank()) continue;
            String p = "players." + uuid + ".";
            yml.set(p + "username", knownUsernamesByUuid.getOrDefault(uuid, ""));
            yml.set(p + "lastDisplayName", knownDisplayNamesByUuid.getOrDefault(uuid, ""));
        }
        try {
            yml.save(knownDisplayNamesFile);
        } catch (IOException ex) {
            plugin.getLogger().warning("Failed to save known-display-names.yml: " + ex.getMessage());
        }
    }

    private synchronized void rememberKnownDisplayName(String uuid, String username, String displayName) {
        if (uuid == null || uuid.isBlank() || displayName == null || displayName.isBlank()) return;
        String oldDisplay = knownDisplayNamesByUuid.put(uuid, displayName);
        String oldUsername = username == null || username.isBlank() ? knownUsernamesByUuid.get(uuid) : knownUsernamesByUuid.put(uuid, username);
        if (!Objects.equals(oldDisplay, displayName) || (username != null && !username.isBlank() && !Objects.equals(oldUsername, username))) {
            saveKnownDisplayNames();
        }
    }

    public String knownDisplayName(String uuid) {
        if (uuid == null || uuid.isBlank()) return "";
        return knownDisplayNamesByUuid.getOrDefault(uuid, "");
    }

    public synchronized void loadPinnedMessages() {
        pinnedById.clear();
        YamlConfiguration yml = YamlConfiguration.loadConfiguration(pinnedFile);
        ConfigurationSection root = yml.getConfigurationSection("pinned");
        if (root == null) return;
        for (String id : root.getKeys(false)) {
            ConfigurationSection s = root.getConfigurationSection(id);
            PinnedMessage pin = PinnedMessage.fromSection(s);
            if (pin == null || pin.pinId == null || pin.pinId.isBlank()) continue;
            if (pin.message == null || pin.message.isBlank()) continue;
            pinnedById.put(pin.pinId, pin);
        }
    }

    public synchronized void savePinnedMessages() {
        YamlConfiguration yml = new YamlConfiguration();
        for (PinnedMessage pin : pinnedById.values()) {
            String safeId = pin.pinId == null ? SecurityUtil.randomToken(8) : pin.pinId.replaceAll("[^A-Za-z0-9._-]", "_");
            String p = "pinned." + safeId + ".";
            yml.set(p + "pinId", pin.pinId);
            yml.set(p + "messageId", pin.messageId);
            yml.set(p + "pinnedAt", pin.pinnedAt);
            yml.set(p + "pinnedBy", pin.pinnedBy);
            yml.set(p + "time", pin.time);
            yml.set(p + "source", pin.source);
            yml.set(p + "sender", pin.sender);
            yml.set(p + "realSender", pin.realSender);
            yml.set(p + "playerUuid", pin.playerUuid);
            yml.set(p + "role", pin.role);
            yml.set(p + "message", pin.message);
            yml.set(p + "i18nKey", pin.i18nKey);
            yml.set(p + "i18nArgs", pin.i18nArgs);
            yml.set(p + "hidden", pin.hidden);
        }
        try {
            yml.save(pinnedFile);
        } catch (IOException ex) {
            plugin.getLogger().warning("Failed to save pinned.yml: " + ex.getMessage());
        }
    }

    public List<PinnedMessage> listPinnedMessages() {
        List<PinnedMessage> out = new ArrayList<>(pinnedById.values());
        out.sort(Comparator.comparingLong((PinnedMessage p) -> p.pinnedAt).reversed());
        return out;
    }

    public synchronized PinnedMessage pinMessage(ChatMessage msg, String pinnedBy, int maxPins) {
        if (msg == null || msg.id == null || msg.id.isBlank() || msg.hidden) return null;
        for (PinnedMessage existing : pinnedById.values()) {
            if (msg.id.equals(existing.messageId)) return existing;
        }
        if (maxPins > 0 && pinnedById.size() >= maxPins) return null;
        PinnedMessage pin = PinnedMessage.fromMessage(msg, pinnedBy);
        pinnedById.put(pin.pinId, pin);
        savePinnedMessages();
        return pin;
    }

    public synchronized boolean unpinMessage(String pinId) {
        if (pinId == null || pinId.isBlank()) return false;
        boolean removed = pinnedById.remove(pinId) != null;
        if (removed) savePinnedMessages();
        return removed;
    }

    public boolean isMessagePinned(String messageId) {
        if (messageId == null || messageId.isBlank()) return false;
        for (PinnedMessage pin : pinnedById.values()) {
            if (messageId.equals(pin.messageId)) return true;
        }
        return false;
    }

    public Set<String> pinnedMessageIds() {
        Set<String> out = new HashSet<>();
        for (PinnedMessage pin : pinnedById.values()) {
            if (pin.messageId != null && !pin.messageId.isBlank()) out.add(pin.messageId);
        }
        return out;
    }

    public List<String> pinnedMessageTexts() {
        List<String> out = new ArrayList<>();
        for (PinnedMessage pin : pinnedById.values()) {
            if (pin.message != null && !pin.message.isBlank()) out.add(pin.message);
        }
        return out;
    }

    public synchronized Account upsertLinkedAccount(String uuid, String username, Role role) {
        return upsertLinkedAccount(uuid, username, role, "");
    }

    public synchronized Account upsertLinkedAccount(String uuid, String username, Role role, String lastDisplayName) {
        String id = "uuid:" + uuid;
        Account a = accountsById.get(id);
        if (a == null) {
            a = new Account();
            a.id = id;
            a.uuid = uuid;
            a.createdAt = System.currentTimeMillis();
            a.local = false;
        }
        a.username = username;
        String remembered = lastDisplayName;
        if ((remembered == null || remembered.isBlank()) && uuid != null && !uuid.isBlank()) {
            remembered = knownDisplayNamesByUuid.getOrDefault(uuid, "");
        }
        if (remembered != null && !remembered.isBlank()) {
            a.lastDisplayName = remembered;
            rememberKnownDisplayName(uuid, username, remembered);
        }
        if (role.atLeast(a.role)) {
            a.role = role;
        }
        putAccountInMemory(a);
        saveAccounts();
        return a;
    }


    public synchronized void updateLastDisplayName(String uuid, String displayName) {
        updateLastDisplayName(uuid, "", displayName);
    }

    public synchronized void updateLastDisplayName(String uuid, String username, String displayName) {
        if (uuid == null || uuid.isBlank() || displayName == null || displayName.isBlank()) return;

        // Check-only calls are common: online account display rendering, join refresh,
        // and chat forwarding can all observe the current display name repeatedly.
        // Persist only when the actual remembered name or real username changed.
        rememberKnownDisplayName(uuid, username, displayName);

        Account a = accountsById.get("uuid:" + uuid);
        if (a == null) return;

        boolean changed = false;
        if (looksLikeMinecraftUsername(username) && !Objects.equals(a.username, username)) {
            // Only real Minecraft account names may update the login username. Display nicknames must never do this.
            a.username = username;
            changed = true;
        }
        if (!Objects.equals(a.lastDisplayName, displayName)) {
            a.lastDisplayName = displayName;
            changed = true;
        }
        if (!changed) return;

        putAccountInMemory(a);
        saveAccounts();
    }

    public synchronized Account createLocalAccount(String username, Role role) {
        String normalized = normalizeUsername(username);
        String id = "local:" + normalized;
        Account a = accountsById.get(id);
        if (a == null) {
            a = new Account();
            a.id = id;
            a.createdAt = System.currentTimeMillis();
            a.local = true;
        }
        a.username = username;
        a.uuid = null;
        a.role = role;
        putAccountInMemory(a);
        saveAccounts();
        return a;
    }

    public synchronized void setPassword(Account account, String password) {
        account.passwordHash = SecurityUtil.hashPassword(password.toCharArray());
        putAccountInMemory(account);
        saveAccounts();
    }

    public synchronized void setRole(Account account, Role role) {
        account.role = role;
        putAccountInMemory(account);
        saveAccounts();
    }

    public Account findAccountByUsername(String username) {
        if (username == null) return null;
        String normalized = normalizeUsername(username);
        String id = usernameIndex.get(normalized);
        if (id != null) return accountsById.get(id);

        return null;
    }

    public Account findAccountById(String id) {
        return accountsById.get(id);
    }

    public synchronized String createSession(Account account, String ip, int days) {
        long now = System.currentTimeMillis();
        long expiresAt = days <= 0 ? 0L : now + days * 24L * 60L * 60L * 1000L;
        return createSessionUntil(account, ip, now, expiresAt);
    }

    public synchronized String createSessionForDuration(Account account, String ip, long durationMillis) {
        long now = System.currentTimeMillis();
        long expiresAt = durationMillis <= 0L ? 0L : now + durationMillis;
        return createSessionUntil(account, ip, now, expiresAt);
    }

    private String createSessionUntil(Account account, String ip, long createdAt, long expiresAt) {
        String token = SecurityUtil.randomToken(32);
        String hash = SecurityUtil.sha256Hex(token);
        Session s = new Session();
        s.tokenHash = hash;
        s.accountId = account.id;
        s.createdAt = createdAt;
        s.expiresAt = expiresAt;
        s.lastIp = ip == null ? "" : ip;
        sessionsByTokenHash.put(hash, s);
        account.lastLogin = System.currentTimeMillis();
        saveAccounts();
        saveSessions();
        saveKnownDisplayNames();
        savePinnedMessages();
        return token;
    }

    public SessionContext getSession(String token) {
        if (token == null || token.isBlank()) return null;
        String hash = SecurityUtil.sha256Hex(token);
        Session s = sessionsByTokenHash.get(hash);
        if (s == null) return null;
        if (s.expired()) {
            sessionsByTokenHash.remove(hash);
            saveSessions();
            return null;
        }
        Account a = accountsById.get(s.accountId);
        if (a == null) return null;
        return new SessionContext(a, s);
    }

    public synchronized boolean revokeSession(String token) {
        if (token == null || token.isBlank()) return false;
        boolean removed = sessionsByTokenHash.remove(SecurityUtil.sha256Hex(token)) != null;
        if (removed) saveSessions();
        return removed;
    }

    public List<Account> listAccounts() {
        List<Account> out = new ArrayList<>(accountsById.values());
        out.sort(Comparator.comparing(a -> a.safeUsername().toLowerCase(Locale.ROOT)));
        return out;
    }

    public List<SessionContext> listSessions() {
        List<SessionContext> out = new ArrayList<>();
        for (Session s : sessionsByTokenHash.values()) {
            if (s.expired()) continue;
            Account a = accountsById.get(s.accountId);
            if (a != null) out.add(new SessionContext(a, s));
        }
        out.sort(Comparator.comparingLong(ctx -> ctx.session.createdAt));
        return out;
    }

    public synchronized int revokeSessionsForAccount(Account account) {
        if (account == null) return 0;
        int before = sessionsByTokenHash.size();
        sessionsByTokenHash.entrySet().removeIf(e -> account.id.equals(e.getValue().accountId));
        int removed = before - sessionsByTokenHash.size();
        if (removed > 0) saveSessions();
        return removed;
    }

    public synchronized int revokeSessionsForUsername(String username) {
        Account account = findAccountByUsername(username);
        return revokeSessionsForAccount(account);
    }

    public synchronized int cleanupExpiredSessions() {
        int before = sessionsByTokenHash.size();
        sessionsByTokenHash.entrySet().removeIf(e -> e.getValue().expired());
        int removed = before - sessionsByTokenHash.size();
        if (removed > 0) saveSessions();
        return removed;
    }

    private void putAccountInMemory(Account a) {
        accountsById.put(a.id, a);
        if (a.username != null) {
            usernameIndex.put(normalizeUsername(a.username), a.id);
        }
    }

    private static boolean looksLikeMinecraftUsername(String username) {
        return username != null && username.matches("[A-Za-z0-9_]{2,16}");
    }

    private static String normalizeUsername(String username) {
        return username == null ? "" : username.trim().toLowerCase(Locale.ROOT);
    }
}
