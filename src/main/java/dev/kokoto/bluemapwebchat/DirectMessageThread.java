package dev.kokoto.bluemapwebchat;

import java.util.LinkedHashMap;
import java.util.Map;

public class DirectMessageThread {
    public String id = "";
    public String otherUuid = "";
    public String otherUsername = "";
    public String otherDisplayName = "";
    public String lastMessage = "";
    public String lastSenderUuid = "";
    public long lastMessageId;
    public long updatedAt;
    public int unread;

    public String toJson() {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", id);
        m.put("otherUuid", otherUuid);
        m.put("otherUsername", otherUsername);
        m.put("otherDisplayName", otherDisplayName);
        String label = otherDisplayName == null || otherDisplayName.isBlank() ? otherUsername : otherDisplayName;
        if (label == null || label.isBlank()) label = otherUuid;
        if (otherUsername != null && !otherUsername.isBlank() && !otherUsername.equals(label)) label += " (" + otherUsername + ")";
        m.put("otherLabel", label);
        m.put("lastMessage", lastMessage);
        m.put("lastSenderUuid", lastSenderUuid);
        m.put("lastMessageId", lastMessageId);
        m.put("updatedAt", updatedAt);
        m.put("unread", unread);
        return JsonUtil.obj(m);
    }
}
