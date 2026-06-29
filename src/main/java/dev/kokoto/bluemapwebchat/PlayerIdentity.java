package dev.kokoto.bluemapwebchat;

import java.util.LinkedHashMap;
import java.util.Map;

public class PlayerIdentity {
    public final String uuid;
    public final String username;
    public final String displayName;

    public PlayerIdentity(String uuid, String username, String displayName) {
        this.uuid = uuid == null ? "" : uuid;
        this.username = username == null ? "" : username;
        this.displayName = displayName == null ? "" : displayName;
    }

    public String label() {
        if (!displayName.isBlank() && !username.isBlank() && !displayName.equals(username)) return displayName + " (" + username + ")";
        if (!displayName.isBlank()) return displayName;
        return username;
    }

    public String toJson() {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("uuid", uuid);
        m.put("username", username);
        m.put("displayName", displayName);
        m.put("label", label());
        return JsonUtil.obj(m);
    }
}
