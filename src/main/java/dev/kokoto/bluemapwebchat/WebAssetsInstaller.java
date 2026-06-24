package dev.kokoto.bluemapwebchat;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class WebAssetsInstaller {
    private final BlueMapWebChatPlugin plugin;
    private final String assetVersionToken;

    public WebAssetsInstaller(BlueMapWebChatPlugin plugin) {
        this.plugin = plugin;
        this.assetVersionToken = buildAssetVersionToken(plugin);
    }

    private String buildAssetVersionToken(BlueMapWebChatPlugin plugin) {
        String version = plugin.getDescription().getVersion();
        String nonce = Long.toString(System.currentTimeMillis(), 36);
        return version + "-" + nonce;
    }

    public void install() {
        ConfigValues config = plugin.configValues();

        if (config.webAutoInstall) {
            List<File> addonDirs = findAddonInstallDirs(config);
            if (addonDirs.isEmpty()) {
                plugin.getLogger().warning("No BlueMap web addon directory could be resolved. Check web-addon.bluemap-web-root.");
            }

            for (File addonDir : addonDirs) {
                if (!addonDir.exists() && !addonDir.mkdirs()) {
                    plugin.getLogger().warning("Failed to create BlueMap addon directory: " + addonDir);
                    continue;
                }

                copyResource("web/chat.js", new File(addonDir, "chat.js"));
                copyResource("web/chat.css", new File(addonDir, "chat.css"));
                writeGeneratedConfig(new File(addonDir, "config.js"));
                plugin.getLogger().info("BlueMap web addon files installed to " + addonDir.getPath());
            }
        } else {
            plugin.getLogger().info("BlueMap web addon auto-install is disabled; bundled web files were not copied.");
        }

        if (config.webAutoPatch) {
            patchWebappConfs();
        } else {
            writeWebappConfExample(config);
            plugin.getLogger().info("BlueMap webapp.conf auto-patch is disabled; refreshed webapp.conf.example-additions only.");
        }
    }

    private List<File> findAddonInstallDirs(ConfigValues config) {
        String addonPath = normalizeAddonPath(config.addonPath);
        List<File> webRootCandidates = new ArrayList<>();

        // Always honor the configured web-root. This is the only candidate we create even if it does not exist.
        addFileCandidate(webRootCandidates, new File(config.bluemapWebRoot));

        // BlueMap commonly serves static files from ./bluemap/web, while webapp.conf lives in ./plugins/BlueMap/.
        // Older configs used ./plugins/BlueMap/web. Update existing/common roots too so v= changes never point at stale files.
        addExistingFileCandidate(webRootCandidates, new File("bluemap/web"));
        addExistingFileCandidate(webRootCandidates, new File("plugins/BlueMap/web"));

        File webappConf = new File(config.bluemapWebappConf);
        File webappParent = webappConf.getParentFile();
        if (webappParent != null) {
            addExistingFileCandidate(webRootCandidates, new File(webappParent, "web"));
        }

        Set<String> seen = new LinkedHashSet<>();
        List<File> addonDirs = new ArrayList<>();
        for (int i = 0; i < webRootCandidates.size(); i++) {
            File webRoot = webRootCandidates.get(i);
            if (webRoot == null) continue;

            // Only create the configured root. Other candidates are updated only when they already exist.
            if (i != 0 && !webRoot.exists()) continue;

            File addonDir = new File(webRoot, addonPath);
            String key;
            try {
                key = addonDir.getCanonicalPath();
            } catch (IOException ex) {
                key = addonDir.getAbsolutePath();
            }
            if (seen.add(key)) {
                addonDirs.add(addonDir);
            }
        }
        return addonDirs;
    }

    private void addFileCandidate(List<File> files, File file) {
        if (file != null) files.add(file);
    }

    private void addExistingFileCandidate(List<File> files, File file) {
        if (file != null && file.exists()) files.add(file);
    }

    private void writeGeneratedConfig(File out) {
        ConfigValues c = plugin.configValues();
        String apiBase = c.apiBaseUrl == null ? "" : c.apiBaseUrl.trim();
        String js;
        if (apiBase.isEmpty()) {
            // Direct HTTP default. HTTPS reverse proxies should normally set
            // web-addon.api-base-url to a public browser path such as /bmwc/api.
            js = "window.BlueMapWebChatConfig = { apiBase: location.protocol + '//' + location.hostname + ':" + c.httpPort + c.pathPrefix + "', apiBaseUrl: location.protocol + '//' + location.hostname + ':" + c.httpPort + c.pathPrefix + "' };\n";
        } else {
            apiBase = normalizeConfiguredBrowserUrl(c, apiBase);
            js = "window.BlueMapWebChatConfig = { apiBase: " + JsonUtil.quote(apiBase) + ", apiBaseUrl: " + JsonUtil.quote(apiBase) + " };\n";
        }
        try {
            Files.writeString(out.toPath(), js, StandardCharsets.UTF_8);
        } catch (IOException ex) {
            plugin.getLogger().warning("Failed to write config.js: " + ex.getMessage());
        }
    }

    private String normalizeConfiguredBrowserUrl(ConfigValues c, String configured) {
        String value = configured == null ? "" : configured.trim();
        if (value.isBlank()) return value;
        if (value.startsWith("http://") || value.startsWith("https://")) return trimTrailingSlash(value);
        if (value.startsWith("//")) {
            String origin = configuredCorsOrigin(c);
            String proto = origin.startsWith("http://") ? "http" : "https";
            return trimTrailingSlash(proto + ":" + value);
        }
        if (value.startsWith("/")) return trimTrailingSlash(value);
        String origin = configuredCorsOrigin(c);
        if (!origin.isBlank()) return trimTrailingSlash(origin + "/" + value.replaceFirst("^/+", ""));
        return trimTrailingSlash("/" + value);
    }

    private String configuredCorsOrigin(ConfigValues c) {
        String origin = c == null || c.corsOrigin == null ? "" : c.corsOrigin.trim();
        if (origin.isBlank() || "*".equals(origin)) return "";
        if (origin.startsWith("http://") || origin.startsWith("https://")) return trimTrailingSlash(origin);
        return "";
    }

    private String trimTrailingSlash(String value) {
        String out = value == null ? "" : value.trim();
        while (out.endsWith("/") && out.length() > 1) out = out.substring(0, out.length() - 1);
        return out;
    }

    private void copyResource(String resource, File out) {
        try (InputStream in = plugin.getResource(resource)) {
            if (in == null) {
                plugin.getLogger().warning("Missing bundled resource: " + resource);
                return;
            }
            Files.copy(in, out.toPath(), java.nio.file.StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException ex) {
            plugin.getLogger().warning("Failed to copy " + resource + ": " + ex.getMessage());
        }
    }

    private void patchWebappConfs() {
        ConfigValues c = plugin.configValues();
        writeWebappConfExample(c);

        List<File> confs = findWebappConfCandidates(c);
        boolean patchedAny = false;
        for (File conf : confs) {
            if (!conf.exists()) continue;
            if (patchSingleWebappConf(conf, c)) {
                patchedAny = true;
            }
        }

        if (!patchedAny) {
            File configured = new File(c.bluemapWebappConf);
            plugin.getLogger().warning("No existing BlueMap webapp.conf was patched. Checked configured path and common candidates. Manual example refreshed at "
                    + new File(plugin.getDataFolder(), "webapp.conf.example-additions").getPath()
                    + "; configured path is " + configured.getPath());
        }
    }

    private List<File> findWebappConfCandidates(ConfigValues config) {
        List<File> candidates = new ArrayList<>();
        addFileCandidate(candidates, new File(config.bluemapWebappConf));
        addFileCandidate(candidates, new File("plugins/BlueMap/webapp.conf"));
        addFileCandidate(candidates, new File("bluemap/webapp.conf"));
        addFileCandidate(candidates, new File("bluemap/web/webapp.conf"));

        File configuredRoot = new File(config.bluemapWebRoot);
        File rootParent = configuredRoot.getParentFile();
        if (rootParent != null) {
            addFileCandidate(candidates, new File(rootParent, "webapp.conf"));
        }

        Set<String> seen = new LinkedHashSet<>();
        List<File> unique = new ArrayList<>();
        for (File file : candidates) {
            if (file == null) continue;
            String key;
            try {
                key = file.getCanonicalPath();
            } catch (IOException ex) {
                key = file.getAbsolutePath();
            }
            if (seen.add(key)) unique.add(file);
        }
        return unique;
    }

    private boolean patchSingleWebappConf(File conf, ConfigValues c) {
        String version = assetVersionToken;
        String addonPath = normalizeAddonPath(c.addonPath);
        String scriptConfig = addonPath + "/config.js?v=" + version;
        String scriptChat = addonPath + "/chat.js?v=" + version;
        String styleChat = addonPath + "/chat.css?v=" + version;

        try {
            String text = Files.readString(conf.toPath(), StandardCharsets.UTF_8);
            String withoutOldEntries = removeOldBlueMapWebChatEntries(text, addonPath);
            String patched = ensureListEntries(withoutOldEntries, "scripts", scriptConfig, scriptChat);
            patched = ensureListEntries(patched, "styles", styleChat);
            if (!patched.equals(text)) {
                Files.writeString(conf.toPath(), patched, StandardCharsets.UTF_8);
                plugin.getLogger().info("Patched BlueMap webapp.conf with BlueMapWebChat JS/CSS entries (v=" + assetVersionToken + "): " + conf.getPath());
            } else {
                plugin.getLogger().info("BlueMap webapp.conf already contains current BlueMapWebChat entries (v=" + assetVersionToken + "): " + conf.getPath());
            }
            return true;
        } catch (IOException ex) {
            plugin.getLogger().warning("Failed to patch webapp.conf " + conf.getPath() + ": " + ex.getMessage());
            return false;
        }
    }

    private void writeWebappConfExample(ConfigValues c) {
        String version = assetVersionToken;
        String addonPath = normalizeAddonPath(c.addonPath);
        String scriptConfig = addonPath + "/config.js?v=" + version;
        String scriptChat = addonPath + "/chat.js?v=" + version;
        String styleChat = addonPath + "/chat.css?v=" + version;
        File example = new File(plugin.getDataFolder(), "webapp.conf.example-additions");
        String text = "scripts: [\n"
                + "  \"" + scriptConfig + "\",\n"
                + "  \"" + scriptChat + "\"\n"
                + "]\n\n"
                + "styles: [\n"
                + "  \"" + styleChat + "\"\n"
                + "]\n";
        try {
            Files.writeString(example.toPath(), text, StandardCharsets.UTF_8);
        } catch (IOException ex) {
            plugin.getLogger().warning("Failed to write webapp.conf.example-additions: " + ex.getMessage());
        }
    }

    private String removeOldBlueMapWebChatEntries(String text, String addonPath) {
        // Remove old non-versioned or older versioned entries to avoid running multiple frontend versions at once.
        text = removeOldBlueMapWebChatEntriesForPath(text, "addons/bluemap-web-chat");
        String configuredPath = normalizeAddonPath(addonPath);
        if (!configuredPath.equals("addons/bluemap-web-chat")) {
            text = removeOldBlueMapWebChatEntriesForPath(text, configuredPath);
        }
        return text;
    }

    private String normalizeAddonPath(String addonPath) {
        String path = addonPath == null ? "addons/bluemap-web-chat" : addonPath.trim().replace('\\', '/');
        while (path.startsWith("/")) path = path.substring(1);
        while (path.endsWith("/")) path = path.substring(0, path.length() - 1);
        return path.isBlank() ? "addons/bluemap-web-chat" : path;
    }

    private String removeOldBlueMapWebChatEntriesForPath(String text, String addonPath) {
        String path = Pattern.quote(normalizeAddonPath(addonPath));
        text = text.replaceAll("(?m)^\\s*\\\"" + path + "/(config|chat)\\.js(\\?v=[^\\\"]*)?\\\",?\\s*\\R", "");
        text = text.replaceAll("(?m)^\\s*\\\"" + path + "/chat\\.css(\\?v=[^\\\"]*)?\\\",?\\s*\\R", "");
        return text;
    }

    private String ensureListEntries(String text, String listName, String... entries) {
        boolean allPresent = true;
        for (String e : entries) {
            if (!text.contains("\"" + e + "\"")) {
                allPresent = false;
                break;
            }
        }
        if (allPresent) return text;

        Pattern p = Pattern.compile("(?s)(" + Pattern.quote(listName) + "\\s*:\\s*\\[)(.*?)(\\])");
        Matcher m = p.matcher(text);
        if (m.find()) {
            String body = m.group(2);
            StringBuilder insert = new StringBuilder();
            for (String e : entries) {
                if (!body.contains("\"" + e + "\"")) {
                    insert.append("\n  \"").append(e).append("\",");
                }
            }
            String replacement = m.group(1) + insert + body + m.group(3);
            return text.substring(0, m.start()) + replacement + text.substring(m.end());
        }

        StringBuilder append = new StringBuilder(text);
        if (!text.endsWith("\n")) append.append('\n');
        append.append("\n# Added by BlueMapWebChat\n").append(listName).append(": [\n");
        for (int i = 0; i < entries.length; i++) {
            append.append("  \"").append(entries[i]).append("\"");
            if (i + 1 < entries.length) append.append(',');
            append.append('\n');
        }
        append.append("]\n");
        return append.toString();
    }
}
