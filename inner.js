(() => {
  const BMWC_INNER_IFRAME_MARKER_296 = true;
  const cfg = window.BlueMapWebChatConfig || {};
  function bmwcDefaultApiBase() {
    const path = String(location.pathname || "").replace(/\/+$/, "");
    const marker = "/bmwc";
    if (path === marker || path.indexOf(marker + "/") === 0) {
      return location.origin + marker + "/api";
    }
    return location.origin + "/api";
  }

  function bmwcNormalizeApiBase(value) {
    let v = String(value || "").trim();
    if (!v) v = bmwcDefaultApiBase();
    v = v.replace(/\/+$/, "");
    // Be forgiving when a legacy resource URL is accidentally placed in an API
    // base option. The API base must point at /api or /bmwc/api; uploads/emojis
    // are appended separately.
    v = v.replace(/\/(?:uploads|emojis)$/i, "");
    return v;
  }
  const apiBase = bmwcNormalizeApiBase(cfg.apiBase || cfg.apiBaseUrl || "");
  const runtimeMode = {
    pip: cfg.pip === true,
    standalone: cfg.standalone === true
  };

  const state = {
    config: null,
    token: localStorage.getItem("bmwc.token") || "",
    username: localStorage.getItem("bmwc.username") || "",
    role: localStorage.getItem("bmwc.role") || "",
    guestName: localStorage.getItem("bmwc.guestName") || "",
    captcha: null,
    captchaPass: localStorage.getItem("bmwc.captchaPass") || "",
    isPip: runtimeMode.pip,
    isStandalone: runtimeMode.standalone,
    minimized: runtimeMode.pip ? false : localStorage.getItem("bmwc.minimized") === "1",
    eventSource: null,
    streamGeneration: 0,
    streamReconnectTimer: null,
    streamReconnectAttempt: 0,
    streamReconnectAfterOpen: false,
    streamReconnectReason: "",
    streamReconnectInFlight: false,
    streamLastOpenAt: 0,
    serverVersion: "",
    lang: {},
    selectedLanguage: localStorage.getItem("bmwc.language") || "",
    availableLanguages: [],
    historyLoading: false,
    historyHasMore: true,
    historyHasAfter: false,
    historyOldestId: "",
    historyNewestId: "",
    historyPageSize: 20,
    frameMinimizedHeight: 71,
    frameNormalWidth: 372,
    frameNormalHeight: 462,
    resizeStart: null,
    themeSyncTimer: null,
    loginModalOpen: false,
    prefsModalOpen: false,
    lastLoginButtonActivateAt: 0,
    dragStart: null,
    messages: [],
    replyTarget: null,
    pins: [],
    pinsEnabled: true,
    pinsCanPin: false,
    moderationActionsVisible: false,
    commands: [],
    commandsCanRun: false,
    commandsEnabled: false,
    commandsAllowAll: false,
    commandsShowButton: true,
    commandsShowSlashPanel: true,
    commandsRunFromChatInput: false,
    commandsRequireConfirm: true,

    emojiEnabled: false,
    emojiShowButton: true,
    emojiRenderSizePx: 32,
    emojiPickerSizePx: 44,
    emojiMessageTokenLimit: 12,
    emojiTokenFormat: "short",
    emojiPacks: [],
    emojiItems: [],
    emojiById: new Map(),
    emojiByAlias: new Map(),
    emojiPanelOpen: false,
    emojiLoading: false,
    emojiPanelHeightPx: Math.max(56, Math.min(420, Number(localStorage.getItem("bmwc.emojiPanelHeightPx") || 180) || 180)),
    emojiPanelResizeStart: null,
    adminEmojiSelectedPack: localStorage.getItem("bmwc.adminEmojiPack") || "default",
    commandMaxLength: 0,
    nextLocalMessageId: 1,
    sendInFlight: false,
    sendInFlightSince: 0,
    sendInFlightText: "",
    virtualRenderStart: 0,
    virtualRenderEnd: 0,
    virtualAverageMessageHeight: 42,
    virtualRenderScheduled: false,
    virtualPendingRenderOptions: null,
    virtualResizeObserver: null,
    resumeRefreshInFlight: false,
    lastResumeRefreshAt: 0,
    autoFollowLatest: true,
    suppressAutoFollowUpdate: false,
    suppressScrollRenderUntil: 0,
    preventBottomStickUntil: 0,
    forceHistoryEndNoticeUntil: 0,
    youtubeExpanded: new Set(),
    youtubeOpen: new Set(),
    mediaOpen: new Set(),
    failedMediaPreviews: new Set(),
    lastUserScrollAt: 0,
    lastDirectScrollInputAt: 0,
    lastNonScrollUiActionAt: 0,
    historyEndNoticeStickySince: 0,
    historyEndNoticeProtectedUntil: 0,
    historyEndNoticeVisible: false,
    historyEndNoticeUiTransitionUntil: 0,
    historyEndNoticeTimer: null,
    historyEndNoticeVisibleUntil: 0,
    historyEndNoticeLastShownAt: 0,
    historyEndNoticePendingUserTopUntil: 0,
    historyEndNoticePendingUserBottomUntil: 0,
    historyEndNoticeBottomExtraScrollCount: 0,
    historyEndNoticePosition: "top",
    historyEndNoticeKey: "history.end",
    historyEndNoticeFallback: "No more messages to display.",
    historySlowNoticeTimer: null,
    forceLatestJumpUntil: 0,
    replyJumpUntil: 0,
    replyJumpGeneration: 0,
    replyJumpTargetId: "",
    replyJumpStartedAt: 0,
    replyJumpLastCenteredScrollTop: NaN,
    replyJumpStabilizeTimer: null,
    explicitLatestFollowUntil: 0,
    explicitLatestFollowReason: "",
    pendingMediaRender: false,
    scrollInteractionUntil: 0,
    scrollIdleTimer: null,
    scrollbarDragActive: false,
    touchScrollActive: false,
    pendingScrollRenderOptions: null,
    pendingOlderHistoryLoad: false,
    pendingNewerHistoryLoad: false,
    pendingTopOlderHistoryTimer: null,
    pendingTopOlderHistoryDueAt: 0,
    pendingBottomNewerHistoryTimer: null,
    pendingBottomNewerHistoryDueAt: 0,
    olderHistorySettleUntil: 0,
    historyTopEdgeIntentUntil: 0,
    historyBottomEdgeIntentUntil: 0,
    lastTopOlderHistoryRequestAt: 0,
    historyLoadingSince: 0,
    historyLoadSeq: 0,
    lastBottomNewerHistoryRequestAt: 0,
    pendingResumeRefreshReason: "",
    uploadXhr: null,
    uploadCancelRequested: false,
    uploadActive: false,
    autoFollowMediaLayoutUntil: 0,
    mediaKeepAliveUntil: new Map(),
    mediaLayoutQuietUntil: 0,
    mediaLayoutQuietTimer: null,
    mediaCullingRelaxUntil: 0,
    lastMediaLayoutChangeAt: 0,
    mediaLayoutQuietStartedAt: 0,
    mediaCullingRelaxStartedAt: 0,
    mediaLayoutEventCache: new Map(),
    mediaLayoutBatchTimer: null,
    mediaLayoutBatchOptions: null,
    historyViewportFillTimer: null,
    historyViewportFillAttempts: 0,
    viewportMaintenanceTimer: null,
    viewportMaintenanceDueAt: 0,
    dragUploadDepth: 0,
    senderIdentityMode: localStorage.getItem("bmwc.senderIdentityMode") === "real" ? "real" : "display",
    timeDisplayMode: localStorage.getItem("bmwc.timeDisplayMode") === "full" ? "full" : "short"
  };

  function normalizeCommandMaxLength(value, fallback = 0) {
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    // 0 means unlimited. Positive values are used directly; no hard upper cap.
    return Math.max(0, Math.floor(n));
  }

  function esc(s) {
    return String(s ?? "").replace(/[&<>"']/g, c => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
    })[c]);
  }

  function cssEscape(value) {
    const text = String(value ?? "");
    if (window.CSS && typeof window.CSS.escape === "function") {
      return window.CSS.escape(text);
    }
    // Minimal CSS.escape fallback for attribute selectors. This keeps message
    // action sync working in older/embedded browser contexts where CSS.escape
    // is not available.
    return text.replace(/[^a-zA-Z0-9_-]/g, ch => "\\" + ch);
  }


  const MC_LEGACY_COLORS = {
    "0": "#000000", "1": "#0000aa", "2": "#00aa00", "3": "#00aaaa",
    "4": "#aa0000", "5": "#aa00aa", "6": "#ffaa00", "7": "#aaaaaa",
    "8": "#555555", "9": "#5555ff", "a": "#55ff55", "b": "#55ffff",
    "c": "#ff5555", "d": "#ff55ff", "e": "#ffff55", "f": "#ffffff"
  };

  function stripMinecraftColorCodes(value) {
    let text = String(value ?? "");
    text = text.replace(/[§&]x(?:[§&][0-9a-fA-F]){6}/g, "");
    text = text.replace(/&#[0-9a-fA-F]{6}/g, "");
    text = text.replace(/[§&][0-9a-fA-Fk-oK-OrR]/g, "");
    return text;
  }

  function shouldRenderMinecraftNameColors() {
    return !!state.config && state.config.playerNameStripColors === false;
  }

  function sourceMayRenderMinecraftNameColors(source) {
    const s = String(source || "").toLowerCase();
    // Only actual chat senders may render Minecraft legacy colors.
    // Server/event/system lines keep legacy codes stripped even when
    // player-display.strip-colors is false.
    return s === "game" || s === "web" || s === "guest" || s === "discord";
  }

  function normalizeMinecraftLegacySource(value) {
    // Reply previews may come from persisted JSON, plugin text, copied HTML,
    // or mis-decoded section signs. Normalize the common escaped/entity forms
    // before parsing so compact reply UI does not leak raw tags such as
    // &a, §a, \u00A7a, &amp;a, &#167;a, &sect;a, or Â§a.
    let text = String(value ?? "");
    for (let i = 0; i < 3; i++) {
      const next = text
        .replace(/\\u00a7/gi, "§")
        .replace(/\\xA7/gi, "§")
        .replace(/\\u0026/gi, "&")
        .replace(/\u00c2\u00a7/g, "§")
        .replace(/Â§/g, "§")
        .replace(/&amp;/gi, "&")
        .replace(/&#0*167;?/gi, "§")
        .replace(/&#x0*a7;?/gi, "§")
        .replace(/&sect;?/gi, "§");
      if (next === text) break;
      text = next;
    }
    return text;
  }

  function plainLegacyText(value) {
    return stripMinecraftColorCodes(normalizeMinecraftLegacySource(value));
  }

  function formatReplyComposeLabelHtml(sender) {
    const marker = "__BMWC_REPLY_SENDER__";
    const template = fmt("reply.composing", "Replying to {sender}", {sender: marker});
    const parts = String(template || "").split(marker);
    if (parts.length < 2) return esc(fmt("reply.composing", "Replying to {sender}", {sender: plainLegacyText(sender)}));
    return parts.map(esc).join(minecraftLegacyTextHtml(sender, true));
  }

  function minecraftLegacyTextHtml(value, renderColors = true) {
    const text = normalizeMinecraftLegacySource(value);
    if (!renderColors) return esc(stripMinecraftColorCodes(text));

    let out = "";
    let buf = "";
    let style = {};

    const styleAttr = () => {
      const parts = [];
      if (style.color) parts.push("color:" + style.color);
      if (style.bold) parts.push("font-weight:700");
      if (style.italic) parts.push("font-style:italic");
      const deco = [];
      if (style.underline) deco.push("underline");
      if (style.strikethrough) deco.push("line-through");
      if (deco.length) parts.push("text-decoration:" + deco.join(" "));
      return parts.join(";");
    };
    const flush = () => {
      if (!buf) return;
      const attr = styleAttr();
      const html = renderCustomEmojiTokens(buf);
      out += attr ? `<span class="bmwc-mc-legacy" style="${esc(attr)}">${html}</span>` : html;
      buf = "";
    };
    const resetFormatting = () => {
      style = {};
    };
    const setColor = color => {
      style = Object.assign({}, style, {color});
      // Minecraft color codes reset formatting in normal legacy text.
      delete style.bold;
      delete style.italic;
      delete style.underline;
      delete style.strikethrough;
    };

    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if ((ch === "§" || ch === "&") && i + 1 < text.length) {
        const code = String(text[i + 1] || "").toLowerCase();
        if (code === "x" && i + 13 < text.length) {
          let hex = "";
          let ok = true;
          for (let j = 0; j < 6; j++) {
            const sep = text[i + 2 + j * 2];
            const digit = text[i + 3 + j * 2];
            if ((sep !== "§" && sep !== "&") || !/[0-9a-fA-F]/.test(digit || "")) {
              ok = false;
              break;
            }
            hex += digit;
          }
          if (ok) {
            flush();
            setColor("#" + hex);
            i += 13;
            continue;
          }
        }
        if (code === "#" && /^[0-9a-fA-F]{6}$/.test(text.slice(i + 2, i + 8))) {
          flush();
          setColor("#" + text.slice(i + 2, i + 8));
          i += 7;
          continue;
        }
        if (Object.prototype.hasOwnProperty.call(MC_LEGACY_COLORS, code)) {
          flush();
          setColor(MC_LEGACY_COLORS[code]);
          i++;
          continue;
        }
        if (code === "r") {
          flush();
          resetFormatting();
          i++;
          continue;
        }
        if ("lmnok".includes(code)) {
          flush();
          if (code === "l") style.bold = true;
          if (code === "o") style.italic = true;
          if (code === "n") style.underline = true;
          if (code === "m") style.strikethrough = true;
          // Obfuscated text (&k/§k) is intentionally not reproduced in the web UI.
          i++;
          continue;
        }
      }
      if (ch === "&" && text[i + 1] === "#" && /^[0-9a-fA-F]{6}$/.test(text.slice(i + 2, i + 8))) {
        flush();
        setColor("#" + text.slice(i + 2, i + 8));
        i += 7;
        continue;
      }
      buf += ch;
    }
    flush();
    return out;
  }

  function minecraftNameHtml(value, renderColors = shouldRenderMinecraftNameColors()) {
    return minecraftLegacyTextHtml(value, renderColors);
  }

  function plainMinecraftName(value) {
    return stripMinecraftColorCodes(String(value ?? ""));
  }

  function normalizeUrl(raw) {
    const url = String(raw || "");
    return /^https?:\/\//i.test(url) ? url : "https://" + url;
  }

  function isImageUrl(url) {
    try {
      const u = new URL(normalizeUrl(url), location.href);
      return /\.(?:png|jpe?g|gif|webp|avif|bmp)(?:$|[?#])/i.test(u.pathname + u.search);
    } catch (_) {
      return /\.(?:png|jpe?g|gif|webp|avif|bmp)(?:$|[?#])/i.test(String(url || ""));
    }
  }

  function parseUrls(value) {
    const text = String(value ?? "");
    const urlRe = /\b((?:https?:\/\/|www\.)[^\s<>"']+)/gi;
    const found = [];
    let match;
    while ((match = urlRe.exec(text)) !== null) {
      const raw = match[1];
      let url = raw;
      while (/[.,!?;:)\]\}]+$/.test(url)) {
        url = url.slice(0, -1);
      }
      if (url) found.push(url);
    }
    return found;
  }

  function linkifyText(value) {
    const text = String(value ?? "");
    if (state.config && state.config.linkifyUrls === false) return esc(text);
    const urlRe = /\b((?:https?:\/\/|www\.)[^\s<>"']+)/gi;
    let out = "";
    let last = 0;
    let match;
    while ((match = urlRe.exec(text)) !== null) {
      const raw = match[1];
      let url = raw;
      let trailing = "";
      while (/[.,!?;:)\]\}]+$/.test(url)) {
        trailing = url.slice(-1) + trailing;
        url = url.slice(0, -1);
      }
      if (!url) continue;
      out += esc(text.slice(last, match.index));
      const href = safeExternalUrl(url);
      if (href) {
        out += `<a class="bmwc-link" href="${esc(href)}" target="_blank" rel="noopener noreferrer">${esc(url)}</a>`;
      } else {
        out += esc(raw);
      }
      out += esc(trailing);
      last = match.index + raw.length;
    }
    out += esc(text.slice(last));
    return out;
  }

  function openChatExternalLink(href) {
    href = String(href || "").trim();
    if (!/^https?:\/\//i.test(href)) return false;
    try {
      const win = window.open(href, "_blank", "noopener,noreferrer");
      if (win) {
        try { win.opener = null; } catch (_) {}
        return true;
      }
    } catch (_) {}
    return false;
  }

  function normalizeReturnedUploadUrl(raw) {
    const value = String(raw || "").trim();
    if (!value) return value;
    if (/^https?:\/\//i.test(value)) return value;
    try {
      return new URL(value, location.href).href;
    } catch (_) {
      return value;
    }
  }

  function safeHttpUrl(raw, options = {}) {
    const value = String(raw || "").trim();
    if (!value || /[\u0000-\u001f\u007f]/.test(value)) return "";
    const allowRelative = options.allowRelative === true;
    try {
      const normalized = /^www\./i.test(value) ? "https://" + value : value;
      if (!allowRelative && !/^https?:\/\//i.test(normalized)) return "";
      const u = new URL(normalized, location.href);
      if (u.protocol !== "http:" && u.protocol !== "https:") return "";
      return u.href;
    } catch (_) {
      return "";
    }
  }

  function safeExternalUrl(raw) {
    return safeHttpUrl(raw, {allowRelative: false});
  }

  function apiBasePath() {
    try {
      return new URL(String(apiBase || ""), location.href).pathname.replace(/\/+$/, "");
    } catch (_) {
      return "";
    }
  }

  function firstApiResourceSuffix(path) {
    const value = String(path || "");
    const names = ["/emojis", "/uploads", "/external-media", "/fonts"];
    let best = -1;
    for (const name of names) {
      const idx = value.indexOf(name);
      if (idx >= 0 && (best < 0 || idx < best)) best = idx;
    }
    return best >= 0 ? value.slice(best) : "";
  }

  function apiResourceUrl(raw) {
    const value = String(raw || "").trim();
    if (!value) return "";
    if (/^https?:\/\//i.test(value)) return value;

    const base = String(apiBase || "").replace(/\/+$/, "");
    if (!base) return value;

    try {
      if (value.startsWith("/")) {
        const basePath = apiBasePath();
        const valuePath = new URL(value, location.href).pathname.replace(/\/+$/, "");
        // If the server already returned the same public path, keep it as-is.
        // This is important for explicit settings such as /bmwc/api/emojis.
        if (basePath && (valuePath === basePath || valuePath.startsWith(basePath + "/"))) {
          return new URL(value, location.href).href;
        }
        // Also keep explicitly configured prefixed API resource paths such as
        // /bmwc/api/uploads even if the runtime API base is currently /api.
        // Only plain internal /api/... paths are candidates for rewriting.
        if (/^\/.+\/api\/(?:emojis|uploads|external-media|fonts)(?:\/|$)/i.test(valuePath)) {
          return new URL(value, location.href).href;
        }
        // If the server returned an internal path such as /api/emojis while the
        // browser uses /bmwc/api, keep only the resource suffix and attach it to
        // the runtime API base.
        const suffix = firstApiResourceSuffix(value);
        if (suffix) return new URL(base + suffix, location.href).href;
        return new URL(value, location.href).href;
      }
      return new URL(base + "/" + value.replace(/^\/+/, ""), location.href).href;
    } catch (_) {
      return value;
    }
  }

  function safePreviewUrl(raw) {
    // Preview URLs may be external http(s) URLs or same-origin relative API
    // URLs generated by BlueMapWebChat, such as /bmwc/api/uploads/... .
    // Normalize internal /api/... resource paths to the runtime API base so
    // explicit reverse-proxy settings keep working.
    const value = String(raw || "").trim();
    const normalized = /^https?:\/\//i.test(value) ? value : apiResourceUrl(value);
    return safeHttpUrl(normalized || value, {allowRelative: true});
  }

  function safeYouTubeEmbedUrl(raw) {
    const href = safePreviewUrl(raw);
    if (!href) return "";
    try {
      const u = new URL(href, location.href);
      const host = u.hostname.toLowerCase();
      if ((host === "www.youtube.com" || host === "www.youtube-nocookie.com") && u.pathname.startsWith("/embed/")) return u.href;
    } catch (_) {}
    return "";
  }

  function installMessageActionDelegation(root) {
    if (!root || root.__bmwcActionDelegationInstalled) return;
    root.__bmwcActionDelegationInstalled = true;

    const selector = "[data-delete], [data-pin], [data-unpin], [data-pin-move], [data-open-pins], a.bmwc-link, a.bmwc-image-link";
    let pointerDownAction = null;
    let touchDownAction = null;
    let lastPointerAction = {key: "", time: 0};

    const actionTarget = event => {
      const target = event.target && event.target.closest
        ? event.target.closest(selector)
        : null;
      return target && root.contains(target) ? target : null;
    };

    const actionKey = target => {
      if (!target) return "";
      const deleteId = target.getAttribute("data-delete");
      if (deleteId) return "delete:" + deleteId;
      const pinId = target.getAttribute("data-pin");
      if (pinId) return "pin:" + pinId;
      const unpinId = target.getAttribute("data-unpin");
      if (unpinId) return "unpin:" + unpinId;
      const movePinId = target.getAttribute("data-pin-move");
      if (movePinId) return "move-pin:" + movePinId + ":" + (target.getAttribute("data-direction") || "");
      if (target.hasAttribute("data-open-pins")) return "open-pins";
      const href = target.getAttribute("href") || "";
      if (href && target.matches("a.bmwc-link, a.bmwc-image-link")) return "link:" + href;
      return "";
    };

    const releasePointerActionScrollState = () => {
      // Action controls run in a capturing pointer handler and intentionally
      // stop propagation to avoid duplicate click actions. On touch browsers
      // that can prevent the history-paging window pointerup listener from
      // seeing the end of the gesture, leaving touchScrollActive true. If that
      // state remains set, virtual render/history refresh work is deferred and
      // scrolling can feel temporarily stuck after opening a link.
      try {
        pointerDownAction = null;
        const hadInteraction = !!state.touchScrollActive || !!state.scrollbarDragActive || Date.now() < Number(state.scrollInteractionUntil || 0);
        state.touchScrollActive = false;
        state.scrollbarDragActive = false;
        state.scrollInteractionUntil = 0;
        if (hadInteraction) {
          clearTimeout(state.scrollIdleTimer);
          state.scrollIdleTimer = setTimeout(flushScrollInteractionWork, 0);
        }
      } catch (_) {}
    };

    const runAction = (event, target) => {
      const deleteId = target.getAttribute("data-delete");
      if (deleteId) {
        releasePointerActionScrollState();
        event.preventDefault();
        event.stopPropagation();
        deleteMessage(deleteId);
        return true;
      }

      const pinId = target.getAttribute("data-pin");
      if (pinId) {
        releasePointerActionScrollState();
        event.preventDefault();
        event.stopPropagation();
        pinMessage(pinId);
        return true;
      }

      const unpinId = target.getAttribute("data-unpin");
      if (unpinId) {
        releasePointerActionScrollState();
        event.preventDefault();
        event.stopPropagation();
        unpinMessage(unpinId);
        return true;
      }

      const movePinId = target.getAttribute("data-pin-move");
      if (movePinId) {
        releasePointerActionScrollState();
        event.preventDefault();
        event.stopPropagation();
        movePinnedMessage(movePinId, target.getAttribute("data-direction") || "");
        return true;
      }

      if (target.hasAttribute("data-open-pins")) {
        releasePointerActionScrollState();
        event.preventDefault();
        event.stopPropagation();
        openPinnedModal();
        return true;
      }

      const href = target.getAttribute("href") || "";
      if (href && target.matches("a.bmwc-link, a.bmwc-image-link") && /^https?:\/\//i.test(href)) {
        if (openChatExternalLink(href)) {
          releasePointerActionScrollState();
          event.preventDefault();
          event.stopPropagation();
          return true;
        }
      }
      return false;
    };

    root.addEventListener("pointerdown", event => {
      const target = actionTarget(event);
      if (!target || event.button !== 0) return;
      pointerDownAction = {
        key: actionKey(target),
        x: event.clientX,
        y: event.clientY,
        button: event.button
      };
      if (target.hasAttribute("data-open-pins")) {
        // Mobile browsers can turn a small tap on the pinned bar into a tiny
        // scroll/drag and then drop the synthetic click. Keep the gesture local
        // to the chat iframe and let pointerup/touchend handle the open action.
        event.preventDefault();
        event.stopPropagation();
      }
    }, true);

    root.addEventListener("pointerup", event => {
      const target = actionTarget(event);
      if (!target || !pointerDownAction) return;
      const down = pointerDownAction;
      pointerDownAction = null;
      if (event.button !== 0 || down.button !== 0) return;

      const key = actionKey(target);
      const moved = Math.hypot(event.clientX - down.x, event.clientY - down.y);
      const moveLimit = target.hasAttribute("data-open-pins") ? 32 : 8;
      if (!key || key !== down.key || moved > moveLimit) return;

      const now = Date.now();
      if (key === lastPointerAction.key && now - lastPointerAction.time < 500) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      if (runAction(event, target)) {
        // Native confirm() blocks the event loop. If we keep the pre-confirm
        // timestamp, the browser's follow-up click can arrive after the
        // duplicate-action window and ask for confirmation a second time.
        // Stamp the action after runAction() returns so OK/Cancel is handled
        // exactly once for pointer-driven taps/clicks.
        lastPointerAction = {key, time: Date.now()};
      }
    }, true);

    root.addEventListener("pointercancel", () => {
      pointerDownAction = null;
    }, true);

    root.addEventListener("touchstart", event => {
      const target = actionTarget(event);
      if (!target || !target.hasAttribute("data-open-pins")) return;
      const t = event.touches && event.touches[0] ? event.touches[0] : null;
      if (!t) return;
      touchDownAction = {
        key: actionKey(target),
        x: t.clientX,
        y: t.clientY,
        target
      };
      event.preventDefault();
      event.stopPropagation();
    }, {capture: true, passive: false});

    root.addEventListener("touchend", event => {
      if (!touchDownAction) return;
      const down = touchDownAction;
      touchDownAction = null;
      const t = event.changedTouches && event.changedTouches[0] ? event.changedTouches[0] : null;
      const target = actionTarget(event) || down.target;
      const key = actionKey(target);
      const moved = t ? Math.hypot(t.clientX - down.x, t.clientY - down.y) : 0;
      const now = Date.now();
      if (key && key === down.key && moved <= 32) {
        if (!(key === lastPointerAction.key && now - lastPointerAction.time < 1200) && runAction(event, target)) {
          lastPointerAction = {key, time: Date.now()};
        }
      }
      event.preventDefault();
      event.stopPropagation();
    }, {capture: true, passive: false});

    root.addEventListener("touchcancel", () => {
      touchDownAction = null;
    }, {capture: true, passive: true});

    root.addEventListener("click", event => {
      const target = actionTarget(event);
      if (!target) return;

      const key = actionKey(target);
      const now = Date.now();
      if (key && key === lastPointerAction.key && now - lastPointerAction.time < 1800) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      if (runAction(event, target) && key) {
        lastPointerAction = {key, time: Date.now()};
      }
    }, true);
  }

  function isVideoUrl(url) {
    try {
      const u = new URL(normalizeUrl(url), location.href);
      return /\.(?:mp4|webm|mov)(?:$|[?#])/i.test(u.pathname + u.search);
    } catch (_) {
      return /\.(?:mp4|webm|mov)(?:$|[?#])/i.test(String(url || ""));
    }
  }

  function isAudioUrl(url) {
    try {
      const u = new URL(normalizeUrl(url), location.href);
      return /\.(?:mp3|m4a|ogg|oga|wav|flac|aac)(?:$|[?#])/i.test(u.pathname + u.search);
    } catch (_) {
      return /\.(?:mp3|m4a|ogg|oga|wav|flac|aac)(?:$|[?#])/i.test(String(url || ""));
    }
  }

  function isDiscordCdnUrl(raw) {
    try {
      const u = new URL(normalizeUrl(raw), location.href);
      if (u.protocol !== "https:") return false;
      const host = u.hostname.toLowerCase();
      const okHost = host === "cdn.discordapp.com"
        || host === "media.discordapp.net"
        || host === "cdn.discordapp.net"
        || /^images-ext-\d+\.discordapp\.net$/.test(host);
      if (!okHost) return false;

      const path = u.pathname.toLowerCase();
      if (/\.(?:png|jpe?g|gif|webp|avif|bmp|mp4|webm|mov|mp3|m4a|ogg|oga|wav|flac|aac)(?:$|[?#])/i.test(u.pathname + u.search)) return true;
      if (/(?:^|[&?])format=(?:png|jpe?g|gif|webp|avif|bmp|mp4|webm|mp3|m4a|ogg|oga|wav|flac|aac)(?:$|&)/i.test(u.search)) return true;

      // Broad candidate support: let the server fetch and verify Content-Type.
      // Failed/invalid/non-media resources are hidden by the media onerror handler.
      return path.includes("/attachments/")
        || path.includes("/ephemeral-attachments/")
        || path.startsWith("/external/");
    } catch (_) {
      return false;
    }
  }


  function discordCdnPreviewUrl(raw) {
    if (!state.config || !state.config.externalMediaCacheEnabled || !state.config.cacheDiscordCdn) return "";
    const href = normalizeUrl(raw);
    if (!isDiscordCdnUrl(href)) return "";
    return apiBase + "/external-media?url=" + encodeURIComponent(href);
  }

  function previewMediaType(raw) {
    if (isVideoUrl(raw)) return "video";
    if (isAudioUrl(raw)) return "audio";
    if (isImageUrl(raw)) return "image";
    return "";
  }

  function mediaClickToLoadEnabled() {
    return !state.config || state.config.mediaClickToLoad !== false;
  }

  function googleDriveFileId(raw) {
    try {
      const u = new URL(normalizeUrl(raw), location.href);
      const host = u.hostname.toLowerCase();
      if (!host.endsWith("google.com") && !host.endsWith("googleusercontent.com")) return "";

      let match = u.pathname.match(/\/file\/d\/([^/]+)/);
      if (match && match[1]) return decodeURIComponent(match[1]);

      match = u.pathname.match(/\/uc$/);
      if (match && u.searchParams.get("id")) return u.searchParams.get("id");

      match = u.pathname.match(/\/open$/);
      if (match && u.searchParams.get("id")) return u.searchParams.get("id");

      if (u.searchParams.get("id")) return u.searchParams.get("id");
    } catch (_) {}
    return "";
  }

  function googleDrivePreviewUrl(raw) {
    if (!state.config || state.config.googleDriveImagePreview !== true) return "";
    const id = googleDriveFileId(raw);
    if (!id || !/^[A-Za-z0-9_-]+$/.test(id)) return "";

    const mode = String(state.config.googleDrivePreviewMode || "thumbnail").toLowerCase();
    if (mode === "uc") {
      return "https://drive.google.com/uc?export=view&id=" + encodeURIComponent(id);
    }

    return "https://drive.google.com/thumbnail?id=" + encodeURIComponent(id) + "&sz=w1600";
  }

  function youtubeVideoInfo(raw) {
    if (!state.config || state.config.youtubeEmbedEnabled === false) return {id: "", shorts: false};
    try {
      const u = new URL(normalizeUrl(raw), location.href);
      const host = u.hostname.toLowerCase().replace(/^www\./, "");
      if (host === "youtu.be") {
        const id = u.pathname.split("/").filter(Boolean)[0] || "";
        return /^[A-Za-z0-9_-]{6,20}$/.test(id) ? {id, shorts: false} : {id: "", shorts: false};
      }
      if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com" || host === "youtube-nocookie.com") {
        let id = u.searchParams.get("v") || "";
        let shorts = false;
        if (!id && u.pathname.startsWith("/shorts/")) {
          id = u.pathname.split("/").filter(Boolean)[1] || "";
          shorts = true;
        }
        if (!id && u.pathname.startsWith("/embed/")) id = u.pathname.split("/").filter(Boolean)[1] || "";
        return /^[A-Za-z0-9_-]{6,20}$/.test(id) ? {id, shorts} : {id: "", shorts: false};
      }
    } catch (_) {}
    return {id: "", shorts: false};
  }

  function youtubeVideoId(raw) {
    return youtubeVideoInfo(raw).id || "";
  }

  function youtubeEmbedUrl(id, autoplay = false, loop = false) {
    const host = state.config && state.config.youtubeNoCookie === false ? "www.youtube.com" : "www.youtube-nocookie.com";
    const params = new URLSearchParams();
    params.set("rel", "0");
    params.set("modestbranding", "1");
    params.set("playsinline", "1");
    if (loop) {
      params.set("loop", "1");
      params.set("playlist", id);
    }
    if (autoplay) params.set("autoplay", "1");
    try { if (location && location.origin && location.origin !== "null") params.set("origin", location.origin); } catch (_) {}
    return "https://" + host + "/embed/" + encodeURIComponent(id) + "?" + params.toString();
  }

  function youtubeShellStyle(shorts, maxHeightCss = "") {
    if (shorts) {
      return "position:relative;width:min(100%,260px);max-width:100%;aspect-ratio:9/16;max-height:420px;border-radius:10px;overflow:hidden;background:#000;margin:6px auto 0;";
    }
    return "position:relative;width:100%;aspect-ratio:16/9;" + String(maxHeightCss || "") + "border-radius:10px;overflow:hidden;background:#000;margin-top:6px;";
  }

  function socialVerticalLoadCardStyle() {
    return "position:relative;width:min(100%,260px);max-width:100%;height:180px;border-radius:10px;overflow:hidden;background:#000;margin:6px auto 0;display:flex;align-items:center;justify-content:center;";
  }

  function youtubeThumbUrl(id) {
    return "https://i.ytimg.com/vi/" + encodeURIComponent(id) + "/hqdefault.jpg";
  }

  function socialEmbedsEnabled() {
    return !!(state.config && state.config.socialEmbedsEnabled === true);
  }

  function socialClickToLoadEnabled() {
    return !state.config || state.config.socialEmbedsClickToLoad !== false;
  }

  function tiktokVideoId(raw) {
    if (!socialEmbedsEnabled() || !state.config.tiktokEmbedEnabled) return "";
    try {
      const u = new URL(normalizeUrl(raw), location.href);
      const host = u.hostname.toLowerCase().replace(/^www\./, "");
      if (host !== "tiktok.com" && host !== "m.tiktok.com") return "";
      let match = u.pathname.match(/\/video\/(\d{8,32})/);
      if (match && match[1]) return match[1];
      match = u.pathname.match(/\/embed\/v2\/(\d{8,32})/);
      if (match && match[1]) return match[1];
    } catch (_) {}
    return "";
  }

  function xPostInfo(raw) {
    if (!socialEmbedsEnabled() || !state.config.xEmbedEnabled) return null;
    try {
      const u = new URL(normalizeUrl(raw), location.href);
      const host = u.hostname.toLowerCase().replace(/^www\./, "");
      if (host !== "x.com" && host !== "twitter.com" && host !== "mobile.twitter.com") return null;
      const match = u.pathname.match(/^\/([^\/]+)\/status(?:es)?\/(\d{6,32})/i);
      if (!match || !match[1] || !match[2]) return null;
      const url = "https://x.com/" + encodeURIComponent(match[1]) + "/status/" + encodeURIComponent(match[2]);
      return {user: match[1], id: match[2], url};
    } catch (_) {}
    return null;
  }

  function tiktokCanonicalUrl(raw, id) {
    const safe = safeExternalUrl(raw);
    if (safe && /(^|\.)tiktok\.com$/i.test((() => { try { return new URL(safe).hostname.replace(/^www\./, ""); } catch (_) { return ""; } })())) return safe;
    if (!/^\d{8,32}$/.test(String(id || ""))) return "";
    return "https://www.tiktok.com/@_/video/" + encodeURIComponent(id);
  }

  function tiktokPlayerUrl(id) {
    if (!/^\d{8,32}$/.test(String(id || ""))) return "";
    const params = new URLSearchParams();
    params.set("controls", "1");
    params.set("progress_bar", "1");
    params.set("play_button", "1");
    params.set("volume_control", "1");
    params.set("fullscreen_button", "1");
    params.set("timestamp", "1");
    params.set("loop", "1");
    params.set("autoplay", "0");
    params.set("music_info", "0");
    params.set("description", "0");
    params.set("rel", "0");
    params.set("native_context_menu", "1");
    params.set("closed_caption", "1");
    return "https://www.tiktok.com/player/v1/" + encodeURIComponent(id) + "?" + params.toString();
  }

  function tiktokPlayerShellStyle() {
    return "position:relative;width:min(100%,325px);max-width:100%;height:575px;border-radius:10px;overflow:hidden;background:#000;margin:6px auto 0;";
  }

  function xThemeValue() {
    const v = String(state.config && state.config.xEmbedTheme || "auto").toLowerCase();
    if (v === "dark" || v === "light") return v;
    const root = document.getElementById("bmwc-root");
    return root && root.classList.contains("bmwc-theme-light") ? "light" : "dark";
  }

  let xWidgetsLoading = false;
  function loadXWidgets(root) {
    try {
      if (window.twttr && window.twttr.widgets && typeof window.twttr.widgets.load === "function") {
        window.twttr.widgets.load(root || document.body);
        return;
      }
      if (!document.querySelector('script[src="https://platform.twitter.com/widgets.js"]')) {
        const script = document.createElement("script");
        script.async = true;
        script.charset = "utf-8";
        script.src = "https://platform.twitter.com/widgets.js";
        document.head.appendChild(script);
      }
      if (!xWidgetsLoading) {
        xWidgetsLoading = true;
        setTimeout(() => {
          xWidgetsLoading = false;
          if (window.twttr && window.twttr.widgets && typeof window.twttr.widgets.load === "function") window.twttr.widgets.load(root || document.body);
        }, 1200);
      }
    } catch (_) {}
  }

  function socialEmbedHtml(item, maxHeightCss = "") {
    const key = item.previewKey || previewKey(item.type, item.href);
    if (item.type === "tiktok") {
      const id = String(item.tiktokId || "");
      if (!/^\d{8,32}$/.test(id)) return "";
      const href = tiktokCanonicalUrl(item.href, id);
      const player = tiktokPlayerUrl(id);
      if (!href || !player) return "";
      if (socialClickToLoadEnabled() && !state.mediaOpen.has(key)) {
        return `<div class="bmwc-social-card bmwc-tiktok-card" data-social-kind="tiktok" data-social-src="${esc(href)}" data-tiktok-id="${esc(id)}" data-preview-key="${esc(key)}" style="${socialVerticalLoadCardStyle()}">
          <button type="button" class="bmwc-media-load">${esc(t("media.loadTikTok", "▶ TikTok"))}</button>
        </div>`;
      }
      return `<div class="bmwc-social-embed bmwc-tiktok-embed" data-preview-key="${esc(key)}" style="${tiktokPlayerShellStyle()}">
        <iframe class="bmwc-social-frame" src="${esc(player)}" title="TikTok" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" allow="encrypted-media; fullscreen; picture-in-picture; web-share" allowfullscreen style="position:absolute;inset:0;width:100%;height:100%;border:0;background:#000;color-scheme:dark;"></iframe>
      </div>
      <div class="bmwc-social-open" style="width:min(100%,325px);max-width:100%;margin:4px auto 0;font-size:11px;opacity:.78;text-align:right;">
        <a class="bmwc-link" href="${esc(href)}" target="_blank" rel="noopener noreferrer">${esc(t("media.openTikTok", "Open on TikTok"))}</a>
      </div>`;
    }
    if (item.type === "x") {
      const href = safeExternalUrl(item.href);
      if (!href) return "";
      if (socialClickToLoadEnabled() && !state.mediaOpen.has(key)) {
        return `<div class="bmwc-social-card bmwc-x-card" data-social-kind="x" data-social-src="${esc(href)}" data-preview-key="${esc(key)}" style="${maxHeightCss}">
          <button type="button" class="bmwc-media-load">${esc(t("media.loadXPost", "▶ X post"))}</button>
        </div>`;
      }
      const theme = xThemeValue();
      const dnt = state.config && state.config.xEmbedDnt !== false ? "true" : "false";
      const hideMedia = state.config && state.config.xEmbedHideMedia === true ? ' data-cards="hidden"' : "";
      const hideThread = state.config && state.config.xEmbedHideThread !== false ? ' data-conversation="none"' : "";
      return `<div class="bmwc-social-embed bmwc-x-embed" data-preview-key="${esc(key)}" style="margin-top:6px;${maxHeightCss}">
        <blockquote class="twitter-tweet" data-theme="${esc(theme)}" data-dnt="${esc(dnt)}"${hideMedia}${hideThread}><a href="${esc(href)}"></a></blockquote>
      </div>`;
    }
    return "";
  }

  function previewKey(kind, href) {
    return String(kind || "media") + ":" + String(href || "");
  }

  window.__bmwcPreviewFailed = function(key) {
    if (key) state.failedMediaPreviews.add(String(key));
  };

  window.__bmwcPreviewLoaded = function(media) {
    // Media load events must not schedule a virtual re-render. In virtual-scroll
    // mode a re-render recreates the same image/video node, which fires load
    // again and can create a scroll-height jitter loop. Just re-measure the
    // containing message and refresh spacer estimates in-place.
    noteMediaLayoutLoaded(media);
  };

  function mediaErrorText(kind) {
    if (kind === "audio") return t("media.audioUnavailable", "Audio preview unavailable");
    if (kind === "image") return t("media.imageUnavailable", "Image preview unavailable");
    return t("media.videoUnavailable", "Video preview unavailable");
  }

  function setMediaError(wrap, kind) {
    if (!wrap) return;
    wrap.textContent = "";
    wrap.classList.add("bmwc-media-failed");
    const span = document.createElement("span");
    span.className = kind === "image" ? "bmwc-media-error bmwc-image-error" : "bmwc-media-error";
    span.textContent = mediaErrorText(kind);
    wrap.appendChild(span);
  }

  function createMediaElement(kind, src, key, maxHeightStyle = "") {
    const safeSrc = safePreviewUrl(src);
    if (!safeSrc) return null;
    const media = document.createElement(kind === "audio" ? "audio" : "video");
    media.className = kind === "audio" ? "bmwc-audio-preview" : "bmwc-video-preview";
    media.src = safeSrc;
    media.controls = true;
    if (kind === "audio") {
      media.preload = "none";
    } else {
      media.playsInline = true;
      media.setAttribute("webkit-playsinline", "");
      media.preload = "metadata";
      if (maxHeightStyle) media.setAttribute("style", maxHeightStyle);
    }
    if (key) media.dataset.previewKey = key;
    return media;
  }

  function hydrateSocialEmbeds(root) {
    if (!root) return;
    if (root.querySelector && root.querySelector(".twitter-tweet")) loadXWidgets(root);
  }

  function hydratePreviewMedia(root) {
    if (!root) return;
    root.querySelectorAll(".bmwc-image-preview").forEach(img => {
      if (img.dataset.bmwcPreviewHydrated === "1") return;
      img.dataset.bmwcPreviewHydrated = "1";
      const src = safePreviewUrl(img.getAttribute("src"));
      if (!src) {
        setMediaError(img.closest(".bmwc-image-link"), "image");
        return;
      }
      img.src = src;
      img.addEventListener("load", () => window.__bmwcPreviewLoaded && window.__bmwcPreviewLoaded(img), {once: true});
      img.addEventListener("error", () => {
        window.__bmwcPreviewFailed && window.__bmwcPreviewFailed(img.dataset.previewKey);
        setMediaError(img.closest(".bmwc-image-link"), "image");
        window.__bmwcPreviewLoaded && window.__bmwcPreviewLoaded(img);
      }, {once: true});
    });

    root.querySelectorAll(".bmwc-video-preview, .bmwc-audio-preview").forEach(media => {
      if (media.dataset.bmwcPreviewHydrated === "1") return;
      media.dataset.bmwcPreviewHydrated = "1";
      const kind = media.tagName === "AUDIO" ? "audio" : "video";
      const src = safePreviewUrl(media.getAttribute("src"));
      const wrap = media.closest(kind === "audio" ? ".bmwc-audio-wrap" : ".bmwc-video-wrap");
      if (!src) {
        setMediaError(wrap, kind);
        return;
      }
      media.src = src;
      media.addEventListener("loadedmetadata", () => window.__bmwcPreviewLoaded && window.__bmwcPreviewLoaded(media), {once: true});
      media.addEventListener("error", () => {
        window.__bmwcPreviewFailed && window.__bmwcPreviewFailed(media.dataset.previewKey);
        setMediaError(wrap, kind);
      }, {once: true});
    });
  }

  function safeImagePreviews(value, messageKey = "") {
    try {
      return imagePreviews(value, messageKey);
    } catch (err) {
      try { console.warn("media preview failed", err); } catch (_) {}
      return "";
    }
  }

  function imagePreviews(value, messageKey = "") {
    if (!state.config) return "";
    const configuredMax = Number(state.config.imagePreviewMaxPerMessage);
    const fallbackMax = Number(state.config.uploadMaxFilesPerMessage);
    const max = Number.isFinite(configuredMax)
      ? Math.max(0, Math.floor(configuredMax))
      : (Number.isFinite(fallbackMax) ? Math.max(0, Math.floor(fallbackMax)) : 3);
    const unlimitedPreviews = max === 0;
    const heightConfig = Number(state.config.imagePreviewMaxHeight);
    const height = Number.isFinite(heightConfig) && heightConfig > 0 ? Math.floor(heightConfig) : 0;
    const maxHeightStyle = height > 0 ? `max-height:${height}px` : "";
    const maxHeightCss = height > 0 ? `max-height:${height}px;` : "";
    const items = [];
    for (const url of parseUrls(value)) {
      if (!unlimitedPreviews && items.length >= max) break;
      const href = safeExternalUrl(url);
      if (!href) continue;
      const youtubeInfo = youtubeVideoInfo(url);
      const youtubeId = youtubeInfo.id || "";
      const tiktokId = tiktokVideoId(url);
      const xPost = xPostInfo(url);
      const discordPreview = safePreviewUrl(discordCdnPreviewUrl(url));
      const drivePreview = safePreviewUrl(googleDrivePreviewUrl(url));
      if (items.some(item => item.href === href || item.linkHref === href || (discordPreview && item.href === discordPreview) || (drivePreview && item.href === drivePreview) || (youtubeId && item.youtubeId === youtubeId) || (tiktokId && item.tiktokId === tiktokId) || (xPost && item.xPostId === xPost.id))) continue;
      const imageKey = previewKey("image", drivePreview || discordPreview || href);
      const videoKey = previewKey("video", discordPreview || href);
      const audioKey = previewKey("audio", discordPreview || href);
      const socialMaxConfig = Number(state.config.socialEmbedsMaxPerMessage);
      const maxSocial = Number.isFinite(socialMaxConfig) ? Math.max(0, Math.floor(socialMaxConfig)) : 2;
      const socialCount = items.filter(item => item.type === "tiktok" || item.type === "x").length;
      if (youtubeId) {
        const configuredYoutubeMax = Number(state.config.youtubeMaxEmbedsPerMessage);
        const maxYoutube = Number.isFinite(configuredYoutubeMax) ? Math.max(0, Math.floor(configuredYoutubeMax)) : 1;
        const youtubeCount = items.filter(item => item.type === "youtube").length;
        if (maxYoutube === 0 || youtubeCount < maxYoutube) items.push({type: "youtube", href, youtubeId, youtubeShorts: youtubeInfo.shorts === true, youtubeKey: String(messageKey || "message") + ":" + youtubeId});
      } else if (tiktokId && (maxSocial === 0 || socialCount < maxSocial)) {
        items.push({type: "tiktok", href, tiktokId, previewKey: previewKey("tiktok", tiktokId)});
      } else if (xPost && (maxSocial === 0 || socialCount < maxSocial)) {
        items.push({type: "x", href: xPost.url, xPostId: xPost.id, previewKey: previewKey("x", xPost.id)});
      } else if (discordPreview) {
        const mediaType = previewMediaType(url);
        if (mediaType === "video" && state.config.uploadPreviewVideos && !state.failedMediaPreviews.has(videoKey)) {
          items.push({type: "video", href: discordPreview, linkHref: href, previewKey: videoKey});
        } else if (mediaType === "audio" && state.config.uploadPreviewAudio && !state.failedMediaPreviews.has(audioKey)) {
          items.push({type: "audio", href: discordPreview, linkHref: href, previewKey: audioKey});
        } else if (mediaType === "image" && state.config.imagePreviewEnabled && state.config.uploadPreviewImages !== false && !state.failedMediaPreviews.has(imageKey)) {
          items.push({type: "image", href: discordPreview, linkHref: href, previewKey: imageKey});
        }
      } else if (state.config.imagePreviewEnabled && state.config.uploadPreviewImages !== false && drivePreview) {
        if (!state.failedMediaPreviews.has(imageKey)) items.push({type: "image", href: drivePreview, linkHref: href, previewKey: imageKey});
      } else if (state.config.imagePreviewEnabled && state.config.uploadPreviewImages !== false && isImageUrl(url)) {
        if (!state.failedMediaPreviews.has(imageKey)) items.push({type: "image", href, previewKey: imageKey});
      } else if (state.config.uploadPreviewVideos && isVideoUrl(url)) {
        if (!state.failedMediaPreviews.has(videoKey)) items.push({type: "video", href, previewKey: videoKey});
      } else if (state.config.uploadPreviewAudio && isAudioUrl(url)) {
        if (!state.failedMediaPreviews.has(audioKey)) items.push({type: "audio", href, previewKey: audioKey});
      }
    }
    if (!items.length) return "";
    return `<div class="bmwc-image-previews">` + items.map(item => {
      if (item.type === "youtube") {
        const id = item.youtubeId;
        const thumb = youtubeThumbUrl(id);
        const key = item.youtubeKey || (String(messageKey || "message") + ":" + id);
        const isShorts = item.youtubeShorts === true;
        const shouldAutoplay = state.config && state.config.youtubeAutoplayOnOpen === true;
        const embed = safeYouTubeEmbedUrl(youtubeEmbedUrl(id, shouldAutoplay, isShorts));
        const shellStyle = youtubeShellStyle(isShorts, maxHeightCss);
        if (!embed) return "";
        const rememberedOpen = state.config.youtubeRememberExpanded !== false && state.youtubeExpanded.has(key);
        const currentlyOpen = state.youtubeOpen.has(key);
        if (state.config.youtubeClickToLoad === false || rememberedOpen || currentlyOpen) {
          return `<div class="bmwc-youtube-wrap${isShorts ? " bmwc-youtube-shorts-wrap" : ""}" data-youtube-key="${esc(key)}" style="${shellStyle}">
            <iframe class="bmwc-youtube-frame" style="position:absolute;inset:0;width:100%;height:100%;border:0;" src="${esc(embed)}" title="${esc(isShorts ? t("media.youtubeShortsTitle", "YouTube Shorts") : t("media.youtubeTitle", "YouTube video"))}" referrerpolicy="strict-origin-when-cross-origin" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
          </div>`;
        }
        return `<button type="button" class="bmwc-youtube-card${isShorts ? " bmwc-youtube-shorts-card" : ""}" data-youtube-embed="${esc(embed)}" data-youtube-key="${esc(key)}" data-youtube-shorts="${isShorts ? "1" : "0"}" style="${shellStyle}border:0;background-size:cover;background-position:center;cursor:pointer;color:#fff;background-image:url('${esc(thumb)}')">
          <span class="bmwc-youtube-play" style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);font-size:34px;text-shadow:0 2px 8px rgba(0,0,0,.85);">▶</span>
          <span class="bmwc-youtube-label" style="position:absolute;left:8px;bottom:8px;font-size:12px;font-weight:700;text-shadow:0 2px 8px rgba(0,0,0,.85);">${esc(isShorts ? t("media.youtubeShorts", "YouTube Shorts") : t("media.youtube", "YouTube"))}</span>
        </button>`;
      }
      if (item.type === "tiktok" || item.type === "x") {
        return socialEmbedHtml(item, maxHeightCss);
      }
      if (item.type === "video") {
        const key = item.previewKey || previewKey("video", item.href);
        const src = safePreviewUrl(item.href);
        const openHref = safeExternalUrl(item.linkHref || item.href) || src;
        if (!src) return "";
        if (mediaClickToLoadEnabled() && !state.mediaOpen.has(key)) {
          return `<div class="bmwc-media-card bmwc-video-card" data-media-kind="video" data-media-src="${esc(src)}" data-media-open="${esc(openHref)}" data-preview-key="${esc(key)}" style="${maxHeightStyle}">
            <button type="button" class="bmwc-media-load">${esc(t("media.loadVideo", "▶ Video"))}</button>
          </div>`;
        }
        return `<div class="bmwc-video-wrap" data-preview-key="${esc(key)}">
          <video class="bmwc-video-preview" src="${esc(src)}" controls playsinline webkit-playsinline preload="metadata" style="${maxHeightStyle}" data-preview-key="${esc(key)}"></video>
        </div>`;
      }
      if (item.type === "audio") {
        const key = item.previewKey || previewKey("audio", item.href);
        const src = safePreviewUrl(item.href);
        const openHref = safeExternalUrl(item.linkHref || item.href) || src;
        if (!src) return "";
        if (mediaClickToLoadEnabled() && !state.mediaOpen.has(key)) {
          return `<div class="bmwc-media-card bmwc-audio-card" data-media-kind="audio" data-media-src="${esc(src)}" data-media-open="${esc(openHref)}" data-preview-key="${esc(key)}">
            <button type="button" class="bmwc-media-load">${esc(t("media.loadAudio", "▶ Audio"))}</button>
          </div>`;
        }
        return `<div class="bmwc-audio-wrap" data-preview-key="${esc(key)}">
          <audio class="bmwc-audio-preview" src="${esc(src)}" controls preload="none" data-preview-key="${esc(key)}"></audio>
        </div>`;
      }
      const src = safePreviewUrl(item.href);
      const linkHref = safeExternalUrl(item.linkHref || item.href) || src;
      if (!src || !linkHref) return "";
      return `<a class="bmwc-image-link" href="${esc(linkHref)}" target="_blank" rel="noopener noreferrer">
        <img class="bmwc-image-preview" src="${esc(src)}" loading="lazy" referrerpolicy="no-referrer" style="${maxHeightStyle}" alt="image preview" data-preview-key="${esc(item.previewKey || previewKey("image", src))}">
      </a>`;
    }).join("") + `</div>`;
  }



  function api(path, opts = {}) {
    const timeoutMs = Number(opts.timeoutMs || 0);
    const fetchOpts = Object.assign({}, opts);
    delete fetchOpts.timeoutMs;
    const isFormData = typeof FormData !== "undefined" && fetchOpts.body instanceof FormData;
    fetchOpts.headers = Object.assign(isFormData ? {} : {"Content-Type": "application/json"}, fetchOpts.headers || {});

    let timeoutId = null;
    let controller = null;
    if (timeoutMs > 0 && !fetchOpts.signal && typeof AbortController === "function") {
      controller = new AbortController();
      fetchOpts.signal = controller.signal;
      timeoutId = setTimeout(() => {
        try { controller.abort(); } catch (_) {}
      }, Math.max(1000, Math.min(60000, Math.round(timeoutMs))));
    }

    return fetch(apiBase + path, fetchOpts).then(async r => {
      if (!r.ok) {
        const err = new Error("HTTP " + r.status);
        err.status = r.status;
        try { err.response = await r.clone().json(); } catch (_) {}
        throw err;
      }
      return r.json();
    }).catch(err => {
      if (controller && err && err.name === "AbortError") {
        err.bmwcTimeout = true;
      }
      throw err;
    }).finally(() => {
      if (timeoutId) clearTimeout(timeoutId);
    });
  }

  function t(key, fallback = "") {
    return (state.lang && state.lang[key]) || fallback || key;
  }

  function fmt(key, fallback, vars = {}) {
    let s = t(key, fallback);
    for (const [k, v] of Object.entries(vars)) {
      s = s.replaceAll("{" + k + "}", String(v ?? ""));
    }
    return s;
  }

  function formatBytes(bytes) {
    const n = Number(bytes || 0);
    if (!Number.isFinite(n) || n <= 0) return "0 B";
    const units = ["B", "KB", "MB", "GB", "TB"];
    let value = n;
    let idx = 0;
    while (value >= 1024 && idx < units.length - 1) {
      value /= 1024;
      idx++;
    }
    const digits = idx === 0 || value >= 100 ? 0 : value >= 10 ? 1 : 2;
    return value.toFixed(digits).replace(/\.0+$/, "").replace(/(\.\d*[1-9])0+$/, "$1") + " " + units[idx];
  }

  function humanizeErrorCode(code) {
    const value = String(code || "unknown").trim();
    if (!value) return t("error.unknown", "Unknown error");
    return value.replace(/[_-]+/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  }

  function localizedError(code, extra = {}) {
    const raw = String(code || "unknown").trim() || "unknown";
    const safe = raw.replace(/[^A-Za-z0-9_.-]/g, "_");
    const fallback = humanizeErrorCode(raw);
    return fmt("error." + safe, fallback, Object.assign({error: raw}, extra || {}));
  }

  function responseError(res, fallbackCode = "unknown") {
    const code = res && res.error ? String(res.error) : fallbackCode;
    if (code === "guest_muted" && res && res.reason) {
      return fmt("error.guest_mutedWithReason", "Guest chat is muted: {reason}", {reason: res.reason});
    }
    if (code === "total_size_exceeded" && res && Number(res.maxTotalSize || 0) > 0) {
      const current = Number(res.currentSize || 0);
      const file = Number(res.fileSize || 0);
      const max = Number(res.maxTotalSize || 0);
      return fmt("error.total_size_exceededWithUsage", "Total emoji storage limit exceeded. Current {current}, selected {file}, maximum {max}.", {
        current: formatBytes(current),
        file: formatBytes(file),
        max: formatBytes(max)
      });
    }
    return localizedError(code);
  }

  function alertResponse(key, fallback, res, fallbackCode = "unknown") {
    alert(fmt(key, fallback, {error: responseError(res, fallbackCode)}));
  }

  function displayMessageText(msg) {
    if (!msg) return "";
    if (msg.hidden) return t("message.deleted", "[deleted]");
    const key = String(msg.i18nKey || "").trim();
    if (!key) return String(msg.message || "");
    let vars = {};
    if (msg.i18nArgs) {
      try { vars = JSON.parse(String(msg.i18nArgs)); } catch (_) { vars = {}; }
    }
    return fmt(key, String(msg.message || ""), vars);
  }

  function shouldStripMessageColorCodes(msg) {
    const source = String(msg && msg.source || "").toLowerCase();
    return source === "event" || source === "system" || source === "server";
  }

  function plainDisplayMessageText(msg) {
    const text = displayMessageText(msg);
    return shouldStripMessageColorCodes(msg) ? stripMinecraftColorCodes(text) : text;
  }

  function customEmojiTokenRegex() {
    // Keep this aligned with the server-side EMOJI_TOKEN_PATTERN.
    // Do not start a custom emoji token at the ':' in URL schemes such as https://.
    try {
      return new RegExp("(?<![A-Za-z0-9+.-]):(?:emoji:)?([^:\\r\\n]{1,200}):", "gu");
    } catch (_) {
      return /:(?:emoji:)?([^:\r\n]{1,200}):/g;
    }
  }

  function customEmojiBoundaryRegex(which) {
    const token = ":(?:emoji:)?[^:\\r\\n]{1,200}:";
    try {
      if (which === "start") return new RegExp("^" + token, "u");
      if (which === "end") return new RegExp("(?<![A-Za-z0-9+.-])" + token + "$", "u");
      return new RegExp("(?<![A-Za-z0-9+.-])" + token, "u");
    } catch (_) {
      const prefix = which === "start" ? "^" : "";
      const suffix = which === "end" ? "$" : "";
      return new RegExp(prefix + token + suffix);
    }
  }

  function normalizeEmojiTokenFormat(value) {
    const v = String(value || "").trim().toLowerCase();
    return (v === "legacy" || v === "prefixed" || v === "emoji") ? "legacy" : "short";
  }

  function customEmojiTokenForId(id) {
    id = String(id || "");
    return normalizeEmojiTokenFormat(state.emojiTokenFormat) === "legacy" ? `:emoji:${id}:` : `:${id}:`;
  }

  function putCustomEmojiAlias(map, key, item) {
    key = String(key || "").trim();
    if (!key || !item) return;
    if (!map.has(key)) map.set(key, item);
    const lower = key.toLowerCase();
    if (!map.has(lower)) map.set(lower, item);
  }


  function rebuildCustomEmojiLookups(items) {
    const byId = new Map();
    const byAlias = new Map();
    (Array.isArray(items) ? items : []).forEach(item => {
      if (!item) return;
      const id = String(item.id || "").trim();
      const name = String(item.name || "").trim();
      const label = String(item.label || "").trim();
      const pack = String(item.pack || "").trim();
      if (id) byId.set(id, item);
      putCustomEmojiAlias(byAlias, id, item);
      putCustomEmojiAlias(byAlias, name, item);
      putCustomEmojiAlias(byAlias, label, item);
      if (pack && name) putCustomEmojiAlias(byAlias, pack + "/" + name, item);
      if (pack && label) putCustomEmojiAlias(byAlias, pack + "/" + label, item);
      (Array.isArray(item.aliases) ? item.aliases : []).forEach(alias => putCustomEmojiAlias(byAlias, alias, item));
    });
    state.emojiById = byId;
    state.emojiByAlias = byAlias;
  }

  function customEmojiById(id) {
    if (!state.emojiById || typeof state.emojiById.get !== "function") return null;
    return state.emojiById.get(String(id || "")) || null;
  }

  function customEmojiByToken(token) {
    token = String(token || "").trim();
    if (!token) return null;
    let item = customEmojiById(token);
    if (item) return item;
    const alias = state.emojiByAlias;
    if (alias && typeof alias.get === "function") {
      item = alias.get(token) || alias.get(token.toLowerCase());
      if (item) return item;
    }
    return null;
  }

  function customEmojiImgHtml(item) {
    if (!item || !item.url) return "";
    const size = Math.max(16, Math.min(1024, Number(state.emojiRenderSizePx || (state.config && state.config.emojiRenderSizePx) || 32)));
    const label = item.label || item.name || item.id || "emoji";
    const title = item.path ? `${label}\n${item.path}` : label;
    return `<img class="bmwc-custom-emoji" src="${esc(item.url)}" alt="${esc(":" + label + ":")}" title="${esc(title)}" loading="lazy" draggable="false" style="width:${size}px;height:${size}px;">`;
  }

  function emojiPickerSizePx() {
    return Math.max(24, Math.min(1024, Number(state.emojiPickerSizePx || (state.config && state.config.emojiPickerSizePx) || 44)));
  }

  function emojiPanelHeightPx() {
    return clampEmojiPanelHeightPx(Number(state.emojiPanelHeightPx || 180) || 180);
  }

  function clampEmojiPanelHeightPx(px, panel = null) {
    const min = emojiPanelMinHeightPx(panel);
    const max = emojiPanelMaxHeightPx();
    return Math.max(min, Math.min(max, Math.round(Number(px) || 180)));
  }

  function emojiPanelFallbackItemHeightPx() {
    // Tile height = icon + item vertical padding + icon/name gap + one label line + border.
    // Keep this tied to picker-size-px so the one-row minimum follows icon scaling.
    return Math.ceil(emojiPickerSizePx() + 28);
  }

  function emojiPanelMinHeightPx(panel = null) {
    panel = panel || document.getElementById("bmwc-emoji-panel");
    const fallbackItemHeight = emojiPanelFallbackItemHeightPx();
    const fallbackTabsHeight = Array.isArray(state.emojiPacks) && state.emojiPacks.length > 1 ? 30 : 0;
    const fallback = 16 + fallbackTabsHeight + fallbackItemHeight;
    if (!panel || panel.classList.contains("bmwc-hidden")) return Math.max(56, Math.ceil(fallback));

    const panelStyle = getComputedStyle(panel);
    const padTop = parseFloat(panelStyle.paddingTop || "0") || 0;
    const padBottom = parseFloat(panelStyle.paddingBottom || "0") || 0;
    const borderTop = parseFloat(panelStyle.borderTopWidth || "0") || 0;
    const borderBottom = parseFloat(panelStyle.borderBottomWidth || "0") || 0;
    const tabs = panel.querySelector(".bmwc-emoji-tabs");
    const item = panel.querySelector(".bmwc-emoji-item");

    let tabsHeight = 0;
    if (tabs) {
      const tabsStyle = getComputedStyle(tabs);
      tabsHeight = Number(tabs.getBoundingClientRect().height || tabs.offsetHeight || fallbackTabsHeight);
      tabsHeight += parseFloat(tabsStyle.marginTop || "0") || 0;
      tabsHeight += parseFloat(tabsStyle.marginBottom || "0") || 0;
    }

    const itemHeight = item ? Number(item.getBoundingClientRect().height || item.offsetHeight || 0) : 0;
    // This is the actual one-row minimum: panel chrome + fixed pack row + one complete emoji tile.
    // Do not use the selected pack's total content height here; multi-row packs must be able to shrink
    // to the same one-row minimum as one-row packs.
    return Math.max(56, Math.ceil(borderTop + padTop + tabsHeight + (itemHeight || fallbackItemHeight) + padBottom + borderBottom));
  }

  function emojiPanelMaxHeightPx() {
    const root = document.getElementById("bmwc-root");
    const panelHeight = root ? Number(root.clientHeight || 0) : 0;
    // Keep enough room for header, messages, input row, and panel padding.
    // On small windows this prevents the emoji picker from swallowing the chat list.
    const min = emojiPanelMinHeightPx();
    const viewportBound = panelHeight > 0 ? Math.max(min, panelHeight - 210) : 420;
    return Math.max(min, Math.min(420, Math.floor(viewportBound)));
  }

  function emojiScrollElement(panel = null) {
    panel = panel || document.getElementById("bmwc-emoji-panel");
    return panel ? (panel.querySelector(".bmwc-emoji-scroll") || panel) : null;
  }

  function emojiGridRowStepPx(panel = null) {
    panel = panel || document.getElementById("bmwc-emoji-panel");
    const item = panel ? panel.querySelector(".bmwc-emoji-item") : null;
    const grid = panel ? panel.querySelector(".bmwc-emoji-grid") : null;
    const itemHeight = item ? Number(item.getBoundingClientRect().height || item.offsetHeight || 0) : 0;
    const gridStyle = grid ? getComputedStyle(grid) : null;
    const rowGap = gridStyle ? parseFloat(gridStyle.rowGap || gridStyle.gap || "0") || 0 : 0;
    const fallback = emojiPanelFallbackItemHeightPx();
    return Math.max(28, Math.round((itemHeight || fallback) + rowGap));
  }

  function snapEmojiPanelHeightPx(px, panel = null) {
    panel = panel || document.getElementById("bmwc-emoji-panel");
    const min = emojiPanelMinHeightPx(panel);
    const max = emojiPanelMaxHeightPx();
    let height = Math.max(min, Math.min(max, Math.round(Number(px) || 180)));
    const scroll = emojiScrollElement(panel);
    const grid = panel ? panel.querySelector(".bmwc-emoji-grid") : null;
    if (!grid || !scroll || panel.classList.contains("bmwc-hidden")) return height;
    const panelStyle = getComputedStyle(panel);
    const padTop = parseFloat(panelStyle.paddingTop || "0") || 0;
    const padBottom = parseFloat(panelStyle.paddingBottom || "0") || 0;
    const scrollTopOffset = Number(scroll.offsetTop || 0);
    const fixedPart = Math.max(0, scrollTopOffset + padBottom);
    const row = emojiGridRowStepPx(panel);
    if (row > 0 && height > fixedPart + row) {
      const available = Math.max(row, height - fixedPart);
      const rows = Math.max(1, Math.round(available / row));
      height = Math.round(fixedPart + rows * row);
      if (height > max) {
        const maxRows = Math.max(1, Math.floor(Math.max(row, max - fixedPart) / row));
        height = Math.round(fixedPart + maxRows * row);
      }
      height = Math.max(min, Math.min(max, height));
    }
    return height;
  }

  function snapEmojiPanelScrollTop(panel = null) {
    panel = panel || document.getElementById("bmwc-emoji-panel");
    if (!panel || panel.classList.contains("bmwc-hidden")) return;
    const scroll = emojiScrollElement(panel);
    const grid = panel.querySelector(".bmwc-emoji-grid");
    if (!grid || !scroll) return;
    const row = emojiGridRowStepPx(panel);
    if (!Number.isFinite(row) || row <= 0) return;
    const current = Number(scroll.scrollTop || 0);
    const maxTop = Math.max(0, Number(scroll.scrollHeight || 0) - Number(scroll.clientHeight || 0));
    const target = Math.max(0, Math.min(maxTop, Math.round(Math.round(current / row) * row)));
    if (Math.abs(target - current) > 0.5) scroll.scrollTop = target;
  }

  function setEmojiPanelHeight(px, persist = true, options = {}) {
    const panel = document.getElementById("bmwc-emoji-panel");
    const height = options && options.snap === false
      ? clampEmojiPanelHeightPx(px, panel)
      : snapEmojiPanelHeightPx(px, panel);
    state.emojiPanelHeightPx = height;
    const root = document.getElementById("bmwc-root");
    if (root) {
      root.style.setProperty("--bmwc-emoji-panel-height", height + "px");
      root.style.setProperty("--bmwc-emoji-panel-min-height", emojiPanelMinHeightPx(panel) + "px");
    }
    if (persist) {
      try { localStorage.setItem("bmwc.emojiPanelHeightPx", String(height)); } catch (_) {}
    }
    if (panel) {
      const minHeight = emojiPanelMinHeightPx(panel);
      panel.style.maxHeight = height + "px";
      panel.style.minHeight = minHeight + "px";
      // Keep the panel as a max-height box during normal use so one-row packs do not
      // leave a large empty area. While dragging, or when the picker is clamped to
      // its minimum, use an explicit height so multi-row packs can shrink to the
      // same one-row minimum instead of being held open by their natural content.
      if ((state.emojiPanelResizeStart && (!options || options.fixed !== false)) || height <= minHeight + 1 || (options && options.fixed === true)) {
        panel.style.height = height + "px";
      } else {
        panel.style.removeProperty("height");
      }
      if (!options || options.snapScroll !== false) snapEmojiPanelScrollTop(panel);
    }
    return height;
  }

  function updateEmojiResizeHandleVisibility() {
    const handle = document.getElementById("bmwc-emoji-resize");
    if (!handle) return;
    const visible = !!(state.emojiPanelOpen && canUseCustomEmoji() && !state.minimized && !guestChatHidden());
    handle.classList.toggle("bmwc-hidden", !visible);
  }

  function installEmojiPanelResize(root) {
    const handle = document.getElementById("bmwc-emoji-resize");
    const panel = document.getElementById("bmwc-emoji-panel");
    if (!handle || !panel || handle.dataset.bmwcInstalled === "1") return;
    handle.dataset.bmwcInstalled = "1";
    setEmojiPanelHeight(emojiPanelHeightPx(), false);

    const pointY = event => {
      const src = event.touches && event.touches.length ? event.touches[0] :
                  event.changedTouches && event.changedTouches.length ? event.changedTouches[0] :
                  event;
      return Number(src.clientY) || 0;
    };

    const begin = event => {
      if (!state.emojiPanelOpen) return;
      event.preventDefault();
      event.stopPropagation();
      markNonScrollUiAction();
      state.emojiPanelResizeStart = {
        y: pointY(event),
        height: Number(panel.getBoundingClientRect().height || emojiPanelHeightPx()),
        currentHeight: Number(panel.getBoundingClientRect().height || emojiPanelHeightPx())
      };
      document.body.classList.add("bmwc-emoji-resizing");
      try { handle.setPointerCapture && event.pointerId != null && handle.setPointerCapture(event.pointerId); } catch (_) {}
    };

    const move = event => {
      const start = state.emojiPanelResizeStart;
      if (!start) return;
      event.preventDefault();
      event.stopPropagation();
      const delta = start.y - pointY(event);
      start.currentHeight = setEmojiPanelHeight(start.height + delta, false, {snap: false, snapScroll: false});
    };

    const end = event => {
      const start = state.emojiPanelResizeStart;
      if (!start) return;
      event.preventDefault();
      event.stopPropagation();
      setEmojiPanelHeight(start.currentHeight || emojiPanelHeightPx(), true, {snap: false, snapScroll: true});
      state.emojiPanelResizeStart = null;
      document.body.classList.remove("bmwc-emoji-resizing");
    };

    handle.addEventListener("pointerdown", begin, {passive: false});
    document.addEventListener("pointermove", move, {passive: false});
    document.addEventListener("pointerup", end, {passive: false});
    document.addEventListener("pointercancel", end, {passive: false});
    handle.addEventListener("touchstart", begin, {passive: false});
    document.addEventListener("touchmove", move, {passive: false});
    document.addEventListener("touchend", end, {passive: false});
    document.addEventListener("touchcancel", end, {passive: false});
  }

  function emojiPanelRowScrollTargets(panel = null) {
    panel = panel || document.getElementById("bmwc-emoji-panel");
    const scroll = emojiScrollElement(panel);
    const grid = panel ? panel.querySelector(".bmwc-emoji-grid") : null;
    if (!panel || !scroll || !grid) return [];

    const scrollRect = scroll.getBoundingClientRect();
    const rawRows = [];
    const seen = [];
    grid.querySelectorAll(".bmwc-emoji-item").forEach(item => {
      const rect = item.getBoundingClientRect();
      const absoluteTop = Math.max(0, Math.round((rect.top - scrollRect.top) + Number(scroll.scrollTop || 0)));
      if (!seen.some(v => Math.abs(v - absoluteTop) <= 2)) {
        seen.push(absoluteTop);
        rawRows.push(absoluteTop);
      }
    });
    rawRows.sort((a, b) => a - b);
    if (!rawRows.length) return [];

    // The grid may sit below pack tabs/header inside the scroll area. Normalize
    // the first emoji row to 0 so the first wheel tick moves exactly one emoji
    // row instead of jumping by the header height plus one row.
    const first = rawRows[0];
    return rawRows.map(v => Math.max(0, Math.round(v - first)));
  }

  function emojiPanelNextRowScrollTop(panel, direction) {
    const scroll = emojiScrollElement(panel);
    if (!scroll) return null;
    const maxTop = Math.max(0, Number(scroll.scrollHeight || 0) - Number(scroll.clientHeight || 0));
    const current = Number(scroll.scrollTop || 0);
    const rows = emojiPanelRowScrollTargets(panel).filter(v => v <= maxTop + 2);
    if (!rows.length) {
      const row = emojiGridRowStepPx(panel);
      if (!Number.isFinite(row) || row <= 0) return null;
      const base = Math.round(current / row) * row;
      return Math.max(0, Math.min(maxTop, Math.round(base + (direction > 0 ? row : -row))));
    }

    if (direction > 0) {
      const next = rows.find(v => v > current + 2);
      return Math.max(0, Math.min(maxTop, next == null ? maxTop : next));
    }

    for (let i = rows.length - 1; i >= 0; i--) {
      if (rows[i] < current - 2) return Math.max(0, Math.min(maxTop, rows[i]));
    }
    return 0;
  }

  function installEmojiPanelWheelStep(panel) {
    panel = panel || document.getElementById("bmwc-emoji-panel");
    const scroll = emojiScrollElement(panel);
    if (!panel || !scroll || scroll.dataset.bmwcWheelStepInstalled === "1") return;
    scroll.dataset.bmwcWheelStepInstalled = "1";
    scroll.addEventListener("wheel", event => {
      if (!state.emojiPanelOpen || panel.classList.contains("bmwc-hidden")) return;
      if (event.ctrlKey || event.metaKey || event.shiftKey) return;
      const deltaY = Number(event.deltaY || 0);
      if (Math.abs(deltaY) < 1) return;
      const target = emojiPanelNextRowScrollTop(panel, deltaY > 0 ? 1 : -1);
      if (target == null) return;
      event.preventDefault();
      event.stopPropagation();
      scroll.scrollTo({top: target, behavior: "auto"});
    }, {passive: false});
  }

  function applyEmojiPickerSize() {
    const root = document.getElementById("bmwc-root");
    if (!root) return;
    root.style.setProperty("--bmwc-emoji-picker-size", emojiPickerSizePx() + "px");
    root.style.setProperty("--bmwc-emoji-panel-height", emojiPanelHeightPx() + "px");
    root.style.setProperty("--bmwc-emoji-panel-min-height", emojiPanelMinHeightPx() + "px");
  }

  function renderCustomEmojiTokens(text) {
    text = String(text ?? "");
    if (!state.emojiEnabled || !state.emojiById || state.emojiById.size === 0) return linkifyText(text);
    const re = customEmojiTokenRegex();
    let out = "";
    let last = 0;
    let match;
    while ((match = re.exec(text)) !== null) {
      out += linkifyText(text.slice(last, match.index));
      const item = customEmojiByToken(match[1]);
      out += item ? customEmojiImgHtml(item) : esc(match[0]);
      last = match.index + match[0].length;
    }
    out += linkifyText(text.slice(last));
    return out;
  }

  function messageTextHtml(msg) {
    return renderCustomEmojiTokens(plainDisplayMessageText(msg));
  }

  function replyPreviewPlain(msg) {
    if (!msg) return "";
    const value = String(msg.replyToPreview || "").trim();
    if (value) return value;
    return plainDisplayMessageText(msg).replace(/[\r\n]+/g, " ").trim();
  }

  function messageById(id) {
    id = String(id || "");
    if (!id) return null;
    return state.messages.find(m => m && String(m.id || "") === id) || null;
  }

  function replyTargetFromMessage(msg) {
    if (!msg || !msg.id || msg.hidden) return null;
    const sender = displaySender(msg) || msg.sender || "";
    let preview = plainDisplayMessageText(msg).replace(/[\r\n]+/g, " ").trim();
    if (preview.length > 120) preview = preview.slice(0, 117) + "...";
    return {id: String(msg.id), sender, preview};
  }

  function renderReplyCompose() {
    const wrap = document.getElementById("bmwc-reply-compose");
    if (!wrap) return;
    const target = state.replyTarget;
    wrap.classList.toggle("bmwc-hidden", !target || !target.id);
    const label = document.getElementById("bmwc-reply-compose-label");
    const preview = document.getElementById("bmwc-reply-compose-preview");
    if (label) label.innerHTML = target && target.id ? formatReplyComposeLabelHtml(target.sender || "") : "";
    if (preview) preview.innerHTML = target && target.id ? replyPreviewHtml(target.preview || "") : "";
  }

  function startReplyToMessage(msg) {
    const target = replyTargetFromMessage(msg);
    if (!target) return;
    state.replyTarget = target;
    renderReplyCompose();
    const input = document.getElementById("bmwc-message");
    if (input) input.focus();
  }

  function clearReplyTarget() {
    state.replyTarget = null;
    renderReplyCompose();
  }

  function replyPreviewHtml(value) {
    // Reply previews are stored as a plain short copy of the original text.
    // Use the dedicated legacy text renderer so raw §a/&a/&#RRGGBB tags do not
    // leak into the compact reply reference UI.
    return minecraftLegacyTextHtml(String(value || ""), true);
  }

  function replyReferenceHtml(msg) {
    if (!msg || !msg.replyToId) return "";
    const sender = msg.replyToSender || t("sender.unknown", "Unknown");
    const preview = msg.replyToPreview || "";
    const plainSender = plainLegacyText(sender).trim() || t("sender.unknown", "Unknown");
    const plainPreview = plainLegacyText(preview).trim();
    const title = plainPreview ? fmt("reply.jump", "Jump to replied message") + ": " + plainSender + " - " + plainPreview : t("reply.jump", "Jump to replied message");
    return `<button type="button" class="bmwc-reply-ref" data-reply-jump="${esc(msg.replyToId)}" title="${esc(title)}">
      <span class="bmwc-reply-ref-sender">${minecraftLegacyTextHtml(sender, true)}</span>
      <span class="bmwc-reply-ref-preview">${replyPreviewHtml(preview)}</span>
    </button>`;
  }

  function highlightMessageElement(el) {
    if (!el) return;
    el.classList.remove("bmwc-reply-highlight");
    void el.offsetWidth;
    el.classList.add("bmwc-reply-highlight");
    setTimeout(() => { try { el.classList.remove("bmwc-reply-highlight"); } catch (_) {} }, 2600);
  }

  function cancelReplyJumpDeferredWork(reason = "reply-jump") {
    // A reply jump is an explicit navigation request. Any delayed scroll-idle,
    // viewport-fill, maintenance, or history paging job that was queued for the
    // previous viewport may otherwise run a few frames later and pull the chat
    // back down. Cancel them and invalidate in-flight history pages before the
    // target-focused render starts.
    clearTimeout(state.scrollIdleTimer);
    state.scrollIdleTimer = null;
    clearTimeout(state.historyViewportFillTimer);
    state.historyViewportFillTimer = null;
    state.historyViewportFillAttempts = 0;
    clearTimeout(state.viewportMaintenanceTimer);
    state.viewportMaintenanceTimer = null;
    state.viewportMaintenanceDueAt = 0;
    clearTimeout(state.pendingTopOlderHistoryTimer);
    state.pendingTopOlderHistoryTimer = null;
    state.pendingTopOlderHistoryDueAt = 0;
    clearTimeout(state.pendingBottomNewerHistoryTimer);
    state.pendingBottomNewerHistoryTimer = null;
    state.pendingBottomNewerHistoryDueAt = 0;
    state.historyTopEdgeIntentUntil = 0;
    state.historyBottomEdgeIntentUntil = 0;
    clearTimeout(state.replyJumpStabilizeTimer);
    state.replyJumpStabilizeTimer = null;

    state.pendingScrollRenderOptions = null;
    state.virtualPendingRenderOptions = null;
    state.pendingOlderHistoryLoad = false;
    state.pendingNewerHistoryLoad = false;
    state.pendingResumeRefreshReason = "";
    state.replyJumpLastCenteredScrollTop = NaN;
    state.olderHistorySettleUntil = 0;
    state.scrollInteractionUntil = 0;
    state.scrollbarDragActive = false;
    state.touchScrollActive = false;

    if (state.historyLoading) {
      state.historyLoading = false;
      state.historyLoadingSince = 0;
    }
    state.historyLoadSeq++;
    state.forceLatestJumpUntil = 0;
    state.explicitLatestFollowUntil = 0;
    state.explicitLatestFollowReason = "";
  }

  function extendReplyJumpLock(ms = 900) {
    const now = Date.now();
    const duration = Math.max(250, Number(ms) || 900);
    state.replyJumpUntil = Math.max(Number(state.replyJumpUntil || 0), now + duration);
    state.preventBottomStickUntil = Math.max(Number(state.preventBottomStickUntil || 0), now + duration);
    state.suppressScrollRenderUntil = Math.max(Number(state.suppressScrollRenderUntil || 0), now + duration);
    state.suppressAutoFollowUpdate = true;
    state.autoFollowLatest = false;
    state.explicitLatestFollowUntil = 0;
    state.forceLatestJumpUntil = 0;
  }

  function beginReplyJumpLock(ms = 1400) {
    cancelReplyJumpDeferredWork("reply-jump");
    const duration = Math.max(300, Number(ms) || 1400);
    const generation = ++state.replyJumpGeneration;
    state.replyJumpStartedAt = Date.now();
    state.replyJumpLastCenteredScrollTop = NaN;
    extendReplyJumpLock(duration);
    setTimeout(() => {
      if (state.replyJumpGeneration === generation && Date.now() >= Number(state.replyJumpUntil || 0) - 30) {
        state.suppressAutoFollowUpdate = false;
        state.replyJumpTargetId = "";
        state.replyJumpStartedAt = 0;
        state.replyJumpLastCenteredScrollTop = NaN;
      }
    }, duration + 40);
    return generation;
  }

  function cancelReplyJumpForUserScroll(reason = "user-scroll") {
    const now = Date.now();
    const hasActiveReplyJump = now < Number(state.replyJumpUntil || 0) || !!state.replyJumpStabilizeTimer || !!state.replyJumpTargetId;
    if (!hasActiveReplyJump) return;

    // Once the user starts wheel/touch/key/scrollbar scrolling, the reply jump is
    // no longer allowed to keep re-centering the target. The previous
    // stabilization loop intentionally rechecked the target for ~2s so late
    // virtual-scroll/media height changes would not knock it out of view. That
    // same loop becomes harmful after real user input: it feels like the scroll
    // is being rewound. Incrementing the generation invalidates any pending
    // requestAnimationFrame/setTimeout callbacks from the old jump.
    clearTimeout(state.replyJumpStabilizeTimer);
    state.replyJumpStabilizeTimer = null;
    state.replyJumpGeneration++;
    state.replyJumpUntil = 0;
    state.replyJumpTargetId = "";
    state.replyJumpStartedAt = 0;
    state.replyJumpLastCenteredScrollTop = NaN;
    state.pendingScrollRenderOptions = null;
    state.virtualPendingRenderOptions = null;
    state.suppressScrollRenderUntil = 0;
    state.suppressAutoFollowUpdate = false;
    state.preventBottomStickUntil = Math.max(Number(state.preventBottomStickUntil || 0), now + 350);
    state.forceLatestJumpUntil = 0;
    state.explicitLatestFollowUntil = 0;
    state.explicitLatestFollowReason = "";
    state.autoFollowLatest = false;
  }

  function isMessageElementCentered(box, el, tolerancePx = 18) {
    if (!box || !el) return false;
    try {
      const boxRect = box.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      if (elRect.bottom < boxRect.top + 4 || elRect.top > boxRect.bottom - 4) return false;
      const boxCenter = boxRect.top + Math.max(1, boxRect.height || box.clientHeight || 1) / 2;
      const elCenter = elRect.top + Math.max(1, elRect.height || 1) / 2;
      return Math.abs(elCenter - boxCenter) <= Math.max(4, Number(tolerancePx) || 18);
    } catch (_) {
      return false;
    }
  }

  function renderReplyJumpFocusedRange(id, generation, options = {}) {
    if (state.replyJumpGeneration !== generation) return false;
    id = String(id || "");
    if (!id) return false;
    const idx = state.messages.findIndex(m => m && String(m.id || "") === id);
    if (idx < 0) return false;
    renderVirtualMessages({
      stickToBottom: false,
      preserveScroll: false,
      preserveVisualAnchor: false,
      forcePreservePosition: true,
      suppressBottomStick: true,
      ignoreVisibleRangeProtection: true,
      focusIndex: idx,
      allowDuringMedia: true,
      allowDuringVisibleMedia: true,
      allowDuringMediaLayout: true,
      deferDuringMediaLayout: false,
      deferDuringScroll: false
    });
    return true;
  }

  function replyJumpLooksUserMoved(box, startedAt) {
    if (!box) return false;
    const lastDirect = Number(state.lastDirectScrollInputAt || 0);
    const lastUserScroll = Number(state.lastUserScrollAt || 0);
    if (lastDirect > 0 && lastDirect >= Number(startedAt || 0) - 10) return true;
    if (lastUserScroll > 0 && lastUserScroll >= Number(startedAt || 0) - 10) return true;
    const lastCentered = Number(state.replyJumpLastCenteredScrollTop);
    if (!Number.isFinite(lastCentered)) return false;
    const drift = Math.abs(Number(box.scrollTop || 0) - lastCentered);
    return drift > Math.max(28, Math.round(Math.max(1, Number(box.clientHeight || 1)) * 0.07));
  }

  function stabilizeReplyJumpTarget(id, generation, options = {}) {
    id = String(id || "");
    if (!id) return;
    clearTimeout(state.replyJumpStabilizeTimer);
    const selector = `.bmwc-msg[data-id="${cssEscape(id)}"]`;
    const lockMs = Math.max(450, Number(options.lockMs || 1100));
    const delays = Array.isArray(options.delays) ? options.delays : [0, 60, 160, 360, 720];
    const startedAt = Number(options.startedAt || state.replyJumpStartedAt || Date.now());
    let pos = 0;

    const run = () => {
      if (state.replyJumpGeneration !== generation) return;
      const box = document.getElementById("bmwc-messages");
      if (!box) return;
      if (pos > 0 && replyJumpLooksUserMoved(box, startedAt)) {
        cancelReplyJumpForUserScroll("reply-jump-user-moved");
        return;
      }
      extendReplyJumpLock(Math.max(260, Math.min(lockMs, 650)));
      let el = box.querySelector(selector);
      if (!el) {
        renderReplyJumpFocusedRange(id, generation, {reason: "reply-jump-stabilize-render"});
        el = box.querySelector(selector);
      }
      if (el && (!isMessageElementCentered(box, el, pos === 0 ? 8 : 22) || pos <= 1)) {
        centerMessageElementInBox(box, el, {
          reason: "reply-jump-stabilize",
          suppressRenderMs: Math.max(450, Math.min(lockMs, 900)),
          suppressUpdateMs: Math.max(450, Math.min(lockMs, 900)),
          highlight: pos <= 1
        });
      }
      const delay = delays[++pos];
      if (state.replyJumpGeneration === generation && Number.isFinite(Number(delay))) {
        state.replyJumpStabilizeTimer = setTimeout(run, Math.max(0, Number(delay)));
      } else if (state.replyJumpGeneration === generation) {
        state.replyJumpStabilizeTimer = null;
      }
    };

    state.replyJumpStabilizeTimer = setTimeout(run, Math.max(0, Number(delays[0]) || 0));
  }

  function centerMessageElementInBox(box, el, options = {}) {
    if (!box || !el) return false;
    let desired = Number(box.scrollTop || 0);
    try {
      const boxRect = box.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      const centerOffset = Math.max(0, (Number(box.clientHeight || 0) - Number(elRect.height || 0)) / 2);
      desired = desired + (elRect.top - boxRect.top) - centerOffset;
    } catch (_) {
      desired = Number(box.scrollTop || 0);
    }
    setScrollTopPreserved(box, desired, {
      allowAwayFromBottom: true,
      reason: options.reason || "reply-jump-center",
      suppressRenderMs: Number(options.suppressRenderMs || 900),
      suppressUpdateMs: Number(options.suppressUpdateMs || 900)
    });
    if (String(options.reason || "").indexOf("reply-jump") === 0) {
      state.replyJumpLastCenteredScrollTop = desired;
    }
    if (options.highlight !== false) highlightMessageElement(el);
    refreshScrollAffordances(box);
    return true;
  }

  function scrollToMessageId(id, options = {}) {
    id = String(id || "");
    if (!id) return false;
    const box = document.getElementById("bmwc-messages");
    if (!box) return false;
    const selector = `.bmwc-msg[data-id="${cssEscape(id)}"]`;
    const lockMs = Math.max(1000, Number(options.lockMs || 1800));
    state.replyJumpTargetId = id;

    let el = box.querySelector(selector);
    if (el) {
      const generation = beginReplyJumpLock(lockMs);
      centerMessageElementInBox(box, el, {reason: "reply-jump-visible", suppressRenderMs: lockMs, suppressUpdateMs: lockMs});
      stabilizeReplyJumpTarget(id, generation, {lockMs});
      return true;
    }

    const idx = state.messages.findIndex(m => m && String(m.id || "") === id);
    if (idx < 0) return false;

    const generation = beginReplyJumpLock(lockMs);
    renderReplyJumpFocusedRange(id, generation, {reason: "reply-jump-virtual"});

    const finish = () => {
      if (state.replyJumpGeneration !== generation) return;
      const currentBox = document.getElementById("bmwc-messages");
      const later = currentBox ? currentBox.querySelector(selector) : null;
      if (later) centerMessageElementInBox(currentBox, later, {reason: "reply-jump-virtual", suppressRenderMs: lockMs, suppressUpdateMs: lockMs});
      else renderReplyJumpFocusedRange(id, generation, {reason: "reply-jump-virtual-retry"});
    };
    requestAnimationFrame(finish);
    setTimeout(finish, 80);
    setTimeout(finish, 220);
    stabilizeReplyJumpTarget(id, generation, {lockMs});
    return true;
  }

  async function jumpToReplyTarget(id) {
    id = String(id || "");
    if (!id) return;
    state.replyJumpTargetId = id;
    if (scrollToMessageId(id, {lockMs: 2200})) return;

    const generation = beginReplyJumpLock(3200);
    try {
      const data = await api(`/history/around?id=${encodeURIComponent(id)}&before=40&after=40`, {timeoutMs: 15000});
      if (state.replyJumpGeneration !== generation) return;
      if (!data || !data.ok || !Array.isArray(data.messages) || !data.messages.length) {
        alert(t("reply.notFound", "The referenced message could not be found."));
        return;
      }
      extendReplyJumpLock(2600);
      state.messages = [];
      state.nextLocalMessageId = 1;
      data.messages.forEach(msg => addMessage(msg, {skipRender: true, suppressAutoFollow: true}));
      state.historyHasMore = !!data.hasBefore;
      state.historyHasAfter = !!data.hasAfter;
      state.historyOldestId = data.oldestId || (state.messages[0] && state.messages[0].id) || "";
      state.historyNewestId = data.newestId || (state.messages[state.messages.length - 1] && state.messages[state.messages.length - 1].id) || "";
      state.autoFollowLatest = false;
      state.explicitLatestFollowUntil = 0;
      state.forceLatestJumpUntil = 0;

      if (!renderReplyJumpFocusedRange(id, generation, {reason: "reply-jump-around"})) {
        alert(t("reply.notFound", "The referenced message could not be found."));
        return;
      }
      stabilizeReplyJumpTarget(id, generation, {lockMs: 1000, delays: [0, 50, 120, 260, 520]});
    } catch (e) {
      if (state.replyJumpGeneration === generation) alert(t("reply.notFound", "The referenced message could not be found."));
    }
  }

  function displaySender(msg) {
    if (!msg) return "";
    const source = String(msg.source || "").toLowerCase();
    const sender = String(msg.sender || "");
    const senderKey = sender.toLowerCase();
    if (source === "event" || source === "system" || source === "server") {
      if (senderKey === "server") return t("sender.server", "Server");
      if (senderKey === "command") return t("sender.command", "Command");
      if (senderKey === "system") return t("sender.system", "System");
    }
    if (source === "discord" && senderKey === "discord") return t("sender.discord", "Discord");
    return sender;
  }

  function realSender(msg) {
    if (!msg) return "";
    const real = String(msg.realSender || msg.realName || "").trim();
    if (!real) return "";
    const shown = String(displaySender(msg) || "").trim();
    const shownPlain = plainMinecraftName(shown).trim();
    const realPlain = plainMinecraftName(real).trim();
    if (!shownPlain || realPlain.toLowerCase() === shownPlain.toLowerCase()) return "";
    return real;
  }

  function senderOriginalTitle(real) {
    return fmt("sender.originalId", "Original ID: {name}", {name: plainMinecraftName(real)});
  }

  function senderDisplayTitle(display) {
    return fmt("sender.displayName", "Display name: {name}", {name: plainMinecraftName(display)});
  }

  function preferredSenderText(display, real) {
    return state.senderIdentityMode === "real" && real ? real : display;
  }

  function senderNameHtml(display, real, source = "") {
    return minecraftNameHtml(preferredSenderText(display, real), shouldRenderMinecraftNameColors() && sourceMayRenderMinecraftNameColors(source));
  }

  function updateSenderIdentityElement(sender) {
    if (!sender) return;
    const real = sender.dataset.realSender || "";
    const display = sender.dataset.displaySender || sender.textContent || "";
    const showingReal = state.senderIdentityMode === "real" && !!real;
    const source = sender.dataset.source || "";
    sender.innerHTML = minecraftNameHtml(showingReal ? real : display, shouldRenderMinecraftNameColors() && sourceMayRenderMinecraftNameColors(source));
    sender.dataset.showingReal = showingReal ? "1" : "0";
    sender.title = showingReal ? senderDisplayTitle(display) : senderOriginalTitle(real);
    sender.setAttribute("aria-label", sender.title);
  }

  function applySenderIdentityMode() {
    document.querySelectorAll(".bmwc-sender[data-real-sender]").forEach(updateSenderIdentityElement);
  }

  function toggleSenderIdentityMode() {
    state.senderIdentityMode = state.senderIdentityMode === "real" ? "display" : "real";
    localStorage.setItem("bmwc.senderIdentityMode", state.senderIdentityMode);
    applySenderIdentityMode();
  }

  function installSenderIdentityToggle(root) {
    if (!root) return;
    root.querySelectorAll(".bmwc-sender[data-real-sender]").forEach(sender => {
      if (sender.dataset.identityToggleInstalled !== "1") {
        sender.dataset.identityToggleInstalled = "1";
        sender.addEventListener("click", event => {
          event.preventDefault();
          event.stopPropagation();
          toggleSenderIdentityMode();
        });
        sender.addEventListener("keydown", event => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          event.stopPropagation();
          toggleSenderIdentityMode();
        });
      }
      updateSenderIdentityElement(sender);
    });
  }

  function displaySource(msg) {
    const source = String(msg && msg.source || "").toLowerCase();
    if (!source) return "";
    return t("source." + source, source);
  }

  async function loadLang() {
    try {
      const lang = String(state.selectedLanguage || localStorage.getItem("bmwc.language") || "").trim();
      const data = await api("/lang" + (lang ? "?lang=" + encodeURIComponent(lang) : ""));
      if (data && data.ok && data.strings) {
        state.lang = data.strings;
        state.availableLanguages = Array.isArray(data.available) ? data.available.map(String) : state.availableLanguages;
      }
    } catch (e) {
      console.warn("BlueMapWebChat lang failed", e);
    }
  }

  function languageLabel(code) {
    const labels = {
      "": t("preferences.languageDefault", "Default"),
      "ko-KR": "Korean",
      "en-US": "English",
      "ja-JP": "Japanese",
      "zh-CN": "Simplified Chinese"
    };
    return labels[String(code || "")] || String(code || "");
  }

  function savedUserLanguage() {
    return String(localStorage.getItem("bmwc.language") || "");
  }

  function selectedLocale() {
    const lang = String(state.selectedLanguage || localStorage.getItem("bmwc.language") || (state.config && state.config.language) || navigator.language || "en-US").trim();
    return lang || "en-US";
  }

  function configuredTimeZone() {
    const raw = String((state.config && state.config.uiTimeZone) || "local").trim();
    if (!raw || raw.toLowerCase() === "local" || raw.toLowerCase() === "browser" || raw.toLowerCase() === "device") {
      return "";
    }
    return raw;
  }

  function timeFormatOptions(options) {
    const out = Object.assign({}, options || {});
    const tz = configuredTimeZone();
    if (tz) out.timeZone = tz;
    return out;
  }

  function formatMessageTimeShort(value) {
    const d = new Date(value || Date.now());
    const locale = selectedLocale();
    try {
      return d.toLocaleTimeString(locale, timeFormatOptions({hour: "2-digit", minute: "2-digit"}));
    } catch (_) {
      return d.toLocaleTimeString(undefined, {hour: "2-digit", minute: "2-digit"});
    }
  }

  function formatMessageTimeFull(value) {
    const d = new Date(value || Date.now());
    const locale = selectedLocale();
    const baseOpts = {year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit"};
    const opts = timeFormatOptions(baseOpts);
    try {
      return d.toLocaleString(locale, opts);
    } catch (_) {
      return d.toLocaleString(undefined, baseOpts);
    }
  }

  function formatMessageTime(value) {
    return state.timeDisplayMode === "full" ? formatMessageTimeFull(value) : formatMessageTimeShort(value);
  }

  function timeToggleTitle(value) {
    return state.timeDisplayMode === "full" ? formatMessageTimeShort(value) : formatMessageTimeFull(value);
  }

  function updateTimeElement(el) {
    if (!el) return;
    const raw = Number(el.dataset.time || 0) || Date.now();
    el.textContent = formatMessageTime(raw);
    el.title = timeToggleTitle(raw);
    el.setAttribute("aria-label", el.title);
    el.dataset.timeMode = state.timeDisplayMode;
  }

  function applyTimeDisplayMode() {
    document.querySelectorAll(".bmwc-time[data-time]").forEach(updateTimeElement);
  }

  function toggleTimeDisplayMode() {
    state.timeDisplayMode = state.timeDisplayMode === "full" ? "short" : "full";
    localStorage.setItem("bmwc.timeDisplayMode", state.timeDisplayMode);
    applyTimeDisplayMode();
  }

  function installTimeDisplayDelegation() {
    if (document.__bmwcTimeDisplayDelegationInstalled) return;
    document.__bmwcTimeDisplayDelegationInstalled = true;

    const timeTarget = event => {
      const target = event.target && event.target.closest
        ? event.target.closest(".bmwc-time[data-time]")
        : null;
      if (!target) return null;
      const root = document.getElementById("bmwc-root");
      return !root || root.contains(target) ? target : null;
    };

    document.addEventListener("click", event => {
      const target = timeTarget(event);
      if (!target) return;
      event.preventDefault();
      event.stopPropagation();
      toggleTimeDisplayMode();
    }, true);

    document.addEventListener("keydown", event => {
      if (event.key !== "Enter" && event.key !== " ") return;
      const target = timeTarget(event);
      if (!target) return;
      event.preventDefault();
      event.stopPropagation();
      toggleTimeDisplayMode();
    }, true);
  }

  function installTimeToggle(root) {
    if (!root) return;
    installTimeDisplayDelegation();
    root.querySelectorAll(".bmwc-time[data-time]").forEach(updateTimeElement);
  }

  async function setUserLanguage(value) {
    const lang = String(value || "").trim();
    state.selectedLanguage = lang;
    if (lang) localStorage.setItem("bmwc.language", lang);
    else localStorage.removeItem("bmwc.language");
    await loadLang();
    refreshStaticLabels();
    refreshRenderedMessagesForLocale();
    if (state.prefsModalOpen) {
      openUserPreferencesModal(true);
    }
    scheduleVirtualRender({preserveScroll: true, stickToBottom: false, allowDuringMedia: true, deferDuringScroll: false, deferDuringMediaLayout: false});
  }

  async function resetUserLanguage() {
    state.selectedLanguage = "";
    localStorage.removeItem("bmwc.language");
    await loadLang();
    refreshStaticLabels();
    refreshRenderedMessagesForLocale();
    if (state.prefsModalOpen) {
      openUserPreferencesModal(true);
    }
    scheduleVirtualRender({preserveScroll: true, stickToBottom: false, allowDuringMedia: true, deferDuringScroll: false, deferDuringMediaLayout: false});
  }



  function postFrame(type, payload = {}) {
    try {
      window.parent.postMessage(Object.assign({source: "BlueMapWebChat", type}, payload), "*");
    } catch (_) {}
  }

  function clampNumber(value, min, max, fallback) {
    value = Number(value);
    if (!Number.isFinite(value)) value = fallback;
    if (Number.isFinite(min)) value = Math.max(min, value);
    if (Number.isFinite(max) && max > 0) value = Math.min(max, value);
    return Math.round(value);
  }

  function resizeBounds() {
    const c = state.config || {};
    const minW = Math.max(240, Number(c.uiMinWidth) || 280);
    const minH = Math.max(180, Number(c.uiMinHeight) || 240);
    const rawMaxW = Number(c.uiMaxWidth);
    const rawMaxH = Number(c.uiMaxHeight);
    const maxW = Number.isFinite(rawMaxW) && rawMaxW > 0 ? Math.max(minW, rawMaxW) : Infinity;
    const maxH = Number.isFinite(rawMaxH) && rawMaxH > 0 ? Math.max(minH, rawMaxH) : Infinity;
    return {minW, minH, maxW, maxH};
  }

  function sanitizeSavedWindowSize(width, height) {
    if (!Number.isFinite(width) || !Number.isFinite(height)) return null;
    if (width < 120 || height < 120) return null;
    return {width, height};
  }

  function applyWindowSizeConfig() {
    const c = state.config || {};
    const b = resizeBounds();
    let width = Number(c.uiDefaultWidth) || 372;
    let height = Number(c.uiDefaultHeight) || 462;

    if (c.uiRememberWindowSize !== false) {
      const savedW = Number(localStorage.getItem("bmwc.windowWidth"));
      const savedH = Number(localStorage.getItem("bmwc.windowHeight"));
      const saved = sanitizeSavedWindowSize(savedW, savedH);
      if (saved) {
        width = saved.width;
        height = saved.height;
      }
    }

    state.frameNormalWidth = clampNumber(width, b.minW, b.maxW, 372);
    state.frameNormalHeight = clampNumber(height, b.minH, b.maxH, 462);
  }

  function saveWindowSize() {
    const c = state.config || {};
    if (c.uiRememberWindowSize === false) return;
    localStorage.setItem("bmwc.windowWidth", String(state.frameNormalWidth));
    localStorage.setItem("bmwc.windowHeight", String(state.frameNormalHeight));
  }

  function updateFrameSize() {
    if (state.isPip) {
      const title = document.querySelector(".bmwc-title");
      if (title) title.textContent = t("title.full", "BlueMap Chat");
      return;
    }
    const title = document.querySelector(".bmwc-title");
    if (title) title.textContent = state.minimized ? t("title.minimized", "Chat") : t("title.full", "BlueMap Chat");
    const loginOnly = guestChatHidden() && !state.minimized;
    postFrame("resize", {
      minimized: state.minimized,
      height: state.minimized ? state.frameMinimizedHeight : state.frameNormalHeight,
      width: state.minimized ? 124 : state.frameNormalWidth,
      resizable: !!(state.config && state.config.uiResizable),
      minW: state.config ? state.config.uiMinWidth : 280,
      minH: state.config ? state.config.uiMinHeight : 240,
      maxW: state.config ? state.config.uiMaxWidth : 640,
      maxH: state.config ? state.config.uiMaxHeight : 720
    });
  }


  function installMapPointerRelayBridge() {
    if (window.__bmwcMapPointerRelayBridgeInstalled) return;
    window.__bmwcMapPointerRelayBridgeInstalled = true;

    const relay = (eventName, event) => {
      try {
        const frame = window.frameElement;
        const fr = frame && frame.getBoundingClientRect ? frame.getBoundingClientRect() : {left: 0, top: 0};
        postFrame("mapPointerRelay", {
          eventName,
          clientX: Number(fr.left || 0) + Number(event.clientX || 0),
          clientY: Number(fr.top || 0) + Number(event.clientY || 0),
          screenX: Number(event.screenX || 0),
          screenY: Number(event.screenY || 0),
          button: Number.isFinite(Number(event.button)) ? Number(event.button) : 0,
          buttons: Number.isFinite(Number(event.buttons)) ? Number(event.buttons) : 0,
          pointerId: event.pointerId,
          pointerType: event.pointerType || "mouse",
          isPrimary: event.isPrimary !== false,
          ctrlKey: !!event.ctrlKey,
          shiftKey: !!event.shiftKey,
          altKey: !!event.altKey,
          metaKey: !!event.metaKey
        });
      } catch (_) {}
    };

    if (window.PointerEvent) {
      document.addEventListener("pointermove", event => {
        if ((Number(event.buttons) & 1) === 1) relay("pointermove", event);
      }, {capture: true, passive: true});
      document.addEventListener("pointerup", event => relay("pointerup", event), {capture: true, passive: true});
      document.addEventListener("pointercancel", event => relay("pointercancel", event), {capture: true, passive: true});
    }

    document.addEventListener("mousemove", event => {
      if ((Number(event.buttons) & 1) === 1) relay("mousemove", event);
    }, {capture: true, passive: true});
    document.addEventListener("mouseup", event => relay("mouseup", event), {capture: true, passive: true});
  }

  function installParentResizeBridge() {
    window.addEventListener("message", event => {
      const data = event.data || {};
      if (!data || data.source !== "BlueMapWebChatParent") return;
      if (data.type === "parentResized") {
        const b = resizeBounds();
        state.frameNormalWidth = clampNumber(data.width, b.minW, b.maxW, state.frameNormalWidth);
        state.frameNormalHeight = clampNumber(data.height, b.minH, b.maxH, state.frameNormalHeight);
        // Do not write localStorage on every resize frame; the parent frame already
        // persists the final size at resize end.
      } else if (data.type === "userPreferencesSet") {
        const persist = data.final !== false;
        if (data.key === "opacity") setUserOpacity(data.value, persist);
        else if (data.key === "fontSize") setUserFontSize(data.value, persist);
        else if (data.key === "fontFamily") setUserFontFamily(data.value);
        else if (data.key === "textColor") setUserTextColor(data.value);
        else if (data.key === "uiTextColor") setUserUiTextColor(data.value);
        else if (data.key === "textShadowMode") setUserTextShadowMode(data.value);
        else if (data.key === "textShadowCustom") setUserTextShadowCustom(data.value);
        else if (data.key === "backgroundColor") setUserBackgroundColor(data.value);
        else if (data.key === "inputBackgroundColor") setUserInputBackgroundColor(data.value);
        else if (data.key === "language") setUserLanguage(data.value);
        else if (data.key === "theme") setUserTheme(data.value);
      } else if (data.type === "userPreferencesReset") {
        resetUserOpacity();
        resetUserFontSize();
        resetUserFontFamily();
        resetUserTextColor();
        resetUserUiTextColor();
        resetUserTextShadowMode();
        resetUserTextShadowCustom();
        resetUserBackgroundColor();
        resetUserInputBackgroundColor();
        resetUserLanguage();
      } else if (data.type === "userPreferencesClosed") {
        state.prefsModalOpen = false;
      } else if (data.type === "pipOpened") {
        // The original chat window should behave exactly as if the user pressed
        // the minimize button once a duplicate PIP window has actually opened.
        // This applies to both BlueMap addon and standalone pages.
        protectHistoryEndNotice("pip-opened", 7000);
        if (!state.isPip && !state.minimized) toggleMin();
        state.forceHistoryEndNoticeUntil = Math.max(Number(state.forceHistoryEndNoticeUntil || 0), Date.now() + 7000);
        scheduleScrollAffordanceRefresh("pip-opened");
      } else if (data.type === "pipClosed") {
        // When the PIP window is closed, restore the original chat window just
        // like pressing the minimized + button. This keeps BlueMap addon and
        // standalone behavior consistent with common PIP workflows.
        protectHistoryEndNotice("pip-closed", 8000);
        if (!state.isPip && state.minimized) toggleMin();
        state.forceHistoryEndNoticeUntil = Math.max(Number(state.forceHistoryEndNoticeUntil || 0), Date.now() + 8000);
        scheduleScrollAffordanceRefresh("pip-closed");
      }
    });
  }

  function installFrameFocusBridge() {
    window.addEventListener("focus", () => postFrame("active", {active: true}), true);
    window.addEventListener("blur", () => postFrame("active", {active: false}), true);
    document.addEventListener("focusin", () => postFrame("active", {active: true}), true);
    document.addEventListener("focusout", () => {
      setTimeout(() => {
        const active = document.activeElement && document.activeElement !== document.body;
        postFrame("active", {active: !!active});
      }, 0);
    }, true);
  }

  function installDrag(root) {
    if (state.isPip) return;
    const header = root.querySelector(".bmwc-header");
    if (!header) return;

    let active = false;
    let lastX = 0;
    let lastY = 0;
    const pointFromEvent = event => {
      const src = event.touches && event.touches.length ? event.touches[0] :
                  event.changedTouches && event.changedTouches.length ? event.changedTouches[0] :
                  event;
      return {
        clientX: Number(src.clientX) || 0,
        clientY: Number(src.clientY) || 0,
        screenX: Number(src.screenX) || Number(src.clientX) || 0,
        screenY: Number(src.screenY) || Number(src.clientY) || 0
      };
    };

    const begin = event => {
      const target = event.target;
      if (target && target.closest && target.closest("button, input, select, textarea")) return;

      const p = pointFromEvent(event);
      active = true;
      state.dragStart = {x: p.clientX, y: p.clientY};
      lastX = p.clientX;
      lastY = p.clientY;

      postFrame("dragStart", {screenX: p.screenX, screenY: p.screenY});
      event.preventDefault();
      event.stopPropagation();
    };

    const move = event => {
      if (!active || !state.dragStart) return;

      const p = pointFromEvent(event);
      const dx = p.clientX - lastX;
      const dy = p.clientY - lastY;
      lastX = p.clientX;
      lastY = p.clientY;

      postFrame("dragMove", {dx, dy, screenX: p.screenX, screenY: p.screenY});
      event.preventDefault();
      event.stopPropagation();
    };

    const endDrag = event => {
      if (!active) return;
      active = false;
      state.dragStart = null;
      postFrame("dragEnd", {});
      event.preventDefault();
      event.stopPropagation();
    };

    if (window.PointerEvent) {
      header.addEventListener("pointerdown", begin, {capture: true});
      document.addEventListener("pointermove", move, {capture: true});
      document.addEventListener("pointerup", endDrag, {capture: true});
      document.addEventListener("pointercancel", endDrag, {capture: true});
    } else {
      header.addEventListener("touchstart", begin, {capture: true, passive: false});
      document.addEventListener("touchmove", move, {capture: true, passive: false});
      document.addEventListener("touchend", endDrag, {capture: true, passive: false});
      document.addEventListener("touchcancel", endDrag, {capture: true, passive: false});
      header.addEventListener("mousedown", begin, {capture: true});
      document.addEventListener("mousemove", move, {capture: true});
      document.addEventListener("mouseup", endDrag, {capture: true});
    }
  }

  function randomGuestName(prefix) {
    return (prefix || "Guest-") + Math.floor(1000 + Math.random() * 9000);
  }

  function generatedGuestNameMatches(name, prefix) {
    name = String(name || "");
    prefix = String(prefix || "Guest-");
    if (!name.startsWith(prefix)) return false;
    return /^\d{4,8}$/.test(name.slice(prefix.length));
  }

  function ensureGuestNameForConfig(force = false) {
    const prefix = (state.config && state.config.guestNamePrefix) || "Guest-";
    const customDisabled = state.config && state.config.guestAllowCustomName === false;
    const stored = String(state.guestName || localStorage.getItem("bmwc.guestName") || "").trim();
    const mustRegenerate = force || !stored || (customDisabled && !generatedGuestNameMatches(stored, prefix));
    if (mustRegenerate) {
      state.guestName = randomGuestName(prefix);
      localStorage.setItem("bmwc.guestName", state.guestName);
      return state.guestName;
    }
    state.guestName = stored;
    localStorage.setItem("bmwc.guestName", state.guestName);
    return state.guestName;
  }

  function currentGuestNameForSubmit() {
    if (state.config && state.config.guestAllowCustomName === false) {
      return ensureGuestNameForConfig();
    }
    const guestInput = document.getElementById("bmwc-guest-name");
    state.guestName = (guestInput && guestInput.value.trim()) || state.guestName || ensureGuestNameForConfig();
    localStorage.setItem("bmwc.guestName", state.guestName);
    return state.guestName;
  }

  function installResize(root) {
    const handle = root.querySelector("#bmwc-resize-handle");
    if (!handle) return;

    const pointFromEvent = event => {
      const src = event.touches && event.touches.length ? event.touches[0] :
                  event.changedTouches && event.changedTouches.length ? event.changedTouches[0] :
                  event;
      return {
        clientX: Number(src.clientX) || 0,
        clientY: Number(src.clientY) || 0
      };
    };

    const begin = event => {
      if (state.minimized || !state.config || !state.config.uiResizable) return;
      if (state.resizeStart) return;

      const p = pointFromEvent(event);
      if (state.isPip) {
        const rect = root.getBoundingClientRect();
        state.resizeStart = {
          pip: true,
          x: p.clientX,
          y: p.clientY,
          width: Math.max(240, Number(window.outerWidth) || Number(window.innerWidth) || Number(rect.width) || state.frameNormalWidth),
          height: Math.max(180, Number(window.outerHeight) || Number(window.innerHeight) || Number(rect.height) || state.frameNormalHeight),
          bounds: resizeBounds()
        };
      } else {
        state.resizeStart = true;
        postFrame("resizeStart", {clientX: p.clientX, clientY: p.clientY});
      }
      event.preventDefault();
      event.stopPropagation();
    };

    const move = event => {
      if (!state.resizeStart) return;
      const p = pointFromEvent(event);
      if (state.resizeStart && state.resizeStart.pip) {
        const r = state.resizeStart;
        const b = r.bounds || resizeBounds();
        const nextW = clampNumber(r.width + (p.clientX - r.x), b.minW, b.maxW, r.width);
        const nextH = clampNumber(r.height + (p.clientY - r.y), b.minH, b.maxH, r.height);
        try {
          if (typeof window.resizeTo === "function") window.resizeTo(nextW, nextH);
        } catch (_) {}
      } else {
        postFrame("resizeMove", {clientX: p.clientX, clientY: p.clientY});
      }
      event.preventDefault();
      event.stopPropagation();
    };

    const end = event => {
      if (!state.resizeStart) return;
      const wasPip = !!(state.resizeStart && state.resizeStart.pip);
      state.resizeStart = null;
      if (!wasPip) {
        postFrame("resizeEnd", {});
        saveWindowSize();
      }
      if (event) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    if (window.PointerEvent) {
      handle.addEventListener("pointerdown", begin, {capture: true});
      document.addEventListener("pointermove", move, {capture: true});
      document.addEventListener("pointerup", end, {capture: true});
      document.addEventListener("pointercancel", end, {capture: true});
    } else {
      handle.addEventListener("mousedown", begin, {capture: true});
      handle.addEventListener("touchstart", begin, {capture: true, passive: false});
      document.addEventListener("mousemove", move, {capture: true});
      document.addEventListener("mouseup", end, {capture: true});
      document.addEventListener("touchmove", move, {capture: true, passive: false});
      document.addEventListener("touchend", end, {capture: true, passive: false});
      document.addEventListener("touchcancel", end, {capture: true, passive: false});
    }
  }


  function installModalAffordanceObserver() {
    if (state.modalAffordanceObserverInstalled) return;
    state.modalAffordanceObserverInstalled = true;
    try {
      const observer = new MutationObserver(mutations => {
        for (const m of mutations || []) {
          const nodes = [...Array.from(m.addedNodes || []), ...Array.from(m.removedNodes || [])];
          if (nodes.some(n => n && n.nodeType === 1 && n.classList && (n.classList.contains("bmwc-modal-backdrop") || n.classList.contains("bmwc-modal-wrap")))) {
            scheduleScrollAffordanceRefresh("modal-change");
            break;
          }
        }
      });
      observer.observe(document.body, {childList: true});
      state.modalAffordanceObserver = observer;
    } catch (_) {}
  }

  function makeRoot() {
    if (document.getElementById("bmwc-root")) return;
    ensureGuestNameForConfig();

    const root = document.createElement("div");
    root.id = "bmwc-root";
    root.style.setProperty("--bmwc-emoji-picker-size", emojiPickerSizePx() + "px");
    root.style.setProperty("--bmwc-emoji-panel-min-height", emojiPanelMinHeightPx() + "px");
    if (state.isPip) {
      document.documentElement.classList.add("bmwc-pip-mode");
      document.body.classList.add("bmwc-pip-mode");
      root.classList.add("bmwc-pip-mode");
    }
    root.innerHTML = `
      <div class="bmwc-panel">
        <div class="bmwc-header">
          <div>
            <span class="bmwc-title">${t("title.full", "BlueMap Chat")}</span>
            <span class="bmwc-status" id="bmwc-status">${t("status.connecting", "connecting...")}</span>
          </div>
          <div class="bmwc-actions">
            <button class="bmwc-button bmwc-hidden" id="bmwc-admin">${t("button.admin", "Admin")}</button>
            <button class="bmwc-button" id="bmwc-login">${t("button.login", "Login")}</button>
            ${state.config && state.config.uiPictureInPictureEnabled === true && !state.isPip ? `<button class="bmwc-button bmwc-pip" id="bmwc-pip" title="${t("button.pip", "PIP")}">▣</button>` : ""}
            <button class="bmwc-button" id="bmwc-min">_</button>
          </div>
        </div>
        <div class="bmwc-pinned-bar bmwc-hidden" id="bmwc-pinned-bar" data-open-pins="1">
          <button class="bmwc-pinned-open" id="bmwc-pinned-open" type="button" data-open-pins="1">
            <span class="bmwc-pinned-icon">📌</span>
            <span id="bmwc-pinned-label">${t("pinned.count", "Pinned messages: {count}").replace("{count}", "0")}</span>
          </button>
        </div>
        <div class="bmwc-messages" id="bmwc-messages">
          <div class="bmwc-virtual-spacer bmwc-virtual-top-spacer"></div>
          <div class="bmwc-history-end bmwc-hidden" id="bmwc-history-end">${t("history.end", "No more messages to display.")}</div>
          <div class="bmwc-virtual-spacer bmwc-virtual-bottom-spacer"></div>
        </div>
        <button class="bmwc-jump-latest bmwc-hidden" id="bmwc-jump-latest" type="button" title="${t("button.jumpLatest", "Jump to latest")}">
          <span class="bmwc-jump-latest-icon">↓</span>
          <span id="bmwc-jump-latest-label">${t("button.jumpLatest", "Jump to latest")}</span>
        </button>
        <div class="bmwc-emoji-resize-handle bmwc-hidden" id="bmwc-emoji-resize" title="${t("button.resizeEmojiPanel", "Drag to resize emoji picker")}" aria-label="${t("button.resizeEmojiPanel", "Drag to resize emoji picker")}"></div>
        <div class="bmwc-form">
          <div class="bmwc-row" id="bmwc-guest-row">
            <input class="bmwc-input" id="bmwc-guest-name" maxlength="16" placeholder="${t("placeholder.guestName", "Guest name")}">
          </div>
          <div class="bmwc-row bmwc-captcha" id="bmwc-captcha-row">
            <span id="bmwc-captcha-q"></span>
            <input class="bmwc-input" id="bmwc-captcha-a" maxlength="6" placeholder="${t("placeholder.captchaAnswer", "answer")}">
          </div>
          <div class="bmwc-reply-compose bmwc-hidden" id="bmwc-reply-compose">
            <button type="button" class="bmwc-reply-compose-main" id="bmwc-reply-compose-main" title="${t("reply.jump", "Jump to replied message")}">
              <span class="bmwc-reply-compose-label" id="bmwc-reply-compose-label"></span>
              <span class="bmwc-reply-compose-preview" id="bmwc-reply-compose-preview"></span>
            </button>
            <button type="button" class="bmwc-mini-action bmwc-reply-cancel" id="bmwc-reply-cancel" title="${t("button.cancel", "Cancel")}">×</button>
          </div>
          <div class="bmwc-row">
            <input class="bmwc-input" id="bmwc-message" maxlength="2048" placeholder="${t("placeholder.message", "message")}">
            <button class="bmwc-button bmwc-command bmwc-hidden" id="bmwc-command" title="${t("button.commands", "Commands")}">/</button>
            <button class="bmwc-button bmwc-emoji-button bmwc-hidden" id="bmwc-emoji" title="${t("button.emoji", "Emoji")}">☺</button>
            <button class="bmwc-button bmwc-upload bmwc-hidden" id="bmwc-upload" title="${t("button.upload", "Attach")}">&#128206;</button>
            <button class="bmwc-button bmwc-send" id="bmwc-send">${t("button.send", "Send")}</button>
            <input type="file" id="bmwc-file" class="bmwc-file-input" multiple hidden style="display:none !important;">
          </div>
          <div class="bmwc-command-panel bmwc-hidden" id="bmwc-command-panel"></div>
          <div class="bmwc-emoji-panel bmwc-hidden" id="bmwc-emoji-panel" aria-live="polite"></div>
          <div class="bmwc-upload-progress bmwc-hidden" id="bmwc-upload-progress" aria-live="polite">
            <div class="bmwc-upload-progress-head">
              <span id="bmwc-upload-progress-text">${t("upload.ready", "Ready")}</span>
              <button class="bmwc-button bmwc-upload-cancel" id="bmwc-upload-cancel" type="button">${t("button.cancel", "Cancel")}</button>
            </div>
            <div class="bmwc-upload-progress-bar"><div id="bmwc-upload-progress-fill"></div></div>
          </div>
        </div>
        <div class="bmwc-drop-overlay bmwc-hidden" id="bmwc-drop-overlay" aria-hidden="true">
          <div class="bmwc-drop-box">
            <div class="bmwc-drop-title" id="bmwc-drop-title">${t("upload.dropTitle", "Drop files to upload")}</div>
            <div class="bmwc-drop-subtitle" id="bmwc-drop-subtitle">${t("upload.dropSubtitle", "Release inside the chat panel.")}</div>
          </div>
        </div>
        <div class="bmwc-resize-handle" id="bmwc-resize-handle" title="${t("button.resize", "Resize")}"></div>
      </div>
    `;
    document.body.appendChild(root);
    installModalAffordanceObserver();
    installMessageActionDelegation(root);
    applyWebFontsConfig();
    applyFontSizeConfig();
    applyMediaViewportConfig();
    applyThemeConfig();


    document.getElementById("bmwc-guest-name").value = state.guestName;
    document.getElementById("bmwc-send").addEventListener("click", e => {
      if (state.sendInFlight) {
        e.preventDefault();
        return;
      }
      sendMessage();
    });
    const jumpLatest = document.getElementById("bmwc-jump-latest");
    if (jumpLatest) jumpLatest.addEventListener("click", () => {
      forceLatestChatView("jump-latest");
    });
    const commandBtn = document.getElementById("bmwc-command");
    if (commandBtn) commandBtn.addEventListener("click", () => openCommandModal());
    const emojiBtn = document.getElementById("bmwc-emoji");
    if (emojiBtn) emojiBtn.addEventListener("click", () => toggleEmojiPanel());
    installEmojiPanelResize(root);
    document.getElementById("bmwc-upload").addEventListener("click", () => {
      const input = document.getElementById("bmwc-file");
      if (input) input.click();
    });
    document.getElementById("bmwc-file").addEventListener("change", uploadSelectedFiles);
    installDragAndDropUpload(root);
    const uploadCancelBtn = document.getElementById("bmwc-upload-cancel");
    if (uploadCancelBtn) uploadCancelBtn.addEventListener("click", cancelCurrentUpload);
    document.getElementById("bmwc-message").addEventListener("paste", handlePasteUpload);
    const replyCancel = document.getElementById("bmwc-reply-cancel");
    if (replyCancel) replyCancel.addEventListener("click", clearReplyTarget);
    const replyComposeMain = document.getElementById("bmwc-reply-compose-main");
    if (replyComposeMain) replyComposeMain.addEventListener("click", () => {
      if (state.replyTarget && state.replyTarget.id) jumpToReplyTarget(state.replyTarget.id);
    });
    renderReplyCompose();
    const messageInput = document.getElementById("bmwc-message");
    messageInput.addEventListener("keydown", e => {
      if (e.key === "Enter") {
        e.preventDefault();
        if (e.repeat || state.sendInFlight) return;
        sendMessage();
      }
      if (e.key === "Escape") { hideCommandPanel(); hideEmojiPanel(); if (state.replyTarget) clearReplyTarget(); }
    });
    messageInput.addEventListener("input", updateCommandPanel);
    messageInput.addEventListener("focus", updateCommandPanel);
    messageInput.addEventListener("blur", () => setTimeout(hideCommandPanel, 160));
    installHistoryPaging();
    document.getElementById("bmwc-login").addEventListener("click", () => {
      if (!state.minimized) openLoginModal();
    });
    document.getElementById("bmwc-admin").addEventListener("click", () => {
      if (!state.minimized) openAdminModal();
    });
    const pipBtn = document.getElementById("bmwc-pip");
    if (pipBtn) pipBtn.addEventListener("click", () => {
      const c = state.config || {};
      if (c.uiPictureInPictureEnabled !== true || state.isPip) {
        updatePipButton();
        return;
      }
      postFrame("togglePip", {
        pipEnabled: true,
        labels: {
          unsupported: t("pip.unsupported", "Document Picture-in-Picture is not supported by this browser. Try desktop Chrome or Edge."),
          openFailed: t("pip.openFailed", "Failed to open Picture-in-Picture window: {error}")
        }
      });
    });
    updatePipButton();
    document.getElementById("bmwc-min").addEventListener("click", toggleMin);
    installDrag(root);
    installResize(root);

    if (!state.isPip && state.minimized) {
      root.classList.add("bmwc-minimized");
      document.getElementById("bmwc-messages").classList.add("bmwc-hidden");
      document.querySelector(".bmwc-form").classList.add("bmwc-hidden");
    }
    const minBtn = document.getElementById("bmwc-min");
    if (minBtn) minBtn.textContent = state.minimized ? "+" : "-";
    const title = document.querySelector(".bmwc-title");
    if (title) title.textContent = state.minimized ? t("title.minimized", "Chat") : t("title.full", "BlueMap Chat");

    updateLoginState();
  }

  function closeAllModals() {
    document.querySelectorAll(".bmwc-modal-backdrop, .bmwc-modal-wrap").forEach(el => el.remove());
    state.loginModalOpen = false;
    state.prefsModalOpen = false;
  }

  function toggleMin() {
    protectHistoryEndNotice("toggle-min", 7000);
    state.minimized = !state.minimized;
    localStorage.setItem("bmwc.minimized", state.minimized ? "1" : "0");

    if (state.minimized) {
      closeAllModals();
    }

    const root = document.getElementById("bmwc-root");
    if (root) root.classList.toggle("bmwc-minimized", state.minimized);
    const messages = document.getElementById("bmwc-messages");
    if (messages) messages.classList.toggle("bmwc-hidden", state.minimized);
    const form = document.querySelector(".bmwc-form");
    if (form) form.classList.toggle("bmwc-hidden", state.minimized);
    updateEmojiResizeHandleVisibility();
    const minBtn = document.getElementById("bmwc-min");
    if (minBtn) minBtn.textContent = state.minimized ? "+" : "-";
    const title = document.querySelector(".bmwc-title");
    if (title) title.textContent = state.minimized ? t("title.minimized", "Chat") : t("title.full", "BlueMap Chat");
    updateFrameSize();
    updatePipButton();
    if (!state.minimized) {
      scheduleVirtualRender();
      protectHistoryEndNotice("unminimize", 8000);
      state.forceHistoryEndNoticeUntil = Math.max(Number(state.forceHistoryEndNoticeUntil || 0), Date.now() + 8000);
      scheduleScrollAffordanceRefresh("unminimize");
    }
  }


  function guestChatHidden() {
    return !!(
      state.config &&
      state.config.guestEnabled === false &&
      state.config.hideChatForGuestsWhenGuestDisabled &&
      !state.token
    );
  }

  function updateGuestVisibility() {
    const root = document.getElementById("bmwc-root");
    const box = document.getElementById("bmwc-messages");
    const form = document.querySelector(".bmwc-form");
    const guestRow = document.getElementById("bmwc-guest-row");
    const captchaRow = document.getElementById("bmwc-captcha-row");
    if (!root) return;

    const hidden = guestChatHidden();
    root.classList.toggle("bmwc-guest-hidden", hidden);

    if (hidden) {
      if (box) box.classList.add("bmwc-hidden");
      if (form) form.classList.add("bmwc-hidden");
      if (guestRow) guestRow.classList.add("bmwc-hidden");
      if (captchaRow) captchaRow.classList.remove("bmwc-show");
      state.captcha = null;
      updateEmojiResizeHandleVisibility();
      updateFrameSize();
      return;
    }

    if (!state.minimized) {
      if (box) box.classList.remove("bmwc-hidden");
      if (form) form.classList.remove("bmwc-hidden");
    }
    updateEmojiResizeHandleVisibility();
  }

  function roleLabel(role) {
    const key = String(role || "").toLowerCase();
    if (key === "moderator") return t("role.moderator.short", "MOD");
    if (key === "admin") return t("role.admin.short", "ADMIN");
    if (key === "user") return t("role.user.short", "USER");
    if (key === "guest") return t("role.guest.short", "GUEST");
    return role || t("status.loggedIn", "logged in");
  }

  function refreshStaticLabels() {
    const title = document.querySelector(".bmwc-title");
    if (title) title.textContent = state.minimized ? t("title.minimized", "Chat") : t("title.full", "BlueMap Chat");
    const adminBtn = document.getElementById("bmwc-admin");
    if (adminBtn) adminBtn.textContent = t("button.admin", "Admin");
    const sendBtn = document.getElementById("bmwc-send");
    if (sendBtn) sendBtn.textContent = t("button.send", "Send");
    const uploadBtn = document.getElementById("bmwc-upload");
    if (uploadBtn) uploadBtn.title = t("button.upload", "Attach");
    const emojiBtn = document.getElementById("bmwc-emoji");
    if (emojiBtn) emojiBtn.title = t("button.emoji", "Emoji");
    const commandBtn = document.getElementById("bmwc-command");
    if (commandBtn) commandBtn.title = t("button.commands", "Commands");
    const jumpBtn = document.getElementById("bmwc-jump-latest");
    if (jumpBtn) jumpBtn.title = t("button.jumpLatest", "Jump to latest");
    const jumpLabel = document.getElementById("bmwc-jump-latest-label");
    if (jumpLabel) jumpLabel.textContent = t("button.jumpLatest", "Jump to latest");
    const historyEnd = ensureHistoryEndNotice(document.getElementById("bmwc-messages"));
    if (historyEnd) historyEnd.textContent = t("history.end", "No more messages to display.");
    const pipBtn = document.getElementById("bmwc-pip");
    if (pipBtn) pipBtn.title = t("button.pip", "PIP");
    const guest = document.getElementById("bmwc-guest-name");
    if (guest) guest.placeholder = t("placeholder.guestName", "Guest name");
    const captcha = document.getElementById("bmwc-captcha-a");
    if (captcha) captcha.placeholder = t("placeholder.captchaAnswer", "answer");
    const input = document.getElementById("bmwc-message");
    if (input) input.placeholder = t("placeholder.message", "message");
    const resize = document.getElementById("bmwc-resize-handle");
    if (resize) resize.title = t("button.resize", "Resize");
    const dropTitle = document.getElementById("bmwc-drop-title");
    if (dropTitle) dropTitle.textContent = t("upload.dropTitle", "Drop files to upload");
    const dropSubtitle = document.getElementById("bmwc-drop-subtitle");
    if (dropSubtitle) dropSubtitle.textContent = t("upload.dropSubtitle", "Release inside the chat panel.");
    renderPinnedBar();
    updateLoginState();
  }

  function updateLoginState() {
    const btn = document.getElementById("bmwc-login");
    const status = document.getElementById("bmwc-status");
    const guestRow = document.getElementById("bmwc-guest-row");
    const adminBtn = document.getElementById("bmwc-admin");
    const uploadBtn = document.getElementById("bmwc-upload");
    const emojiBtn = document.getElementById("bmwc-emoji");
    const commandBtn = document.getElementById("bmwc-command");
    if (!btn || !status) return;
    status.classList.remove("bmwc-status-role-ADMIN", "bmwc-status-role-MODERATOR", "bmwc-status-role-USER", "bmwc-status-role-GUEST");

    const adminPanelAllowed = !state.config || state.config.allowWebAdminPanel !== false;
    const moderationEnabled = !state.config || state.config.moderationEnabled !== false;
    const canManageMutes = moderationEnabled && state.token && (state.role === "ADMIN" || (state.role === "MODERATOR" && (!state.config || state.config.allowModeratorGuestMute !== false)));
    const canUseAdminPanel = state.token && adminPanelAllowed && (state.role === "ADMIN" || canManageMutes);
    if (adminBtn) adminBtn.classList.toggle("bmwc-hidden", !canUseAdminPanel);
    if (uploadBtn) uploadBtn.classList.toggle("bmwc-hidden", !canUpload());
    updateEmojiButton();
    updateCommandButton();
    updatePipButton();

    btn.classList.remove("bmwc-login-user", "bmwc-user-role-ADMIN", "bmwc-user-role-MODERATOR", "bmwc-user-role-USER", "bmwc-user-role-GUEST");
    if (state.token) {
      btn.textContent = state.username || t("status.loggedIn", "User");
      btn.title = t("preferences.title", "Chat settings");
      btn.classList.add("bmwc-login-user", "bmwc-user-role-" + String(state.role || "USER"));
      status.textContent = roleLabel(state.role);
      status.title = state.role || "";
      status.classList.add("bmwc-status-role-" + String(state.role || "USER"));
      if (guestRow) guestRow.classList.add("bmwc-hidden");
    } else {
      btn.title = t("button.login", "Login");
      btn.textContent = t("button.login", "Login");
      status.textContent = t("status.guest", "guest");
      const allowGuestName = !state.config || state.config.guestAllowCustomName !== false;
      if (guestRow) guestRow.classList.toggle("bmwc-hidden", !allowGuestName || guestChatHidden());
    }
    if (state.messages && state.messages.length) scheduleVirtualRender();
  }


  function virtualScrollEnabled() {
    const c = state.config || {};
    return c.uiVirtualScrollEnabled !== false;
  }

  function virtualOverscanScreens() {
    const n = Number(state.config && state.config.uiVirtualScrollOverscanScreens);
    return Number.isFinite(n) && n >= 0 ? n : 1;
  }

  function virtualMinRenderedMessages() {
    const n = Number(state.config && state.config.uiVirtualScrollMinRenderedMessages);
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 20;
  }

  function virtualRenderTargetMessageCount(viewport, overscanPx) {
    const base = virtualMinRenderedMessages();
    const avg = Math.max(24, Math.min(120, Number(state.virtualAverageMessageHeight) || 42));
    const px = Math.max(1, Number(viewport) || 1) + Math.max(0, Number(overscanPx) || 0) * 2;
    const byViewport = Math.ceil(px / avg) + 4;
    return Math.max(base, byViewport);
  }

  function scheduleHistoryViewportFill(reason = "") {
    clearTimeout(state.historyViewportFillTimer);
    state.historyViewportFillTimer = setTimeout(() => {
      state.historyViewportFillTimer = null;
      const box = document.getElementById("bmwc-messages");
      if (!box || state.minimized || guestChatHidden()) return;
      if (!state.historyHasMore || state.historyLoading || !state.historyOldestId) return;
      if (!bottomFollowAllowed(box)) return;
      if (isScrollInteractionActive()) {
        scheduleHistoryViewportFill(reason || "scroll-idle");
        return;
      }

      // If the first history page is shorter than a large chat window, there is
      // no scrollbar, so the usual top-scroll preload can never fire. Pull older
      // pages until the viewport is filled or there is no more history.
      if (box.scrollHeight <= box.clientHeight + 4 && Number(state.historyViewportFillAttempts || 0) < 8) {
        state.historyViewportFillAttempts = Number(state.historyViewportFillAttempts || 0) + 1;
        loadHistory(true, {viewportFill: true});
      }
    }, 40);
  }

  function historyEndEligible() {
    return !state.historyLoading && !state.historyHasMore && state.messages.length > 0;
  }

  function historyLatestEndEligible() {
    return !state.historyLoading && !state.historyHasAfter && state.messages.length > 0;
  }

  function protectHistoryEndNotice(reason = "", ms = 0) {
    // The oldest-history notice is a user-scroll toast, not a persistent state
    // banner. Modal/focus/resize/PIP/delete transitions may refresh layout, but
    // they must not force the notice to appear or keep it latched.
    state.historyEndNoticeProtectedUntil = 0;
    state.historyEndNoticeUiTransitionUntil = 0;
    state.forceHistoryEndNoticeUntil = 0;
  }


  function updateScrollAffordanceLayout(box) {
    if (!box) box = document.getElementById("bmwc-messages");
    const root = document.getElementById("bmwc-root");
    const panel = root && root.querySelector ? root.querySelector(".bmwc-panel") : null;
    if (!box || !root || !panel) return;
    try {
      const br = box.getBoundingClientRect();
      const pr = panel.getBoundingClientRect();
      const top = Math.max(8, Math.round(br.top - pr.top + 8));
      const bottom = Math.max(8, Math.round(pr.bottom - br.bottom + 12));
      root.style.setProperty("--bmwc-affordance-top", top + "px");
      root.style.setProperty("--bmwc-affordance-bottom", bottom + "px");
    } catch (_) {}
  }

  function setHistoryNoticeText(notice, key = "history.end", fallback = "No more messages to display.") {
    state.historyEndNoticeKey = key || "history.end";
    state.historyEndNoticeFallback = fallback || "";
    if (notice) notice.textContent = t(state.historyEndNoticeKey, state.historyEndNoticeFallback);
  }

  function resetHistoryNoticeText(notice = null) {
    setHistoryNoticeText(notice || document.getElementById("bmwc-history-end"), "history.end", "No more messages to display.");
  }

  function ensureHistoryEndNotice(box, key = null, fallback = null, position = null) {
    if (!box) box = document.getElementById("bmwc-messages");
    const root = document.getElementById("bmwc-root");
    const panel = root && root.querySelector ? root.querySelector(".bmwc-panel") : null;
    if (!box || !panel) return null;
    let notice = document.getElementById("bmwc-history-end");
    if (!notice) {
      notice = document.createElement("div");
      notice.className = "bmwc-history-end bmwc-history-end-top bmwc-hidden";
      notice.id = "bmwc-history-end";
    }
    if (key) {
      setHistoryNoticeText(notice, key, fallback || key);
    } else {
      setHistoryNoticeText(notice, state.historyEndNoticeKey || "history.end", state.historyEndNoticeFallback || "No more messages to display.");
    }

    const pos = position || state.historyEndNoticePosition || "top";
    state.historyEndNoticePosition = pos === "bottom" ? "bottom" : "top";
    notice.classList.toggle("bmwc-history-end-bottom", state.historyEndNoticePosition === "bottom");
    notice.classList.toggle("bmwc-history-end-top", state.historyEndNoticePosition !== "bottom");

    // Keep this as a panel-level overlay, not as a child of the virtualized
    // message list.  When the notice lived inside .bmwc-messages it competed
    // with top/bottom spacers and virtual re-renders, so modal/PIP transitions
    // and scrolling could repeatedly hide/reinsert it.
    if (notice.parentNode !== panel) {
      panel.appendChild(notice);
    }
    updateScrollAffordanceLayout(box);
    return notice;
  }

  function historyEndNoticeThresholdPx(box) {
    // Tight physical-top check.  This is deliberately much smaller than the
    // preload threshold so the toast cannot appear while older messages remain
    // just above the viewport.
    return Math.max(2, Math.min(8, Math.floor(Number(box && box.clientHeight || 0) * 0.01)));
  }

  function historyEndNoticeAtTop(box) {
    return !!box && Number(box.scrollTop || 0) <= historyEndNoticeThresholdPx(box);
  }

  function historyEndNoticeAtBottom(box) {
    return !!box && bottomGapPx(box) <= historyEndNoticeThresholdPx(box);
  }

  function hideHistoryEndNoticeToast(clearPending = false) {
    if (state.historyEndNoticeTimer) {
      clearTimeout(state.historyEndNoticeTimer);
      state.historyEndNoticeTimer = null;
    }
    state.historyEndNoticeVisibleUntil = 0;
    state.historyEndNoticeVisible = false;
    state.historyEndNoticeSticky = false;
    state.historyEndNoticeStickySince = 0;
    state.historyEndNoticeProtectedUntil = 0;
    state.historyEndNoticeUiTransitionUntil = 0;
    state.forceHistoryEndNoticeUntil = 0;
    if (clearPending) {
      state.historyEndNoticePendingUserTopUntil = 0;
      state.historyEndNoticePendingUserBottomUntil = 0;
      state.historyEndNoticeBottomExtraScrollCount = 0;
    }
    const notice = document.getElementById("bmwc-history-end");
    if (notice) {
      notice.classList.add("bmwc-hidden");
      notice.classList.remove("bmwc-history-end-bottom");
      notice.classList.add("bmwc-history-end-top");
    }
    resetHistoryNoticeText(notice);
  }

  function showHistoryStatusNoticeToast(box, key, fallback, durationMs = 3500) {
    if (!box) box = document.getElementById("bmwc-messages");
    if (!box || state.minimized || guestChatHidden()) return;
    if (Number(box.scrollTop || 0) > historyPreloadThresholdPx(box)) return;

    const notice = ensureHistoryEndNotice(box, key, fallback, "top");
    if (!notice) return;
    const now = Date.now();
    if (state.historyEndNoticeTimer) clearTimeout(state.historyEndNoticeTimer);
    state.historyEndNoticeTimer = null;
    state.historyEndNoticeVisible = true;
    state.historyEndNoticeVisibleUntil = now + Math.max(800, Math.min(10000, Number(durationMs) || 3500));
    notice.classList.remove("bmwc-hidden");

    state.historyEndNoticeTimer = setTimeout(() => {
      if (Date.now() >= Number(state.historyEndNoticeVisibleUntil || 0)) {
        hideHistoryEndNoticeToast(false);
      }
    }, Math.max(850, Math.min(10050, Number(durationMs) || 3500)) + 50);
  }

  function hideHistoryStatusNoticeIfActive() {
    const key = String(state.historyEndNoticeKey || "history.end");
    if (key !== "history.end") hideHistoryEndNoticeToast(false);
  }

  function showHistoryEndNoticeToast(box, reason = "", position = "top") {
    if (!box) box = document.getElementById("bmwc-messages");
    const pos = position === "bottom" ? "bottom" : "top";
    const notice = ensureHistoryEndNotice(box, "history.end", "No more messages to display.", pos);
    if (!notice || !box) return;
    const eligible = pos === "bottom"
      ? (historyLatestEndEligible() && historyEndNoticeAtBottom(box))
      : (historyEndEligible() && historyEndNoticeAtTop(box));
    if (state.minimized || guestChatHidden() || !eligible) return;

    const now = Date.now();
    // Ignore duplicate callbacks fired in the same frame, but do not latch the
    // notice across focus changes. A new wheel/touch/key/scrollbar input at the
    // edge can show it again after the previous toast has disappeared.
    if (state.historyEndNoticeVisible && now < Number(state.historyEndNoticeVisibleUntil || 0)) return;
    if (now - Number(state.historyEndNoticeLastShownAt || 0) < 250) return;

    if (state.historyEndNoticeTimer) clearTimeout(state.historyEndNoticeTimer);
    state.historyEndNoticeTimer = null;
    state.historyEndNoticeVisible = true;
    state.historyEndNoticeSticky = false;
    state.historyEndNoticeStickySince = 0;
    state.historyEndNoticeVisibleUntil = now + 2500;
    state.historyEndNoticeLastShownAt = now;
    if (pos === "bottom") {
      state.historyEndNoticePendingUserBottomUntil = 0;
      state.historyEndNoticeBottomExtraScrollCount = 0;
    } else state.historyEndNoticePendingUserTopUntil = 0;
    notice.classList.remove("bmwc-hidden");

    state.historyEndNoticeTimer = setTimeout(() => {
      if (Date.now() >= Number(state.historyEndNoticeVisibleUntil || 0)) {
        hideHistoryEndNoticeToast(false);
      }
    }, 2550);
  }

  function clearHistorySlowNoticeTimer() {
    if (state.historySlowNoticeTimer) {
      clearTimeout(state.historySlowNoticeTimer);
      state.historySlowNoticeTimer = null;
    }
  }

  function scheduleHistorySlowNotice(box, loadSeq, older) {
    clearHistorySlowNoticeTimer();
    if (!older) return;
    state.historySlowNoticeTimer = setTimeout(() => {
      state.historySlowNoticeTimer = null;
      if (!state.historyLoading || loadSeq !== state.historyLoadSeq) return;
      const currentBox = document.getElementById("bmwc-messages") || box;
      showHistoryStatusNoticeToast(currentBox, "history.loading", "Loading history.\nPlease wait.", 3500);
    }, 1400);
  }

  function historyFailureNoticeKey(error) {
    if (typeof navigator !== "undefined" && navigator && navigator.onLine === false) return "history.offline";
    if (error && (error.bmwcTimeout || error.name === "AbortError")) return "history.timeout";
    return "history.failed";
  }

  function historyFailureNoticeFallback(key) {
    if (key === "history.offline") return "Offline.\nCheck connection.";
    if (key === "history.timeout") return "Slow response.\nTry again shortly.";
    return "Load failed.\nTry again shortly.";
  }

  function showHistoryFailureNotice(box, error) {
    const key = historyFailureNoticeKey(error);
    showHistoryStatusNoticeToast(box, key, historyFailureNoticeFallback(key), 4500);
  }

  function recentHistoryEndUserScrollInput(now = Date.now()) {
    const lastDirect = Number(state.lastDirectScrollInputAt || 0);
    const lastNonScrollUi = Number(state.lastNonScrollUiActionAt || 0);
    if (lastDirect <= 0) return false;
    // Any UI click/key after the scroll input cancels the user-top intent. This
    // prevents delete/admin/settings/modal/layout changes from creating a toast.
    if (lastNonScrollUi > 0 && lastNonScrollUi >= lastDirect - 20) return false;
    return now - lastDirect <= Math.max(1400, scrollInteractionIdleMs() * 4);
  }

  function rememberUserTopIntent(box) {
    if (!box || !recentHistoryEndUserScrollInput()) return;
    if (Number(box.scrollTop || 0) <= historyPreloadThresholdPx(box)) {
      state.historyEndNoticePendingUserTopUntil = Date.now() + 5000;
    }
  }

  function markHistoryEndTopUserIntent(box, reason = "") {
    if (!box || state.minimized || guestChatHidden()) return;
    // This is only called from direct user scroll inputs.  It intentionally
    // records intent while a focus/resume history refresh is in flight, then
    // loadHistory() rechecks after the response settles.
    const nearTop = Number(box.scrollTop || 0) <= historyPreloadThresholdPx(box);
    if (!nearTop) return;
    state.historyEndNoticePendingUserTopUntil = Date.now() + 6000;
    setTimeout(() => maybeShowHistoryEndNoticeFromUserScroll(box, reason || "top-user-input"), 0);
    setTimeout(() => maybeShowHistoryEndNoticeFromUserScroll(box, reason || "top-user-input"), 80);
    setTimeout(() => maybeShowHistoryEndNoticeFromUserScroll(box, reason || "top-user-input"), 220);
  }

  function resetHistoryEndBottomExtraScrollCount() {
    state.historyEndNoticeBottomExtraScrollCount = 0;
  }

  function bottomEndNoticeExtraScrollAttemptReason(reason) {
    return /^(wheel|key|touch)-bottom$/.test(String(reason || ""));
  }

  function bottomEndNoticeExtraScrollCountReached() {
    return Number(state.historyEndNoticeBottomExtraScrollCount || 0) >= 10;
  }

  function markHistoryEndBottomUserIntent(box, reason = "") {
    if (!box || state.minimized || guestChatHidden()) return;
    const nearBottom = bottomGapPx(box) <= historyPreloadThresholdPx(box);
    if (!nearBottom) {
      resetHistoryEndBottomExtraScrollCount();
      return;
    }
    if (bottomEndNoticeExtraScrollAttemptReason(reason)) {
      state.historyEndNoticeBottomExtraScrollCount = Math.max(0, Number(state.historyEndNoticeBottomExtraScrollCount || 0)) + 1;
    }
    state.historyEndNoticePendingUserBottomUntil = Date.now() + 6000;
    setTimeout(() => maybeShowHistoryEndNoticeFromUserScroll(box, reason || "bottom-user-input"), 0);
    setTimeout(() => maybeShowHistoryEndNoticeFromUserScroll(box, reason || "bottom-user-input"), 80);
    setTimeout(() => maybeShowHistoryEndNoticeFromUserScroll(box, reason || "bottom-user-input"), 220);
  }

  function maybeShowHistoryEndNoticeFromUserScroll(box, reason = "") {
    if (!box) box = document.getElementById("bmwc-messages");
    if (!box) return;

    const now = Date.now();
    const atTop = historyEndNoticeAtTop(box);
    const atBottom = historyEndNoticeAtBottom(box);
    if (!atBottom) resetHistoryEndBottomExtraScrollCount();
    if (!atTop && !atBottom) {
      hideHistoryEndNoticeToast(false);
      return;
    }

    const fromRecentScroll = recentHistoryEndUserScrollInput(now);
    const fromPendingTopIntent = Number(state.historyEndNoticePendingUserTopUntil || 0) > now;
    const fromPendingBottomIntent = Number(state.historyEndNoticePendingUserBottomUntil || 0) > now;
    if (!fromRecentScroll && !fromPendingTopIntent && !fromPendingBottomIntent) return;

    if (state.minimized || guestChatHidden()) return;

    if (atTop && (fromRecentScroll || fromPendingTopIntent)) {
      if (!historyEndEligible()) {
        // While history is still loading or hasMore is still true, keep only the
        // user intent. The load completion path will call this again and show the
        // toast only if the final response proves there is no older history.
        if (fromRecentScroll) state.historyEndNoticePendingUserTopUntil = now + 5000;
      } else {
        showHistoryEndNoticeToast(box, reason, "top");
        return;
      }
    }

    if (atBottom && (fromRecentScroll || fromPendingBottomIntent)) {
      if (!historyLatestEndEligible()) {
        // If newer messages are still loading or still known to exist, keep the
        // bottom-edge intent. loadNewerHistory() will recheck after it settles.
        if (fromRecentScroll) state.historyEndNoticePendingUserBottomUntil = now + 5000;
      } else if (bottomEndNoticeExtraScrollCountReached()) {
        showHistoryEndNoticeToast(box, reason, "bottom");
      }
    }
  }
  function updateHistoryEndNotice(box) {
    if (!box) box = document.getElementById("bmwc-messages");
    const notice = ensureHistoryEndNotice(box);
    if (!notice || !box) return;
    updateScrollAffordanceLayout(box);

    const now = Date.now();
    const noticeAtExpectedEdge = state.historyEndNoticePosition === "bottom"
      ? (historyLatestEndEligible() && historyEndNoticeAtBottom(box))
      : (historyEndEligible() && historyEndNoticeAtTop(box));
    const shouldRemainVisible =
      state.historyEndNoticeVisible &&
      now < Number(state.historyEndNoticeVisibleUntil || 0) &&
      noticeAtExpectedEdge &&
      !state.minimized &&
      !guestChatHidden();

    notice.classList.toggle("bmwc-hidden", !shouldRemainVisible);
    if (!shouldRemainVisible && state.historyEndNoticeVisible) {
      state.historyEndNoticeVisible = false;
      state.historyEndNoticeVisibleUntil = 0;
    }
  }


  function scheduleScrollAffordanceRefresh(reason = "") {
    const reasonText = String(reason || "").toLowerCase();
    if (/(modal|admin|pref|setting|pip|minimize|unminimize|resize|restore|focus)/.test(reasonText)) {
      protectHistoryEndNotice(reasonText, /pip/.test(reasonText) ? 7000 : 5000);
    }
    const box = document.getElementById("bmwc-messages");
    if (box) refreshScrollAffordances(box);
    setTimeout(() => {
      const laterBox = document.getElementById("bmwc-messages");
      if (laterBox) refreshScrollAffordances(laterBox);
    }, 60);
    setTimeout(() => {
      const laterBox = document.getElementById("bmwc-messages");
      if (laterBox) refreshScrollAffordances(laterBox);
    }, 220);
  }

  function updateJumpLatestButton(box) {
    const button = document.getElementById("bmwc-jump-latest");
    if (!button || !box) return;
    updateScrollAffordanceLayout(box);
    const root = document.getElementById("bmwc-root");
    const atBottom = isAutoFollowBottom(box);
    const hasUnloadedNewer = !!state.historyHasAfter;
    const show = !!root && !state.minimized && !guestChatHidden() && state.messages.length > 0 && (!atBottom || hasUnloadedNewer);
    button.classList.toggle("bmwc-hidden", !show);
  }

  function refreshScrollAffordances(box) {
    if (!box) box = document.getElementById("bmwc-messages");
    if (!box) return;
    applyMediaViewportConfig();
    updateHistoryEndNotice(box);
    updateJumpLatestButton(box);
  }

  function applyBottomStackFiller(box, start, end, shouldStickBottom) {
    if (!box || !shouldStickBottom || start !== 0 || end !== state.messages.length) return;
    if (state.historyHasMore) return;
    const sp = ensureVirtualSpacers(box);
    if (!sp.top) return;

    // When all available messages fit inside a tall chat panel, keep them
    // visually stacked from the bottom instead of leaving a large blank area
    // below the latest message. This filler is only visual; it is not used while
    // older history still exists because that case should auto-load more pages.
    sp.top.style.height = "0px";
    const missing = Math.max(0, Math.ceil(box.clientHeight - box.scrollHeight));
    if (missing > 1) sp.top.style.height = missing + "px";
  }

  function scrollInteractionIdleMs() {
    const n = Number(state.config && state.config.uiScrollInteractionIdleMs);
    return Number.isFinite(n) && n >= 50 ? Math.max(50, Math.min(1000, Math.round(n))) : 160;
  }

  function isScrollInteractionActive() {
    return state.scrollbarDragActive || state.touchScrollActive || Date.now() < Number(state.scrollInteractionUntil || 0);
  }

  function mergeRenderOptions(base, next) {
    const merged = Object.assign({}, base || {}, next || {});
    // Later render requests must be able to cancel a previously queued
    // bottom-stick render. The previous OR-merge kept stickToBottom=true even
    // after the user scrolled away, which caused the viewport to be dragged
    // back to the bottom while the virtual range was being recalculated.
    if (next && Object.prototype.hasOwnProperty.call(next, "stickToBottom")) {
      merged.stickToBottom = !!next.stickToBottom;
    } else if (base && Object.prototype.hasOwnProperty.call(base, "stickToBottom")) {
      merged.stickToBottom = !!base.stickToBottom;
    }
    return merged;
  }

  function flushScrollInteractionWork() {
    if (isScrollInteractionActive()) {
      clearTimeout(state.scrollIdleTimer);
      state.scrollIdleTimer = setTimeout(flushScrollInteractionWork, scrollInteractionIdleMs());
      return;
    }
    const pending = state.pendingScrollRenderOptions;
    state.pendingScrollRenderOptions = null;
    if (pending) scheduleVirtualRender(Object.assign({}, pending, {deferDuringScroll: false}));
    if (state.pendingOlderHistoryLoad) {
      state.pendingOlderHistoryLoad = false;
      loadHistory(true);
    }
    if (state.pendingNewerHistoryLoad) {
      state.pendingNewerHistoryLoad = false;
      loadNewerHistory();
    }
    if (state.pendingResumeRefreshReason) {
      const reason = state.pendingResumeRefreshReason;
      state.pendingResumeRefreshReason = "";
      setTimeout(() => refreshOnResume(reason), 0);
    }
  }

  function markScrollInteraction() {
    state.scrollInteractionUntil = Date.now() + scrollInteractionIdleMs();
    clearTimeout(state.scrollIdleTimer);
    state.scrollIdleTimer = setTimeout(flushScrollInteractionWork, scrollInteractionIdleMs());
  }

  function markDirectScrollInput() {
    state.lastDirectScrollInputAt = Date.now();
    cancelReplyJumpForUserScroll("direct-scroll-input");
    markScrollInteraction();
  }

  function markNonScrollUiAction() {
    state.lastNonScrollUiActionAt = Date.now();
    state.historyEndNoticePendingUserTopUntil = 0;
    state.historyEndNoticePendingUserBottomUntil = 0;
  }

  function deferRenderUntilScrollIdle(options = {}) {
    state.pendingScrollRenderOptions = mergeRenderOptions(state.pendingScrollRenderOptions, options);
    markScrollInteraction();
  }

  function requestOlderHistoryAfterScrollIdle() {
    state.pendingOlderHistoryLoad = true;
    markScrollInteraction();
  }

  function requestNewerHistoryAfterScrollIdle() {
    state.pendingNewerHistoryLoad = true;
    markScrollInteraction();
  }

  function newerHistoryRequestCooldownMs() {
    const n = Number(state.config && state.config.uiHistoryNewerRequestCooldownMs);
    if (Number.isFinite(n) && n >= 120) return Math.max(120, Math.min(2500, Math.round(n)));
    return Math.max(300, scrollInteractionIdleMs() * 2);
  }

  function requestNewerHistoryFromBottomInput(reason = "bottom-input") {
    const box = document.getElementById("bmwc-messages");
    if (!box || state.minimized || guestChatHidden()) return;
    const atBottomEdge = isAtHistoryBottomRequestZone(box);
    if (atBottomEdge) markHistoryBottomEdgeIntent(reason);
    if (!state.historyHasAfter || !state.historyNewestId) return;
    if (!atBottomEdge && !hasHistoryBottomEdgeIntent()) return;
    if (state.historyLoading) {
      requestNewerHistoryAfterScrollIdle();
      scheduleBottomNewerHistoryRetry(reason);
      return;
    }
    const now = Date.now();
    if (now - Number(state.lastBottomNewerHistoryRequestAt || 0) < newerHistoryRequestCooldownMs()) {
      requestNewerHistoryAfterScrollIdle();
      scheduleBottomNewerHistoryRetry(reason);
      return;
    }
    state.lastBottomNewerHistoryRequestAt = now;
    loadNewerHistory({forceDuringScroll: true, reason});
  }

  function requestOlderHistoryFromTopInput(reason = "top-input") {
    const box = document.getElementById("bmwc-messages");
    if (!box || state.minimized || guestChatHidden()) return;
    const atTopEdge = isAtHistoryTopRequestZone(box);
    if (atTopEdge) markHistoryTopEdgeIntent(reason);
    if (!state.historyHasMore || !state.historyOldestId) return;
    if (!atTopEdge && !hasHistoryTopEdgeIntent()) return;

    if (topHistoryLoadBusy()) {
      scheduleTopOlderHistoryRetry(reason);
      return;
    }

    state.lastTopOlderHistoryRequestAt = Date.now();
    rememberUserTopIntent(box);

    // At the physical top of the scroll container additional wheel/touch input
    // does not always produce another scroll event, so the old preload trigger
    // could be missed until the user moved down and up again. Fetch immediately,
    // but do not let repeated wheel ticks start a chain of overlapping height
    // corrections. A short settle window keeps scrollTop preservation from
    // fighting the user's next wheel movement.
    loadHistory(true, {forceDuringScroll: true, reason});
  }

  function requestResumeRefreshAfterScrollIdle(reason) {
    state.pendingResumeRefreshReason = reason || "resume";
    markScrollInteraction();
  }

  function beginTouchScrollInteraction() {
    state.touchScrollActive = true;
    markScrollInteraction();
  }

  function endTouchScrollInteraction() {
    if (!state.touchScrollActive) return;
    state.touchScrollActive = false;
    markScrollInteraction();
  }

  function historyPreloadThresholdPx(box) {
    const c = state.config || {};
    const screens = Number(c.uiHistoryPreloadScreens);
    const safeScreens = Number.isFinite(screens) && screens >= 0 ? Math.min(5, screens) : 0.75;
    const viewport = Math.max(1, box && box.clientHeight ? box.clientHeight : 1);
    const minPx = Number(c.uiHistoryPreloadMinPx);
    const safeMinPx = Number.isFinite(minPx) && minPx >= 0 ? Math.min(1000, minPx) : 160;
    return Math.max(safeMinPx, Math.round(viewport * safeScreens));
  }

  function topHistorySettleMs() {
    const n = Number(state.config && state.config.uiHistoryTopSettleMs);
    if (Number.isFinite(n) && n >= 100) return Math.max(100, Math.min(2000, Math.round(n)));
    return Math.max(520, scrollInteractionIdleMs() * 3);
  }

  function topHistoryRequestCooldownMs() {
    const n = Number(state.config && state.config.uiHistoryTopRequestCooldownMs);
    if (Number.isFinite(n) && n >= 120) return Math.max(120, Math.min(2500, Math.round(n)));
    return Math.max(650, topHistorySettleMs());
  }

  function markOlderHistorySettling() {
    state.olderHistorySettleUntil = Date.now() + topHistorySettleMs();
  }

  function historyEdgeIntentMs() {
    const n = Number(state.config && state.config.uiHistoryEdgeIntentMs);
    if (Number.isFinite(n) && n >= 300) return Math.max(300, Math.min(5000, Math.round(n)));
    return Math.max(1200, Math.min(3200, scrollInteractionIdleMs() * 5));
  }

  function markHistoryTopEdgeIntent(reason = "") {
    state.historyTopEdgeIntentUntil = Date.now() + historyEdgeIntentMs();
  }

  function markHistoryBottomEdgeIntent(reason = "") {
    state.historyBottomEdgeIntentUntil = Date.now() + historyEdgeIntentMs();
  }

  function hasHistoryTopEdgeIntent() {
    return Date.now() < Number(state.historyTopEdgeIntentUntil || 0);
  }

  function hasHistoryBottomEdgeIntent() {
    return Date.now() < Number(state.historyBottomEdgeIntentUntil || 0);
  }

  function isAtHistoryTopRequestZone(box) {
    return !!box && Number(box.scrollTop || 0) <= historyPreloadThresholdPx(box);
  }

  function isAtHistoryBottomRequestZone(box) {
    return !!box && bottomGapPx(box) <= historyPreloadThresholdPx(box);
  }

  function topHistoryBusyTimeoutMs() {
    const n = Number(state.config && state.config.uiHistoryTopBusyTimeoutMs);
    if (Number.isFinite(n) && n >= 3000) return Math.max(3000, Math.min(30000, Math.round(n)));
    return 10000;
  }

  function topHistoryLoadBusy() {
    const now = Date.now();
    const sinceRequest = now - Number(state.lastTopOlderHistoryRequestAt || 0);

    if (state.historyLoading) {
      const since = Number(state.historyLoadingSince || 0);
      const maxBusy = topHistoryBusyTimeoutMs();
      if (since > 0 && now - since > maxBusy) {
        console.warn("[BMWC] history loading busy timeout; forcing retry unlock", {
          elapsed: now - since,
          maxBusy
        });
        state.historyLoading = false;
        state.historyLoadingSince = 0;
      } else {
        return true;
      }
    }

    const settleUntil = Number(state.olderHistorySettleUntil || 0);
    if (settleUntil > now) {
      const remaining = settleUntil - now;
      const maxBusy = topHistoryBusyTimeoutMs();
      if (remaining > maxBusy) {
        console.warn("[BMWC] older history settle timeout too large; clearing", {
          remaining,
          maxBusy
        });
        state.olderHistorySettleUntil = 0;
      } else {
        return true;
      }
    }

    return sinceRequest < topHistoryRequestCooldownMs();
  }

  function scheduleTopOlderHistoryRetry(reason = "top-retry") {
    const now = Date.now();
    const settleUntil = Number(state.olderHistorySettleUntil || 0);
    const cooldownUntil = Number(state.lastTopOlderHistoryRequestAt || 0) + topHistoryRequestCooldownMs();
    const busyUntil = Math.max(
      Number.isFinite(settleUntil) ? settleUntil : 0,
      Number.isFinite(cooldownUntil) ? cooldownUntil : 0
    );
    const delay = Math.max(120, Math.min(1200, busyUntil > now ? busyUntil - now + 40 : 220));
    const safeDelay = Number.isFinite(delay) ? delay : 220;
    const dueAt = now + safeDelay;

    // Keep one safe retry point. Most repeated wheel/touch retries are ignored,
    // but if the current settle/cooldown window moved later, reschedule to that
    // safer due time instead of firing while virtual-scroll height correction or
    // top-history request throttling is still settling.
    if (state.pendingTopOlderHistoryTimer) {
      const previousDueAt = Number(state.pendingTopOlderHistoryDueAt || 0);
      if (previousDueAt && dueAt <= previousDueAt) return;
      clearTimeout(state.pendingTopOlderHistoryTimer);
    }

    state.pendingTopOlderHistoryDueAt = dueAt;
    state.pendingTopOlderHistoryTimer = setTimeout(() => {
      state.pendingTopOlderHistoryTimer = null;
      state.pendingTopOlderHistoryDueAt = 0;
      requestOlderHistoryFromTopInput(reason + "-retry");
    }, safeDelay);
  }

  function scheduleBottomNewerHistoryRetry(reason = "bottom-retry") {
    const now = Date.now();
    const cooldownUntil = Number(state.lastBottomNewerHistoryRequestAt || 0) + newerHistoryRequestCooldownMs();
    const loadingSince = Number(state.historyLoadingSince || 0);
    const loadingUntil = state.historyLoading && loadingSince > 0 ? loadingSince + 15000 : 0;
    const busyUntil = Math.max(
      Number.isFinite(cooldownUntil) ? cooldownUntil : 0,
      Number.isFinite(loadingUntil) ? loadingUntil : 0
    );
    const delay = Math.max(120, Math.min(1200, busyUntil > now ? busyUntil - now + 40 : 220));
    const safeDelay = Number.isFinite(delay) ? delay : 220;
    const dueAt = now + safeDelay;

    if (state.pendingBottomNewerHistoryTimer) {
      const previousDueAt = Number(state.pendingBottomNewerHistoryDueAt || 0);
      if (previousDueAt && dueAt <= previousDueAt) return;
      clearTimeout(state.pendingBottomNewerHistoryTimer);
    }

    state.pendingBottomNewerHistoryDueAt = dueAt;
    state.pendingBottomNewerHistoryTimer = setTimeout(() => {
      state.pendingBottomNewerHistoryTimer = null;
      state.pendingBottomNewerHistoryDueAt = 0;
      requestNewerHistoryFromBottomInput(reason + "-retry");
    }, safeDelay);
  }

  function isNearBottom(box, tolerance = 2) {
    if (!box) return false;
    const remaining = box.scrollHeight - box.scrollTop - box.clientHeight;
    return remaining <= tolerance;
  }

  function autoFollowBottomThresholdPx(box) {
    const c = state.config || {};
    const configured = Number(c.uiAutoFollowBottomThresholdPx);
    const base = Number.isFinite(configured) ? Math.max(2, Math.min(300, configured)) : 80;
    const viewport = Math.max(1, box && box.clientHeight ? box.clientHeight : 1);
    // Do not let the near-bottom zone become too large on very small or mobile windows.
    return Math.max(2, Math.min(base, Math.round(viewport * 0.35)));
  }

  function isAutoFollowBottom(box) {
    return isNearBottom(box, autoFollowBottomThresholdPx(box));
  }

  function markExplicitLatestFollow(reason = "", ms = 4500) {
    const now = Date.now();
    state.explicitLatestFollowUntil = Math.max(Number(state.explicitLatestFollowUntil || 0), now + Math.max(500, Number(ms) || 4500));
    state.explicitLatestFollowReason = String(reason || "explicit");
    state.preventBottomStickUntil = 0;
    state.autoFollowLatest = true;
  }

  function hasExplicitLatestFollow() {
    return Date.now() <= Number(state.explicitLatestFollowUntil || 0);
  }

  function bottomFollowAllowed(box, options = {}) {
    if (!box) return false;
    const explicit = !!options.latestJump ||
      !!options.forceLatestFollow ||
      !!options.forceStickToBottom ||
      hasExplicitLatestFollow();
    if (explicit) return true;
    // If the current in-memory range is a middle slice loaded by reply jump,
    // the physical bottom is only the bottom of that slice, not the real latest
    // chat position. Do not treat it as auto-follow/latest until newer pages
    // have been loaded or the latest button explicitly reloads the tail page.
    if (state.historyHasAfter) return false;
    return isAutoFollowBottom(box);
  }


  function allowMediaLayoutAutoFollow(ms = 2500) {
    const now = Date.now();
    state.autoFollowMediaLayoutUntil = Math.max(Number(state.autoFollowMediaLayoutUntil || 0), now + Math.max(250, Number(ms) || 2500));
  }

  function shouldAutoFollowAfterMediaLayout(box, heightDelta) {
    if (!box || isScrollInteractionActive()) return false;
    if (Date.now() > Number(state.autoFollowMediaLayoutUntil || 0)) return false;

    const threshold = autoFollowBottomThresholdPx(box);
    const remainingAfter = box.scrollHeight - box.scrollTop - box.clientHeight;
    const remainingBefore = Number(heightDelta) > 0 ? remainingAfter - Number(heightDelta) : remainingAfter;
    return remainingBefore <= threshold || hasExplicitLatestFollow();
  }

  function cleanupMediaKeepAlive() {
    const now = Date.now();
    for (const [key, until] of Array.from(state.mediaKeepAliveUntil || new Map())) {
      if (!Number.isFinite(Number(until)) || Number(until) <= now) state.mediaKeepAliveUntil.delete(key);
    }
  }

  function protectMediaMessageKey(key, ms = 6000) {
    key = String(key || "");
    if (!key) return;
    cleanupMediaKeepAlive();
    const now = Date.now();
    const until = now + Math.max(500, Number(ms) || 6000);
    state.mediaKeepAliveUntil.set(key, Math.max(Number(state.mediaKeepAliveUntil.get(key) || 0), until));
  }

  function protectMediaElement(media, messageEl, ms = 6000) {
    const msgEl = messageEl || (media && media.closest && media.closest(".bmwc-msg"));
    const key = msgEl && msgEl.dataset && msgEl.dataset.virtualKey;
    if (key) protectMediaMessageKey(key, ms);
  }

  function isMediaMessageKeepAlive(key) {
    key = String(key || "");
    if (!key) return false;
    cleanupMediaKeepAlive();
    return Number(state.mediaKeepAliveUntil.get(key) || 0) > Date.now();
  }

  function markMediaLayoutQuiet(ms = 900) {
    const now = Date.now();
    const requested = Math.max(100, Number(ms) || 900);
    const maxWindow = 4200;
    if (!state.mediaLayoutQuietStartedAt || now > Number(state.mediaLayoutQuietUntil || 0) + 250) {
      state.mediaLayoutQuietStartedAt = now;
    }
    const cappedUntil = Number(state.mediaLayoutQuietStartedAt || now) + maxWindow;
    const until = Math.min(now + requested, cappedUntil);
    state.mediaLayoutQuietUntil = Math.max(Number(state.mediaLayoutQuietUntil || 0), until);
  }

  function isMediaLayoutQuietActive() {
    return Date.now() < Number(state.mediaLayoutQuietUntil || 0);
  }

  function extendMediaCullingRelax(ms = 2500) {
    const now = Date.now();
    const requested = Math.max(250, Number(ms) || 2500);
    const maxWindow = 7000;
    if (!state.mediaCullingRelaxStartedAt || now > Number(state.mediaCullingRelaxUntil || 0) + 250) {
      state.mediaCullingRelaxStartedAt = now;
    }
    const cappedUntil = Number(state.mediaCullingRelaxStartedAt || now) + maxWindow;
    const until = Math.min(now + requested, cappedUntil);
    state.mediaCullingRelaxUntil = Math.max(Number(state.mediaCullingRelaxUntil || 0), until);
    state.lastMediaLayoutChangeAt = now;
  }

  function isMediaCullingRelaxActive() {
    return Date.now() < Number(state.mediaCullingRelaxUntil || 0);
  }

  function scheduleRenderAfterMediaQuiet(options = {}) {
    state.virtualPendingRenderOptions = mergeRenderOptions(state.virtualPendingRenderOptions, options);
    if (state.mediaLayoutQuietTimer) return;

    const delay = Math.max(80, Math.min(900, Number(state.mediaLayoutQuietUntil || 0) - Date.now() + 40));
    state.mediaLayoutQuietTimer = setTimeout(() => {
      state.mediaLayoutQuietTimer = null;
      const opts = state.virtualPendingRenderOptions || {};
      state.virtualPendingRenderOptions = null;

      const quietTimedOut = state.mediaLayoutQuietStartedAt && Date.now() - Number(state.mediaLayoutQuietStartedAt) > 4200;
      if (!quietTimedOut && isMediaLayoutQuietActive() && !opts.stickToBottom && !opts.anchor && opts.allowDuringMediaLayout !== true) {
        scheduleRenderAfterMediaQuiet(opts);
        return;
      }

      if (state.virtualRenderScheduled) {
        state.virtualPendingRenderOptions = mergeRenderOptions(state.virtualPendingRenderOptions, opts);
        return;
      }
      state.virtualRenderScheduled = true;
      requestAnimationFrame(() => {
        const finalOpts = state.virtualPendingRenderOptions || opts || {};
        state.virtualPendingRenderOptions = null;
        state.virtualRenderScheduled = false;
        renderVirtualMessages(finalOpts);
      });
    }, delay);
  }

  function setScrollTopPreserved(box, value, options = {}) {
    if (!box) return;

    const maxTop = Math.max(0, Number(box.scrollHeight || 0) - Number(box.clientHeight || 0));
    let requested = Number(value);
    if (!Number.isFinite(requested)) requested = 0;
    requested = Math.max(0, Math.min(maxTop, requested));

    const currentTop = Number(box.scrollTop || 0);
    const threshold = autoFollowBottomThresholdPx(box);
    const beforeGap = Math.max(0, Number(box.scrollHeight || 0) - currentTop - Number(box.clientHeight || 0));
    const requestedGap = Math.max(0, maxTop - requested);

    // A render that was scheduled while the chat was at the latest message must
    // not restore an old scrollTop and create a gap from the bottom. Older-history
    // prepends are the only normal case that may intentionally move away from the
    // bottom via scroll preservation.
    if (!options.allowAwayFromBottom && beforeGap <= threshold && requestedGap > threshold) {
      requested = maxTop;
      state.autoFollowLatest = true;
    }

    // At the bottom, browsers often report maxTop/scrollTop with a 1px rounding
    // difference while video metadata, image dimensions, or virtual spacers settle.
    // Writing scrollTop again for that tiny difference fires another scroll event,
    // which schedules another virtual render, which can look like bottom jitter.
    // Use a much smaller tolerance than before. The old 1-3px tolerance hid
    // harmless scroll writes, but it also allowed visible 1-2px twitching after
    // new messages, virtual spacer recalculation, or anchor restoration.
    // Browser scrollTop can be fractional, so keep a tiny epsilon only to avoid
    // write/read loops caused by sub-pixel rounding.
    const tolerance = Number.isFinite(Number(options.tolerancePx))
      ? Math.max(0, Number(options.tolerancePx))
      : (options.bottomStick ? 0.35 : 0.15);
    if (Math.abs(currentTop - requested) <= tolerance) {
      if (requestedGap <= threshold) state.autoFollowLatest = true;
      return;
    }

    state.suppressAutoFollowUpdate = true;
    state.suppressScrollRenderUntil = Date.now() + Math.max(80, Number(options.suppressRenderMs || 160));
    box.scrollTop = requested;
    setTimeout(() => { state.suppressAutoFollowUpdate = false; }, Math.max(40, Number(options.suppressUpdateMs || 120)));
  }

  function bottomGapPx(box) {
    if (!box) return Infinity;
    return Math.max(0, Number(box.scrollHeight || 0) - Number(box.scrollTop || 0) - Number(box.clientHeight || 0));
  }

  function stickToBottomStable(box) {
    if (!box) return;
    state.autoFollowLatest = true;

    const setBottom = (phase, tolerance = 0.35) => {
      if (!box) return false;
      const maxTop = Math.max(0, Number(box.scrollHeight || 0) - Number(box.clientHeight || 0));
      const gap = bottomGapPx(box);
      if (gap <= tolerance && Math.abs(Number(box.scrollTop || 0) - maxTop) <= tolerance) return false;
      setScrollTopPreserved(box, maxTop, {bottomStick: true, reason: "stick-bottom-" + phase, tolerancePx: tolerance, suppressRenderMs: 180, suppressUpdateMs: 140});
      return true;
    };

    // Do only one synchronous bottom write. Delayed rAF/setTimeout corrections
    // can look like a visible 1-2px second movement after new messages or the
    // latest-jump button. If later media changes create a small gap, leave it
    // alone until the user scrolls or a real latest render happens again.
    setBottom("now", 0.35);
  }

  async function forceLatestChatView(reason = "") {
    const box = document.getElementById("bmwc-messages");
    const now = Date.now();
    markExplicitLatestFollow(reason || "latest", 4500);
    state.preventBottomStickUntil = 0;
    state.suppressScrollRenderUntil = now + 220;
    state.forceLatestJumpUntil = now + 900;
    state.autoFollowLatest = true;
    allowMediaLayoutAutoFollow(4000);
    state.pendingScrollRenderOptions = null;
    state.pendingNewerHistoryLoad = false;
    state.pendingMediaRender = false;
    state.virtualPendingRenderOptions = null;

    const options = {
      stickToBottom: true,
      preserveScroll: false,
      preserveVisualAnchor: false,
      latestJump: true,
      forceLatestFollow: true,
      ignoreVisibleRangeProtection: true,
      allowDuringMedia: true,
      allowDuringVisibleMedia: true,
      allowDuringMediaLayout: true,
      deferDuringScroll: false,
      deferDuringMediaLayout: false,
      allowBottomStickDuringLock: true
    };

    if (box) {
      renderVirtualMessages(options);
      // Latest button is an explicit jump. Render the current tail immediately,
      // then reload the real latest history page. This matters after reply-jump,
      // where state.messages may be a middle slice with unloaded newer records.
      stickToBottomStable(box);
      refreshScrollAffordances(box);
    } else {
      state.virtualPendingRenderOptions = options;
    }

    await loadHistory(false, {forceLatest: true, forceDuringScroll: true});
  }

  function assignMessageKey(msg) {
    if (!msg) msg = {};
    if (msg._bmwcKey) return msg._bmwcKey;
    if (msg.id) {
      msg._bmwcKey = "id:" + String(msg.id);
    } else {
      msg._bmwcKey = "local:" + (state.nextLocalMessageId++);
    }
    return msg._bmwcKey;
  }

  function messageHeightAt(index) {
    const msg = state.messages[index];
    if (!msg) return state.virtualAverageMessageHeight;
    const h = Number(msg._bmwcHeight);
    return Number.isFinite(h) && h > 0 ? h : state.virtualAverageMessageHeight;
  }

  function estimatedHeightUntil(index) {
    let total = 0;
    const max = Math.max(0, Math.min(index, state.messages.length));
    for (let i = 0; i < max; i++) total += messageHeightAt(i);
    return total;
  }

  function estimatedTotalHeight() {
    return estimatedHeightUntil(state.messages.length);
  }

  function updateVirtualSpacersFromMeasuredHeights(box) {
    if (!box || !virtualScrollEnabled()) return;
    const sp = ensureVirtualSpacers(box);
    if (sp.top) sp.top.style.height = Math.max(0, Math.round(estimatedHeightUntil(state.virtualRenderStart))) + "px";
    if (sp.bottom) sp.bottom.style.height = Math.max(0, Math.round(estimatedTotalHeight() - estimatedHeightUntil(state.virtualRenderEnd))) + "px";
  }

  function cleanupMediaLayoutEventCache(now = Date.now()) {
    if (!state.mediaLayoutEventCache || !(state.mediaLayoutEventCache instanceof Map)) {
      state.mediaLayoutEventCache = new Map();
      return;
    }
    for (const [key, time] of Array.from(state.mediaLayoutEventCache.entries())) {
      if (!Number.isFinite(Number(time)) || now - Number(time) > 15000) state.mediaLayoutEventCache.delete(key);
    }
  }

  function mediaEventKey(media, messageKey, eventType = "layout") {
    const tag = media && media.tagName ? String(media.tagName).toLowerCase() : "media";
    const src = media ? String(media.currentSrc || media.src || media.getAttribute("src") || "") : "";
    return String(messageKey || "") + "|" + tag + "|" + String(eventType || "layout") + "|" + src;
  }

  function shouldProcessMediaEvent(media, messageKey, eventType = "layout", dedupeMs = 900) {
    const now = Date.now();
    cleanupMediaLayoutEventCache(now);
    const key = mediaEventKey(media, messageKey, eventType);
    const last = Number(state.mediaLayoutEventCache.get(key) || 0);
    if (last && now - last < Math.max(80, Number(dedupeMs) || 900)) return false;
    state.mediaLayoutEventCache.set(key, now);
    return true;
  }

  function scheduleBatchedMediaLayoutRender(options = {}) {
    state.mediaLayoutBatchOptions = mergeRenderOptions(state.mediaLayoutBatchOptions, options);
    if (state.mediaLayoutBatchTimer) return;
    state.mediaLayoutBatchTimer = setTimeout(() => {
      state.mediaLayoutBatchTimer = null;
      const opts = state.mediaLayoutBatchOptions || {};
      state.mediaLayoutBatchOptions = null;
      scheduleVirtualRender(Object.assign({
        preserveScroll: true,
        allowDuringMedia: true,
        allowDuringVisibleMedia: true,
        allowDuringMediaLayout: true,
        deferDuringMediaLayout: false
      }, opts));
    }, 180);
  }

  function noteMediaLayoutLoaded(media, messageEl, eventType = "layout") {
    const box = document.getElementById("bmwc-messages");
    if (!box) return;

    const msgEl = messageEl || (media && media.closest && media.closest(".bmwc-msg"));
    if (!msgEl || !box.contains(msgEl)) return;

    const key = msgEl.dataset && msgEl.dataset.virtualKey;
    if (!key) return;

    const mediaSrc = media ? String(media.currentSrc || media.src || media.getAttribute("src") || "") : "";
    const now = Date.now();
    const dedupeMs = eventType === "iframe-load" ? 5000 : eventType === "metadata" ? 1800 : 1200;
    if (!shouldProcessMediaEvent(media, key, eventType, dedupeMs)) return;
    const lastNoteAt = Number(msgEl.dataset.bmwcMediaLayoutNoteAt || 0);
    const lastNoteSrc = String(msgEl.dataset.bmwcMediaLayoutNoteSrc || "");
    if (mediaSrc && lastNoteSrc === mediaSrc && now - lastNoteAt < 450) return;
    msgEl.dataset.bmwcMediaLayoutNoteAt = String(now);
    if (mediaSrc) msgEl.dataset.bmwcMediaLayoutNoteSrc = mediaSrc;

    const viewportHeight = Math.max(1, Number(box.clientHeight || 1));
    const preRect = msgEl.getBoundingClientRect();
    const preLargeMedia = preRect.height >= viewportHeight * 0.5;

    protectMediaMessageKey(key, preLargeMedia ? 12000 : 8000);
    markMediaLayoutQuiet(preLargeMedia ? 1200 : 800);
    extendMediaCullingRelax(preLargeMedia ? 3200 : 2200);

    const msg = state.messages.find(m => m && m._bmwcKey === key);
    if (!msg) return;

    const rect = msgEl.getBoundingClientRect();
    const h = Math.max(1, Math.ceil(rect.height + parseFloat(getComputedStyle(msgEl).marginBottom || "0")));
    const old = Number(msg._bmwcHeight) || 0;
    msg._bmwcHeight = h;

    const delta = h - old;
    if (Math.abs(delta) > 0.5) {
      const largeDelta = Math.abs(delta) >= viewportHeight * 0.25 || h >= viewportHeight * 0.5;
      if (largeDelta) {
        protectMediaMessageKey(key, 12000);
        markMediaLayoutQuiet(1200);
        extendMediaCullingRelax(3200);
      }
      updateVirtualSpacersFromMeasuredHeights(box);
      if (shouldAutoFollowAfterMediaLayout(box, delta)) {
        stickToBottomStable(box);
      }
    }
  }

  function ensureVirtualSpacers(box) {
    if (!box) return {top: null, bottom: null};
    let top = box.querySelector(":scope > .bmwc-virtual-top-spacer");
    let bottom = box.querySelector(":scope > .bmwc-virtual-bottom-spacer");
    if (!top) {
      top = document.createElement("div");
      top.className = "bmwc-virtual-spacer bmwc-virtual-top-spacer";
      box.insertBefore(top, box.firstChild);
    }
    if (!bottom) {
      bottom = document.createElement("div");
      bottom.className = "bmwc-virtual-spacer bmwc-virtual-bottom-spacer";
      box.appendChild(bottom);
    }
    ensureHistoryEndNotice(box);
    return {top, bottom};
  }

  function renderMessageElement(msg) {
    const el = document.createElement("div");
    el.className = `bmwc-msg bmwc-role-${esc(msg.role)} bmwc-source-${esc(msg.source)}${msg.hidden ? " bmwc-deleted" : ""}`;
    const key = assignMessageKey(msg);
    el.dataset.virtualKey = key;
    el.dataset.hidden = msg.hidden ? "1" : "0";
    if (msg.id) el.dataset.id = msg.id;

    const time = formatMessageTime(msg.time);
    const shownSender = displaySender(msg);
    const originalSender = realSender(msg);
    const renderedSender = originalSender ? preferredSenderText(shownSender, originalSender) : shownSender;
    const senderAttrs = originalSender
      ? ` title="${esc(state.senderIdentityMode === "real" ? senderDisplayTitle(shownSender) : senderOriginalTitle(originalSender))}" data-display-sender="${esc(shownSender)}" data-real-sender="${esc(originalSender)}" data-source="${esc(msg.source || "")}" data-showing-real="${state.senderIdentityMode === "real" ? "1" : "0"}" role="button" tabindex="0"`
      : "";
    const actions = messageActionAvailability(msg);
    const canDelete = actions.canDelete;
    const canPin = actions.canPin;
    const canReply = actions.canReply;
    const miniActionsHtml = (canReply || canPin || canDelete)
      ? `<span class="bmwc-mini-actions">${canReply ? `<button class="bmwc-mini-action bmwc-reply-action" data-reply="${esc(msg.id)}">${t("button.reply", "reply")}</button>` : ""}${canPin ? `<button class="bmwc-mini-action" data-pin="${esc(msg.id)}">${t("button.pin", "pin")}</button>` : ""}${canDelete ? `<button class="bmwc-mini-action" data-delete="${esc(msg.id)}">${t("button.delete", "delete")}</button>` : ""}</span>`
      : "";
    el.classList.toggle("bmwc-has-mini-actions", !!(canReply || canPin || canDelete));
    el.innerHTML = `
      <div class="bmwc-meta">
        <span class="bmwc-sender${originalSender ? " bmwc-sender-has-real" : ""}"${senderAttrs}>${originalSender ? senderNameHtml(shownSender, originalSender, msg.source) : minecraftNameHtml(renderedSender, shouldRenderMinecraftNameColors() && sourceMayRenderMinecraftNameColors(msg.source))}</span><span class="bmwc-meta-sep" aria-hidden="true">·</span><span class="bmwc-source-label">${esc(displaySource(msg))}</span><span class="bmwc-meta-sep" aria-hidden="true">·</span><span class="bmwc-time-actions"><span class="bmwc-time" data-time="${esc(msg.time || "")}" title="${esc(timeToggleTitle(msg.time))}" role="button" tabindex="0">${esc(time)}</span>${miniActionsHtml}</span>
      </div>
      ${replyReferenceHtml(msg)}
      <div class="bmwc-text">${messageTextHtml(msg)}</div>
      ${safeImagePreviews(plainDisplayMessageText(msg), key)}
    `;
    installSenderIdentityToggle(el);
    installTimeToggle(el);
    el.querySelectorAll("[data-reply]").forEach(btn => {
      btn.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();
        startReplyToMessage(messageById(btn.dataset.reply || "") || msg);
      });
    });
    el.querySelectorAll("[data-reply-jump]").forEach(btn => {
      btn.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();
        jumpToReplyTarget(btn.dataset.replyJump || "");
      });
    });
    el.querySelectorAll(".bmwc-youtube-card").forEach(btn => {
      btn.addEventListener("click", () => {
        const embed = btn.dataset.youtubeEmbed || "";
        if (!/^https:\/\/(www\.)?youtube(-nocookie)?\.com\/embed\//i.test(embed)) return;
        const key = btn.dataset.youtubeKey || "";
        if (key) {
          state.youtubeOpen.add(key);
          if (!state.config || state.config.youtubeRememberExpanded !== false) state.youtubeExpanded.add(key);
        }
        const isShorts = btn.dataset.youtubeShorts === "1";
        const wrap = document.createElement("div");
        wrap.className = isShorts ? "bmwc-youtube-wrap bmwc-youtube-shorts-wrap" : "bmwc-youtube-wrap";
        if (key) wrap.setAttribute("data-youtube-key", key);
        wrap.style.cssText = youtubeShellStyle(isShorts, "");
        const safeEmbed = safeYouTubeEmbedUrl(embed);
        if (!safeEmbed) return;
        const iframe = document.createElement("iframe");
        iframe.className = "bmwc-youtube-frame";
        iframe.style.cssText = "position:absolute;inset:0;width:100%;height:100%;border:0;";
        iframe.src = safeEmbed;
        iframe.title = t("media.youtubeTitle", "YouTube video");
        iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
        iframe.referrerPolicy = "strict-origin-when-cross-origin";
        iframe.allowFullscreen = true;
        wrap.appendChild(iframe);
        btn.replaceWith(wrap);
      }, {once: true});
    });
    el.querySelectorAll(".bmwc-social-card").forEach(card => {
      const load = card.querySelector(".bmwc-media-load");
      if (!load) return;
      load.addEventListener("click", () => {
        const kind = card.dataset.socialKind || "";
        const src = card.dataset.socialSrc || "";
        const key = card.dataset.previewKey || previewKey(kind, src);
        if (key) state.mediaOpen.add(key);
        const html = socialEmbedHtml({type: kind, href: src, tiktokId: kind === "tiktok" ? (card.dataset.tiktokId || "") : "", previewKey: key}, "");
        const wrap = document.createElement("div");
        wrap.innerHTML = html;
        const next = wrap.firstElementChild;
        if (!next) return;
        card.replaceWith(next);
        if (kind === "x") loadXWidgets(next);
      }, {once: true});
    });
    hydrateSocialEmbeds(el);
    el.querySelectorAll(".bmwc-media-card").forEach(card => {
      const load = card.querySelector(".bmwc-media-load");
      if (!load) return;
      load.addEventListener("click", () => {
        const kind = card.dataset.mediaKind || "";
        const src = card.dataset.mediaSrc || "";
        const openHref = card.dataset.mediaOpen || src;
        const key = card.dataset.previewKey || previewKey(kind, src);
        const safeSrc = safePreviewUrl(src);
        if (!safeSrc) return;
        if (key) state.mediaOpen.add(key);
        const wrap = document.createElement("div");
        wrap.className = kind === "audio" ? "bmwc-audio-wrap" : "bmwc-video-wrap";
        if (key) wrap.setAttribute("data-preview-key", key);
        const media = createMediaElement(kind, safeSrc, key);
        if (media) wrap.appendChild(media);
        if (media) {
          media.addEventListener("error", () => {
            window.__bmwcPreviewFailed && window.__bmwcPreviewFailed(key);
            setMediaError(wrap, kind);
          }, {once: true});
          media.addEventListener("loadedmetadata", () => window.__bmwcPreviewLoaded && window.__bmwcPreviewLoaded(media), {once: true});
          media.addEventListener("loadeddata", () => {
            const msgEl = wrap.closest(".bmwc-msg");
            const key = msgEl && msgEl.dataset && msgEl.dataset.virtualKey;
            if (!key || shouldProcessMediaEvent(media, key, "ready", 1200)) protectMediaElement(media, msgEl, 6000);
          }, {once: true});
          media.addEventListener("canplay", () => {
            const msgEl = wrap.closest(".bmwc-msg");
            const key = msgEl && msgEl.dataset && msgEl.dataset.virtualKey;
            if (!key || shouldProcessMediaEvent(media, key, "canplay", 1200)) protectMediaElement(media, msgEl, 6000);
          }, {once: true});
          media.addEventListener("pause", () => {
            protectMediaElement(media, wrap.closest(".bmwc-msg"), 7000);
            setTimeout(flushDeferredMediaRender, 500);
          });
          media.addEventListener("ended", () => setTimeout(flushDeferredMediaRender, 500));
        }
        card.replaceWith(wrap);
        if (media && kind === "video" && typeof media.play === "function") {
          const playPromise = media.play();
          if (playPromise && typeof playPromise.catch === "function") playPromise.catch(() => {});
        }
      }, {once: true});
    });
    hydratePreviewMedia(el);
    el.querySelectorAll("img, video, audio").forEach(media => {
      const noteLayoutChange = event => noteMediaLayoutLoaded(media, el, event && event.type === "loadedmetadata" ? "metadata" : "load");
      const protectOnly = event => {
        const key = el && el.dataset && el.dataset.virtualKey;
        if (key && !shouldProcessMediaEvent(media, key, event && event.type || "ready", 1200)) return;
        protectMediaElement(media, el, 6000);
      };
      media.addEventListener("load", noteLayoutChange, {once: true});
      media.addEventListener("loadedmetadata", noteLayoutChange, {once: true});
      media.addEventListener("loadeddata", protectOnly, {once: true});
      media.addEventListener("canplay", protectOnly, {once: true});
      media.addEventListener("error", () => {
        if (media.classList.contains("bmwc-image-preview")) {
          window.__bmwcPreviewFailed && window.__bmwcPreviewFailed(media.dataset.previewKey);
          setMediaError(media.closest(".bmwc-image-link"), "image");
        } else if (media.classList.contains("bmwc-video-preview") || media.classList.contains("bmwc-audio-preview")) {
          const kind = media.tagName === "AUDIO" ? "audio" : "video";
          window.__bmwcPreviewFailed && window.__bmwcPreviewFailed(media.dataset.previewKey);
          setMediaError(media.closest(kind === "audio" ? ".bmwc-audio-wrap" : ".bmwc-video-wrap"), kind);
        }
        noteLayoutChange();
      }, {once: true});
      if (media.tagName === "VIDEO" || media.tagName === "AUDIO") {
        media.addEventListener("pause", () => {
          protectMediaElement(media, el, 7000);
          setTimeout(flushDeferredMediaRender, 500);
        });
        media.addEventListener("ended", () => setTimeout(flushDeferredMediaRender, 500));
      }
    });
    return el;
  }

  function renderAllMessages(box) {
    const {top, bottom} = ensureVirtualSpacers(box);
    Array.from(box.querySelectorAll(":scope > .bmwc-msg")).forEach(el => el.remove());
    if (top) top.style.height = "0px";
    if (bottom) bottom.style.height = "0px";
    for (const msg of state.messages) {
      box.insertBefore(renderMessageElement(msg), bottom || null);
    }
    measureRenderedMessages(box);
    syncTransientYoutubeOpen(box);
  }


  function messageActionAvailability(msg) {
    const moderationEnabled = !state.config || state.config.moderationEnabled !== false;
    const canModerate = state.token && moderationEnabled && (state.role === "ADMIN" || state.role === "MODERATOR");
    const canReply = !!(msg && msg.id && !msg.hidden);
    return {
      canReply,
      canDelete: state.moderationActionsVisible && canModerate && msg && msg.id && !msg.hidden && (state.role === "ADMIN" || !state.config || state.config.allowModeratorMessageDelete !== false),
      canPin: state.moderationActionsVisible && state.token && (state.role === "ADMIN" || state.role === "MODERATOR") && state.pinsEnabled !== false && state.pinsCanPin !== false && msg && msg.id && !msg.hidden && !isMessagePinned(msg.id)
    };
  }

  function syncMessageElementActions(el, msg) {
    if (!el || !msg) return;
    const meta = el.querySelector(":scope > .bmwc-meta");
    if (!meta) return;

    meta.querySelectorAll(":scope > .bmwc-mini-actions, :scope > .bmwc-mini-action[data-pin], :scope > .bmwc-mini-action[data-delete], :scope .bmwc-time-actions > .bmwc-mini-actions").forEach(btn => btn.remove());

    const actions = messageActionAvailability(msg);
    const hasActions = !!(actions.canReply || actions.canPin || actions.canDelete);
    el.classList.toggle("bmwc-has-mini-actions", hasActions);
    if (!hasActions) return;

    let timeActions = meta.querySelector(":scope > .bmwc-time-actions");
    if (!timeActions) {
      const timeEl = meta.querySelector(":scope > .bmwc-time");
      timeActions = document.createElement("span");
      timeActions.className = "bmwc-time-actions";
      if (timeEl) {
        meta.insertBefore(timeActions, timeEl);
        timeActions.appendChild(timeEl);
      } else {
        meta.appendChild(timeActions);
      }
    }

    const wrap = document.createElement("span");
    wrap.className = "bmwc-mini-actions";

    if (actions.canReply) {
      const reply = document.createElement("button");
      reply.className = "bmwc-mini-action bmwc-reply-action";
      reply.type = "button";
      reply.setAttribute("data-reply", String(msg.id));
      reply.textContent = t("button.reply", "reply");
      reply.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();
        startReplyToMessage(messageById(String(msg.id)) || msg);
      });
      wrap.appendChild(reply);
    }

    if (actions.canPin) {
      const pin = document.createElement("button");
      pin.className = "bmwc-mini-action";
      pin.type = "button";
      pin.setAttribute("data-pin", String(msg.id));
      pin.textContent = t("button.pin", "pin");
      wrap.appendChild(pin);
    }
    if (actions.canDelete) {
      const del = document.createElement("button");
      del.className = "bmwc-mini-action";
      del.type = "button";
      del.setAttribute("data-delete", String(msg.id));
      del.textContent = t("button.delete", "delete");
      wrap.appendChild(del);
    }
    timeActions.appendChild(wrap);
  }

  function messageElementNeedsRebuild(el, msg) {
    if (!el || !msg) return false;
    const hiddenNow = el.dataset && el.dataset.hidden === "1";
    if (hiddenNow !== !!msg.hidden) return true;
    // A message can be replaced in-place by moderation events while virtual
    // scroll keeps the existing DOM node alive. If the rendered text does not
    // match the hidden/deleted state, rebuild immediately instead of waiting
    // for the node to be culled and recreated by a later scroll.
    if (msg.hidden && !el.classList.contains("bmwc-deleted")) return true;
    return false;
  }

  function rebuildRenderedMessageElement(el, msg) {
    if (!el || !msg || !el.parentNode) return el;
    const fresh = renderMessageElement(msg);
    el.replaceWith(fresh);
    return fresh;
  }

  function syncRenderedMessageStateForId(id) {
    if (!id) return;
    const box = document.getElementById("bmwc-messages");
    if (!box) return;
    const sid = String(id);
    const msg = state.messages.find(m => m && String(m.id) === sid);
    if (!msg) return;
    box.querySelectorAll(`:scope > .bmwc-msg[data-id="${cssEscape(sid)}"]`).forEach(el => {
      if (messageElementNeedsRebuild(el, msg)) el = rebuildRenderedMessageElement(el, msg);
      syncMessageElementActions(el, msg);
    });
  }

  function syncRenderedMessageActions() {
    const box = document.getElementById("bmwc-messages");
    if (!box) return;
    box.querySelectorAll(":scope > .bmwc-msg").forEach(el => {
      const key = el.dataset && el.dataset.virtualKey;
      const id = el.dataset && el.dataset.id;
      const msg = state.messages.find(m => m && ((key && m._bmwcKey === key) || (id && m.id === id)));
      if (msg) syncMessageElementActions(el, msg);
    });
  }


  function refreshRenderedMessagesForLocale() {
    const box = document.getElementById("bmwc-messages");
    if (!box) return;
    const anchor = captureScrollAnchor(box);
    const wasNearBottom = isAutoFollowBottom(box);
    box.querySelectorAll(":scope > .bmwc-msg").forEach(el => {
      const key = el.dataset && el.dataset.virtualKey;
      const id = el.dataset && el.dataset.id;
      const msg = state.messages.find(m => m && ((key && m._bmwcKey === key) || (id && String(m.id) === String(id))));
      if (!msg) return;
      const fresh = renderMessageElement(msg);
      el.replaceWith(fresh);
    });
    applyTimeDisplayMode();
    if (wasNearBottom) stickToBottomStable(box);
    else if (anchor) restoreScrollAnchor(box, anchor, {thresholdPx: 2.5, reason: "maintenance-anchor-restore"});
  }

  function syncTransientYoutubeOpen(box) {
    if (!box || !state.config || state.config.youtubeRememberExpanded !== false) return;
    const visible = new Set();
    box.querySelectorAll(".bmwc-youtube-wrap[data-youtube-key]").forEach(el => {
      const key = el.getAttribute("data-youtube-key") || "";
      if (key) visible.add(key);
    });
    for (const key of Array.from(state.youtubeOpen)) {
      if (!visible.has(key)) state.youtubeOpen.delete(key);
    }
  }

  function measureRenderedMessages(box) {
    if (!box) return;
    const rendered = Array.from(box.querySelectorAll(":scope > .bmwc-msg"));
    let total = 0;
    let count = 0;
    for (const el of rendered) {
      if (el.dataset && el.dataset.activeMediaParked === "1") continue;
      const key = el.dataset.virtualKey;
      const msg = state.messages.find(m => m && m._bmwcKey === key);
      const rect = el.getBoundingClientRect();
      const h = Math.max(1, Math.ceil(rect.height + parseFloat(getComputedStyle(el).marginBottom || "0")));
      if (msg) msg._bmwcHeight = h;
      total += h;
      count++;
    }
    if (count > 0) {
      state.virtualAverageMessageHeight = Math.max(18, Math.min(240, total / count));
    }
  }

  function findIndexForOffset(offset) {
    let y = 0;
    for (let i = 0; i < state.messages.length; i++) {
      const h = messageHeightAt(i);
      if (y + h >= offset) return i;
      y += h;
    }
    return Math.max(0, state.messages.length - 1);
  }

  function mediaRenderPauseEnabled() {
    const c = state.config || {};
    return c.uiResumeRefreshSkipWhileMediaActive !== false;
  }

  function isMediaPlaybackActive() {
    if (!mediaRenderPauseEnabled()) return false;
    const box = document.getElementById("bmwc-messages");
    if (!box) return false;

    // YouTube runs inside a cross-origin iframe, so the browser does not expose
    // a reliable playback state here. Treat an opened YouTube player as active
    // when offscreen preservation is enabled; otherwise only protect it while
    // it is visible.
    if (box.querySelector(".bmwc-youtube-frame")) {
      return preservePlayingMediaEnabled() ? true : isActiveMediaVisible();
    }

    for (const media of box.querySelectorAll("video, audio")) {
      try {
        if (!media.paused && !media.ended) return true;
      } catch (_) {}
    }
    return false;
  }

  function preserveVisibleMediaEnabled() {
    const c = state.config || {};
    return c.uiVirtualScrollPreserveVisibleMedia !== false;
  }

  function preservePlayingMediaEnabled() {
    const c = state.config || {};
    return c.uiVirtualScrollPreservePlayingMedia !== false;
  }

  function hasActiveMediaElement(el, viewport = null) {
    if (!el) return false;
    if (el.querySelector && el.querySelector(".bmwc-youtube-frame")) return true;

    // Visible media nodes, including images and GIFs, must be preserved across
    // virtual renders. Recreating them fires load/metadata events again, changes
    // measured message heights, and can make the browser scroll-anchor jump.
    if (viewport && preserveVisibleMediaEnabled()) {
      for (const media of el.querySelectorAll ? el.querySelectorAll("img, video, audio, iframe") : []) {
        try {
          if (media.matches && media.matches("video, audio") && media.ended) continue;
          if (rectIntersectsViewport(media.getBoundingClientRect(), viewport, 96)) return true;
        } catch (_) {}
      }
    }

    for (const media of el.querySelectorAll ? el.querySelectorAll("video, audio") : []) {
      try {
        if (media.ended) continue;
        if (!media.paused) return true;
      } catch (_) {}
    }
    return false;
  }

  function activeMediaMessageElements(box) {
    const map = new Map();
    if (!box || (!preservePlayingMediaEnabled() && !preserveVisibleMediaEnabled())) return map;
    const viewport = preserveVisibleMediaEnabled() ? box.getBoundingClientRect() : null;
    for (const el of box.querySelectorAll(":scope > .bmwc-msg")) {
      const key = el.dataset && el.dataset.virtualKey;
      if (key && (isMediaMessageKeepAlive(key) || hasActiveMediaElement(el, viewport))) map.set(key, el);
    }
    return map;
  }

  function messageIndexByVirtualKey(key) {
    if (!key) return -1;
    for (let i = 0; i < state.messages.length; i++) {
      const msg = state.messages[i];
      if (msg && assignMessageKey(msg) === key) return i;
    }
    return -1;
  }

  function parkActiveMediaElement(el) {
    if (!el || !el.dataset || el.dataset.activeMediaParked === "1") return;
    el.dataset.activeMediaParked = "1";
    el.style.position = "absolute";
    el.style.left = "-100000px";
    el.style.top = "0";
    el.style.width = "1px";
    el.style.height = "1px";
    el.style.overflow = "hidden";
    el.style.opacity = "0";
    el.style.pointerEvents = "none";
    el.style.margin = "0";
  }

  function unparkActiveMediaElement(el) {
    if (!el || !el.dataset || el.dataset.activeMediaParked !== "1") return;
    delete el.dataset.activeMediaParked;
    el.style.removeProperty("position");
    el.style.removeProperty("left");
    el.style.removeProperty("top");
    el.style.removeProperty("width");
    el.style.removeProperty("height");
    el.style.removeProperty("overflow");
    el.style.removeProperty("opacity");
    el.style.removeProperty("pointer-events");
    el.style.removeProperty("margin");
  }

  function rectIntersectsViewport(rect, viewport, margin = 24) {
    if (!rect || !viewport) return false;
    return rect.bottom >= viewport.top - margin &&
      rect.top <= viewport.bottom + margin &&
      rect.right >= viewport.left - margin &&
      rect.left <= viewport.right + margin;
  }

  function isActiveMediaVisible() {
    if (!preserveVisibleMediaEnabled()) return false;
    const box = document.getElementById("bmwc-messages");
    if (!box) return false;
    const viewport = box.getBoundingClientRect();
    const candidates = box.querySelectorAll(".bmwc-youtube-frame, img, video, audio, iframe");
    for (const media of candidates) {
      try {
        if (media.matches && media.matches("video, audio") && media.ended) continue;
        if (rectIntersectsViewport(media.getBoundingClientRect(), viewport, 64)) return true;
      } catch (_) {}
    }
    return false;
  }

  function deferRenderBecauseMediaActive() {
    state.pendingMediaRender = true;
  }

  function flushDeferredMediaRender() {
    if (!state.pendingMediaRender) return;

    // Do not flush while a paused video/audio element is still visible. The
    // element is no longer "playing", but recreating it immediately after pause
    // reloads metadata and repeatedly shifts virtual-scroll height.
    if (isMediaPlaybackActive() || isActiveMediaVisible()) return;

    state.pendingMediaRender = false;
    scheduleVirtualRender({
      preserveScroll: true,
      stickToBottom: state.autoFollowLatest && isAutoFollowBottom(document.getElementById("bmwc-messages")),
      allowDuringMedia: true,
      allowDuringVisibleMedia: true
    });
  }

  function captureScrollAnchor(box) {
    if (!box) return null;
    const viewport = box.getBoundingClientRect();
    const messages = Array.from(box.querySelectorAll(":scope > .bmwc-msg"));
    for (const el of messages) {
      const rect = el.getBoundingClientRect();
      if (rect.bottom >= viewport.top + 1) {
        const key = el.dataset && el.dataset.virtualKey;
        if (!key) continue;
        return {
          key,
          offset: rect.top - viewport.top
        };
      }
    }
    return null;
  }

  function restoreScrollAnchor(box, anchor, options = {}) {
    if (!box || !anchor || !anchor.key) return false;
    const el = box.querySelector(`:scope > .bmwc-msg[data-virtual-key="${CSS.escape(anchor.key)}"]`);
    if (!el) return false;
    const viewport = box.getBoundingClientRect();
    const rect = el.getBoundingClientRect();
    const desiredTop = viewport.top + Number(anchor.offset || 0);
    const delta = rect.top - desiredTop;
    // Avoid visible micro-corrections after a jump/render. Corrections smaller
    // than this are usually fractional spacer/layout settling and look worse
    // when written back as a second 1-2px scroll movement. Older-history prepends
    // pass a smaller threshold explicitly because that path needs exact anchoring.
    const threshold = Number.isFinite(Number(options.thresholdPx)) ? Math.max(0, Number(options.thresholdPx)) : 1.75;
    if (Math.abs(delta) > threshold) {
      setScrollTopPreserved(box, box.scrollTop + delta, {
        allowAwayFromBottom: true,
        reason: options.reason || "anchor-restore",
        tolerancePx: Math.min(0.75, Math.max(0.15, threshold / 3))
      });
    }
    return true;
  }


  function scheduleViewportMaintenance(reason = "", delay = 900) {
    // This is a soft, invisible housekeeping pass. It does not remove loaded
    // message history; it only clears transient caches and re-commits the
    // current virtual range when the user is idle. The goal is to avoid long
    // sessions accumulating stale media/layout state while preserving the exact
    // visible anchor.
    clearTimeout(state.viewportMaintenanceTimer);
    const wait = Math.max(400, Math.min(5000, Number(delay) || 900));
    state.viewportMaintenanceDueAt = Date.now() + wait;
    state.viewportMaintenanceTimer = setTimeout(() => runViewportMaintenance(reason), wait);
  }

  function runViewportMaintenance(reason = "") {
    state.viewportMaintenanceTimer = null;
    state.viewportMaintenanceDueAt = 0;
    const box = document.getElementById("bmwc-messages");
    if (!box || state.minimized || guestChatHidden()) return;
    if (state.historyLoading || state.virtualRenderScheduled || isScrollInteractionActive() || isMediaLayoutQuietActive()) {
      scheduleViewportMaintenance(reason || "busy", 1200);
      return;
    }

    cleanupMediaKeepAlive();
    try { state.mediaLayoutEventCache.clear(); } catch (_) {}

    // Keep this pass visually silent. Earlier versions re-rendered the current
    // virtual range and restored an anchor here, but that can still appear as a
    // small late movement. Cache cleanup is safe and invisible; virtual range
    // cleanup is left to normal scroll/history renders.
    if (!virtualScrollEnabled() || state.messages.length === 0) return;
    refreshScrollAffordances(box);
  }

  function preserveOlderHistoryViewportAfterRender(box, prevTop, prevHeight, anchor, label = "older-history") {
    if (!box) return;
    const expectedFromCurrentHeight = () => {
      const delta = Math.max(0, Number(box.scrollHeight || 0) - Number(prevHeight || 0));
      return { delta, expectedTop: Math.max(0, Number(prevTop || 0) + delta) };
    };
    const restore = () => {
      if (!box || !document.body.contains(box)) return;
      const {delta, expectedTop} = expectedFromCurrentHeight();
      const restoredAnchor = anchor ? restoreScrollAnchor(box, anchor, {thresholdPx: 0.5, reason: label + "-anchor"}) : false;

      // If older rows/spacers were inserted above the viewport, scrollTop must
      // be moved down by the height delta. Without this fallback, wheel-up at
      // the physical top can keep loading older pages while scrollTop remains 0,
      // which appears as a frozen chat log.
      if (delta > 0 && (!restoredAnchor || (Number(prevTop || 0) <= 2 && Number(box.scrollTop || 0) <= 2))) {
        setScrollTopPreserved(box, expectedTop, {allowAwayFromBottom: true, reason: label});
      }
    };

    restore();
    requestAnimationFrame(restore);
    setTimeout(restore, 80);
  }

  function visibleMessageIndices(box, margin = 0) {
    const indices = new Set();
    if (!box) return indices;
    const viewport = box.getBoundingClientRect();
    for (const el of box.querySelectorAll(":scope > .bmwc-msg")) {
      if (!el || !el.dataset || el.dataset.activeMediaParked === "1") continue;
      const key = el.dataset.virtualKey;
      if (!key) continue;
      let rect;
      try {
        rect = el.getBoundingClientRect();
      } catch (_) {
        continue;
      }
      // While image/video dimensions settle, the estimated-height model can be
      // temporarily wrong. Keep messages that are actually visible or close to
      // the viewport in the render range so a media-layout render cannot cull
      // text that is still on screen.
      if (!rectIntersectsViewport(rect, viewport, margin)) continue;
      const index = messageIndexByVirtualKey(key);
      if (index >= 0) indices.add(index);
    }
    return indices;
  }

  function viewportVisibleMessageArea(box, margin = 0) {
    const result = {count: 0, totalHeight: 0, firstKey: "", lastKey: ""};
    if (!box) return result;
    const viewport = box.getBoundingClientRect();
    for (const el of box.querySelectorAll(":scope > .bmwc-msg")) {
      if (!el || !el.dataset || el.dataset.activeMediaParked === "1") continue;
      let rect;
      try {
        rect = el.getBoundingClientRect();
      } catch (_) {
        continue;
      }
      if (!rectIntersectsViewport(rect, viewport, margin)) continue;
      let style;
      try {
        style = getComputedStyle(el);
      } catch (_) {
        style = null;
      }
      if (style && (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0)) continue;
      const clippedTop = Math.max(rect.top, viewport.top);
      const clippedBottom = Math.min(rect.bottom, viewport.bottom);
      const visibleHeight = Math.max(0, clippedBottom - clippedTop);
      if (margin <= 0 && visibleHeight <= 0) continue;
      result.count++;
      result.totalHeight += Math.max(0, visibleHeight);
      const key = el.dataset.virtualKey || "";
      if (!result.firstKey) result.firstKey = key;
      result.lastKey = key;
    }
    return result;
  }

  function isVirtualViewportNearEmpty(box) {
    if (!box || !state.messages || state.messages.length === 0) return false;
    const area = viewportVisibleMessageArea(box, 0);
    const minArea = Math.min(120, Math.max(40, Number(box.clientHeight || 1) * 0.20));
    return area.count === 0 || area.totalHeight < minArea;
  }

  function rememberGoodVirtualViewport(box) {
    if (!box || !state.messages || state.messages.length === 0) return;
    const area = viewportVisibleMessageArea(box, 0);
    const minArea = Math.min(120, Math.max(40, Number(box.clientHeight || 1) * 0.20));
    if (area.count > 0 && area.totalHeight >= minArea) {
      const anchor = captureScrollAnchor(box);
      if (anchor && anchor.key) {
        state.lastGoodVirtualAnchor = anchor;
        state.lastGoodVirtualAnchorAt = Date.now();
      }
    }
  }

  function maybeScheduleBlankRescueRender(box, options = {}) {
    if (!box || !virtualScrollEnabled() || !state.messages || state.messages.length === 0) return;
    if (options.blankRescue === true) return;
    if (!isVirtualViewportNearEmpty(box)) {
      rememberGoodVirtualViewport(box);
      return;
    }
    const now = Date.now();
    if (now - Number(state.lastBlankRescueAt || 0) < 350) return;
    state.lastBlankRescueAt = now;
    scheduleVirtualRender({
      preserveScroll: true,
      deferDuringScroll: false,
      deferDuringMediaLayout: false,
      allowDuringMedia: true,
      allowDuringVisibleMedia: true,
      allowDuringMediaLayout: true,
      blankRescue: true,
      anchor: state.lastGoodVirtualAnchor || null
    });
  }

  function mediaNearbyVirtualRangeInfo(box, margin = 0) {
    const info = {
      hasMedia: false,
      hasLargeMedia: false,
      minIndex: Infinity,
      maxIndex: -1,
      maxMediaHeight: 0
    };
    if (!box) return info;
    const viewport = box.getBoundingClientRect();
    const viewportHeight = Math.max(1, Number(box.clientHeight || viewport.height || 1));
    for (const media of box.querySelectorAll("img, video, audio, iframe, .bmwc-youtube-frame")) {
      let mediaRect;
      try {
        mediaRect = media.getBoundingClientRect();
      } catch (_) {
        continue;
      }
      const msgEl = media.closest && media.closest(".bmwc-msg");
      if (!msgEl || !msgEl.dataset || msgEl.dataset.activeMediaParked === "1") continue;
      let msgRect;
      try {
        msgRect = msgEl.getBoundingClientRect();
      } catch (_) {
        msgRect = mediaRect;
      }

      // A not-yet-loaded image can report 0x0. In that case the owner message
      // rectangle is the safer proximity signal.
      const near = rectIntersectsViewport(mediaRect, viewport, margin) ||
        rectIntersectsViewport(msgRect, viewport, margin);
      if (!near) continue;

      const key = msgEl.dataset.virtualKey;
      const index = messageIndexByVirtualKey(key);
      if (index < 0) continue;

      const mediaHeight = Math.max(0, Number(mediaRect.height || 0));
      const ownerHeight = Math.max(0, Number(msgRect.height || 0));
      const large = mediaHeight >= viewportHeight * 0.5 || ownerHeight >= viewportHeight * 0.75;

      info.hasMedia = true;
      info.hasLargeMedia = info.hasLargeMedia || large;
      info.minIndex = Math.min(info.minIndex, index);
      info.maxIndex = Math.max(info.maxIndex, index);
      info.maxMediaHeight = Math.max(info.maxMediaHeight, mediaHeight, ownerHeight);
    }
    if (!Number.isFinite(info.minIndex)) {
      info.minIndex = Infinity;
      info.maxIndex = -1;
    }
    return info;
  }

  function expandVirtualRangeForVisibleMessages(start, end, protectedIndices, count, guard = 2) {
    if (!protectedIndices || protectedIndices.size === 0) return {start, end};
    let min = Infinity;
    let max = -1;
    for (const index of protectedIndices) {
      if (!Number.isFinite(index) || index < 0 || index >= count) continue;
      min = Math.min(min, index);
      max = Math.max(max, index);
    }
    if (!Number.isFinite(min) || max < 0) return {start, end};
    const pad = Math.max(1, Math.min(12, Math.floor(Number(guard) || 2)));
    return {
      start: Math.max(0, Math.min(start, min - pad)),
      end: Math.min(count, Math.max(end, max + pad + 1))
    };
  }

  function expandVirtualRangeForMediaStability(start, end, count, mediaInfo, protectedIndices, viewport) {
    if (!count) return {start, end};

    let min = Infinity;
    let max = -1;
    if (protectedIndices) {
      for (const index of protectedIndices) {
        if (!Number.isFinite(index) || index < 0 || index >= count) continue;
        min = Math.min(min, index);
        max = Math.max(max, index);
      }
    }
    if (mediaInfo && mediaInfo.hasMedia && Number.isFinite(mediaInfo.minIndex) && mediaInfo.maxIndex >= 0) {
      min = Math.min(min, mediaInfo.minIndex);
      max = Math.max(max, mediaInfo.maxIndex);
    }

    const mediaNear = !!(mediaInfo && mediaInfo.hasMedia);
    const largeMediaNear = !!(mediaInfo && mediaInfo.hasLargeMedia);
    const relaxing = isMediaCullingRelaxActive();
    if (!mediaNear && !largeMediaNear && !relaxing) return {start, end};

    if (!Number.isFinite(min) || max < 0) {
      // During a short post-load relax window there may be no media element in
      // the current DOM because it was just culled. Keep a wider window around
      // the already calculated range instead of aggressively deleting nodes.
      min = start;
      max = Math.max(start, end - 1);
    }

    const avg = Math.max(24, Math.min(120, Number(state.virtualAverageMessageHeight) || 42));
    const viewportMessages = Math.max(6, Math.ceil(Math.max(1, Number(viewport) || 1) / avg));

    let before = Math.max(8, Math.ceil(viewportMessages * 0.75));
    let after = Math.max(16, Math.ceil(viewportMessages * 1.5));

    if (mediaNear) {
      before = Math.max(before, 10, Math.ceil(viewportMessages * 1.0));
      after = Math.max(after, 28, Math.ceil(viewportMessages * 2.2));
    }
    if (largeMediaNear) {
      before = Math.max(before, 14, Math.ceil(viewportMessages * 1.5));
      after = Math.max(after, 45, Math.ceil(viewportMessages * 3.2));
    }
    if (relaxing) {
      before = Math.max(before, 12, Math.ceil(viewportMessages * 1.2));
      after = Math.max(after, 36, Math.ceil(viewportMessages * 2.6));
    }

    return {
      start: Math.max(0, Math.min(start, min - before)),
      end: Math.min(count, Math.max(end, max + after + 1))
    };
  }

  function renderVirtualMessages(options = {}) {
    if (Date.now() < Number(state.forceLatestJumpUntil || 0)) {
      options = Object.assign({}, options, {
        stickToBottom: true,
        preserveScroll: false,
        preserveVisualAnchor: false,
        latestJump: true,
        ignoreVisibleRangeProtection: true,
        allowDuringMedia: true,
        allowDuringVisibleMedia: true,
        allowDuringMediaLayout: true,
        deferDuringScroll: false,
        deferDuringMediaLayout: false,
        allowBottomStickDuringLock: true
      });
    }
    const mediaActive = isMediaPlaybackActive();
    if (mediaActive && options.allowDuringMedia !== true && !preservePlayingMediaEnabled()) {
      deferRenderBecauseMediaActive();
      return;
    }
    const box = document.getElementById("bmwc-messages");
    if (!box) return;
    if (isActiveMediaVisible() && options.allowDuringVisibleMedia !== true && !preservePlayingMediaEnabled()) {
      deferRenderBecauseMediaActive();
      return;
    }
    const keptActiveMedia = activeMediaMessageElements(box);
    const prevScrollTop = box.scrollTop;
    const bottomStickSuppressed = options.forcePreservePosition === true || options.suppressBottomStick === true || (Date.now() < Number(state.preventBottomStickUntil || 0) && options.allowBottomStickDuringLock !== true);
    const explicitLatestFollow = !bottomStickSuppressed && (
      !!options.latestJump ||
      !!options.forceLatestFollow ||
      !!options.forceStickToBottom ||
      hasExplicitLatestFollow()
    );
    const actuallyNearBottom = bottomStickSuppressed ? false : (!state.historyHasAfter && isAutoFollowBottom(box));
    const explicitlyStickBottom = !!options.stickToBottom && (explicitLatestFollow || actuallyNearBottom);
    const mediaLayoutBottomFollow =
      !bottomStickSuppressed &&
      (explicitLatestFollow || actuallyNearBottom) &&
      Date.now() <= Number(state.autoFollowMediaLayoutUntil || 0) &&
      !isScrollInteractionActive() &&
      (Date.now() - Number(state.lastUserScrollAt || 0)) > Math.max(250, scrollInteractionIdleMs());
    let shouldStickBottom = !bottomStickSuppressed && (explicitlyStickBottom || actuallyNearBottom || mediaLayoutBottomFollow);
    const preserveBottomAfterRender = !options.anchor && shouldStickBottom;
    if (preserveBottomAfterRender) {
      state.autoFollowLatest = true;
    } else if (!actuallyNearBottom && !explicitLatestFollow) {
      state.autoFollowLatest = false;
    }

    // For normal non-bottom virtual renders, preserve the user's visual anchor
    // instead of the raw scrollTop. Media load/error, spacer recalculation, and
    // range expansion can change the height above the viewport after scrolling
    // stops. Keeping only scrollTop stable makes the visible image/text appear
    // to jump. Restoring the first visible message keeps the pixels the user was
    // looking at in place while the scrollbar size/position settles.
    const visualAnchor = (!preserveBottomAfterRender && !options.anchor && options.preserveScroll !== false && options.preserveVisualAnchor !== false)
      ? captureScrollAnchor(box)
      : null;

    if (!virtualScrollEnabled()) {
      renderAllMessages(box);
      if (preserveBottomAfterRender) stickToBottomStable(box);
      else if (options.preserveScroll !== false) setScrollTopPreserved(box, prevScrollTop);
      return;
    }

    const {top, bottom} = ensureVirtualSpacers(box);
    const count = state.messages.length;
    if (count === 0) {
      Array.from(box.querySelectorAll(":scope > .bmwc-msg")).forEach(el => el.remove());
      if (top) top.style.height = "0px";
      if (bottom) bottom.style.height = "0px";
      state.virtualRenderStart = 0;
      state.virtualRenderEnd = 0;
      refreshScrollAffordances(box);
      return;
    }

    const viewport = Math.max(1, box.clientHeight || 1);
    const overscanPx = viewport * virtualOverscanScreens();
    const totalHeight = estimatedTotalHeight();
    const targetCount = virtualRenderTargetMessageCount(viewport, overscanPx);

    let start;
    let end;
    if (shouldStickBottom) {
      // When entering the latest-chat view, render the newest messages first.
      // Rendering from scrollTop=0 and then jumping to bottom leaves the viewport
      // sitting on the bottom spacer, which looks like an empty/black chat area
      // until a resize or large scroll forces a second render.
      end = count;
      const startOffset = Math.max(0, totalHeight - viewport - overscanPx);
      start = findIndexForOffset(startOffset);
    } else if (Number.isFinite(Number(options.focusIndex))) {
      const focusIndex = Math.max(0, Math.min(count - 1, Math.floor(Number(options.focusIndex))));
      const focusCenter = estimatedHeightUntil(focusIndex) + Math.max(1, messageHeightAt(focusIndex)) / 2;
      const startOffset = Math.max(0, focusCenter - viewport / 2 - overscanPx);
      const endOffset = Math.min(totalHeight, focusCenter + viewport / 2 + overscanPx);
      start = findIndexForOffset(startOffset);
      end = findIndexForOffset(endOffset) + 1;
    } else {
      const startOffset = Math.max(0, box.scrollTop - overscanPx);
      const endOffset = Math.min(totalHeight, box.scrollTop + viewport + overscanPx);
      start = findIndexForOffset(startOffset);
      end = findIndexForOffset(endOffset) + 1;
    }

    if (end - start < targetCount) {
      if (shouldStickBottom) {
        start = Math.max(0, end - targetCount);
      } else {
        const need = targetCount - (end - start);
        const before = Math.floor(need / 2);
        start = Math.max(0, start - before);
        end = Math.min(count, start + targetCount);
        start = Math.max(0, Math.min(start, end - targetCount));
      }
    }
    start = Math.max(0, Math.min(start, count));
    end = Math.max(start, Math.min(end, count));

    const skipVisibleRangeProtection = !!options.ignoreVisibleRangeProtection || !!options.latestJump;
    const mediaProbeMargin = Math.max(240, Math.round(viewport * (isMediaCullingRelaxActive() ? 2.5 : 1.25)));
    const mediaInfo = skipVisibleRangeProtection
      ? {hasMedia: false, hasLargeMedia: false, minIndex: Infinity, maxIndex: -1, maxMediaHeight: 0}
      : mediaNearbyVirtualRangeInfo(box, mediaProbeMargin);
    const visibleProtectMargin = mediaInfo.hasMedia || isMediaCullingRelaxActive()
      ? Math.max(720, Math.round(viewport * 2.5))
      : Math.max(160, Math.min(720, Math.round(viewport * 0.75)));
    const protectedVisibleIndices = skipVisibleRangeProtection ? new Set() : visibleMessageIndices(box, visibleProtectMargin);
    if (!skipVisibleRangeProtection) {
      let expanded = expandVirtualRangeForVisibleMessages(start, end, protectedVisibleIndices, count, mediaInfo.hasMedia ? 8 : 3);
      start = expanded.start;
      end = expanded.end;
      expanded = expandVirtualRangeForMediaStability(start, end, count, mediaInfo, protectedVisibleIndices, viewport);
      start = expanded.start;
      end = expanded.end;
    }

    if (options.blankRescue === true) {
      let center = findIndexForOffset(Math.max(0, Number(box.scrollTop || 0) + viewport / 2));
      const anchorKey = options.anchor && options.anchor.key ? options.anchor.key : (state.lastGoodVirtualAnchor && state.lastGoodVirtualAnchor.key);
      const anchorIndex = anchorKey ? messageIndexByVirtualKey(anchorKey) : -1;
      if (anchorIndex >= 0) center = anchorIndex;
      const rescueSpan = Math.max(targetCount * 4, 120);
      start = Math.max(0, Math.min(start, center - Math.floor(rescueSpan / 2)));
      end = Math.min(count, Math.max(end, center + Math.ceil(rescueSpan / 2)));
    }

    Array.from(box.querySelectorAll(":scope > .bmwc-msg")).forEach(el => {
      const key = el.dataset && el.dataset.virtualKey;
      if (!key) {
        el.remove();
        return;
      }
      const index = messageIndexByVirtualKey(key);
      if (index >= start && index < end) {
        unparkActiveMediaElement(el);
        return;
      }
      if (keptActiveMedia.has(key)) parkActiveMediaElement(el);
      else el.remove();
    });
    if (top) top.style.height = Math.max(0, Math.round(estimatedHeightUntil(start))) + "px";
    if (bottom) bottom.style.height = Math.max(0, Math.round(estimatedTotalHeight() - estimatedHeightUntil(end))) + "px";

    // Keep active media nodes in-place. Moving an existing YouTube iframe/video
    // with insertBefore() can make some browsers reload the player, which restarts
    // playback when the message re-enters the virtual-scroll viewport. We only
    // insert newly rendered messages around already-kept media nodes.
    const renderedByKey = new Map();
    Array.from(box.querySelectorAll(":scope > .bmwc-msg")).forEach(el => {
      const key = el.dataset && el.dataset.virtualKey;
      if (key) renderedByKey.set(key, el);
    });

    const findInsertBefore = (fromIndex) => {
      for (let j = fromIndex + 1; j < end; j++) {
        const nextMsg = state.messages[j];
        if (!nextMsg) continue;
        const nextKey = assignMessageKey(nextMsg);
        const nextEl = renderedByKey.get(nextKey);
        if (nextEl && nextEl.parentNode === box) return nextEl;
      }
      return bottom || null;
    };

    for (let i = start; i < end; i++) {
      const msg = state.messages[i];
      const key = assignMessageKey(msg);
      let el = renderedByKey.get(key);
      if (el) {
        unparkActiveMediaElement(el);
        if (messageElementNeedsRebuild(el, msg)) {
          el = rebuildRenderedMessageElement(el, msg);
          renderedByKey.set(key, el);
        } else {
          syncMessageElementActions(el, msg);
        }
        const before = findInsertBefore(i);
        if (before !== el && el.nextSibling !== before) box.insertBefore(el, before);
        continue;
      }
      el = renderMessageElement(msg);
      box.insertBefore(el, findInsertBefore(i));
      renderedByKey.set(key, el);
    }
    state.virtualRenderStart = start;
    state.virtualRenderEnd = end;
    measureRenderedMessages(box);
    syncTransientYoutubeOpen(box);
    if (top) top.style.height = Math.max(0, Math.round(estimatedHeightUntil(start))) + "px";
    if (bottom) bottom.style.height = Math.max(0, Math.round(estimatedTotalHeight() - estimatedHeightUntil(end))) + "px";
    applyBottomStackFiller(box, start, end, shouldStickBottom);
    if (preserveBottomAfterRender) scheduleHistoryViewportFill("bottom-render");
    if (preserveBottomAfterRender) {
      // Bottom auto-follow wins over scroll-anchor restoration. This prevents
      // media-layout/virtual-scroll renders from pulling the latest chat upward.
      stickToBottomStable(box);
    } else if (options.anchor && restoreScrollAnchor(box, options.anchor, {thresholdPx: Number.isFinite(Number(options.anchorThresholdPx)) ? Number(options.anchorThresholdPx) : 0.5, reason: "explicit-anchor-restore"})) {
      // Anchor restore keeps the user's current viewport stable after prepending older history.
    } else if (visualAnchor && restoreScrollAnchor(box, visualAnchor, {thresholdPx: options.maintenanceRender ? 2.5 : 1.75, reason: options.maintenanceRender ? "maintenance-visual-anchor" : "visual-anchor-restore"})) {
      // Normal scroll/media renders should keep the visible message in place.
      // The scrollbar can resize, but already visible images/text should not
      // jump after scroll idle when spacers are recalculated.
    } else if (shouldStickBottom && state.autoFollowLatest) stickToBottomStable(box);
    else if (options.preserveScroll !== false) setScrollTopPreserved(box, prevScrollTop);

    // A failed/late media load can shrink a message after the range has already
    // been calculated. If the DOM still contains messages but the viewport is
    // effectively empty, immediately re-render a wider rescue range instead of
    // waiting for the user to scroll again.
    if (!options.latestJump) maybeScheduleBlankRescueRender(box, options);
    refreshScrollAffordances(box);
  }

  function scheduleVirtualRender(options = {}) {
    if (options.deferDuringScroll !== false && isScrollInteractionActive() && !options.stickToBottom && !options.anchor) {
      deferRenderUntilScrollIdle(options);
      return;
    }
    if (options.deferDuringMediaLayout !== false && isMediaLayoutQuietActive() && !options.stickToBottom && !options.anchor && options.allowDuringMediaLayout !== true) {
      scheduleRenderAfterMediaQuiet(options);
      return;
    }
    state.virtualPendingRenderOptions = mergeRenderOptions(state.virtualPendingRenderOptions, options);
    if (state.virtualRenderScheduled) return;
    state.virtualRenderScheduled = true;
    requestAnimationFrame(() => {
      const opts = state.virtualPendingRenderOptions || {};
      state.virtualPendingRenderOptions = null;
      state.virtualRenderScheduled = false;
      renderVirtualMessages(opts);
    });
  }

  function addMessage(msg, options = {}) {
    const box = document.getElementById("bmwc-messages");
    if (!box || !msg) return;
    // Auto-follow new incoming chat only when the viewport is physically near
    // the bottom or a user action explicitly requested the latest view
    // (send/upload/latest button). Do not trust a stale autoFollowLatest flag.
    const explicitLatestFollow = !options.prepend && options.suppressAutoFollow !== true && (options.forceStickToBottom || hasExplicitLatestFollow());
    const canUsePhysicalBottomForFollow = !options.prepend && options.suppressAutoFollow !== true && !state.historyHasAfter;
    const wasNearBottom = canUsePhysicalBottomForFollow && isAutoFollowBottom(box);
    const shouldFollowLatest = !options.prepend && (wasNearBottom || explicitLatestFollow);
    if (shouldFollowLatest) {
      state.autoFollowLatest = true;
      if (!options.skipRender) allowMediaLayoutAutoFollow(4000);
    } else if (!options.prepend) {
      state.autoFollowLatest = false;
    }
    const key = assignMessageKey(msg);
    let idx = -1;
    if (msg.id) idx = state.messages.findIndex(m => m && m.id === msg.id);
    if (idx < 0) idx = state.messages.findIndex(m => m && m._bmwcKey === key);
    if (idx >= 0) {
      state.messages[idx] = Object.assign(state.messages[idx], msg, {_bmwcKey: state.messages[idx]._bmwcKey});
    } else if (options.prepend) {
      state.messages.unshift(msg);
    } else {
      state.messages.push(msg);
    }
    if (!options.skipRender) {
      const renderOptions = {
        stickToBottom: shouldFollowLatest,
        preserveScroll: !shouldFollowLatest,
        deferDuringScroll: !shouldFollowLatest,
        forceLatestFollow: explicitLatestFollow,
        allowDuringMedia: true,
        allowDuringVisibleMedia: true,
        // New incoming messages must not be held behind the media-layout quiet
        // window. Active media nodes are preserved by renderVirtualMessages(),
        // so delaying here can make SSE updates appear stuck.
        deferDuringMediaLayout: false
      };
      if (!options.prepend && !shouldFollowLatest && isScrollInteractionActive()) deferRenderUntilScrollIdle(renderOptions);
      else renderVirtualMessages(renderOptions);
      if (!options.prepend && shouldFollowLatest) stickToBottomStable(box);
      if (!options.prepend) scheduleViewportMaintenance("message", shouldFollowLatest ? 1400 : 2200);
    }
  }

  function markMessageDeleted(id) {
    if (!id) return;
    const box = document.getElementById("bmwc-messages");
    const wasNearBottom = box ? isAutoFollowBottom(box) : !!state.autoFollowLatest;
    const wasAtHistoryEnd = !!box && !state.historyLoading && !state.historyHasMore && state.messages.length > 0 && Number(box.scrollTop || 0) <= historyPreloadThresholdPx(box) + 6;
    if (wasAtHistoryEnd) state.forceHistoryEndNoticeUntil = Math.max(Number(state.forceHistoryEndNoticeUntil || 0), Date.now() + 1600);
    const anchor = box && !wasNearBottom && !wasAtHistoryEnd ? captureScrollAnchor(box) : null;
    const prevTop = box ? Number(box.scrollTop || 0) : 0;
    const prevAutoFollow = !!state.autoFollowLatest;
    const msg = state.messages.find(m => m && String(m.id) === String(id));
    if (msg && msg.hidden === true) {
      if (!wasNearBottom) {
        state.preventBottomStickUntil = Math.max(Number(state.preventBottomStickUntil || 0), Date.now() + 1400);
        state.autoFollowLatest = false;
        if (wasAtHistoryEnd && box) setScrollTopPreserved(box, 0, {allowAwayFromBottom: true, reason: "delete-history-end-preserve", suppressRenderMs: 220, suppressUpdateMs: 180});
        refreshScrollAffordances(box);
      }
      return;
    }
    if (msg) {
      msg.hidden = true;
      msg.message = t("message.deleted", "[deleted]");
    }
    // Deleting/rebuilding a message can shrink the estimated content height.
    // If we decide bottom-follow after that shrink, a mid-history viewport may
    // suddenly look "near bottom" and get dragged to the latest message. Capture
    // the pre-delete anchor first and force a non-bottom render unless the user
    // really was already at the bottom before pressing delete. Keep a short
    // bottom-stick lock as well, because the optimistic delete and the SSE delete
    // event can arrive in separate frames and otherwise re-enable auto-follow.
    if (!wasNearBottom) {
      state.preventBottomStickUntil = Math.max(Number(state.preventBottomStickUntil || 0), Date.now() + 1400);
      state.autoFollowLatest = false;
    }
    renderVirtualMessages({
      stickToBottom: wasNearBottom,
      preserveScroll: !wasNearBottom,
      anchor: !wasNearBottom && !wasAtHistoryEnd ? anchor : null,
      forcePreservePosition: !wasNearBottom,
      suppressBottomStick: !wasNearBottom,
      allowDuringMedia: true,
      allowDuringVisibleMedia: true,
      deferDuringMediaLayout: false,
      deferDuringScroll: false
    });
    if (!wasNearBottom) {
      state.autoFollowLatest = false;
      const afterBox = document.getElementById("bmwc-messages");
      if (afterBox && wasAtHistoryEnd) {
        state.forceHistoryEndNoticeUntil = Math.max(Number(state.forceHistoryEndNoticeUntil || 0), Date.now() + 1600);
        setScrollTopPreserved(afterBox, 0, {allowAwayFromBottom: true, reason: "delete-history-end-preserve", suppressRenderMs: 260, suppressUpdateMs: 180});
      } else if (afterBox && !anchor) {
        setScrollTopPreserved(afterBox, prevTop, {allowAwayFromBottom: true, reason: "delete-preserve-scroll", suppressRenderMs: 260, suppressUpdateMs: 180});
      }
      refreshScrollAffordances(afterBox);
    } else {
      state.autoFollowLatest = prevAutoFollow || wasNearBottom;
    }
  }

  function formatDecimalNumber(value, digits = 2) {
    value = Number(value);
    if (!Number.isFinite(value)) value = 0;
    const fixed = value.toFixed(Math.max(0, Math.min(6, Math.floor(Number(digits) || 0))));
    return fixed.replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1");
  }

  function pxLabel(value) {
    return formatDecimalNumber(value, 2) + "px";
  }

  function fontPx(value, fallback) {
    value = Number(value);
    if (!Number.isFinite(value) || value <= 0) value = fallback;
    return pxLabel(Math.max(8, Math.min(36, value)));
  }

  function savedUserFontSize() {
    const v = Number(localStorage.getItem("bmwc.userFontSize"));
    return Number.isFinite(v) && v >= 8 && v <= 36 ? v : null;
  }

  function savedUserFontFamily() {
    return String(localStorage.getItem("bmwc.userFontFamily") || "");
  }

  function effectiveBaseFontSize() {
    const c = state.config || {};
    const user = c.uiUserPreferencesControl === false ? null : savedUserFontSize();
    return user == null ? Number(c.uiFontSize || 13) : user;
  }

  function setUserFontSize(value, persist = true) {
    value = Number(value);
    if (!Number.isFinite(value)) return;
    value = Math.max(8, Math.min(36, value));
    state.liveUserFontSize = value;
    if (persist) {
      localStorage.setItem("bmwc.userFontSize", formatDecimalNumber(value, 2));
    }
    applyFontSizeConfig();
    applyMediaViewportConfig();
  }

  function resetUserFontSize() {
    state.liveUserFontSize = null;
    localStorage.removeItem("bmwc.userFontSize");
    applyFontSizeConfig();
    applyMediaViewportConfig();
  }

  function setUserFontFamily(value) {
    value = normalizeFontFamilyPreference(value);
    if (value) localStorage.setItem("bmwc.userFontFamily", value);
    else localStorage.removeItem("bmwc.userFontFamily");
    applyThemeConfig();
  }

  function resetUserFontFamily() {
    localStorage.removeItem("bmwc.userFontFamily");
    applyThemeConfig();
  }

  function cssFontString(value) {
    return String(value || "").replace(/\\/g, "\\\\").replace(/"/g, "\\\"").replace(/\n/g, " ");
  }

  function normalizeFontFamilyPreference(value) {
    value = String(value || "").trim();
    if (!value) return "";
    // Advanced users may enter a full CSS font-family list.
    // Keep lists, quoted names, CSS variables, and generic families as-is.
    if (value.includes(",") || value.includes("'") || value.includes('"')) return value;
    if (/^(serif|sans-serif|monospace|cursive|fantasy|system-ui|ui-serif|ui-sans-serif|ui-monospace|emoji|math|fangsong)$/i.test(value)) return value;
    if (/^(var|inherit|initial|unset|revert)\s*\(/i.test(value)) return value;
    // A single installed font family such as Malgun Gothic or 맑은 고딕 must be quoted for reliable CSS parsing.
    return `"${cssFontString(value)}", sans-serif`;
  }

  function primaryFontFamilyName(value) {
    value = String(value || "").trim();
    if (!value) return "";
    if (value[0] === '"' || value[0] === "'") {
      const quote = value[0];
      let out = "";
      for (let i = 1; i < value.length; i++) {
        const ch = value[i];
        if (ch === "\\" && i + 1 < value.length) {
          out += value[++i];
          continue;
        }
        if (ch === quote) return out.trim();
        out += ch;
      }
      return out.trim();
    }
    const comma = value.indexOf(",");
    return (comma >= 0 ? value.slice(0, comma) : value).trim();
  }

  function isGenericFontFamilyName(value) {
    return /^(serif|sans-serif|monospace|cursive|fantasy|system-ui|ui-serif|ui-sans-serif|ui-monospace|emoji|math|fangsong)$/i.test(String(value || "").trim());
  }

  function fontDetectionStatus(value) {
    const raw = String(value || "").trim();
    if (!raw) return {state: "empty", name: ""};
    const normalized = normalizeFontFamilyPreference(raw);
    const primary = primaryFontFamilyName(normalized) || primaryFontFamilyName(raw);
    if (!primary) return {state: "unknown", name: raw};
    if (isGenericFontFamilyName(primary)) return {state: "generic", name: primary};

    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext && canvas.getContext("2d");
      if (!ctx) return {state: "unknown", name: primary};
      const sample = "mmmmmmmmmmiiiiiiiWWWWW 가나다漢字12345";
      const size = "72px ";
      const bases = ["monospace", "serif", "sans-serif"];
      const baseWidths = bases.map(base => {
        ctx.font = size + base;
        return ctx.measureText(sample).width;
      });
      const cssCandidate = `"${cssFontString(primary)}"`;
      const differs = bases.some((base, idx) => {
        ctx.font = size + cssCandidate + ", " + base;
        const width = ctx.measureText(sample).width;
        return Math.abs(width - baseWidths[idx]) > 0.5;
      });
      return {state: differs ? "detected" : "notDetected", name: primary, normalized};
    } catch (_) {
      return {state: "unknown", name: primary};
    }
  }

  function fontFormatForFile(file) {
    file = String(file || "").toLowerCase();
    if (file.endsWith(".woff2")) return "woff2";
    if (file.endsWith(".woff")) return "woff";
    if (file.endsWith(".ttf")) return "truetype";
    if (file.endsWith(".otf")) return "opentype";
    return "";
  }

  function applyWebFontsConfig() {
    let style = document.getElementById("bmwc-web-fonts-style");
    if (!state.config || !state.config.webFontsEnabled) {
      if (style) style.remove();
      return;
    }

    const items = Array.isArray(state.config.webFontsItems) ? state.config.webFontsItems : [];
    const rules = [];

    for (const item of items) {
      if (!item) continue;
      const family = String(item.family || "").trim();
      const file = String(item.file || "").trim();
      if (!family || !file || file.includes("..") || file.startsWith("/") || file.includes("\\")) continue;

      const format = fontFormatForFile(file);
      if (!format) continue;

      const weight = Number(item.weight) || 400;
      const styleValue = String(item.style || "normal").toLowerCase();
      const safeStyle = ["normal", "italic", "oblique"].includes(styleValue) ? styleValue : "normal";
      const url = apiBase + "/fonts/" + file.split("/").map(encodeURIComponent).join("/");

      rules.push(`@font-face{font-family:"${cssFontString(family)}";src:url("${url}") format("${format}");font-weight:${Math.max(100, Math.min(900, Math.round(weight)))};font-style:${safeStyle};font-display:swap;}`);
    }

    if (!style) {
      style = document.createElement("style");
      style.id = "bmwc-web-fonts-style";
      document.head.appendChild(style);
    }
    style.textContent = rules.join("\n");
  }


  function applyMediaViewportConfig() {
    const root = document.getElementById("bmwc-root");
    if (!root) return;
    const configured = Number(state.config && state.config.imagePreviewMaxHeight);
    const box = document.getElementById("bmwc-messages");
    const viewportHeight = Math.max(160, Number(box && box.clientHeight ? box.clientHeight : window.innerHeight || 720));
    const viewportWidth = Math.max(180, Number(box && box.clientWidth ? box.clientWidth : window.innerWidth || 480));
    const viewportCap = Math.max(160, Math.floor(viewportHeight - 72));
    const configuredPx = Number.isFinite(configured) && configured > 0 ? Math.floor(configured) : viewportCap;
    const px = Math.max(120, Math.min(configuredPx, viewportCap));
    root.style.setProperty("--bmwc-media-viewport-max-height", px + "px");
    root.style.setProperty("--bmwc-media-viewport-max-width", Math.floor(viewportWidth) + "px");
  }

  function applyFontSizeConfig() {
    const root = document.getElementById("bmwc-root");
    if (!root || !state.config) return;

    const userSize = state.config.uiUserPreferencesControl === false ? null : (state.liveUserFontSize || savedUserFontSize());
    if (userSize == null) {
      root.style.setProperty("--bmwc-font-size", fontPx(state.config.uiFontSize, 13));
      root.style.setProperty("--bmwc-message-font-size", fontPx(state.config.uiMessageFontSize, Number(state.config.uiFontSize) || 13));
      root.style.setProperty("--bmwc-input-font-size", fontPx(state.config.uiInputFontSize, Number(state.config.uiFontSize) || 13));
      root.style.setProperty("--bmwc-button-font-size", fontPx(state.config.uiButtonFontSize, 12));
      root.style.setProperty("--bmwc-badge-font-size", fontPx(state.config.uiBadgeFontSize, 10));
      return;
    }

    root.style.setProperty("--bmwc-font-size", fontPx(userSize, 13));
    root.style.setProperty("--bmwc-message-font-size", fontPx(userSize, 13));
    root.style.setProperty("--bmwc-input-font-size", fontPx(userSize, 13));
    root.style.setProperty("--bmwc-button-font-size", fontPx(Math.max(8, userSize - 1), 12));
    root.style.setProperty("--bmwc-badge-font-size", fontPx(Math.max(8, userSize - 3), 10));
  }

  function clampOpacity(value) {
    value = Number(value);
    if (!Number.isFinite(value)) value = 0.92;
    return String(Math.max(0.10, Math.min(1, value)));
  }

  function normalizedTheme(value) {
    value = String(value || "system").toLowerCase().trim();
    if (value === "high_contrast" || value === "highcontrast" || value === "contrast") return "high-contrast";
    if (value === "dark" || value === "light" || value === "system" || value === "high-contrast") return value;
    return "system";
  }

  function savedUserTheme() {
    return normalizedTheme(localStorage.getItem("bmwc.userTheme") || "");
  }

  function resetVisualUserPreferencesForTheme() {
    state.liveUserOpacity = null;
    localStorage.removeItem("bmwc.userOpacity");
    localStorage.removeItem("bmwc.userFontSize");
    localStorage.removeItem("bmwc.userFontFamily");
    localStorage.removeItem("bmwc.userTextColor");
    localStorage.removeItem("bmwc.userUiTextColor");
    localStorage.removeItem("bmwc.userTextShadowMode");
    localStorage.removeItem("bmwc.userTextShadowCustom");
    localStorage.removeItem("bmwc.userBackgroundColor");
    localStorage.removeItem("bmwc.userInputBackgroundColor");
  }

  function setUserTheme(value) {
    const theme = normalizedTheme(value || "");
    if (theme) localStorage.setItem("bmwc.userTheme", theme);
    else localStorage.removeItem("bmwc.userTheme");
    resetVisualUserPreferencesForTheme();
    applyFontSizeConfig();
    applyThemeConfig();
    refreshRenderedMessagesForLocale();
    scheduleVirtualRender({preserveScroll: true, stickToBottom: false, allowDuringMedia: true, deferDuringScroll: false, deferDuringMediaLayout: false});
    if (state.prefsModalOpen) {
      openUserPreferencesModal(true);
    }
  }

  function themeFromText(value) {
    value = String(value || "").toLowerCase();
    if (!value) return "";
    if (value.includes("high") || value.includes("contrast")) return "high-contrast";
    if (value.includes("light")) return "light";
    if (value.includes("dark")) return "dark";
    return "";
  }

  function detectBlueMapTheme() {
    try {
      const pdoc = window.parent && window.parent.document;
      if (pdoc) {
        const html = pdoc.documentElement;
        const body = pdoc.body;
        const text = [
          html && html.className,
          body && body.className,
          html && html.getAttribute("data-theme"),
          body && body.getAttribute("data-theme"),
          html && html.getAttribute("data-bs-theme"),
          body && body.getAttribute("data-bs-theme"),
          html && html.style && html.style.colorScheme,
          body && body.style && body.style.colorScheme
        ].join(" ");
        const fromDom = themeFromText(text);
        if (fromDom) return fromDom;
      }
    } catch (_) {}

    try {
      const storages = [window.parent && window.parent.localStorage, window.localStorage].filter(Boolean);
      for (const storage of storages) {
        for (let i = 0; i < storage.length; i++) {
          const key = storage.key(i) || "";
          if (!/theme|color|appearance|dark|light|bluemap/i.test(key)) continue;
          const value = storage.getItem(key);
          const found = themeFromText(key + " " + value);
          if (found) return found;
        }
      }
    } catch (_) {}

    return "";
  }

  function effectiveTheme() {
    const c = state.config || {};
    const userTheme = (!c || c.uiUserPreferencesControl !== false) ? savedUserTheme() : "";
    if (userTheme) return userTheme;
    if (c.uiSyncBlueMapTheme) {
      const bm = detectBlueMapTheme();
      if (bm) return bm;
    }
    return normalizedTheme(c.uiTheme || "system");
  }

  function savedUserOpacity() {
    const v = Number(localStorage.getItem("bmwc.userOpacity"));
    return Number.isFinite(v) && v >= 0.10 && v <= 1 ? v : null;
  }

  function effectiveOpacity() {
    const c = state.config || {};
    const user = c.uiUserPreferencesControl === false ? null : (state.liveUserOpacity || savedUserOpacity());
    return user == null ? clampOpacity(c.uiOpacity) : clampOpacity(user);
  }

  function setUserOpacity(value, persist = true) {
    value = Number(value);
    if (!Number.isFinite(value)) return;
    value = Math.max(0.10, Math.min(1, value));
    state.liveUserOpacity = value;
    if (persist) {
      localStorage.setItem("bmwc.userOpacity", String(value.toFixed(2)));
    }
    applyThemeConfig();
  }

  function resetUserOpacity() {
    state.liveUserOpacity = null;
    localStorage.removeItem("bmwc.userOpacity");
    applyThemeConfig();
  }

  function normalizeHexColor(value) {
    value = String(value || "").trim();
    if (/^#[0-9a-fA-F]{6}$/.test(value)) return value.toLowerCase();
    if (/^#[0-9a-fA-F]{3}$/.test(value)) {
      return ("#" + value.slice(1).split("").map(ch => ch + ch).join("")).toLowerCase();
    }
    return "";
  }

  function hexToRgbList(hex) {
    hex = normalizeHexColor(hex);
    if (!hex) return "";
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255].join(", ");
  }

  function savedUserTextColor() {
    return normalizeHexColor(localStorage.getItem("bmwc.userTextColor") || "");
  }

  function savedUserUiTextColor() {
    return normalizeHexColor(localStorage.getItem("bmwc.userUiTextColor") || "");
  }

  function normalizeTextShadowMode(value) {
    value = String(value || "").trim().toLowerCase();
    if (["none", "auto", "dark", "light", "custom"].includes(value)) return value;
    return "auto";
  }

  function sanitizeTextShadow(value) {
    value = String(value || "").trim();
    if (!value) return "";
    if (value.length > 120) value = value.slice(0, 120);
    if (/url\s*\(/i.test(value)) return "";
    if (!/^[#a-zA-Z0-9(),.%\s+\-]*$/.test(value)) return "";
    return value;
  }

  function clampShadowNumber(value, min, max, fallback, digits = 0) {
    value = Number(value);
    if (!Number.isFinite(value)) value = fallback;
    value = Math.max(min, Math.min(max, value));
    return Number(formatDecimalNumber(value, digits));
  }

  function hexFromRgb(r, g, b) {
    const toHex = n => Math.max(0, Math.min(255, Math.round(Number(n) || 0))).toString(16).padStart(2, "0");
    return ("#" + toHex(r) + toHex(g) + toHex(b)).toLowerCase();
  }

  function rgbFromHex(hex) {
    hex = normalizeHexColor(hex);
    if (!hex) return {r: 0, g: 0, b: 0};
    const n = parseInt(hex.slice(1), 16);
    return {r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255};
  }

  function parseTextShadowParts(value) {
    value = sanitizeTextShadow(value) || "0 1px 2px rgba(0, 0, 0, 0.85)";
    const parts = {x: 0, y: 1, blur: 2, color: "#000000", opacity: 85};
    const rgba = value.match(/rgba?\s*\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)(?:\s*,\s*([0-9.]+)\s*)?\)/i);
    if (rgba) {
      parts.color = hexFromRgb(rgba[1], rgba[2], rgba[3]);
      parts.opacity = clampShadowNumber((rgba[4] == null ? 1 : Number(rgba[4])) * 100, 0, 100, 85);
    } else {
      const hex = value.match(/#[0-9a-fA-F]{3,6}/);
      if (hex) parts.color = normalizeHexColor(hex[0]) || parts.color;
    }
    const numeric = value.replace(/rgba?\s*\([^)]*\)/ig, " ").replace(/#[0-9a-fA-F]{3,6}/g, " ").match(/-?\d+(?:\.\d+)?/g) || [];
    if (numeric.length >= 1) parts.x = clampShadowNumber(numeric[0], -12, 12, parts.x, 2);
    if (numeric.length >= 2) parts.y = clampShadowNumber(numeric[1], -12, 12, parts.y, 2);
    if (numeric.length >= 3) parts.blur = clampShadowNumber(numeric[2], 0, 24, parts.blur, 2);
    return parts;
  }

  function buildTextShadowFromParts(parts) {
    parts = parts || {};
    const x = clampShadowNumber(parts.x, -12, 12, 0, 2);
    const y = clampShadowNumber(parts.y, -12, 12, 1, 2);
    const blur = clampShadowNumber(parts.blur, 0, 24, 2, 2);
    const opacity = clampShadowNumber(parts.opacity, 0, 100, 85) / 100;
    const rgb = rgbFromHex(parts.color || "#000000");
    return `${pxLabel(x)} ${pxLabel(y)} ${pxLabel(blur)} rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity.toFixed(2).replace(/0+$/, "").replace(/\.$/, "")})`;
  }

  function savedUserTextShadowMode() {
    return normalizeTextShadowMode(localStorage.getItem("bmwc.userTextShadowMode") || "");
  }

  function savedUserTextShadowCustom() {
    return sanitizeTextShadow(localStorage.getItem("bmwc.userTextShadowCustom") || "");
  }

  function savedUserBackgroundColor() {
    return normalizeHexColor(localStorage.getItem("bmwc.userBackgroundColor") || "");
  }

  function savedUserInputBackgroundColor() {
    return normalizeHexColor(localStorage.getItem("bmwc.userInputBackgroundColor") || "");
  }

  function setUserTextColor(value) {
    value = normalizeHexColor(value);
    if (value) localStorage.setItem("bmwc.userTextColor", value);
    else localStorage.removeItem("bmwc.userTextColor");
    applyThemeConfig();
  }

  function setUserUiTextColor(value) {
    value = normalizeHexColor(value);
    if (value) localStorage.setItem("bmwc.userUiTextColor", value);
    else localStorage.removeItem("bmwc.userUiTextColor");
    applyThemeConfig();
  }

  function setUserTextShadowMode(value) {
    value = normalizeTextShadowMode(value);
    localStorage.setItem("bmwc.userTextShadowMode", value);
    applyThemeConfig();
  }

  function setUserTextShadowCustom(value) {
    value = sanitizeTextShadow(value);
    if (value) localStorage.setItem("bmwc.userTextShadowCustom", value);
    else localStorage.removeItem("bmwc.userTextShadowCustom");
    applyThemeConfig();
  }

  function setUserBackgroundColor(value) {
    value = normalizeHexColor(value);
    if (value) localStorage.setItem("bmwc.userBackgroundColor", value);
    else localStorage.removeItem("bmwc.userBackgroundColor");
    applyThemeConfig();
  }

  function setUserInputBackgroundColor(value) {
    value = normalizeHexColor(value);
    if (value) localStorage.setItem("bmwc.userInputBackgroundColor", value);
    else localStorage.removeItem("bmwc.userInputBackgroundColor");
    applyThemeConfig();
  }

  function resetUserTextColor() {
    localStorage.removeItem("bmwc.userTextColor");
    applyThemeConfig();
  }

  function resetUserUiTextColor() {
    localStorage.removeItem("bmwc.userUiTextColor");
    applyThemeConfig();
  }

  function resetUserTextShadowMode() {
    localStorage.removeItem("bmwc.userTextShadowMode");
    applyThemeConfig();
  }

  function resetUserTextShadowCustom() {
    localStorage.removeItem("bmwc.userTextShadowCustom");
    applyThemeConfig();
  }

  function resetUserBackgroundColor() {
    localStorage.removeItem("bmwc.userBackgroundColor");
    applyThemeConfig();
  }

  function resetUserInputBackgroundColor() {
    localStorage.removeItem("bmwc.userInputBackgroundColor");
    applyThemeConfig();
  }

  function fallbackTextColorForTheme() {
    const theme = effectiveTheme();
    if (theme === "light") return "#151922";
    return "#ffffff";
  }

  function fallbackBackgroundColorForTheme() {
    const theme = effectiveTheme();
    if (theme === "light") return "#f8fafc";
    return "#121216";
  }

  function fallbackInputBackgroundColorForTheme() {
    const theme = effectiveTheme();
    if (theme === "light") return "#ffffff";
    return "#000000";
  }

  function fallbackUiTextColorForTheme() {
    return normalizeHexColor(state.config && state.config.uiUiTextColor) || fallbackTextColorForTheme();
  }

  function effectiveUserTextColor() {
    return savedUserTextColor() || normalizeHexColor(state.config && state.config.uiTextColor) || fallbackTextColorForTheme();
  }

  function effectiveUserUiTextColor() {
    return savedUserUiTextColor() || fallbackUiTextColorForTheme();
  }

  function effectiveUserBackgroundColor() {
    return savedUserBackgroundColor() || fallbackBackgroundColorForTheme();
  }

  function effectiveUserInputBackgroundColor() {
    return savedUserInputBackgroundColor() || normalizeHexColor(state.config && state.config.uiInputBackgroundColor) || fallbackInputBackgroundColorForTheme();
  }

  function colorBrightness(hex) {
    hex = normalizeHexColor(hex);
    if (!hex) return 255;
    const n = parseInt(hex.slice(1), 16);
    const r = (n >> 16) & 255;
    const g = (n >> 8) & 255;
    const b = n & 255;
    return (r * 299 + g * 587 + b * 114) / 1000;
  }

  function textShadowCssForMode(mode, custom, sampleColor) {
    mode = normalizeTextShadowMode(mode);
    custom = sanitizeTextShadow(custom);
    if (mode === "none") return "none";
    if (mode === "custom") return custom || "0 1px 2px rgba(0, 0, 0, 0.85)";
    if (mode === "light") return "0 1px 2px rgba(255, 255, 255, 0.85)";
    if (mode === "dark") return "0 1px 2px rgba(0, 0, 0, 0.85)";
    // Auto shadow should not make the light theme fuzzy. Dark theme keeps the
    // original shadowed look; light theme uses crisp text unless the user
    // explicitly selects a shadow preset.
    if (effectiveTheme() === "light") return "none";
    const sample = normalizeHexColor(sampleColor) || fallbackTextColorForTheme();
    return colorBrightness(sample) >= 150 ? "0 1px 2px rgba(0, 0, 0, 0.85)" : "0 1px 2px rgba(255, 255, 255, 0.85)";
  }

  function effectiveUserTextShadowMode() {
    const prefsEnabled = !state.config || state.config.uiUserPreferencesControl !== false;
    return normalizeTextShadowMode((prefsEnabled ? savedUserTextShadowMode() : "") || (state.config && state.config.uiTextShadowMode) || "auto");
  }

  function effectiveUserTextShadowCustom() {
    const prefsEnabled = !state.config || state.config.uiUserPreferencesControl !== false;
    return sanitizeTextShadow((prefsEnabled ? savedUserTextShadowCustom() : "") || (state.config && state.config.uiTextShadowCustom) || "0 1px 2px rgba(0, 0, 0, 0.85)");
  }

  function effectiveUserTextShadowCss() {
    return textShadowCssForMode(effectiveUserTextShadowMode(), effectiveUserTextShadowCustom(), effectiveUserTextColor() || fallbackTextColorForTheme());
  }

  function applyUserColorOverrides(root) {
    if (!root || !state.config) return;
    const prefsEnabled = state.config.uiUserPreferencesControl !== false;
    const text = (prefsEnabled ? savedUserTextColor() : "") || normalizeHexColor(state.config && state.config.uiTextColor);
    const uiText = (prefsEnabled ? savedUserUiTextColor() : "") || normalizeHexColor(state.config && state.config.uiUiTextColor);
    const shadowMode = (prefsEnabled ? savedUserTextShadowMode() : "") || (state.config && state.config.uiTextShadowMode) || "auto";
    const shadowCustom = (prefsEnabled ? savedUserTextShadowCustom() : "") || (state.config && state.config.uiTextShadowCustom) || "0 1px 2px rgba(0, 0, 0, 0.85)";
    const shadowCss = textShadowCssForMode(shadowMode, shadowCustom, text || fallbackTextColorForTheme());
    const uiShadowCss = textShadowCssForMode(shadowMode, shadowCustom, uiText || text || fallbackUiTextColorForTheme());
    const bg = prefsEnabled ? savedUserBackgroundColor() : "";
    const inputBg = (prefsEnabled ? savedUserInputBackgroundColor() : "") || normalizeHexColor(state.config && state.config.uiInputBackgroundColor);
    if (text) {
      root.style.setProperty("--bmwc-text-color", text);
    } else {
      root.style.removeProperty("--bmwc-text-color");
    }
    if (uiText) {
      root.style.setProperty("--bmwc-ui-color", uiText);
      root.style.setProperty("--bmwc-ui-text-color", uiText);
      root.style.setProperty("--bmwc-button-text", uiText);
      root.style.setProperty("--bmwc-muted-color", uiText);
    } else {
      root.style.removeProperty("--bmwc-ui-color");
      root.style.removeProperty("--bmwc-ui-text-color");
      root.style.removeProperty("--bmwc-button-text");
      root.style.removeProperty("--bmwc-muted-color");
    }
    if (bg) {
      const rgb = hexToRgbList(bg);
      if (rgb) {
        root.style.setProperty("--bmwc-panel-bg-rgb", rgb);
        root.style.setProperty("--bmwc-modal-bg-rgb", rgb);
      }
    } else {
      root.style.removeProperty("--bmwc-panel-bg-rgb");
      root.style.removeProperty("--bmwc-modal-bg-rgb");
    }
    root.style.setProperty("--bmwc-text-shadow", shadowCss || "none");
    root.style.setProperty("--bmwc-ui-text-shadow", uiShadowCss || shadowCss || "none");
    if (inputBg) {
      root.style.setProperty("--bmwc-input-bg", inputBg);
    } else {
      root.style.removeProperty("--bmwc-input-bg");
    }
  }

  function applyThemeConfig() {
    const root = document.getElementById("bmwc-root");
    if (!root || !state.config) return;

    const theme = effectiveTheme();
    root.classList.remove("bmwc-theme-system", "bmwc-theme-dark", "bmwc-theme-light", "bmwc-theme-high-contrast");
    root.classList.add("bmwc-theme-" + theme);
    root.style.setProperty("--bmwc-panel-opacity", effectiveOpacity());

    const userFamily = state.config.uiUserPreferencesControl === false ? "" : savedUserFontFamily();
    const family = String(userFamily || state.config.uiFontFamily || "").trim();
    root.style.fontFamily = family || "";
    applyUserColorOverrides(root);

    if (state.themeSyncTimer) {
      clearInterval(state.themeSyncTimer);
      state.themeSyncTimer = null;
    }
    if (state.config.uiSyncBlueMapTheme) {
      state.themeSyncTimer = setInterval(() => {
        const current = effectiveTheme();
        if (!root.classList.contains("bmwc-theme-" + current)) {
          applyThemeConfig();
        }
      }, 2000);
    }
  }

  async function loadConfig() {
    try {
      const data = await api("/config");
      state.config = data;
      const pageSize = Number(data.historyPageSize);
      state.historyPageSize = Number.isFinite(pageSize) && pageSize >= 0 ? Math.floor(pageSize) : 20;
      state.serverVersion = data.serverVersion || "";
      applyWindowSizeConfig();
      applyWebFontsConfig();
      applyFontSizeConfig();
    applyMediaViewportConfig();
      applyThemeConfig();
      updatePipButton();
      updateGuestVisibility();
      const msg = document.getElementById("bmwc-message");
      if (msg) {
        const inputLimit = normalizeCommandMaxLength(data.maxMessageInputLength, 0);
        if (inputLimit > 0) msg.maxLength = inputLimit;
        else msg.removeAttribute("maxlength");
      }
      state.commandMaxLength = normalizeCommandMaxLength(data.commandsMaxLength, 0);
      state.emojiEnabled = data.emojiEnabled !== false;
      state.emojiShowButton = data.emojiShowButton !== false;
      state.emojiRenderSizePx = Math.max(16, Math.min(1024, Number(data.emojiRenderSizePx) || 32));
      state.emojiPickerSizePx = Math.max(24, Math.min(1024, Number(data.emojiPickerSizePx) || 44));
      applyEmojiPickerSize();
      state.emojiMessageTokenLimit = Math.max(0, Math.floor(Number(data.emojiMessageTokenLimit) || 0));
      state.emojiTokenFormat = normalizeEmojiTokenFormat(data.emojiTokenFormat);
      const fileInput = document.getElementById("bmwc-file");
      if (fileInput) fileInput.accept = uploadAcceptList();
      updateLoginState();
      ensureGuestNameForConfig();
      const guestNameInput = document.getElementById("bmwc-guest-name");
      if (guestNameInput) guestNameInput.value = state.guestName;
      await refreshCaptcha();
      await loadCommands();
    } catch (e) {
      console.warn("BlueMapWebChat config failed", e);
    }
  }


  function hideCaptchaUi() {
    const row = document.getElementById("bmwc-captcha-row");
    const a = document.getElementById("bmwc-captcha-a");
    const q = document.getElementById("bmwc-captcha-q");
    if (row) row.classList.remove("bmwc-show");
    if (a) a.value = "";
    if (q) q.textContent = "";
    state.captcha = null;
  }

  async function refreshCaptcha(force = false) {
    const row = document.getElementById("bmwc-captcha-row");
    if (!row || !state.config) return;
    if (state.token || !state.config.captchaEnabled) {
      hideCaptchaUi();
      return;
    }

    // If server is configured for one captcha pass per guest session, hide captcha after success.
    if (!force && !state.config.captchaRequireOnEachMessage && state.captchaPass) {
      hideCaptchaUi();
      return;
    }

    try {
      const data = await api("/captcha");
      if (data.enabled) {
        state.captcha = data;
        row.classList.add("bmwc-show");
        document.getElementById("bmwc-captcha-q").textContent = data.question;
        document.getElementById("bmwc-captcha-a").value = "";
      }
    } catch (e) {
      console.warn("captcha failed", e);
    }
  }

  function historyQuery(mode) {
    const configured = Number(state.historyPageSize);
    const limit = Number.isFinite(configured) && configured >= 0 ? Math.floor(configured) : 20;
    let url = "/history?limit=" + encodeURIComponent(limit);
    if ((mode === true || mode === "older") && state.historyOldestId) url += "&before=" + encodeURIComponent(state.historyOldestId);
    if (mode === "newer" && state.historyNewestId) url += "&after=" + encodeURIComponent(state.historyNewestId);
    return url;
  }


  function messageRefreshKey(msg) {
    if (!msg) return "";
    return [
      msg.id || "",
      msg.time || msg.timestamp || msg.createdAt || "",
      msg.sender || "",
      msg.realSender || "",
      msg.playerUuid || "",
      msg.role || "",
      msg.source || "",
      msg.message || msg.text || "",
      msg.replyToId || "",
      msg.replyToSender || "",
      msg.replyToPreview || "",
      msg.hidden ? "1" : "0"
    ].map(v => String(v)).join("\u001f");
  }

  function latestHistoryPageUnchanged(freshMessages) {
    if (!Array.isArray(freshMessages)) return false;
    if (!state.messages.length && freshMessages.length === 0) return true;
    if (freshMessages.length === 0) return state.messages.length === 0;
    if (state.messages.length < freshMessages.length) return false;
    const currentTail = state.messages.slice(state.messages.length - freshMessages.length);
    for (let i = 0; i < freshMessages.length; i++) {
      if (messageRefreshKey(currentTail[i]) !== messageRefreshKey(freshMessages[i])) return false;
    }
    return true;
  }

  function installHistoryPaging() {
    const box = document.getElementById("bmwc-messages");
    if (!box || box.dataset.pagingInstalled === "1") return;
    box.dataset.pagingInstalled = "1";

    const installScrollInteractionEvents = () => {
      const isInteractiveScrollTarget = target => {
        try {
          return !!(target && target.closest && target.closest(
            "[data-delete], [data-pin], [data-unpin], [data-open-pins], " +
            "a.bmwc-link, a.bmwc-image-link, button, input, textarea, select, " +
            ".bmwc-media-card, .bmwc-youtube-card, .bmwc-social-card, .bmwc-social-embed"
          ));
        } catch (_) {
          return false;
        }
      };

      const cancelReplyJumpOnUserScrollInput = () => {
        cancelReplyJumpForUserScroll("user-scroll-input-capture");
      };
      box.addEventListener("wheel", cancelReplyJumpOnUserScrollInput, {capture: true, passive: true});
      box.addEventListener("touchmove", cancelReplyJumpOnUserScrollInput, {capture: true, passive: true});
      box.addEventListener("keydown", event => {
        if (["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "].includes(event.key)) cancelReplyJumpOnUserScrollInput();
      }, {capture: true, passive: true});

      box.addEventListener("wheel", (ev) => {
        markDirectScrollInput();
        rememberUserTopIntent(box);
        if (ev.deltaY < 0) {
          markHistoryEndTopUserIntent(box, "wheel-top");
          requestOlderHistoryFromTopInput("wheel");
        } else if (ev.deltaY > 0) {
          markHistoryEndBottomUserIntent(box, "wheel-bottom");
          requestNewerHistoryFromBottomInput("wheel");
        }
        setTimeout(() => maybeShowHistoryEndNoticeFromUserScroll(box, "wheel"), 0);
      }, {passive: true});
      box.addEventListener("keydown", (ev) => {
        if (["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "].includes(ev.key)) {
          markDirectScrollInput();
          rememberUserTopIntent(box);
          if (["ArrowUp", "PageUp", "Home"].includes(ev.key)) markHistoryEndTopUserIntent(box, "key-top");
          if (["ArrowDown", "PageDown", "End", " "].includes(ev.key)) {
            markHistoryEndBottomUserIntent(box, "key-bottom");
            setTimeout(() => requestNewerHistoryFromBottomInput("key"), 0);
          }
          setTimeout(() => maybeShowHistoryEndNoticeFromUserScroll(box, "key"), 0);
        }
      }, {passive: true});
      let historyTouchStartY = null;
      box.addEventListener("touchstart", (ev) => {
        historyTouchStartY = ev.touches && ev.touches[0] ? ev.touches[0].clientY : null;
        if (!isInteractiveScrollTarget(ev.target)) beginTouchScrollInteraction();
      }, {passive: true});
      box.addEventListener("touchmove", (ev) => {
        markDirectScrollInput();
        rememberUserTopIntent(box);
        setTimeout(() => maybeShowHistoryEndNoticeFromUserScroll(box, "touch"), 0);
        const y = ev.touches && ev.touches[0] ? ev.touches[0].clientY : null;
        if (historyTouchStartY != null && y != null && y - historyTouchStartY > 18) {
          markHistoryEndTopUserIntent(box, "touch-top");
          requestOlderHistoryFromTopInput("touch");
        } else if (historyTouchStartY != null && y != null && historyTouchStartY - y > 18) {
          markHistoryEndBottomUserIntent(box, "touch-bottom");
          requestNewerHistoryFromBottomInput("touch");
        }
      }, {passive: true});
      box.addEventListener("touchend", () => { historyTouchStartY = null; endTouchScrollInteraction(); }, {passive: true});
      box.addEventListener("touchcancel", () => { historyTouchStartY = null; endTouchScrollInteraction(); }, {passive: true});
      box.addEventListener("pointerdown", (ev) => {
        if (ev.pointerType === "touch" && !isInteractiveScrollTarget(ev.target)) beginTouchScrollInteraction();
        const rect = box.getBoundingClientRect();
        const nearVerticalScrollbar = ev.clientX >= rect.right - 18;
        const nearHorizontalScrollbar = ev.clientY >= rect.bottom - 18;
        if (nearVerticalScrollbar || nearHorizontalScrollbar) {
          state.scrollbarDragActive = true;
          markDirectScrollInput();
          markHistoryEndTopUserIntent(box, "scrollbar-down");
        }
      }, {passive: true});
      window.addEventListener("pointerup", (ev) => {
        if (ev.pointerType === "touch") endTouchScrollInteraction();
        if (!state.scrollbarDragActive) return;
        state.scrollbarDragActive = false;
        markScrollInteraction();
        markHistoryEndTopUserIntent(box, "scrollbar");
        setTimeout(() => maybeShowHistoryEndNoticeFromUserScroll(box, "scrollbar"), 0);
      }, {capture: true, passive: true});
      window.addEventListener("pointercancel", (ev) => {
        if (ev.pointerType === "touch") endTouchScrollInteraction();
        if (!state.scrollbarDragActive) return;
        state.scrollbarDragActive = false;
        markScrollInteraction();
        setTimeout(() => maybeShowHistoryEndNoticeFromUserScroll(box, "scrollbar-cancel"), 0);
      }, {capture: true, passive: true});
      window.addEventListener("blur", () => {
        endTouchScrollInteraction();
        if (!state.scrollbarDragActive) return;
        state.scrollbarDragActive = false;
        markScrollInteraction();
        setTimeout(() => maybeShowHistoryEndNoticeFromUserScroll(box, "scrollbar-blur"), 0);
      });
    };
    const installNonScrollUiActionEvents = () => {
      const root = document.getElementById("bmwc-root");
      if (!root || root.dataset.nonScrollUiActionInstalled === "1") return;
      root.dataset.nonScrollUiActionInstalled = "1";
      const markIfUiControl = (ev) => {
        const target = ev && ev.target;
        try {
          if (target && target.closest && target.closest(
            "button, input, textarea, select, a, [data-delete], [data-pin], [data-unpin], [data-pin-move], [data-open-pins], " +
            ".bmwc-modal, .bmwc-modal-backdrop, .bmwc-login, .bmwc-admin-modal, .bmwc-preferences-modal, " +
            ".bmwc-media-card, .bmwc-youtube-card, .bmwc-social-card, .bmwc-social-embed"
          )) markNonScrollUiAction();
        } catch (_) {}
      };
      root.addEventListener("pointerdown", markIfUiControl, true);
      root.addEventListener("click", markIfUiControl, true);
      root.addEventListener("keydown", markIfUiControl, true);
    };

    installScrollInteractionEvents();
    installNonScrollUiActionEvents();

    box.addEventListener("scroll", () => {
      if (state.minimized || guestChatHidden()) return;
      const now = Date.now();
      const directScrollInputActive = now - Number(state.lastDirectScrollInputAt || 0) <= Math.max(220, scrollInteractionIdleMs() + 120);
      let replyProgrammaticScroll = now < Number(state.replyJumpUntil || 0);
      if (replyProgrammaticScroll && !directScrollInputActive && replyJumpLooksUserMoved(box, Number(state.replyJumpStartedAt || 0))) {
        cancelReplyJumpForUserScroll("scroll-drift");
        replyProgrammaticScroll = false;
      }
      const programmaticScroll = !directScrollInputActive && (now < Number(state.suppressScrollRenderUntil || 0) || replyProgrammaticScroll);
      const keepBottom = isAutoFollowBottom(box) && !state.historyHasAfter;
      const preloadThreshold = historyPreloadThresholdPx(box);
      const shouldLoadOlder = box.scrollTop <= preloadThreshold;
      const shouldLoadNewer = !!state.historyHasAfter && bottomGapPx(box) <= preloadThreshold;
      refreshScrollAffordances(box);
      if (!programmaticScroll) {
        if (shouldLoadOlder) markHistoryEndTopUserIntent(box, "scroll-top");
        if (isAtHistoryBottomRequestZone(box)) markHistoryEndBottomUserIntent(box, "scroll-bottom");
        maybeShowHistoryEndNoticeFromUserScroll(box, "scroll");
      }

      if (!state.suppressAutoFollowUpdate && !programmaticScroll) {
        state.lastUserScrollAt = Date.now();
        state.autoFollowLatest = keepBottom && Date.now() >= Number(state.preventBottomStickUntil || 0);
        markScrollInteraction();
      } else {
        state.autoFollowLatest = keepBottom && Date.now() >= Number(state.preventBottomStickUntil || 0);
      }

      // Programmatic bottom corrections can emit scroll events for several
      // frames. Do not turn those events into more virtual renders unless they
      // actually reached the top-history preload zone.
      if (programmaticScroll && (replyProgrammaticScroll || !shouldLoadOlder)) return;

      const visibleMediaLocked = isActiveMediaVisible();
      // During a real scroll event, the physical position is the source of truth.
      // A stale autoFollowLatest=true must not keep dragging the viewport back
      // to the bottom after the user starts scrolling upward.
      if (visibleMediaLocked) {
        // Keep the visible player DOM intact while still updating the virtual
        // range. If the viewport is at the latest message, keep bottom-follow
        // semantics instead of preserving an old scrollTop.
        scheduleVirtualRender({
          preserveScroll: !keepBottom,
          stickToBottom: keepBottom,
          allowDuringMedia: true,
          allowDuringVisibleMedia: true,
          deferDuringScroll: false,
          deferDuringMediaLayout: false
        });
      } else if (isScrollInteractionActive()) {
        deferRenderUntilScrollIdle({preserveScroll: !keepBottom, stickToBottom: keepBottom, allowDuringMedia: true, allowDuringVisibleMedia: true});
      } else {
        scheduleVirtualRender({preserveScroll: !keepBottom, stickToBottom: keepBottom, allowDuringMedia: true, allowDuringVisibleMedia: true});
      }
      if (shouldLoadOlder) {
        // Reaching the top is the user's explicit request for older history,
        // but route it through the same top-load throttle used by wheel/touch.
        // Directly calling loadHistory() here lets repeated scroll events start
        // a fetch -> scrollTop correction -> heavy mutation loop.
        requestOlderHistoryFromTopInput("scroll-top");
      }
      if (shouldLoadNewer) {
        // Reply-jump can place the viewport in a middle slice. Reaching the
        // bottom of that slice should page newer messages, not pretend that this
        // is already the latest chat position.
        requestNewerHistoryFromBottomInput("scroll-bottom");
      }
    }, {passive: true});

    if (window.ResizeObserver && !state.virtualResizeObserver) {
      state.virtualResizeObserver = new ResizeObserver(() => {
        const keepBottom = isAutoFollowBottom(box) && !state.historyHasAfter;
        scheduleVirtualRender({preserveScroll: !keepBottom, stickToBottom: keepBottom, allowDuringMedia: true, allowDuringVisibleMedia: true, deferDuringScroll: false});
        if (keepBottom) {
          state.historyViewportFillAttempts = 0;
          scheduleHistoryViewportFill("resize");
        }
      });
      state.virtualResizeObserver.observe(box);
    }
  }

  async function loadHistory(older = false, options = {}) {
    if (state.historyLoading) return;
    if (older && !state.historyHasMore) return;
    if (older && isScrollInteractionActive() && !options.forceDuringScroll) {
      requestOlderHistoryAfterScrollIdle();
      return;
    }
    // Do not skip fetching fresh history just because a YouTube/video/audio
    // player is open. Rendering can preserve active media nodes, but skipping
    // the fetch leaves the chat stale after focus/visibility resume.

    const box = document.getElementById("bmwc-messages");
    const prevHeight = box ? box.scrollHeight : 0;
    const prevTop = box ? box.scrollTop : 0;
    const wasNearBottom = box ? (isAutoFollowBottom(box) && !state.historyHasAfter) : true;
    const explicitLatestFollowBeforeHistory = box ? hasExplicitLatestFollow() : true;

    const historyLoadSeq = ++state.historyLoadSeq;
    state.historyLoading = true;
    state.historyLoadingSince = Date.now();
    if (older) markOlderHistorySettling();
    if (!older) state.historyViewportFillAttempts = 0;
    scheduleHistorySlowNotice(box, historyLoadSeq, older);
    let historyLoadSucceeded = false;
    try {
      const data = await api(historyQuery(older ? "older" : "latest"), {timeoutMs: older ? topHistoryBusyTimeoutMs() : 15000});
      if (historyLoadSeq !== state.historyLoadSeq) return;
      historyLoadSucceeded = true;
      if (data.ok && Array.isArray(data.messages)) {
        const nextHasBefore = data.hasBefore != null ? !!data.hasBefore : !!data.hasMore;
        const nextHasAfter = data.hasAfter != null ? !!data.hasAfter : false;
        const nextOldestId = data.oldestId || state.historyOldestId;
        const nextNewestId = data.newestId || state.historyNewestId;
        if (!older && state.messages.length > 0 && latestHistoryPageUnchanged(data.messages)) {
          state.historyHasMore = nextHasBefore;
          state.historyHasAfter = nextHasAfter;
          state.historyOldestId = nextOldestId;
          state.historyNewestId = nextNewestId || (state.messages[state.messages.length - 1] && state.messages[state.messages.length - 1].id) || "";
          refreshScrollAffordances(box);
          if (box && (options.forceLatest || bottomFollowAllowed(box, {forceLatestFollow: !!options.forceLatest}))) {
            state.autoFollowLatest = true;
            renderVirtualMessages({stickToBottom: true, preserveScroll: false, latestJump: !!options.forceLatest, forceLatestFollow: !!options.forceLatest, ignoreVisibleRangeProtection: !!options.forceLatest, allowDuringMedia: true, allowDuringVisibleMedia: true, deferDuringMediaLayout: false, deferDuringScroll: false, allowBottomStickDuringLock: !!options.forceLatest});
            stickToBottomStable(box);
            scheduleHistoryViewportFill("unchanged-history");
          }
          return;
        }
        if (older) {
          const lockedVisibleMedia = isActiveMediaVisible();
          const anchor = captureScrollAnchor(box);
          const beforeCount = state.messages.length;
          [...data.messages].reverse().forEach(msg => addMessage(msg, {prepend: true, skipRender: true, suppressAutoFollow: true}));
          const addedCount = Math.max(0, state.messages.length - beforeCount);
          state.historyHasMore = nextHasBefore;
          state.historyOldestId = nextOldestId;
          // Keep the existing newer-side state. A page fetched before the current
          // oldest message naturally has server-side hasAfter=true, but that does
          // not mean the current loaded range is missing newer messages.
          if (options.viewportFill && box && bottomFollowAllowed(box)) {
            renderVirtualMessages({stickToBottom: true, preserveScroll: false, forceLatestFollow: hasExplicitLatestFollow(), allowDuringMedia: true, allowDuringVisibleMedia: true, deferDuringMediaLayout: false});
            if (box) stickToBottomStable(box);
            scheduleHistoryViewportFill("viewport-fill");
          } else if (box && addedCount > 0) {
            // Pre-adjust by estimated height so the same viewport remains in the
            // virtual range before the final anchor correction runs. This avoids
            // the scroll thumb twitching at the very top while older history is appended.
            let estimatedAddedHeight = 0;
            for (let i = 0; i < addedCount; i++) estimatedAddedHeight += messageHeightAt(i);
            setScrollTopPreserved(box, prevTop + estimatedAddedHeight, {allowAwayFromBottom: true, reason: "older-history-preadjust"});
          }
          if (options.viewportFill && box && bottomFollowAllowed(box)) {
            // Already rendered above as a latest-chat view.
          } else if (lockedVisibleMedia && box) {
            // The user reached the top while a media player is visible. Add the
            // older records to the in-memory history and extend the virtual
            // spacers without destroying/recreating the currently visible
            // player iframe/video/audio DOM.
            state.virtualRenderStart += addedCount;
            state.virtualRenderEnd += addedCount;
            const sp = ensureVirtualSpacers(box);
            if (sp.top) sp.top.style.height = Math.max(0, Math.round(estimatedHeightUntil(state.virtualRenderStart))) + "px";
            if (sp.bottom) sp.bottom.style.height = Math.max(0, Math.round(estimatedTotalHeight() - estimatedHeightUntil(state.virtualRenderEnd))) + "px";
            preserveOlderHistoryViewportAfterRender(box, prevTop, prevHeight, anchor, "older-history-media");
            deferRenderBecauseMediaActive();
          } else {
            renderVirtualMessages({stickToBottom: false, preserveScroll: false, allowDuringMedia: true, allowDuringVisibleMedia: true, deferDuringMediaLayout: false, anchor});
            if (box && addedCount > 0) {
              preserveOlderHistoryViewportAfterRender(box, prevTop, prevHeight, anchor, "older-history");
            }
          }
        } else {
          state.messages = [];
          state.nextLocalMessageId = 1;
          data.messages.forEach(msg => addMessage(msg, {skipRender: true, suppressAutoFollow: true}));
          state.historyHasMore = nextHasBefore;
          state.historyHasAfter = nextHasAfter;
          state.historyOldestId = nextOldestId || (state.messages[0] && state.messages[0].id) || "";
          state.historyNewestId = nextNewestId || (state.messages[state.messages.length - 1] && state.messages[state.messages.length - 1].id) || "";
          const shouldFollowLatest = !!options.forceLatest || wasNearBottom || explicitLatestFollowBeforeHistory || state.messages.length === 0;
          state.autoFollowLatest = shouldFollowLatest;
          renderVirtualMessages({stickToBottom: shouldFollowLatest, preserveScroll: !shouldFollowLatest, latestJump: !!options.forceLatest, forceLatestFollow: !!options.forceLatest || explicitLatestFollowBeforeHistory, ignoreVisibleRangeProtection: !!options.forceLatest, allowDuringMedia: true, allowDuringVisibleMedia: true, deferDuringMediaLayout: false, deferDuringScroll: !!options.forceLatest ? false : undefined, allowBottomStickDuringLock: !!options.forceLatest});
          if (box && !shouldFollowLatest) setScrollTopPreserved(box, prevTop, {allowAwayFromBottom: true, reason: "latest-history-preserve"});
          if (shouldFollowLatest) scheduleHistoryViewportFill("initial-history");
        }
      }
    } catch (e) {
      console.warn("history failed", e);
      if (historyLoadSeq === state.historyLoadSeq) {
        clearHistorySlowNoticeTimer();
        if (older) {
          state.pendingOlderHistoryLoad = false;
          state.olderHistorySettleUntil = 0;
          if (state.pendingTopOlderHistoryTimer) {
            clearTimeout(state.pendingTopOlderHistoryTimer);
            state.pendingTopOlderHistoryTimer = null;
            state.pendingTopOlderHistoryDueAt = 0;
          }
          showHistoryFailureNotice(box, e);
        }
      }
    } finally {
      if (historyLoadSeq === state.historyLoadSeq) {
        clearHistorySlowNoticeTimer();
        if (String(state.historyEndNoticeKey || "history.end") === "history.loading") hideHistoryStatusNoticeIfActive();
        state.historyLoading = false;
        state.historyLoadingSince = 0;
        if (older && historyLoadSucceeded) {
          markOlderHistorySettling();
        } else if (older) {
          state.olderHistorySettleUntil = 0;
        }
        const finalBox = document.getElementById("bmwc-messages");
        if (historyLoadSucceeded && older && finalBox && state.historyHasMore && (isAtHistoryTopRequestZone(finalBox) || hasHistoryTopEdgeIntent())) {
          // Some browsers do not emit another scroll/wheel event once the user is
          // already pinned to the physical top. If there is still older history
          // and the user's recent edge intent is still active, queue another
          // guarded pass instead of leaving the viewport apparently stuck.
          scheduleTopOlderHistoryRetry("older-continuation");
        }
        const hasPendingHistoryEndTopIntent = Number(state.historyEndNoticePendingUserTopUntil || 0) > Date.now();
        const hasPendingHistoryEndBottomIntent = Number(state.historyEndNoticePendingUserBottomUntil || 0) > Date.now();
        if (finalBox && (older || hasPendingHistoryEndTopIntent || hasPendingHistoryEndBottomIntent)) {
          setTimeout(() => maybeShowHistoryEndNoticeFromUserScroll(finalBox, older ? "history-loaded" : "history-refreshed"), 0);
          setTimeout(() => maybeShowHistoryEndNoticeFromUserScroll(finalBox, older ? "history-loaded-late" : "history-refreshed-late"), 120);
        }
        if (historyLoadSucceeded) scheduleViewportMaintenance(older ? "older-history" : "history", older ? 1600 : 2200);
      }
    }
  }

  async function loadNewerHistory(options = {}) {
    if (state.historyLoading) return;
    if (!state.historyHasAfter || !state.historyNewestId) return;
    if (isScrollInteractionActive() && !options.forceDuringScroll) {
      requestNewerHistoryAfterScrollIdle();
      return;
    }

    const box = document.getElementById("bmwc-messages");
    const prevTop = box ? Number(box.scrollTop || 0) : 0;
    const anchor = captureScrollAnchor(box);
    const historyLoadSeq = ++state.historyLoadSeq;
    state.historyLoading = true;
    state.historyLoadingSince = Date.now();
    let historyLoadSucceeded = false;
    try {
      const data = await api(historyQuery("newer"), {timeoutMs: 15000});
      if (historyLoadSeq !== state.historyLoadSeq) return;
      historyLoadSucceeded = true;
      if (data.ok && Array.isArray(data.messages)) {
        const beforeCount = state.messages.length;
        data.messages.forEach(msg => addMessage(msg, {skipRender: true, suppressAutoFollow: true}));
        const addedCount = Math.max(0, state.messages.length - beforeCount);
        state.historyHasAfter = data.hasAfter != null ? !!data.hasAfter : false;
        state.historyNewestId = data.newestId || (state.messages[state.messages.length - 1] && state.messages[state.messages.length - 1].id) || state.historyNewestId;
        // Keep older-side state unchanged. The server's hasBefore for an after
        // page only means there are records before that returned page; those may
        // already be loaded in the current contiguous range.
        state.autoFollowLatest = false;
        if (box && addedCount > 0) {
          renderVirtualMessages({
            stickToBottom: false,
            preserveScroll: true,
            anchor,
            forcePreservePosition: true,
            suppressBottomStick: true,
            allowDuringMedia: true,
            allowDuringVisibleMedia: true,
            deferDuringMediaLayout: false,
            deferDuringScroll: false
          });
          if (anchor) restoreScrollAnchor(box, anchor, {thresholdPx: 0.5, reason: "newer-history-anchor"});
          else setScrollTopPreserved(box, prevTop, {allowAwayFromBottom: true, reason: "newer-history-preserve"});
        } else if (box) {
          refreshScrollAffordances(box);
        }
      }
    } catch (e) {
      console.warn("newer history failed", e);
    } finally {
      if (historyLoadSeq === state.historyLoadSeq) {
        state.historyLoading = false;
        state.historyLoadingSince = 0;
        state.pendingNewerHistoryLoad = false;
        if (historyLoadSucceeded) scheduleViewportMaintenance("newer-history", 1600);
        const finalBox = document.getElementById("bmwc-messages");
        if (historyLoadSucceeded && finalBox && state.historyHasAfter && (isAtHistoryBottomRequestZone(finalBox) || hasHistoryBottomEdgeIntent())) {
          // If the fetched page was too short to create additional scroll room,
          // or the user is still trying to continue toward the newer edge, queue
          // another guarded pass. This covers the physical-bottom case where no
          // additional scroll event is fired after a blocked/cooldowned request.
          requestNewerHistoryAfterScrollIdle();
          scheduleBottomNewerHistoryRetry("newer-continuation");
        } else if (historyLoadSucceeded && finalBox && !state.historyHasAfter && Number(state.historyEndNoticePendingUserBottomUntil || 0) > Date.now()) {
          setTimeout(() => maybeShowHistoryEndNoticeFromUserScroll(finalBox, "newer-history-end"), 0);
          setTimeout(() => maybeShowHistoryEndNoticeFromUserScroll(finalBox, "newer-history-end-late"), 120);
        }
      }
    }
  }

  function resumeRefreshEnabled() {
    const c = state.config || {};
    return c.uiResumeRefreshEnabled !== false;
  }

  function resumeRefreshMinIntervalMs() {
    const c = state.config || {};
    const n = Number(c.uiResumeRefreshMinIntervalSeconds);
    return Math.max(1000, Math.min(300000, (Number.isFinite(n) && n > 0 ? n : 5) * 1000));
  }

  async function refreshOnResume(reason = "resume") {
    if (!resumeRefreshEnabled()) return;
    if (guestChatHidden()) return;
    if (Date.now() < Number(state.replyJumpUntil || 0)) return;
    if (isScrollInteractionActive() || (Date.now() - Number(state.lastUserScrollAt || 0)) < Math.max(250, scrollInteractionIdleMs() * 2)) {
      requestResumeRefreshAfterScrollIdle(reason);
      return;
    }
    // Even while media is open, resume/focus should still reconcile the latest
    // history. The renderer preserves active media nodes instead of rebuilding
    // them, so skipping this refresh can leave the chat stale.
    const now = Date.now();
    if (state.resumeRefreshInFlight) return;
    if (now - state.lastResumeRefreshAt < resumeRefreshMinIntervalMs()) return;
    state.lastResumeRefreshAt = now;
    state.resumeRefreshInFlight = true;
    try {
      // Browsers, especially mobile browsers, may pause or close SSE/EventSource
      // while the tab/app is in the background. Reconnect and pull one fresh
      // history page when the UI becomes active again.
      if (!state.eventSource || state.eventSource.readyState === EventSource.CLOSED) {
        connectStream();
      }
      await loadHistory(false, {skipIfUnchanged: true});
    } catch (e) {
      console.warn("BlueMapWebChat resume refresh failed", reason, e);
    } finally {
      state.resumeRefreshInFlight = false;
    }
  }

  function installResumeRefreshHandlers() {
    const trigger = (reason) => {
      if (document.visibilityState && document.visibilityState !== "visible") return;
      setTimeout(() => refreshOnResume(reason), 150);
    };
    document.addEventListener("visibilitychange", () => trigger("visibilitychange"));
    window.addEventListener("focus", () => trigger("focus"));
    window.addEventListener("pageshow", () => trigger("pageshow"));
  }

  function clearStreamReconnectTimer() {
    if (state.streamReconnectTimer) {
      clearTimeout(state.streamReconnectTimer);
      state.streamReconnectTimer = null;
    }
  }

  function streamReconnectDelayMs() {
    const attempt = Math.max(0, Number(state.streamReconnectAttempt || 0));
    const base = Math.min(30000, 1000 * Math.pow(1.7, attempt));
    const jitter = Math.floor(Math.random() * 350);
    return Math.max(800, Math.floor(base + jitter));
  }

  function markStreamStatusReconnecting() {
    const status = document.getElementById("bmwc-status");
    if (status) status.textContent = t("status.reconnecting", "reconnecting...");
  }

  function scheduleStreamReconnect(reason = "stream-error") {
    if (guestChatHidden()) return;
    state.streamReconnectAfterOpen = true;
    state.streamReconnectReason = reason || state.streamReconnectReason || "stream-error";
    markStreamStatusReconnecting();
    if (state.streamReconnectTimer) return;

    const delay = streamReconnectDelayMs();
    state.streamReconnectAttempt = Math.min(12, Number(state.streamReconnectAttempt || 0) + 1);
    state.streamReconnectTimer = setTimeout(() => {
      state.streamReconnectTimer = null;

      // Native EventSource may have recovered before our fallback timer fired.
      if (state.eventSource && state.eventSource.readyState === EventSource.OPEN) {
        state.streamReconnectAttempt = 0;
        return;
      }

      connectStream({refreshAfterOpen: true, reason: state.streamReconnectReason || reason});
    }, delay);
  }

  async function reconcileAfterStreamReconnect(reason = "stream-reconnect") {
    if (state.streamReconnectInFlight) return;
    if (guestChatHidden()) return;
    state.streamReconnectInFlight = true;
    try {
      // A server restart loses the old SSE connection and may also refresh the
      // web config/captcha state. Re-read config and one latest history page so
      // the page recovers without requiring a manual browser refresh.
      await loadConfig();
      await loadHistory(false, {skipIfUnchanged: false});
    } catch (e) {
      console.warn("BlueMapWebChat stream reconnect refresh failed", reason, e);
      scheduleStreamReconnect("reconnect-refresh-failed");
    } finally {
      state.streamReconnectInFlight = false;
    }
  }

  function connectStream(options = {}) {
    const generation = ++state.streamGeneration;
    clearStreamReconnectTimer();

    if (state.eventSource) {
      try { state.eventSource.close(); } catch (_) {}
    }

    state.streamReconnectAfterOpen = !!options.refreshAfterOpen || state.streamReconnectAfterOpen;
    state.streamReconnectReason = options.reason || state.streamReconnectReason || "stream-connect";

    const es = new EventSource(apiBase + "/stream");
    state.eventSource = es;

    const handleConnected = () => {
      if (generation !== state.streamGeneration || state.eventSource !== es) return;
      state.streamLastOpenAt = Date.now();
      state.streamReconnectAttempt = 0;
      clearStreamReconnectTimer();

      const status = document.getElementById("bmwc-status");
      if (status && !state.token) status.textContent = t("status.guest", "guest");
      updateLoginState();

      if (state.streamReconnectAfterOpen) {
        const reason = state.streamReconnectReason || "stream-reconnect";
        state.streamReconnectAfterOpen = false;
        setTimeout(() => reconcileAfterStreamReconnect(reason), 150);
      }
    };

    es.onopen = handleConnected;
    es.addEventListener("ready", handleConnected);
    es.addEventListener("chat", e => {
      if (guestChatHidden()) return;
      try {
        const msg = JSON.parse(e.data);
        if (state.historyHasAfter) {
          // The current viewport is a reply-jump middle slice. Do not append a
          // live tail message after a gap; keep the slice contiguous and let
          // newer-history paging or the latest button fetch the missing range.
          refreshScrollAffordances(document.getElementById("bmwc-messages"));
          return;
        }
        addMessage(msg);
      } catch (_) {}
    });
    es.addEventListener("delete", e => {
      try { markMessageDeleted(JSON.parse(e.data).id); } catch (_) {}
    });
    es.addEventListener("pins", e => {
      try {
        const data = JSON.parse(e.data);
        if (data && Array.isArray(data.pins)) {
          state.pins = canViewPinnedMessages() ? data.pins : [];
          renderPinnedBar();
          if (state.messages && state.messages.length) scheduleVirtualRender({preserveScroll: true});
        }
      } catch (_) {}
    });
    es.addEventListener("clear", () => {
      state.messages = [];
      state.nextLocalMessageId = 1;
      renderVirtualMessages({stickToBottom: true});
      state.historyHasMore = false;
      state.historyHasAfter = false;
      state.historyOldestId = "";
      state.historyNewestId = "";
    });
    es.onerror = () => {
      if (generation !== state.streamGeneration || state.eventSource !== es) return;
      scheduleStreamReconnect("stream-error");
    };
  }


  function canUseCustomEmoji() {
    return !!(state.emojiEnabled && state.emojiShowButton !== false && Array.isArray(state.emojiItems) && state.emojiItems.length > 0 && !state.minimized);
  }

  function updateEmojiButton() {
    const btn = document.getElementById("bmwc-emoji");
    if (!btn) return;
    const visible = canUseCustomEmoji();
    btn.classList.toggle("bmwc-hidden", !visible);
    btn.title = t("button.emoji", "Emoji");
    if (!visible) hideEmojiPanel();
  }

  function hideEmojiPanel() {
    state.emojiPanelOpen = false;
    const panel = document.getElementById("bmwc-emoji-panel");
    if (panel) panel.classList.add("bmwc-hidden");
    updateEmojiResizeHandleVisibility();
  }

  function toggleEmojiPanel() {
    if (!canUseCustomEmoji()) return;
    state.emojiPanelOpen = !state.emojiPanelOpen;
    renderEmojiPanel();
  }

  function emojiTokenCount(text) {
    let count = 0;
    const re = customEmojiTokenRegex();
    let match;
    const source = String(text || "");
    while ((match = re.exec(source)) !== null) {
      if (customEmojiByToken(match[1])) count++;
    }
    return count;
  }

  function endsWithCustomEmojiToken(text) {
    const source = String(text || "");
    const re = customEmojiBoundaryRegex("end");
    const match = re.exec(source);
    if (!match) return false;
    const tokenMatch = customEmojiTokenRegex().exec(match[0]);
    return !!(tokenMatch && customEmojiByToken(tokenMatch[1]));
  }

  function startsWithCustomEmojiToken(text) {
    const source = String(text || "");
    const re = customEmojiBoundaryRegex("start");
    const match = re.exec(source);
    if (!match) return false;
    const tokenMatch = customEmojiTokenRegex().exec(match[0]);
    return !!(tokenMatch && customEmojiByToken(tokenMatch[1]));
  }

  function insertCustomEmoji(id) {
    id = String(id || "");
    if (!customEmojiById(id)) return;
    const input = document.getElementById("bmwc-message");
    if (!input) return;
    const limit = Number(state.emojiMessageTokenLimit || 0);
    if (limit > 0 && emojiTokenCount(input.value) >= limit) {
      alert(fmt("alert.emojiTooMany", "Only {max} emoji(s) can be used in one message.", {max: limit}));
      return;
    }
    const token = customEmojiTokenForId(id);
    const start = Number(input.selectionStart);
    const end = Number(input.selectionEnd);
    const hasSelection = Number.isFinite(start) && Number.isFinite(end);
    const current = input.value || "";
    if (hasSelection) {
      const before = current.slice(0, start);
      const after = current.slice(end);
      // Do not add an automatic gap between custom emoji tokens. Keep a small
      // separator only when inserting into normal text.
      const prefix = before && !/\s$/.test(before) && !endsWithCustomEmojiToken(before) ? " " : "";
      const suffix = after && !/^\s/.test(after) && !startsWithCustomEmojiToken(after) ? " " : "";
      input.value = before + prefix + token + suffix + after;
      const caret = (before + prefix + token + suffix).length;
      try { input.selectionStart = input.selectionEnd = caret; } catch (_) {}
    } else {
      const current = input.value || "";
      const prefix = current && !/\s$/.test(current) && !endsWithCustomEmojiToken(current) ? " " : "";
      input.value = current + prefix + token;
      try { input.selectionStart = input.selectionEnd = input.value.length; } catch (_) {}
    }
    input.focus();
  }

  function renderEmojiPanel() {
    const panel = document.getElementById("bmwc-emoji-panel");
    if (!panel) return;
    if (!state.emojiPanelOpen || !canUseCustomEmoji()) {
      panel.classList.add("bmwc-hidden");
      updateEmojiResizeHandleVisibility();
      return;
    }
    const packs = Array.isArray(state.emojiPacks) ? state.emojiPacks : [];
    const items = Array.isArray(state.emojiItems) ? state.emojiItems : [];
    if (!items.length) {
      panel.innerHTML = `<div class="bmwc-emoji-scroll"><div class="bmwc-emoji-empty">${esc(t("emoji.empty", "No emojis configured."))}</div></div>`;
      panel.classList.remove("bmwc-hidden");
      setEmojiPanelHeight(emojiPanelHeightPx(), false);
      installEmojiPanelWheelStep(panel);
      updateEmojiResizeHandleVisibility();
      return;
    }
    const packTabs = packs.length > 1
      ? `<div class="bmwc-emoji-tabs">${packs.map((pack, idx) => `<button type="button" class="bmwc-emoji-tab${idx === 0 ? " bmwc-active" : ""}" data-emoji-pack="${esc(pack.id)}">${esc(pack.label || pack.id)} <span>${esc(pack.count || "")}</span></button>`).join("")}</div>`
      : "";
    const firstPack = packs[0] && packs[0].id ? packs[0].id : "";
    const shown = firstPack ? items.filter(item => item.pack === firstPack) : items;
    panel.innerHTML = packTabs + `<div class="bmwc-emoji-scroll"><div class="bmwc-emoji-grid">${shown.map(emojiButtonHtml).join("")}</div></div>`;
    panel.classList.remove("bmwc-hidden");
    setEmojiPanelHeight(emojiPanelHeightPx(), false);
    installEmojiPanelWheelStep(panel);
    updateEmojiResizeHandleVisibility();

    panel.querySelectorAll("[data-emoji-pack]").forEach(btn => {
      btn.addEventListener("click", () => {
        const pack = btn.dataset.emojiPack || "";
        panel.querySelectorAll(".bmwc-emoji-tab").forEach(tab => tab.classList.toggle("bmwc-active", tab === btn));
        const grid = panel.querySelector(".bmwc-emoji-grid");
        if (grid) grid.innerHTML = items.filter(item => item.pack === pack).map(emojiButtonHtml).join("");
        const scroll = emojiScrollElement(panel);
        if (scroll) scroll.scrollTop = 0;
        setEmojiPanelHeight(emojiPanelHeightPx(), false);
        installEmojiItemHandlers(panel);
      });
    });
    installEmojiItemHandlers(panel);
  }

  function emojiButtonHtml(item) {
    if (!item || !item.id || !item.url) return "";
    const label = item.label || item.name || item.id;
    const size = emojiPickerSizePx();
    return `<button type="button" class="bmwc-emoji-item" data-emoji-id="${esc(item.id)}" title="${esc(label)}"><img src="${esc(item.url)}" alt="${esc(label)}" loading="lazy" draggable="false" style="width:${size}px;height:${size}px;"><span>${esc(label)}</span></button>`;
  }

  function installEmojiItemHandlers(panel) {
    panel.querySelectorAll("[data-emoji-id]").forEach(btn => {
      btn.addEventListener("click", () => insertCustomEmoji(btn.dataset.emojiId || ""));
    });
  }

  async function loadEmojis(options = {}) {
    if (!state.config || state.config.emojiEnabled === false) {
      state.emojiEnabled = false;
      state.emojiPacks = [];
      state.emojiItems = [];
      state.emojiById = new Map();
      state.emojiByAlias = new Map();
      updateEmojiButton();
      return;
    }
    state.emojiLoading = true;
    try {
      const force = options && options.force === true;
      const res = await api("/emojis" + (force ? ("?_=" + Date.now()) : ""), force ? {cache: "no-store"} : {});
      state.emojiEnabled = res.enabled !== false;
      state.emojiPacks = Array.isArray(res.packs) ? res.packs : [];
      state.emojiItems = (Array.isArray(res.items) ? res.items : []).map(item => Object.assign({}, item, {
        url: apiResourceUrl(item && item.url)
      }));
      rebuildCustomEmojiLookups(state.emojiItems);
      state.emojiRenderSizePx = Math.max(16, Math.min(1024, Number(res.renderSizePx || state.emojiRenderSizePx || 32)));
      state.emojiPickerSizePx = Math.max(24, Math.min(1024, Number(res.pickerSizePx || state.emojiPickerSizePx || 44)));
      applyEmojiPickerSize();
      state.emojiMessageTokenLimit = Math.max(0, Math.floor(Number(res.messageTokenLimit || state.emojiMessageTokenLimit || 0)));
      state.emojiTokenFormat = normalizeEmojiTokenFormat(res.tokenFormat || state.emojiTokenFormat);
      if (state.messages && state.messages.length) scheduleVirtualRender({preserveScroll: true, deferDuringScroll: false});
    } catch (e) {
      state.emojiPacks = [];
      state.emojiItems = [];
      state.emojiById = new Map();
      state.emojiByAlias = new Map();
      console.warn("BlueMapWebChat emoji list failed", e);
    } finally {
      state.emojiLoading = false;
      updateEmojiButton();
      renderEmojiPanel();
    }
  }

  function canUpload() {
    const c = state.config || {};
    if (!c.uploadEnabled) return false;
    if (state.token) {
      if (state.role === "ADMIN") return c.uploadAllowAdmin !== false;
      if (state.role === "MODERATOR") return c.uploadAllowModerator !== false;
      return c.uploadAllowUser !== false;
    }
    return !!c.uploadAllowGuest && c.guestEnabled !== false;
  }

  function uploadAcceptList() {
    const exts = (state.config && Array.isArray(state.config.uploadAllowedExtensions))
      ? state.config.uploadAllowedExtensions
      : [];
    return exts.map(e => "." + String(e).replace(/^\./, "").trim()).filter(Boolean).join(",");
  }

  function normalizeInsertedMediaLinks(text) {
    const parts = String(text || "")
      .split(/\s+/)
      .map(part => part.trim())
      .filter(Boolean);
    return parts.length ? parts.join(" ") + " " : "";
  }

  function appendToMessage(text, options = {}) {
    const input = document.getElementById("bmwc-message");
    if (!input) return;
    const inserted = options.mediaLinks ? normalizeInsertedMediaLinks(text) : String(text || "");
    if (!inserted) return;

    const current = input.value || "";
    const needsSeparator = current && !/\s$/.test(current);
    input.value = current + (needsSeparator ? " " : "") + inserted;
    input.focus();
    try {
      input.selectionStart = input.selectionEnd = input.value.length;
    } catch (_) {}
  }

  function extensionFromMime(type) {
    type = String(type || "").toLowerCase();
    if (type === "image/jpeg") return "jpg";
    if (type === "image/png") return "png";
    if (type === "image/gif") return "gif";
    if (type === "image/webp") return "webp";
    if (type === "image/avif") return "avif";
    if (type === "image/bmp") return "bmp";
    if (type === "video/mp4") return "mp4";
    if (type === "video/webm") return "webm";
    if (type === "application/zip") return "zip";
    return "";
  }

  function clipboardFileName(file, index) {
    const rawName = String(file && file.name || "").trim();
    if (rawName && rawName.includes(".")) return rawName;

    const c = state.config || {};
    const fromMime = extensionFromMime(file && file.type);
    const configured = String(c.uploadClipboardImageDefaultExtension || "png").replace(/^\./, "").trim().toLowerCase();
    const ext = fromMime || configured || "png";
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    return `clipboard-${stamp}-${index + 1}.${ext}`;
  }

  function normalizeUploadFile(file, index, source) {
    if (!file) return null;
    const name = source === "clipboard" ? clipboardFileName(file, index) : (file.name || clipboardFileName(file, index));
    if (typeof File !== "undefined" && file.name !== name) {
      try {
        return new File([file], name, {type: file.type || "application/octet-stream"});
      } catch (_) {
        // Some older browsers do not allow File construction; fall through.
      }
    }
    return file;
  }


  function setUploadProgressVisible(visible) {
    const panel = document.getElementById("bmwc-upload-progress");
    if (panel) panel.classList.toggle("bmwc-hidden", !visible);
  }

  function setUploadControlsBusy(busy) {
    const uploadBtn = document.getElementById("bmwc-upload");
    const fileInput = document.getElementById("bmwc-file");
    if (uploadBtn) uploadBtn.disabled = !!busy;
    if (fileInput) fileInput.disabled = !!busy;
  }

  function updateUploadProgress(label, percent, active = true) {
    const panel = document.getElementById("bmwc-upload-progress");
    const text = document.getElementById("bmwc-upload-progress-text");
    const fill = document.getElementById("bmwc-upload-progress-fill");
    const cancel = document.getElementById("bmwc-upload-cancel");

    if (panel) panel.classList.toggle("bmwc-hidden", !active);
    if (text) text.textContent = label || "";
    if (fill) {
      const p = Math.max(0, Math.min(100, Number(percent) || 0));
      fill.style.width = p.toFixed(1) + "%";
    }
    if (cancel) {
      cancel.disabled = !active || !state.uploadActive;
      cancel.textContent = state.uploadCancelRequested ? t("upload.canceling", "Canceling...") : t("button.cancel", "Cancel");
    }
  }

  function hideUploadProgressSoon(label) {
    if (label) updateUploadProgress(label, 100, true);
    setTimeout(() => {
      if (state.uploadActive) return;
      setUploadProgressVisible(false);
      updateUploadProgress("", 0, false);
    }, 900);
  }

  function cancelCurrentUpload() {
    if (!state.uploadActive) return;
    state.uploadCancelRequested = true;
    updateUploadProgress(t("upload.canceling", "Canceling..."), 0, true);
    try {
      if (state.uploadXhr) state.uploadXhr.abort();
    } catch (_) {}
  }

  function uploadFormWithProgress(form, progressCallback) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      state.uploadXhr = xhr;

      xhr.upload.onprogress = event => {
        if (event && event.lengthComputable && typeof progressCallback === "function") {
          progressCallback(event.loaded, event.total);
        }
      };

      xhr.onload = () => {
        state.uploadXhr = null;
        let data = null;
        try {
          data = JSON.parse(xhr.responseText || "{}");
        } catch (_) {
          data = {ok: false, error: "invalid_response"};
        }
        if (xhr.status < 200 || xhr.status >= 300) {
          reject({error: data && data.error ? data.error : ("HTTP " + xhr.status)});
          return;
        }
        resolve(data);
      };

      xhr.onerror = () => {
        state.uploadXhr = null;
        reject({error: "network"});
      };

      xhr.onabort = () => {
        state.uploadXhr = null;
        reject({aborted: true});
      };

      xhr.open("POST", apiBase + "/upload", true);
      xhr.send(form);
    });
  }

  function clipboardFiles(event) {
    const dt = event.clipboardData;
    if (!dt) return [];

    const files = [];
    if (dt.items && dt.items.length) {
      for (const item of Array.from(dt.items)) {
        if (item.kind === "file") {
          const file = item.getAsFile();
          if (file) files.push(file);
        }
      }
    }

    if (!files.length && dt.files && dt.files.length) {
      files.push(...Array.from(dt.files));
    }

    return files;
  }

  async function handlePasteUpload(event) {
    const c = state.config || {};
    if (!c.uploadClipboardEnabled) return;

    const files = clipboardFiles(event);
    if (!files.length) return;

    event.preventDefault();
    event.stopPropagation();
    await uploadFiles(files, "clipboard");
  }

  function isFileDragEvent(event) {
    const dt = event && event.dataTransfer;
    if (!dt) return false;
    try {
      const types = Array.from(dt.types || []);
      return types.includes("Files") || types.includes("application/x-moz-file");
    } catch (_) {
      return false;
    }
  }

  function dropEventFiles(event) {
    const dt = event && event.dataTransfer;
    if (!dt || !dt.files || !dt.files.length) return [];
    return Array.from(dt.files).filter(file => file && (file.name || file.size || file.type));
  }

  function setDropOverlayVisible(visible, messageKey = "") {
    const overlay = document.getElementById("bmwc-drop-overlay");
    if (!overlay) return;

    const title = document.getElementById("bmwc-drop-title");
    const subtitle = document.getElementById("bmwc-drop-subtitle");

    if (messageKey === "busy") {
      if (title) title.textContent = t("upload.dropBusy", "Upload is already in progress.");
      if (subtitle) subtitle.textContent = t("upload.dropSubtitle", "Release inside the chat panel.");
    } else if (messageKey === "denied") {
      if (title) title.textContent = t("upload.dropDenied", "File upload is not allowed.");
      if (subtitle) subtitle.textContent = t("upload.dropSubtitle", "Release inside the chat panel.");
    } else {
      if (title) title.textContent = t("upload.dropTitle", "Drop files to upload");
      if (subtitle) subtitle.textContent = t("upload.dropSubtitle", "Release inside the chat panel.");
    }

    overlay.classList.toggle("bmwc-hidden", !visible);
    overlay.setAttribute("aria-hidden", visible ? "false" : "true");
  }

  function hideDropOverlay() {
    state.dragUploadDepth = 0;
    setDropOverlayVisible(false);
  }

  function installDragAndDropUpload(root) {
    const panel = root && root.querySelector ? root.querySelector(".bmwc-panel") : null;
    if (!panel || panel.dataset.dropUploadInstalled === "1") return;
    panel.dataset.dropUploadInstalled = "1";

    const overlayState = () => {
      if (state.uploadActive) return "busy";
      if (!canUpload()) return "denied";
      return "ready";
    };

    panel.addEventListener("dragenter", event => {
      if (!isFileDragEvent(event)) return;
      event.preventDefault();
      event.stopPropagation();
      if (state.minimized) {
        hideDropOverlay();
        if (event.dataTransfer) event.dataTransfer.dropEffect = "none";
        return;
      }
      state.dragUploadDepth++;
      const status = overlayState();
      if (event.dataTransfer) event.dataTransfer.dropEffect = status === "ready" ? "copy" : "none";
      setDropOverlayVisible(true, status === "ready" ? "" : status);
    }, {capture: true});

    panel.addEventListener("dragover", event => {
      if (!isFileDragEvent(event)) return;
      event.preventDefault();
      event.stopPropagation();
      if (state.minimized) {
        hideDropOverlay();
        if (event.dataTransfer) event.dataTransfer.dropEffect = "none";
        return;
      }
      const status = overlayState();
      if (event.dataTransfer) event.dataTransfer.dropEffect = status === "ready" ? "copy" : "none";
      setDropOverlayVisible(true, status === "ready" ? "" : status);
    }, {capture: true});

    panel.addEventListener("dragleave", event => {
      if (!isFileDragEvent(event)) return;
      event.preventDefault();
      event.stopPropagation();
      state.dragUploadDepth = Math.max(0, state.dragUploadDepth - 1);
      if (state.dragUploadDepth === 0) setDropOverlayVisible(false);
    }, {capture: true});

    panel.addEventListener("drop", async event => {
      if (!isFileDragEvent(event)) return;
      event.preventDefault();
      event.stopPropagation();
      const files = dropEventFiles(event);
      hideDropOverlay();
      if (state.minimized || !files.length) return;
      if (state.uploadActive) {
        alert(t("upload.dropBusy", "Upload is already in progress."));
        return;
      }
      await uploadFiles(files, "drop");
    }, {capture: true});

    document.addEventListener("dragend", hideDropOverlay, {capture: true});
    document.addEventListener("drop", event => {
      if (isFileDragEvent(event)) hideDropOverlay();
    }, {capture: true});
  }

  async function uploadSelectedFiles(e) {
    const input = e.target;
    const files = Array.from(input.files || []);
    input.value = "";
    await uploadFiles(files, "file");
  }

  async function uploadFiles(files, source) {
    files = Array.from(files || []).map((file, index) => normalizeUploadFile(file, index, source)).filter(Boolean);
    if (!files.length) return;

    if (state.uploadActive) {
      alert(t("upload.dropBusy", "Upload is already in progress."));
      return;
    }

    if (!canUpload()) {
      alert(t("alert.uploadNotAllowed", "File upload is not allowed."));
      return;
    }

    const c = state.config || {};
    const maxFilesConfig = Number(c.uploadMaxFilesPerMessage);
    const maxFiles = Number.isFinite(maxFilesConfig) && maxFilesConfig > 0 ? Math.floor(maxFilesConfig) : 0;
    const maxFileSizeConfig = Number(c.uploadMaxFileSizeMb);
    const maxBytes = Number.isFinite(maxFileSizeConfig) && maxFileSizeConfig > 0 ? maxFileSizeConfig * 1024 * 1024 : 0;
    const allowed = new Set((c.uploadAllowedExtensions || []).map(x => String(x).toLowerCase().replace(/^\./, "")));
    const selected = maxFiles > 0 ? files.slice(0, maxFiles) : files;

    if (maxFiles > 0 && files.length > maxFiles) {
      alert(fmt("alert.uploadTooMany", "Only {max} file(s) can be selected at once.", {max: maxFiles}));
    }

    const valid = [];
    for (const file of selected) {
      const ext = (file.name.split(".").pop() || "").toLowerCase();
      if (allowed.size && !allowed.has(ext)) {
        alert(fmt("alert.uploadExtensionDenied", "This file type is not allowed: {name}", {name: file.name}));
        continue;
      }
      if (maxBytes > 0 && file.size > maxBytes) {
        alert(fmt("alert.uploadTooLarge", "File is too large: {name}", {name: file.name}));
        continue;
      }
      valid.push(file);
    }

    if (!valid.length) return;

    const totalBytes = valid.reduce((sum, file) => sum + Math.max(1, Number(file.size) || 1), 0);
    let completedBytes = 0;
    const uploaded = [];

    state.uploadCancelRequested = false;
    state.uploadActive = true;
    markExplicitLatestFollow("upload", 90000);
    setUploadControlsBusy(true);
    updateUploadProgress(t("upload.preparing", "Preparing upload..."), 0, true);

    try {
      for (let i = 0; i < valid.length; i++) {
        if (state.uploadCancelRequested) break;
        const file = valid[i];
        const form = new FormData();
        form.append("file", file, file.name);

        if (state.token) {
          form.append("token", state.token);
        } else {
          form.append("guestName", currentGuestNameForSubmit());
        }

        const baseLabel = fmt("upload.progress", "Uploading {current}/{total}: {name}", {
          current: i + 1,
          total: valid.length,
          name: file.name
        });

        try {
          const res = await uploadFormWithProgress(form, (loaded, size) => {
            const fileSize = Math.max(1, Number(size) || Number(file.size) || 1);
            const overall = totalBytes > 0
              ? ((completedBytes + Math.min(fileSize, loaded)) / totalBytes) * 100
              : ((i + Math.min(1, loaded / fileSize)) / valid.length) * 100;
            updateUploadProgress(baseLabel, overall, true);
          });
          completedBytes += Math.max(1, Number(file.size) || 1);

          if (!res.ok) {
            alertResponse("alert.uploadFailed", "Upload failed: {error}", res);
            continue;
          }
          uploaded.push(normalizeReturnedUploadUrl(res.url));
          updateUploadProgress(baseLabel, totalBytes > 0 ? (completedBytes / totalBytes) * 100 : ((i + 1) / valid.length) * 100, true);
        } catch (err) {
          if (err && err.aborted) {
            updateUploadProgress(t("upload.canceled", "Upload canceled."), 0, true);
            break;
          }
          alert(err && err.error && err.error !== "network"
            ? fmt("alert.uploadFailed", "Upload failed: {error}", {error: responseError(err)})
            : t("alert.serverUnavailable", "Cannot connect to chat server."));
        }
      }
    } finally {
      state.uploadXhr = null;
      state.uploadActive = false;
      setUploadControlsBusy(false);
    }

    if (uploaded.length) {
      forceLatestChatView("upload");
      const text = normalizeInsertedMediaLinks(uploaded.join(" "));
      const mode = String((state.config && state.config.uploadClipboardSendMode) || "insert").toLowerCase();
      if (source === "clipboard" && mode === "send") {
        const ok = await sendMessageText(text, null, {forceLatest: true});
        if (!ok) appendToMessage(text, {mediaLinks: true});
      } else {
        appendToMessage(text, {mediaLinks: true});
      }
      forceLatestChatView("upload-complete");
      hideUploadProgressSoon(t("upload.complete", "Upload complete."));
    } else if (state.uploadCancelRequested) {
      hideUploadProgressSoon(t("upload.canceled", "Upload canceled."));
    } else {
      hideUploadProgressSoon("");
    }
  }



  function updatePipButton() {
    const btn = document.getElementById("bmwc-pip");
    const c = state.config || {};
    const enabled = c.uiPictureInPictureEnabled === true && !state.isPip;
    if (!enabled) {
      if (btn) btn.remove();
      return;
    }
    if (!btn) return;
    const visible = !state.minimized;
    btn.classList.toggle("bmwc-hidden", !visible);
    btn.hidden = !visible;
    btn.setAttribute("aria-hidden", visible ? "false" : "true");
    btn.style.display = visible ? "" : "none";
    btn.disabled = !visible;
    btn.title = t("button.pip", "PIP");
  }

  function canRunWebCommands() {
    return !!(state.commandsEnabled && state.commandsCanRun && state.token && (state.commandsAllowAll || (Array.isArray(state.commands) && state.commands.length)));
  }

  function updateCommandButton() {
    const btn = document.getElementById("bmwc-command");
    if (!btn) return;
    const visible = canRunWebCommands() && state.commandsShowButton !== false && !state.minimized;
    btn.classList.toggle("bmwc-hidden", !visible);
    btn.title = t("button.commands", "Commands");
    if (!visible) hideCommandPanel();
  }

  async function loadCommands() {
    if (!state.config || !state.config.commandsEnabled || !state.token) {
      state.commands = [];
      state.commandsCanRun = false;
      state.commandsEnabled = !!(state.config && state.config.commandsEnabled);
      state.commandsAllowAll = !!(state.config && state.config.commandsAllowAll);
      state.commandsShowButton = state.config ? state.config.commandsShowButton !== false : true;
      state.commandsShowSlashPanel = state.config ? state.config.commandsShowSlashPanel !== false : true;
      state.commandsRunFromChatInput = state.config ? state.config.commandsRunFromChatInput === true : false;
      state.commandsRequireConfirm = state.config ? state.config.commandsRequireConfirm !== false : true;
      state.commandMaxLength = state.config ? normalizeCommandMaxLength(state.config.commandsMaxLength, 0) : 0;
      updateCommandButton();
      hideCommandPanel();
      return;
    }

    try {
      const res = await api("/commands?token=" + encodeURIComponent(state.token));
      state.commandsEnabled = !!res.enabled;
      state.commandsCanRun = !!res.canRun;
      state.commandsAllowAll = !!res.allowAll;
      state.commandsShowButton = res.showButton !== false;
      state.commandsShowSlashPanel = res.showSlashPanel !== false;
      state.commandsRunFromChatInput = res.runFromChatInput === true;
      state.commandsRequireConfirm = res.requireConfirm !== false;
      state.commandMaxLength = normalizeCommandMaxLength(res.maxLength, state.commandMaxLength || 0);
      state.commands = Array.isArray(res.presets) ? res.presets : [];
    } catch (e) {
      state.commands = [];
      state.commandsCanRun = false;
    }
    updateCommandButton();
    updateCommandPanel();
  }

  function commandMatches(preset, query) {
    if (!query) return true;
    const q = query.toLowerCase();
    return [preset.id, preset.label, preset.description, preset.command]
      .some(v => String(v || "").toLowerCase().includes(q));
  }

  function hasCommandMaxLength() {
    return Number(state.commandMaxLength || 0) > 0;
  }

  function commandMaxLengthAttr() {
    return hasCommandMaxLength() ? ` maxlength="${esc(state.commandMaxLength)}"` : "";
  }

  function commandMaxLengthHintHtml() {
    return hasCommandMaxLength()
      ? `<small class="bmwc-command-limit">${esc(fmt("commands.maxLengthHint", "Maximum: {max} characters", {max: state.commandMaxLength}))}</small>`
      : "";
  }

  function hideCommandPanel() {
    const panel = document.getElementById("bmwc-command-panel");
    if (panel) panel.classList.add("bmwc-hidden");
  }

  function updateCommandPanel() {
    const panel = document.getElementById("bmwc-command-panel");
    const input = document.getElementById("bmwc-message");
    if (!panel || !input) return;
    const value = String(input.value || "").trim();
    if (!canRunWebCommands() || state.commandsRunFromChatInput !== true || state.commandsShowSlashPanel === false || !value.startsWith("/")) {
      panel.classList.add("bmwc-hidden");
      panel.innerHTML = "";
      return;
    }

    const query = value.slice(1).trim();
    if (state.commandsAllowAll) {
      if (!query) {
        panel.classList.add("bmwc-hidden");
        panel.innerHTML = "";
        return;
      }
      const tooLong = hasCommandMaxLength() && query.length > state.commandMaxLength;
      panel.innerHTML = tooLong ?
        `<div class="bmwc-command-empty">${esc(fmt("commands.tooLong", "Command is too long. Maximum: {max} characters.", {max: state.commandMaxLength}))}</div>` :
        `<button type="button" class="bmwc-command-inline-item bmwc-command-direct" data-run-direct-command="${esc(query)}">
          <span class="bmwc-command-label">${esc(t("commands.runDirect", "Run command"))}</span>
          <span class="bmwc-command-preview">/${esc(query)}</span>
        </button>`;
      panel.querySelectorAll("[data-run-direct-command]").forEach(btn => {
        btn.onclick = async e => {
          e.preventDefault();
          e.stopPropagation();
          await runDirectCommand(btn.getAttribute("data-run-direct-command"));
          hideCommandPanel();
          input.value = "";
        };
      });
      panel.classList.remove("bmwc-hidden");
      return;
    }

    const items = (Array.isArray(state.commands) ? state.commands : []).filter(p => commandMatches(p, query)).slice(0, 8);
    if (!items.length) {
      panel.innerHTML = `<div class="bmwc-command-empty">${esc(t("commands.noMatches", "No matching commands."))}</div>`;
      panel.classList.remove("bmwc-hidden");
      return;
    }

    panel.innerHTML = items.map(p => `
      <button type="button" class="bmwc-command-inline-item" data-run-command="${esc(p.id)}">
        <span class="bmwc-command-label">${esc(p.label || p.id)}</span>
        <span class="bmwc-command-preview">/${esc(p.command || "")}</span>
      </button>
    `).join("");
    panel.querySelectorAll("[data-run-command]").forEach(btn => {
      btn.onclick = async e => {
        e.preventDefault();
        e.stopPropagation();
        await runCommandPreset(btn.getAttribute("data-run-command"));
        hideCommandPanel();
        input.value = "";
      };
    });
    panel.querySelectorAll("[data-run-direct-command]").forEach(btn => {
      btn.onclick = async e => {
        e.preventDefault();
        e.stopPropagation();
        await runDirectCommand(btn.getAttribute("data-run-direct-command"));
        hideCommandPanel();
        input.value = "";
      };
    });
    panel.classList.remove("bmwc-hidden");
  }

  function openCommandModal() {
    if (!canRunWebCommands()) {
      alert(t("commands.notAvailable", "Command panel is not available."));
      return;
    }

    const old = document.getElementById("bmwc-command-modal");
    if (old) old.remove();
    const wrap = document.createElement("div");
    wrap.className = "bmwc-modal-backdrop bmwc-user-prefs-backdrop";
    wrap.id = "bmwc-command-modal";
    wrap.innerHTML = `
      <div class="bmwc-modal bmwc-command-modal">
        <div class="bmwc-modal-head">
          <h3>${t("commands.title", "Server commands")}</h3>
          <button class="bmwc-button" id="bmwc-command-close">${t("button.close", "Close")}</button>
        </div>
        <p>${state.commandsAllowAll ? t("commands.descriptionAll", "Run any server console command from the web UI.") : t("commands.description", "Run a pre-approved server command from the web UI.")}</p>
        ${state.commandsAllowAll ? `<div class="bmwc-command-direct-box"><input class="bmwc-input" id="bmwc-command-direct"${commandMaxLengthAttr()} placeholder="${t("commands.directPlaceholder", "Command without /")}"><button class="bmwc-button" id="bmwc-command-direct-run">${t("button.run", "Run")}</button></div>${commandMaxLengthHintHtml()}` : `<input class="bmwc-input" id="bmwc-command-search" placeholder="${t("commands.search", "Search preset commands")}"><div class="bmwc-command-list" id="bmwc-command-list"></div>`}
      </div>
    `;
    document.body.appendChild(wrap);
    const search = wrap.querySelector("#bmwc-command-search");
    const directInput = wrap.querySelector("#bmwc-command-direct");
    const directRun = wrap.querySelector("#bmwc-command-direct-run");
    if (directRun && directInput) {
      const submitDirect = async () => {
        const ok = await runDirectCommand(String(directInput.value || ""));
        if (ok) wrap.remove();
      };
      directRun.onclick = submitDirect;
      directInput.addEventListener("keydown", e => { if (e.key === "Enter" && !e.isComposing) submitDirect(); });
    }
    const render = () => renderCommandList(wrap, String(search ? search.value : ""));
    wrap.querySelector("#bmwc-command-close").onclick = () => wrap.remove();
    wrap.addEventListener("click", e => { if (e.target === wrap) wrap.remove(); });
    if (search) {
      search.addEventListener("input", render);
      render();
      setTimeout(() => search.focus(), 0);
    } else if (directInput) {
      setTimeout(() => directInput.focus(), 0);
    }
  }

  function renderCommandList(wrap, query) {
    const list = wrap.querySelector("#bmwc-command-list");
    if (!list) return;
    const q = String(query || "").trim();
    const items = (Array.isArray(state.commands) ? state.commands : []).filter(p => commandMatches(p, q));
    if (!items.length) {
      list.innerHTML = `<div class="bmwc-command-empty">${esc(t("commands.noMatches", "No matching commands."))}</div>`;
      return;
    }
    list.innerHTML = items.map(p => `
      <div class="bmwc-command-item">
        <div class="bmwc-command-main">
          <strong>${esc(p.label || p.id)}</strong>
          ${p.description ? `<small>${esc(p.description)}</small>` : ""}
          <code>/${esc(p.command || "")}</code>
        </div>
        <button class="bmwc-button" data-run-command="${esc(p.id)}">${t("button.run", "Run")}</button>
      </div>
    `).join("");
    list.querySelectorAll("[data-run-command]").forEach(btn => {
      btn.onclick = async () => {
        const ok = await runCommandPreset(btn.getAttribute("data-run-command"));
        if (ok) wrap.remove();
      };
    });
  }


  async function runDirectCommand(command) {
    command = String(command || "").trim();
    if (command.startsWith("/")) command = command.slice(1).trim();
    if (!state.commandsAllowAll || !command) return false;
    if (hasCommandMaxLength() && command.length > state.commandMaxLength) {
      alert(fmt("commands.tooLong", "Command is too long. Maximum: {max} characters.", {max: state.commandMaxLength}));
      return false;
    }
    const needConfirm = state.commandsRequireConfirm !== false;
    if (needConfirm && !confirm(fmt("commands.confirm", "Run command: /{command}?", {command}))) return false;
    try {
      const res = await api("/commands/run", {method: "POST", body: JSON.stringify({token: state.token, command})});
      if (!res.ok) {
        alertResponse("commands.failed", "Command failed: {error}", res);
        return false;
      }
      alert(fmt("commands.submitted", "Command submitted: {label}", {label: command}));
      return true;
    } catch (e) {
      alert(t("alert.serverUnavailable", "Cannot connect to chat server."));
      return false;
    }
  }

  async function runCommandPreset(id) {
    const preset = state.commands.find(p => p && p.id === id);
    if (!preset) return false;
    const needConfirm = state.commandsRequireConfirm !== false || preset.confirm !== false;
    if (needConfirm && !confirm(fmt("commands.confirm", "Run command: /{command}?", {command: preset.command || preset.label || id}))) return false;
    try {
      const res = await api("/commands/run", {method: "POST", body: JSON.stringify({token: state.token, id})});
      if (!res.ok) {
        alertResponse("commands.failed", "Command failed: {error}", res);
        return false;
      }
      alert(fmt("commands.submitted", "Command submitted: {label}", {label: preset.label || id}));
      return true;
    } catch (e) {
      alert(t("alert.serverUnavailable", "Cannot connect to chat server."));
      return false;
    }
  }

  function setSendControlsBusy(busy) {
    const sendBtn = document.getElementById("bmwc-send");
    const input = document.getElementById("bmwc-message");
    if (sendBtn) {
      sendBtn.disabled = !!busy;
      sendBtn.classList.toggle("bmwc-busy", !!busy);
    }
    if (input) {
      input.dataset.bmwcSending = busy ? "1" : "0";
    }
  }

  async function sendMessageText(text, inputToClear, options = {}) {
    text = String(text || "").trim();
    if (!text) return false;
    const emojiLimit = Number(state.emojiMessageTokenLimit || 0);
    if (emojiLimit > 0 && emojiTokenCount(text) > emojiLimit) {
      alert(fmt("alert.emojiTooMany", "Only {max} emoji(s) can be used in one message.", {max: emojiLimit}));
      return false;
    }
    if (state.sendInFlight && options.allowConcurrent !== true) {
      return false;
    }
    if (options.allowConcurrent !== true) {
      state.sendInFlight = true;
      state.sendInFlightSince = Date.now();
      state.sendInFlightText = text;
      setSendControlsBusy(true);
    }

    const payload = {message: text};
    if (state.replyTarget && state.replyTarget.id) {
      payload.replyToId = state.replyTarget.id;
      payload.replyToSender = state.replyTarget.sender || "";
      payload.replyToPreview = state.replyTarget.preview || "";
    }
    if (state.token) {
      payload.token = state.token;
    } else {
      payload.guestName = currentGuestNameForSubmit();
      if (state.captchaPass) {
        payload.captchaPass = state.captchaPass;
      }
      if (state.captcha) {
        payload.captchaId = state.captcha.id;
        const captchaInput = document.getElementById("bmwc-captcha-a");
        payload.captchaAnswer = captchaInput ? captchaInput.value.trim() : "";
      }
    }

    try {
      markExplicitLatestFollow(options.forceLatest ? "send-forced" : "send", 4500);
      const res = await api("/send", {method: "POST", body: JSON.stringify(payload)});
      if (!res.ok) {
        if (res.captchaPass) {
          state.captchaPass = res.captchaPass;
          localStorage.setItem("bmwc.captchaPass", state.captchaPass);
        } else if (res.error === "rate_limited" && state.config && state.config.captchaEnabled && !state.config.captchaRequireOnEachMessage) {
          state.captchaPass = state.captchaPass || "frontend-ok";
          localStorage.setItem("bmwc.captchaPass", state.captchaPass);
        }

        if (state.captchaPass && state.config && state.config.captchaEnabled && !state.config.captchaRequireOnEachMessage) {
          hideCaptchaUi();
        }

        if (res.error === "captcha_failed") {
          state.captchaPass = "";
          localStorage.removeItem("bmwc.captchaPass");
          await refreshCaptcha(true);
        } else {
          await refreshCaptcha();
        }

        if (res.error === "rate_limited") {
          alert(t("alert.rateLimited", "You are sending messages too quickly. Please wait."));
        } else if (res.error === "emoji_limit") {
          alert(fmt("alert.emojiTooMany", "Only {max} emoji(s) can be used in one message.", {max: state.emojiMessageTokenLimit || ""}));
        } else {
          alertResponse("alert.sendFailed", "Send failed: {error}", res);
        }
        return false;
      }
      if (res.captchaPass) {
        state.captchaPass = res.captchaPass;
        localStorage.setItem("bmwc.captchaPass", state.captchaPass);
      } else if (!state.token && state.config && state.config.captchaEnabled && !state.config.captchaRequireOnEachMessage && state.captcha) {
        // Frontend fallback: hide captcha after a successful solve.
        // A real server-side pass is still preferred and used when available.
        state.captchaPass = "frontend-ok";
        localStorage.setItem("bmwc.captchaPass", state.captchaPass);
      }
      if (inputToClear) inputToClear.value = "";
      clearReplyTarget();
      forceLatestChatView(options.forceLatest ? "send-forced" : "send");
      setTimeout(() => {
        if (state.autoFollowLatest) loadHistory(false, {skipIfUnchanged: true});
      }, 180);
      await refreshCaptcha();
      return true;
    } catch (e) {
      alert(t("alert.serverUnavailable", "Cannot connect to chat server."));
      return false;
    } finally {
      if (options.allowConcurrent !== true) {
        state.sendInFlight = false;
        state.sendInFlightSince = 0;
        state.sendInFlightText = "";
        setSendControlsBusy(false);
      }
    }
  }

  async function sendMessage() {
    const input = document.getElementById("bmwc-message");
    const text = input ? input.value.trim() : "";
    if (!text) return;
    if (state.sendInFlight) return;
    if (state.commandsAllowAll && state.commandsRunFromChatInput === true && canRunWebCommands() && text.startsWith("/")) {
      state.sendInFlight = true;
      state.sendInFlightSince = Date.now();
      state.sendInFlightText = text;
      setSendControlsBusy(true);
      try {
        const ok = await runDirectCommand(text);
        if (ok && input) input.value = "";
      } finally {
        state.sendInFlight = false;
        state.sendInFlightSince = 0;
        state.sendInFlightText = "";
        setSendControlsBusy(false);
        hideCommandPanel();
      }
      return;
    }
    await sendMessageText(text, input);
  }


  function isMessagePinned(messageId) {
    if (!messageId) return false;
    return state.pins.some(pin => pin && pin.messageId === messageId);
  }

  function languagePrefix() {
    const selected = String(state.selectedLanguage || "").trim();
    if (selected) return selected.toLowerCase();
    const browser = String(navigator.language || "").trim();
    return browser.toLowerCase();
  }

  function moderationActionsFallback(enabled) {
    const lang = languagePrefix();
    if (lang.startsWith("ko")) return enabled ? "고정 / 삭제 비활성화" : "고정 / 삭제 활성화";
    if (lang.startsWith("ja")) return enabled ? "固定 / 削除を無効化" : "固定 / 削除を有効化";
    if (lang.startsWith("zh")) return enabled ? "停用固定/删除" : "启用固定/删除";
    return enabled ? "Disable pin/delete" : "Enable pin/delete";
  }

  function moderationActionsToggleLabel() {
    return state.moderationActionsVisible
      ? t("button.moderationActionsDisable", moderationActionsFallback(true))
      : t("button.moderationActionsEnable", moderationActionsFallback(false));
  }

  function updateModerationActionsToggleButton(button) {
    if (!button) return;
    button.textContent = moderationActionsToggleLabel();
    button.setAttribute("aria-pressed", state.moderationActionsVisible ? "true" : "false");
  }

  function refreshOpenPinnedModal() {
    const list = document.getElementById("bmwc-pinned-list");
    if (!list) return;
    list.innerHTML = "";
    if (!state.pins.length) {
      list.innerHTML = `<p>${esc(t("pinned.empty", "No pinned messages."))}</p>`;
      return;
    }
    state.pins.forEach((pin, index) => list.appendChild(renderPinnedItem(pin, index, state.pins.length)));
  }

  function setModerationActionsVisible(visible) {
    state.moderationActionsVisible = !!visible;
    document.querySelectorAll("#bmwc-toggle-moderation-actions").forEach(updateModerationActionsToggleButton);
    refreshOpenPinnedModal();
    // Existing virtual-scroll message nodes are normally reused instead of being
    // rebuilt. Update the admin mini-actions in-place so pin/delete buttons do
    // not wait for a later scroll-driven re-render.
    syncRenderedMessageActions();
    if (state.messages && state.messages.length) scheduleVirtualRender({preserveScroll: true});
  }


  function pinnedTitle(pin) {
    const text = displayMessageText(pin).replace(/\s+/g, " ").trim();
    if (!text) return t("pinned.untitled", "Pinned message");
    return text.length > 64 ? text.slice(0, 64) + "…" : text;
  }

  function pinnedTooltip(pin) {
    const title = pinnedTitle(pin);
    const real = realSender(pin);
    return real ? title + " — " + senderOriginalTitle(real) : title;
  }


  function canViewPinnedMessages() {
    return !!state.token || !state.config || state.config.pinnedShowToLoggedOut !== false;
  }

  function renderPinnedBar() {
    const bar = document.getElementById("bmwc-pinned-bar");
    const opener = document.getElementById("bmwc-pinned-open");
    const label = document.getElementById("bmwc-pinned-label");
    if (!bar || !label) return;
    const count = Array.isArray(state.pins) ? state.pins.length : 0;
    const visible = canViewPinnedMessages() && state.pinsEnabled !== false && count > 0 && !state.minimized;
    bar.classList.toggle("bmwc-hidden", !visible);
    if (!visible) return;
    const rootWidth = document.getElementById("bmwc-root")?.getBoundingClientRect().width || window.innerWidth || 999;
    // Default chat width is around 372px, so do not collapse to a plain count there.
    // Only use compact count when the bar is truly too narrow to show a useful title.
    const compact = rootWidth < 260;
    if (compact) {
      label.textContent = fmt("pinned.compact", "{count}", {count});
      label.title = count === 1 ? pinnedTooltip(state.pins[0]) : fmt("pinned.multiple", "{title} and {rest} more", {title: pinnedTooltip(state.pins[0]), rest: count - 1});
    } else if (count === 1) {
      label.textContent = fmt("pinned.single", "{title}", {title: pinnedTitle(state.pins[0])});
      label.title = pinnedTooltip(state.pins[0]);
    } else {
      label.textContent = fmt("pinned.multiple", "{title} and {rest} more", {title: pinnedTitle(state.pins[0]), rest: count - 1});
      label.title = fmt("pinned.multiple", "{title} and {rest} more", {title: pinnedTooltip(state.pins[0]), rest: count - 1});
    }
    if (opener) opener.title = label.title || label.textContent || "";
    if (bar) bar.title = label.title || label.textContent || "";
  }

  function renderPinnedItem(pin, index = 0, total = 0) {
    const msg = Object.assign({}, pin, {id: pin.messageId || pin.pinId});
    const el = renderMessageElement(msg);
    el.classList.add("bmwc-pinned-item");
    el.querySelectorAll("[data-delete], [data-pin]").forEach(btn => btn.remove());
    const meta = el.querySelector(".bmwc-meta");
    if (meta) {
      const detail = document.createElement("span");
      detail.className = "bmwc-pinned-detail";
      detail.textContent = " · " + fmt("pinned.pinnedBy", "pinned by {user}", {user: pin.pinnedBy || "-"});
      meta.appendChild(detail);
      if (state.moderationActionsVisible && state.pinsCanPin && pin.pinId) {
        const controls = document.createElement("span");
        controls.className = "bmwc-mini-actions bmwc-pinned-actions";

        const up = document.createElement("button");
        up.className = "bmwc-mini-action";
        up.type = "button";
        up.setAttribute("data-pin-move", pin.pinId);
        up.setAttribute("data-direction", "up");
        up.title = t("button.moveUp", "Move up");
        up.textContent = "↑";
        if (index <= 0) up.disabled = true;
        controls.appendChild(up);

        const down = document.createElement("button");
        down.className = "bmwc-mini-action";
        down.type = "button";
        down.setAttribute("data-pin-move", pin.pinId);
        down.setAttribute("data-direction", "down");
        down.title = t("button.moveDown", "Move down");
        down.textContent = "↓";
        if (total > 0 && index >= total - 1) down.disabled = true;
        controls.appendChild(down);

        const unpin = document.createElement("button");
        unpin.className = "bmwc-mini-action";
        unpin.type = "button";
        unpin.setAttribute("data-unpin", pin.pinId);
        unpin.textContent = t("button.unpin", "unpin");
        controls.appendChild(unpin);

        meta.appendChild(controls);
      }
    }
    return el;
  }

  async function loadPins() {
    try {
      const tokenQuery = state.token ? "?token=" + encodeURIComponent(state.token) : "";
      const res = await api("/pins" + tokenQuery, {method: "GET"});
      if (!res || !res.ok) return;
      state.pinsEnabled = res.enabled !== false;
      state.pinsCanPin = !!res.canPin;
      state.pins = canViewPinnedMessages() && Array.isArray(res.pins) ? res.pins : [];
      renderPinnedBar();
      syncRenderedMessageActions();
      if (state.messages && state.messages.length) scheduleVirtualRender({preserveScroll: true});
    } catch (_) {}
  }

  async function pinMessage(id) {
    if (!id || !state.token || !(state.role === "ADMIN" || state.role === "MODERATOR")) return;
    const res = await adminApi("/admin/pin-message", {
      method: "POST",
      body: JSON.stringify({id})
    });
    if (!res.ok) {
      alertResponse("alert.pinFailed", "Pin failed: {error}", res);
      return;
    }
    await loadPins();
  }

  async function movePinnedMessage(pinId, direction) {
    if (!pinId || !direction || !state.token || !(state.role === "ADMIN" || state.role === "MODERATOR")) return;
    const res = await adminApi("/admin/move-pin", {
      method: "POST",
      body: JSON.stringify({pinId, direction})
    });
    if (!res.ok) {
      alertResponse("alert.movePinFailed", "Move failed: {error}", res);
      return;
    }
    await loadPins();
    refreshOpenPinnedModal();
  }

  async function unpinMessage(pinId) {
    if (!pinId || !state.token || !(state.role === "ADMIN" || state.role === "MODERATOR")) return;
    const res = await adminApi("/admin/unpin-message", {
      method: "POST",
      body: JSON.stringify({pinId})
    });
    if (!res.ok) {
      alertResponse("alert.unpinFailed", "Unpin failed: {error}", res);
      return;
    }
    await loadPins();
    refreshOpenPinnedModal();
  }

  function openPinnedModal() {
    if (!state.pinsEnabled || !state.pins.length) return;
    const old = document.getElementById("bmwc-pinned-modal");
    if (old) old.remove();
    const wrap = document.createElement("div");
    wrap.className = "bmwc-modal-backdrop bmwc-pinned-backdrop";
    wrap.id = "bmwc-pinned-modal";
    wrap.innerHTML = `
      <div class="bmwc-modal bmwc-pinned-modal">
        <div class="bmwc-modal-head">
          <h3>${t("pinned.title", "Pinned messages")}</h3>
          <button class="bmwc-button" id="bmwc-pinned-close">${t("button.close", "Close")}</button>
        </div>
        <div class="bmwc-pinned-list" id="bmwc-pinned-list"></div>
      </div>
    `;
    document.body.appendChild(wrap);
    const list = wrap.querySelector("#bmwc-pinned-list");
    if (list) {
      if (!state.pins.length) list.innerHTML = `<p>${esc(t("pinned.empty", "No pinned messages."))}</p>`;
      state.pins.forEach((pin, index) => list.appendChild(renderPinnedItem(pin, index, state.pins.length)));
    }
    wrap.querySelector("#bmwc-pinned-close").onclick = () => wrap.remove();
    wrap.addEventListener("click", e => {
      const move = e.target && e.target.closest ? e.target.closest("[data-pin-move]") : null;
      if (move && wrap.contains(move)) {
        e.preventDefault();
        e.stopPropagation();
        movePinnedMessage(move.getAttribute("data-pin-move"), move.getAttribute("data-direction") || "");
        return;
      }
      const unpin = e.target && e.target.closest ? e.target.closest("[data-unpin]") : null;
      if (unpin && wrap.contains(unpin)) {
        e.preventDefault();
        e.stopPropagation();
        unpinMessage(unpin.getAttribute("data-unpin"));
        return;
      }
      if (e.target === wrap) wrap.remove();
    });
  }

  function adminApi(path, opts = {}) {
    const joiner = path.includes("?") ? "&" : "?";
    return api(path + joiner + "token=" + encodeURIComponent(state.token), opts);
  }

  async function deleteMessage(id) {
    if (!id || !confirm(t("alert.confirmDelete", "Hide this message?"))) return;
    const res = await adminApi("/admin/delete-message", {
      method: "POST",
      body: JSON.stringify({id})
    });
    if (!res.ok) {
      alertResponse("alert.deleteFailed", "Delete failed: {error}", res);
      return;
    }
    // Do not rely solely on the SSE delete event. Older history pages or a
    // temporarily stale EventSource can leave the clicked message visible until
    // the next refresh even though the server already hid it.
    markMessageDeleted(id);
  }

  async function openAdminModal() {
    if (!state.token || !(state.role === "ADMIN" || state.role === "MODERATOR")) return;

    const canManageMutes = (!state.config || state.config.moderationEnabled !== false) && (state.role === "ADMIN" || (!state.config || state.config.allowModeratorGuestMute !== false));
    const wrap = document.createElement("div");
    wrap.className = "bmwc-modal-backdrop bmwc-user-prefs-backdrop";
    wrap.innerHTML = `
      <div class="bmwc-modal bmwc-admin-modal">
        <h3>${t("admin.title", "BlueMap Chat Admin")}</h3>
        <div class="bmwc-tabs">
          <button class="bmwc-button bmwc-tab" data-panel="summary">${t("admin.summary", "Summary")}</button>
          ${canManageMutes ? `<button class="bmwc-button bmwc-tab" data-panel="mutes">${t("admin.mutes", "Mutes")}</button>` : ""}
          ${state.role === "ADMIN" ? `<button class="bmwc-button bmwc-tab" data-panel="sessions">${t("admin.sessions", "Sessions")}</button>` : ""}
          ${state.role === "ADMIN" ? `<button class="bmwc-button bmwc-tab" data-panel="emojis">${t("admin.emojis", "Emojis")}</button>` : ""}
        </div>
        <div id="bmwc-admin-content">${t("admin.loading", "Loading...")}</div>
        <br>
        <button class="bmwc-button" id="bmwc-admin-close">${t("button.close", "Close")}</button>
      </div>
    `;
    protectHistoryEndNotice("admin-open", 6000);
    document.body.appendChild(wrap);
    wrap.querySelector("#bmwc-admin-close").onclick = () => { protectHistoryEndNotice("admin-close", 6000); wrap.remove(); scheduleScrollAffordanceRefresh("admin-close"); };
    wrap.querySelectorAll("[data-panel]").forEach(btn => {
      btn.onclick = () => loadAdminPanel(wrap, btn.dataset.panel);
    });
    await loadAdminPanel(wrap, "summary");
  }

  async function loadAdminPanel(wrap, panel) {
    const content = wrap.querySelector("#bmwc-admin-content");
    content.textContent = t("admin.loading", "Loading...");
    try {
      if (panel === "summary") return renderAdminSummary(content);
      if (panel === "mutes") return renderAdminMutes(content);
      if (panel === "sessions") return renderAdminSessions(content);
      if (panel === "emojis") return renderAdminEmojis(content);
    } catch (e) {
      content.textContent = fmt("admin.failed", "Failed: {error}", {error: e.message});
    }
  }

  async function renderAdminSummary(content) {
    const summary = await adminApi("/admin/summary");
    const online = await adminApi("/admin/online");
    content.innerHTML = `
      <div class="bmwc-admin-grid">
        <div>${t("admin.online", "Online")}</div><strong>${esc(summary.onlineCount)}</strong>
        <div>${t("admin.accounts", "Accounts")}</div><strong>${esc(summary.accountCount)}</strong>
        <div>${t("admin.sessions", "Sessions")}</div><strong>${esc(summary.sessionCount)}</strong>
        <div>${t("admin.mutes", "Mutes")}</div><strong>${esc(summary.muteCount)}</strong>
      </div>
      <h4>${t("admin.onlinePlayers", "Online players")}</h4>
      <div class="bmwc-admin-list">
        ${(online.players || []).map(p => `<div>${esc(p.name)}</div>`).join("") || `<em>${t("admin.none", "none")}</em>`}
      </div>
      <br>
      <div class="bmwc-row bmwc-admin-actions-row">
        <button class="bmwc-button" id="bmwc-clear-history">${t("button.clearHistory", "Clear web history")}</button>
        <button class="bmwc-button" id="bmwc-toggle-moderation-actions" type="button" aria-pressed="${state.moderationActionsVisible ? "true" : "false"}">${moderationActionsToggleLabel()}</button>
      </div>
    `;
    const clear = content.querySelector("#bmwc-clear-history");
    if (clear) clear.onclick = async () => {
      if (!confirm(t("alert.confirmClearHistory", "Clear web chat history?"))) return;
      const res = await adminApi("/admin/clear-history", {method: "POST", body: "{}"});
      if (!res.ok) alertResponse("alert.failed", "Failed: {error}", res);
    };
    const toggleModeration = content.querySelector("#bmwc-toggle-moderation-actions");
    updateModerationActionsToggleButton(toggleModeration);
    if (toggleModeration) toggleModeration.onclick = () => {
      setModerationActionsVisible(!state.moderationActionsVisible);
      updateModerationActionsToggleButton(toggleModeration);
    };
  }

  async function renderAdminMutes(content) {
    const data = await adminApi("/admin/mutes");
    content.innerHTML = `
      <h4>${t("admin.muteGuestIp", "Mute guest/IP")}</h4>
      <div class="bmwc-row">
        <select class="bmwc-input" id="bmwc-mute-type">
          <option value="guest">${t("admin.typeGuest", "guest")}</option>
          <option value="ip">${t("admin.typeIp", "ip")}</option>
        </select>
        <input class="bmwc-input" id="bmwc-mute-value" placeholder="${t("placeholder.muteTarget", "Guest name or IP")}">
      </div>
      <div class="bmwc-row">
        <input class="bmwc-input" id="bmwc-mute-min" placeholder="${t("placeholder.minutes", "minutes")}" value="${esc(state.config?.defaultMuteMinutes || 60)}">
        <input class="bmwc-input" id="bmwc-mute-reason" placeholder="${t("placeholder.reason", "reason")}">
        <button class="bmwc-button" id="bmwc-mute-add">${t("button.mute", "Mute")}</button>
      </div>
      <h4>${t("admin.currentMutes", "Current mutes")}</h4>
      <div class="bmwc-admin-list">
        ${(data.mutes || []).map(m => `
          <div class="bmwc-admin-item">
            <div><strong>${esc(m.type)}</strong>: ${esc(m.value)}<br><small>${esc(m.reason || "")}</small></div>
            <button class="bmwc-button" data-unmute-type="${esc(m.type)}" data-unmute-value="${esc(m.value)}">${t("button.unmute", "Unmute")}</button>
          </div>
        `).join("") || `<em>${t("admin.none", "none")}</em>`}
      </div>
    `;
    content.querySelector("#bmwc-mute-add").onclick = async () => {
      const body = {
        type: content.querySelector("#bmwc-mute-type").value,
        value: content.querySelector("#bmwc-mute-value").value,
        minutes: content.querySelector("#bmwc-mute-min").value,
        reason: content.querySelector("#bmwc-mute-reason").value
      };
      const res = await adminApi("/admin/mute", {method: "POST", body: JSON.stringify(body)});
      if (!res.ok) alertResponse("alert.failed", "Failed: {error}", res);
      await renderAdminMutes(content);
    };
    content.querySelectorAll("[data-unmute-type]").forEach(btn => {
      btn.onclick = async () => {
        const res = await adminApi("/admin/unmute", {
          method: "POST",
          body: JSON.stringify({type: btn.dataset.unmuteType, value: btn.dataset.unmuteValue})
        });
        if (!res.ok) alertResponse("alert.failed", "Failed: {error}", res);
        await renderAdminMutes(content);
      };
    });
  }


  async function renderAdminEmojis(content) {
    if (state.role !== "ADMIN") return;
    await loadEmojis({force: true});
    const data = await adminApi("/admin/emojis?_=" + Date.now(), {cache: "no-store"});
    const packs = Array.isArray(data.packs) ? data.packs : [];
    const items = Array.isArray(state.emojiItems) ? state.emojiItems : [];
    const packIds = new Set(packs.map(pack => String(pack.id || "default")));
    let selectedPack = String(state.adminEmojiSelectedPack || "default");
    if (!packIds.has(selectedPack)) selectedPack = packs[0] && packs[0].id ? String(packs[0].id) : "default";
    state.adminEmojiSelectedPack = selectedPack;
    localStorage.setItem("bmwc.adminEmojiPack", selectedPack);

    const selectedPackInfo = packs.find(pack => String(pack.id || "default") === selectedPack) || {id: selectedPack, label: selectedPack, count: 0};
    const shown = items.filter(item => String(item.pack || "default") === selectedPack);
    const packOptions = packs.map(pack => `<option value="${esc(pack.id)}"${String(pack.id) === selectedPack ? " selected" : ""}>${esc(pack.label || pack.id)} (${esc(pack.count || 0)})</option>`).join("") || `<option value="default">Default</option>`;
    const packTabs = packs.map(pack => `<button type="button" class="bmwc-button bmwc-admin-emoji-tab${String(pack.id) === selectedPack ? " bmwc-active" : ""}" data-admin-emoji-pack="${esc(pack.id)}">${esc(pack.label || pack.id)} <span>${esc(pack.count || 0)}</span></button>`).join("");
    const showStorageUsage = data.showStorageUsage !== false;
    const showStorageLimit = data.showStorageLimit !== false;
    const maxTotalBytes = Number(data.maxTotalSize || 0) || (Number(data.maxTotalSizeMb || 0) > 0 ? Number(data.maxTotalSizeMb) * 1024 * 1024 : 0);
    const limitLines = [
      `<small>${esc(fmt("admin.emojiFileLimit", "Per file {file}", {file: data.maxFileSizeKb ? (data.maxFileSizeKb + " KB") : t("admin.unlimited", "unlimited")}))}</small>`
    ];
    if (showStorageUsage || showStorageLimit) {
      const currentText = formatBytes(data.totalSize || 0);
      const totalText = maxTotalBytes > 0 ? formatBytes(maxTotalBytes) : t("admin.unlimited", "unlimited");
      if (showStorageUsage && showStorageLimit) {
        limitLines.push(`<small>${esc(fmt("admin.emojiStorageUsage", "Storage {current} / {total}", {current: currentText, total: totalText}))}</small>`);
      } else if (showStorageUsage) {
        limitLines.push(`<small>${esc(fmt("admin.emojiStorageCurrent", "Storage {current}", {current: currentText}))}</small>`);
      } else {
        limitLines.push(`<small>${esc(fmt("admin.emojiStorageLimit", "Storage limit {total}", {total: totalText}))}</small>`);
      }
    }

    content.innerHTML = `
      <h4>${t("admin.emojiTitle", "Custom emojis")}</h4>
      <div class="bmwc-admin-emoji-tools">
        <div class="bmwc-admin-emoji-upload-row">
          <input class="bmwc-input" id="bmwc-emoji-upload-file" type="file" accept=".png,.jpg,.jpeg,.gif,.webp,image/png,image/jpeg,image/gif,image/webp">
          <button class="bmwc-button" id="bmwc-emoji-upload" type="button">${t("button.uploadEmoji", "Upload")}</button>
          <button class="bmwc-button" id="bmwc-emoji-pack-create" type="button">${t("button.createPack", "Create folder")}</button>
        </div>
        <small class="bmwc-admin-emoji-file-name" id="bmwc-emoji-upload-file-name" title="${esc(t("admin.emojiNoFileSelected", "No file selected"))}">${esc(t("admin.emojiNoFileSelected", "No file selected"))}</small>
        ${limitLines.join("")}
      </div>
      <h4>${t("admin.emojiCurrent", "Current emojis")}</h4>
      <div class="bmwc-admin-emoji-tabs">${packTabs || `<button type="button" class="bmwc-button bmwc-admin-emoji-tab bmwc-active" data-admin-emoji-pack="default">Default <span>0</span></button>`}</div>
      <div class="bmwc-admin-emoji-pack-actions">
        <div class="bmwc-admin-emoji-pack-summary">
          <select class="bmwc-input" id="bmwc-emoji-pack-select" aria-label="${esc(t("admin.emojiFolderSelect", "Emoji folder"))}">${packOptions}</select>
          <span>${esc(fmt("admin.emojiPackCount", "{count} emojis", {count: shown.length}))}</span>
        </div>
        <div class="bmwc-admin-emoji-pack-buttons">
          <button class="bmwc-button" id="bmwc-emoji-select-all" type="button" ${shown.length ? "" : "disabled"}>${t("button.selectAll", "Select all")}</button>
          <button class="bmwc-button" id="bmwc-emoji-delete-selected" type="button" ${shown.length ? "" : "disabled"}>${t("button.deleteSelected", "Delete selected")}</button>
          ${selectedPack !== "default" ? `<button class="bmwc-button" id="bmwc-emoji-rename-pack" type="button">${t("button.renamePack", "Rename folder")}</button><button class="bmwc-button" id="bmwc-emoji-delete-pack" type="button">${t("button.deletePack", "Delete folder")}</button>` : ""}
        </div>
      </div>
      <div class="bmwc-admin-list bmwc-admin-emoji-list">
        ${shown.map(item => `
          <label class="bmwc-admin-emoji-item">
            <input type="checkbox" class="bmwc-admin-emoji-check" data-emoji-delete-id="${esc(item.id)}">
            <img src="${esc(item.url)}" alt="${esc(item.label || item.name || item.id)}" title="${esc(item.label || item.name || item.id)}" loading="lazy" draggable="false">
            <div class="bmwc-admin-emoji-item-label" title="${esc(item.label || item.name || item.id)}"><strong title="${esc(item.label || item.name || item.id)}">${esc(item.label || item.name || item.id)}</strong></div>
            <div class="bmwc-admin-emoji-item-actions">
              <button class="bmwc-mini-action" data-emoji-rename-one="${esc(item.id)}" data-emoji-current-name="${esc(item.label || item.name || item.id)}" type="button">${t("button.change", "Change")}</button>
              <button class="bmwc-mini-action" data-emoji-delete-one="${esc(item.id)}" type="button">${t("button.delete", "delete")}</button>
            </div>
          </label>
        `).join("") || `<div class="bmwc-admin-emoji-empty" title="${esc(t("emoji.emptyPack", "No emojis in this folder."))}">${esc(t("emoji.emptyPack", "No emojis here."))}</div>`}
      </div>
    `;

    const rerenderPack = async pack => {
      state.adminEmojiSelectedPack = String(pack || "default");
      localStorage.setItem("bmwc.adminEmojiPack", state.adminEmojiSelectedPack);
      await renderAdminEmojis(content);
    };

    content.querySelectorAll("[data-admin-emoji-pack]").forEach(btn => {
      btn.onclick = () => rerenderPack(btn.dataset.adminEmojiPack || "default");
    });

    const packSelect = content.querySelector("#bmwc-emoji-pack-select");
    if (packSelect) packSelect.onchange = () => rerenderPack(packSelect.value || "default");

    const uploadFileInput = content.querySelector("#bmwc-emoji-upload-file");
    const uploadFileName = content.querySelector("#bmwc-emoji-upload-file-name");
    const updateEmojiUploadFileName = () => {
      if (!uploadFileName) return;
      const file = uploadFileInput && uploadFileInput.files && uploadFileInput.files[0];
      const name = file ? file.name : t("admin.emojiNoFileSelected", "No file selected");
      uploadFileName.textContent = name;
      uploadFileName.title = name;
    };
    if (uploadFileInput) {
      uploadFileInput.onchange = updateEmojiUploadFileName;
      updateEmojiUploadFileName();
    }

    const createBtn = content.querySelector("#bmwc-emoji-pack-create");
    if (createBtn) {
      createBtn.onclick = async () => {
        const next = prompt(t("prompt.createEmojiPack", "New folder name"), "");
        if (next == null) return;
        const pack = String(next || "").trim();
        if (!pack) return alert(t("alert.emojiPackNameRequired", "Enter a folder name."));
        const res = await adminApi("/admin/emojis/create-pack", {method: "POST", body: JSON.stringify({pack})});
        if (!res.ok) return alertResponse("alert.failed", "Failed: {error}", res);
        state.adminEmojiSelectedPack = res.pack || pack;
        localStorage.setItem("bmwc.adminEmojiPack", state.adminEmojiSelectedPack);
        await loadEmojis({force: true});
        updateEmojiButton();
        await renderAdminEmojis(content);
      };
    }

    const uploadBtn = content.querySelector("#bmwc-emoji-upload");
    if (uploadBtn) {
      uploadBtn.onclick = async () => {
        const select = content.querySelector("#bmwc-emoji-pack-select");
        const fileInput = content.querySelector("#bmwc-emoji-upload-file");
        const file = fileInput && fileInput.files && fileInput.files[0];
        if (!file) return alert(t("alert.emojiFileRequired", "Choose an emoji file."));
        const pack = select ? select.value : selectedPack;
        const form = new FormData();
        form.append("pack", pack || "default");
        form.append("file", file, file.name);
        uploadBtn.disabled = true;
        try {
          const res = await adminApi("/admin/emojis/upload", {method: "POST", body: form});
          if (!res.ok) return alertResponse("alert.uploadFailed", "Upload failed: {error}", res);
          state.adminEmojiSelectedPack = res.pack || pack || "default";
          localStorage.setItem("bmwc.adminEmojiPack", state.adminEmojiSelectedPack);
          await loadEmojis({force: true});
          updateEmojiButton();
          await renderAdminEmojis(content);
        } catch (err) {
          const res = err && err.response ? err.response : {ok: false, error: err && err.bmwcTimeout ? "timeout" : (err && err.message ? err.message : "network")};
          alertResponse("alert.uploadFailed", "Upload failed: {error}", res);
          try { await renderAdminEmojis(content); } catch (_) {}
        } finally {
          uploadBtn.disabled = false;
        }
      };
    }

    const deleteOne = async id => {
      if (!id) return;
      if (!confirm(t("alert.confirmDeleteEmoji", "Delete this emoji?"))) return;
      const res = await adminApi("/admin/emojis/delete", {method: "POST", body: JSON.stringify({type: "item", id})});
      if (!res.ok) return alertResponse("alert.failed", "Failed: {error}", res);
      await loadEmojis({force: true});
      updateEmojiButton();
      await renderAdminEmojis(content);
    };

    const renameOne = async (id, currentName) => {
      if (!id) return;
      const next = prompt(t("prompt.renameEmoji", "New emoji name"), currentName || "");
      if (next == null) return;
      const name = String(next || "").trim();
      if (!name) return alert(t("alert.emojiRenameNameRequired", "Enter a new name."));
      if (!confirm(fmt("alert.confirmRenameEmoji", "Rename this emoji to {name}? Existing emoji tokens using the old name will no longer match.", {name}))) return;
      const res = await adminApi("/admin/emojis/rename", {method: "POST", body: JSON.stringify({type: "item", id, name})});
      if (!res.ok) return alertResponse("alert.renameFailed", "Rename failed: {error}", res);
      await loadEmojis({force: true});
      updateEmojiButton();
      await renderAdminEmojis(content);
    };

    content.querySelectorAll("[data-emoji-delete-one]").forEach(btn => {
      btn.onclick = event => {
        event.preventDefault();
        event.stopPropagation();
        deleteOne(btn.dataset.emojiDeleteOne || "");
      };
    });

    content.querySelectorAll("[data-emoji-rename-one]").forEach(btn => {
      btn.onclick = event => {
        event.preventDefault();
        event.stopPropagation();
        renameOne(btn.dataset.emojiRenameOne || "", btn.dataset.emojiCurrentName || "");
      };
    });

    const emojiChecks = () => Array.from(content.querySelectorAll(".bmwc-admin-emoji-check"));
    const updateSelectAllButton = () => {
      const btn = content.querySelector("#bmwc-emoji-select-all");
      if (!btn) return;
      const checks = emojiChecks();
      const allChecked = checks.length > 0 && checks.every(check => check.checked);
      btn.textContent = allChecked ? t("button.deselectAll", "Clear all") : t("button.selectAll", "Select all");
      btn.setAttribute("aria-pressed", allChecked ? "true" : "false");
    };

    const selectAll = content.querySelector("#bmwc-emoji-select-all");
    if (selectAll) {
      content.querySelectorAll(".bmwc-admin-emoji-check").forEach(check => {
        check.onchange = updateSelectAllButton;
      });
      updateSelectAllButton();
      selectAll.onclick = event => {
        event.preventDefault();
        event.stopPropagation();
        const checks = emojiChecks();
        const allChecked = checks.length > 0 && checks.every(check => check.checked);
        checks.forEach(check => { check.checked = !allChecked; });
        updateSelectAllButton();
      };
    }

    const deleteSelected = content.querySelector("#bmwc-emoji-delete-selected");
    if (deleteSelected) {
      deleteSelected.onclick = async () => {
        const ids = Array.from(content.querySelectorAll(".bmwc-admin-emoji-check:checked")).map(el => el.dataset.emojiDeleteId).filter(Boolean);
        if (!ids.length) return alert(t("alert.emojiSelectRequired", "Select emojis to delete."));
        if (!confirm(fmt("alert.confirmDeleteSelectedEmoji", "Delete {count} selected emojis?", {count: ids.length}))) return;
        deleteSelected.disabled = true;
        try {
          for (const id of ids) {
            const res = await adminApi("/admin/emojis/delete", {method: "POST", body: JSON.stringify({type: "item", id})});
            if (!res.ok) return alertResponse("alert.failed", "Failed: {error}", res);
          }
          await loadEmojis({force: true});
          updateEmojiButton();
          await renderAdminEmojis(content);
        } finally {
          deleteSelected.disabled = false;
        }
      };
    }

    const renamePack = content.querySelector("#bmwc-emoji-rename-pack");
    if (renamePack) {
      renamePack.onclick = async () => {
        const next = prompt(t("prompt.renameEmojiPack", "New folder name"), selectedPackInfo.label || selectedPack);
        if (next == null) return;
        const name = String(next || "").trim();
        if (!name) return alert(t("alert.emojiRenameNameRequired", "Enter a new name."));
        if (!confirm(fmt("alert.confirmRenameEmojiPack", "Rename folder {pack} to {name}? Emoji tokens in this folder will change.", {pack: selectedPackInfo.label || selectedPack, name}))) return;
        const res = await adminApi("/admin/emojis/rename", {method: "POST", body: JSON.stringify({type: "pack", pack: selectedPack, name})});
        if (!res.ok) return alertResponse("alert.renameFailed", "Rename failed: {error}", res);
        state.adminEmojiSelectedPack = res.pack || name;
        localStorage.setItem("bmwc.adminEmojiPack", state.adminEmojiSelectedPack);
        await loadEmojis({force: true});
        updateEmojiButton();
        await renderAdminEmojis(content);
      };
    }

    const deletePack = content.querySelector("#bmwc-emoji-delete-pack");
    if (deletePack) {
      deletePack.onclick = async () => {
        if (!confirm(fmt("alert.confirmDeleteEmojiPack", "Delete folder {pack} and all emojis inside?", {pack: selectedPack}))) return;
        const res = await adminApi("/admin/emojis/delete", {method: "POST", body: JSON.stringify({type: "pack", pack: selectedPack})});
        if (!res.ok) return alertResponse("alert.failed", "Failed: {error}", res);
        state.adminEmojiSelectedPack = "default";
        localStorage.setItem("bmwc.adminEmojiPack", "default");
        await loadEmojis({force: true});
        updateEmojiButton();
        await renderAdminEmojis(content);
      };
    }
  }

  async function renderAdminSessions(content) {
    const data = await adminApi("/admin/sessions");
    content.innerHTML = `
      <h4>${t("admin.sessions", "Sessions")}</h4>
      <div class="bmwc-admin-list">
        ${(data.sessions || []).map(s => `
          <div class="bmwc-admin-item">
            <div>
              <strong>${esc(s.username)}</strong> ${esc(s.role)}<br>
              <small>${esc(s.lastIp || "")} / ${t("admin.expires", "expires")} ${s.expiresAt ? esc(formatMessageTimeFull(s.expiresAt)) : t("admin.never", "never")}</small>
            </div>
            <button class="bmwc-button" data-revoke="${esc(s.username)}">${t("button.revoke", "Revoke")}</button>
          </div>
        `).join("") || `<em>${t("admin.none", "none")}</em>`}
      </div>
    `;
    content.querySelectorAll("[data-revoke]").forEach(btn => {
      btn.onclick = async () => {
        if (!confirm(fmt("admin.revokeConfirm", "Revoke all sessions for {username}?", {username: btn.dataset.revoke}))) return;
        const res = await adminApi("/admin/revoke", {
          method: "POST",
          body: JSON.stringify({username: btn.dataset.revoke})
        });
        if (!res.ok) alertResponse("alert.failed", "Failed: {error}", res);
        await renderAdminSessions(content);
      };
    });
  }


  function clampModalPosition(modal, left, top) {
    const rect = modal.getBoundingClientRect();
    const pad = 8;
    const maxLeft = Math.max(pad, window.innerWidth - rect.width - pad);
    const maxTop = Math.max(pad, window.innerHeight - rect.height - pad);
    return {
      left: Math.max(pad, Math.min(maxLeft, left)),
      top: Math.max(pad, Math.min(maxTop, top))
    };
  }

  function makeModalDraggable(wrap, storageKey) {
    const modal = wrap && wrap.querySelector(".bmwc-modal");
    const handle = modal && modal.querySelector("h3");
    if (!modal || !handle) return;

    modal.classList.add("bmwc-draggable-modal");
    handle.classList.add("bmwc-modal-drag-handle");

    const saved = storageKey ? localStorage.getItem(storageKey) : "";
    if (saved) {
      try {
        const pos = JSON.parse(saved);
        const clamped = clampModalPosition(modal, Number(pos.left) || 0, Number(pos.top) || 0);
        modal.style.position = "absolute";
        modal.style.left = clamped.left + "px";
        modal.style.top = clamped.top + "px";
        modal.style.margin = "0";
        wrap.classList.add("bmwc-modal-dragging-ready");
      } catch (_) {}
    }

    let active = false;
    let offsetX = 0;
    let offsetY = 0;

    const point = event => {
      const src = event.touches && event.touches.length ? event.touches[0] :
                  event.changedTouches && event.changedTouches.length ? event.changedTouches[0] :
                  event;
      return {x: Number(src.clientX) || 0, y: Number(src.clientY) || 0};
    };

    const begin = event => {
      const target = event.target;
      if (target && target.closest && target.closest("button, input, select, textarea")) return;
      const p = point(event);
      const rect = modal.getBoundingClientRect();

      active = true;
      offsetX = p.x - rect.left;
      offsetY = p.y - rect.top;

      modal.style.position = "absolute";
      modal.style.left = rect.left + "px";
      modal.style.top = rect.top + "px";
      modal.style.margin = "0";
      wrap.classList.add("bmwc-modal-dragging-ready");

      event.preventDefault();
      event.stopPropagation();
    };

    const move = event => {
      if (!active) return;
      const p = point(event);
      const clamped = clampModalPosition(modal, p.x - offsetX, p.y - offsetY);
      modal.style.left = clamped.left + "px";
      modal.style.top = clamped.top + "px";
      event.preventDefault();
      event.stopPropagation();
    };

    const end = event => {
      if (!active) return;
      active = false;
      if (storageKey) {
        localStorage.setItem(storageKey, JSON.stringify({
          left: parseFloat(modal.style.left) || 0,
          top: parseFloat(modal.style.top) || 0
        }));
      }
      if (event) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    handle.addEventListener("pointerdown", begin);
    window.addEventListener("pointermove", move, true);
    window.addEventListener("pointerup", end, true);
    window.addEventListener("pointercancel", end, true);
    handle.addEventListener("touchstart", begin, {passive: false});
    window.addEventListener("touchmove", move, {capture: true, passive: false});
    window.addEventListener("touchend", end, {capture: true, passive: false});
    window.addEventListener("touchcancel", end, {capture: true, passive: false});
  }

  function fontOptionLabel(value) {
    value = String(value || "");
    if (!value) return t("preferences.fontDefault", "Default");
    if (value === "system-ui, sans-serif") return t("preferences.fontSystem", "System");
    return value.replace(/"/g, "");
  }


  function normalizePreferenceLine(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function uniquePreferenceLines(lines) {
    const out = [];
    const seen = new Set();
    for (const line of lines || []) {
      const clean = normalizePreferenceLine(line);
      if (!clean) continue;
      const key = clean.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(clean);
    }
    return out;
  }

  function splitLegacyFontHelp(value) {
    const text = normalizePreferenceLine(value);
    if (!text) return {help: "", example: ""};
    const markerRe = /(?:^|\s)(Examples?:\s*|예:\s*|例:\s*|示例[:：]\s*)/i;
    const match = markerRe.exec(text);
    if (!match) return {help: text, example: ""};
    const help = text.slice(0, match.index).trim();
    const example = text.slice(match.index).trim();
    return {help, example};
  }

  function preferencesFontHelpParts(labels = {}) {
    const fallbackHelp = "Find the font family name in your OS font settings.";
    const fallbackExample = "Examples: Malgun Gothic, Noto Sans KR, D2Coding.";
    const rawHelp = labels && labels.fontHelp ? String(labels.fontHelp) : t("preferences.fontHelp", fallbackHelp);
    const split = splitLegacyFontHelp(rawHelp);
    const rawExample = labels && labels.fontExample ? String(labels.fontExample) : t("preferences.fontExample", split.example || fallbackExample);
    const example = split.example || rawExample;
    return uniquePreferenceLines([split.help || rawHelp || fallbackHelp, example || fallbackExample]);
  }

  function splitLegacyPreferenceNote(value) {
    const text = normalizePreferenceLine(value);
    if (!text) return {note: "", drag: ""};
    const dragMarkers = [
      "Drag the title to move this window.",
      "제목을 잡고 이동할 수 있습니다.",
      "タイトルをドラッグして移動できます。",
      "可拖动标题移动此窗口。"
    ];
    let best = -1;
    let marker = "";
    for (const m of dragMarkers) {
      const idx = text.indexOf(m);
      if (idx >= 0 && (best < 0 || idx < best)) {
        best = idx;
        marker = m;
      }
    }
    if (best < 0) return {note: text, drag: ""};
    return {
      note: text.slice(0, best).trim(),
      drag: text.slice(best).trim() || marker
    };
  }

  function preferencesNoteParts(labels = {}) {
    const fallbackNote = "Saved only in this browser.";
    const fallbackDrag = "Drag the title to move this window.";
    const rawNote = labels && labels.note ? String(labels.note) : t("preferences.note", fallbackNote);
    const split = splitLegacyPreferenceNote(rawNote);
    const rawDrag = labels && labels.noteDrag ? String(labels.noteDrag) : t("preferences.noteDrag", split.drag || fallbackDrag);
    return {
      note: uniquePreferenceLines([split.note || rawNote || fallbackNote])[0] || fallbackNote,
      drag: uniquePreferenceLines([split.drag || rawDrag || fallbackDrag])[0] || fallbackDrag
    };
  }

  function preferencesNoteText(labels = {}) {
    return preferencesNoteParts(labels).note;
  }

  function preferencesNoteDragText(labels = {}) {
    return preferencesNoteParts(labels).drag;
  }

  function preferencesNoteHtml(labels = {}, includeDrag = false, escapeFn = esc) {
    const parts = preferencesNoteParts(labels);
    const lines = [parts.note];
    if (includeDrag) lines.push(parts.drag);
    return uniquePreferenceLines(lines).map(line => escapeFn(line)).join("<br>");
  }

  function preferencesFontHelpHtml(labels = {}, escapeFn = esc) {
    return preferencesFontHelpParts(labels).map(line => escapeFn(line)).join("<br>");
  }


  function buildUserPreferencesPayload() {
    const configured = Array.isArray(state.config && state.config.uiUserFontOptions) ? state.config.uiUserFontOptions : [];
    const options = configured.length ? configured : ["", "system-ui, sans-serif", "Arial, sans-serif", "Verdana, sans-serif", "Georgia, serif", "serif", "monospace"];
    const seen = new Set();
    const fontOptions = options.filter(v => {
      v = String(v || "");
      if (seen.has(v)) return false;
      seen.add(v);
      return true;
    }).map(v => ({value: String(v || ""), label: fontOptionLabel(v)}));

    const fontHelpParts = preferencesFontHelpParts();
    const noteParts = preferencesNoteParts();

    return {
      labels: {
        title: t("preferences.title", "Chat settings"),
        theme: t("preferences.theme", "Theme"),
        themeDefault: t("preferences.themeDefault", "Default"),
        themeSystem: t("preferences.themeSystem", "System"),
        themeDark: t("preferences.themeDark", "Dark"),
        themeLight: t("preferences.themeLight", "Light"),
        themeHighContrast: t("preferences.themeHighContrast", "High contrast"),
        themeResetNote: t("preferences.themeResetNote", "Changing the theme resets visual chat settings to the theme defaults."),
        opacity: t("opacity.title", "Opacity"),
        fontSize: t("preferences.fontSize", "Font size"),
        fontFamily: t("preferences.fontFamily", "Font"),
        fontCustom: t("preferences.fontCustom", "Custom font"),
        fontCustomPlaceholder: t("preferences.fontCustomPlaceholder", "Installed font name or CSS font-family"),
        fontApply: t("preferences.fontApply", "Apply"),
        fontTest: t("preferences.fontTest", "Test"),
        fontHelp: fontHelpParts[0] || t("preferences.fontHelp", "Find the font family name in your OS font settings."),
        fontExample: fontHelpParts[1] || t("preferences.fontExample", "Examples: Malgun Gothic, Noto Sans KR, D2Coding."),
        fontDetected: t("preferences.fontDetected", "Detected in this browser: {name}"),
        fontNotDetected: t("preferences.fontNotDetected", "Not detected. Check the font family name or install the font on this device."),
        fontGeneric: t("preferences.fontGeneric", "Generic CSS family: {name}"),
        fontUnknown: t("preferences.fontUnknown", "Could not test this font in this browser."),
        textColor: t("preferences.textColor", "Message text color"),
        uiTextColor: t("preferences.uiTextColor", "UI text color"),
        textShadow: t("preferences.textShadow", "Text shadow"),
        textShadowNone: t("preferences.textShadowNone", "None"),
        textShadowAuto: t("preferences.textShadowAuto", "Auto"),
        textShadowDark: t("preferences.textShadowDark", "Dark shadow"),
        textShadowLight: t("preferences.textShadowLight", "Light shadow"),
        textShadowCustom: t("preferences.textShadowCustom", "Custom"),
        textShadowCustomValue: t("preferences.textShadowCustomValue", "Custom shadow"),
        textShadowCustomColor: t("preferences.textShadowCustomColor", "Shadow color"),
        textShadowCustomX: t("preferences.textShadowCustomX", "X offset"),
        textShadowCustomY: t("preferences.textShadowCustomY", "Y offset"),
        textShadowCustomBlur: t("preferences.textShadowCustomBlur", "Blur"),
        textShadowCustomOpacity: t("preferences.textShadowCustomOpacity", "Opacity"),
        textShadowCustomPreview: t("preferences.textShadowCustomPreview", "Shadow preview"),
        textShadowCustomPlaceholder: t("preferences.textShadowCustomPlaceholder", "0 1px 2px rgba(0, 0, 0, 0.85)"),
        backgroundColor: t("preferences.backgroundColor", "Background color"),
        inputBackgroundColor: t("preferences.inputBackgroundColor", "Input background color"),
        language: t("preferences.language", "Language"),
        reset: t("button.reset", "Reset"),
        close: t("button.close", "Close"),
        note: noteParts.note,
        noteDrag: noteParts.drag,
        fontDefault: t("preferences.fontDefault", "Default"),
        fontSystem: t("preferences.fontSystem", "System"),
        languageDefault: t("preferences.languageDefault", "Default")
      },
      opacityPercent: Math.round(Number(effectiveOpacity()) * 100),
      defaultOpacityPercent: Math.round(Number(clampOpacity(state.config.uiOpacity)) * 100),
      fontSizePx: Number(formatDecimalNumber(Number(effectiveBaseFontSize()) || 13, 2)),
      defaultFontSizePx: Number(formatDecimalNumber(Number(state.config.uiFontSize || 13), 2)),
      fontFamily: savedUserFontFamily(),
      textColor: effectiveUserTextColor(),
      uiTextColor: effectiveUserUiTextColor(),
      textShadowMode: effectiveUserTextShadowMode(),
      textShadowCustom: effectiveUserTextShadowCustom(),
      backgroundColor: effectiveUserBackgroundColor(),
      inputBackgroundColor: effectiveUserInputBackgroundColor(),
      fontOptions,
      theme: savedUserTheme(),
      themeOptions: [
        {value: "", label: t("preferences.themeDefault", "Default")},
        {value: "system", label: t("preferences.themeSystem", "System")},
        {value: "dark", label: t("preferences.themeDark", "Dark")},
        {value: "light", label: t("preferences.themeLight", "Light")},
        {value: "high-contrast", label: t("preferences.themeHighContrast", "High contrast")}
      ],
      language: savedUserLanguage(),
      languageOptions: [""].concat((state.availableLanguages && state.availableLanguages.length ? state.availableLanguages : ["ko-KR", "en-US", "ja-JP", "zh-CN"]).filter(Boolean)).map(code => ({value: code, label: languageLabel(code)}))
    };
  }

  function optionListHtml(items, current) {
    return (items || []).map(item => `<option value="${esc(item.value)}"${String(item.value || "") === String(current || "") ? " selected" : ""}>${esc(item.label)}</option>`).join("");
  }

  function openLocalUserPreferencesModal(payload) {
    const old = document.getElementById("bmwc-user-prefs-modal");
    if (old) old.remove();
    const labels = payload.labels || {};
    const includeDragNote = !state.isPip;
    const wrap = document.createElement("div");
    wrap.className = "bmwc-modal-backdrop bmwc-user-prefs-backdrop";
    wrap.id = "bmwc-user-prefs-modal";
    wrap.innerHTML = `
      <div class="bmwc-modal bmwc-user-prefs-modal">
        <div class="bmwc-modal-head">
          <h3>${esc(labels.title || "Chat settings")}</h3>
          <button class="bmwc-button" id="bmwc-prefs-close">${esc(labels.close || "Close")}</button>
        </div>

        <label class="bmwc-pref-label"><span>${esc(labels.theme || "Theme")}</span></label>
        <select class="bmwc-input bmwc-pref-select" id="bmwc-prefs-theme">${optionListHtml(payload.themeOptions, payload.theme)}</select>
        <p class="bmwc-pref-font-help">${esc(labels.themeResetNote || "Changing the theme resets visual chat settings to the theme defaults.")}</p>

        <label class="bmwc-pref-label"><span>${esc(labels.opacity || "Opacity")}</span><strong id="bmwc-prefs-opacity-value">${Math.round(payload.opacityPercent || 100)}%</strong></label>
        <input class="bmwc-pref-range" id="bmwc-prefs-opacity" type="range" min="10" max="100" step="1" value="${Math.round(payload.opacityPercent || 100)}">
        <div class="bmwc-pref-hints"><span>10%</span><span>100%</span></div>

        <label class="bmwc-pref-label"><span>${esc(labels.fontSize || "Font size")}</span><strong id="bmwc-prefs-font-size-value">${pxLabel(payload.fontSizePx || 13)}</strong></label>
        <input class="bmwc-pref-range" id="bmwc-prefs-font-size" type="range" min="8" max="36" step="0.1" value="${formatDecimalNumber(payload.fontSizePx || 13, 2)}">
        <div class="bmwc-pref-hints"><span>8px</span><span>36px</span></div>

        <label class="bmwc-pref-label"><span>${esc(labels.fontFamily || "Font")}</span></label>
        <select class="bmwc-input bmwc-pref-select" id="bmwc-prefs-font-family">${optionListHtml(payload.fontOptions, payload.fontFamily)}</select>
        <label class="bmwc-pref-label"><span>${esc(labels.fontCustom || "Custom font")}</span></label>
        <div class="bmwc-pref-inline-row">
          <input class="bmwc-input" id="bmwc-prefs-font-family-custom" type="text" value="${esc(payload.fontFamily || "")}" placeholder="${esc(labels.fontCustomPlaceholder || "Installed font name or CSS font-family")}">
          <button class="bmwc-button" id="bmwc-prefs-font-family-test" type="button">${esc(labels.fontTest || "Test")}</button>
          <button class="bmwc-button" id="bmwc-prefs-font-family-apply" type="button">${esc(labels.fontApply || "Apply")}</button>
        </div>
        <p class="bmwc-pref-font-help">${preferencesFontHelpHtml(labels, esc)}</p>
        <p class="bmwc-pref-font-status" id="bmwc-prefs-font-family-status" aria-live="polite"></p>

        <label class="bmwc-pref-label"><span>${esc(labels.textColor || "Message text color")}</span><input class="bmwc-pref-color-input" id="bmwc-prefs-text-color" type="color" value="${esc(payload.textColor || "#ffffff")}"></label>
        <label class="bmwc-pref-label"><span>${esc(labels.uiTextColor || "UI text color")}</span><input class="bmwc-pref-color-input" id="bmwc-prefs-ui-text-color" type="color" value="${esc(payload.uiTextColor || "#ffffff")}"></label>
        <label class="bmwc-pref-label"><span>${esc(labels.backgroundColor || "Background color")}</span><input class="bmwc-pref-color-input" id="bmwc-prefs-background-color" type="color" value="${esc(payload.backgroundColor || "#121216")}"></label>
        <label class="bmwc-pref-label"><span>${esc(labels.inputBackgroundColor || "Input background color")}</span><input class="bmwc-pref-color-input" id="bmwc-prefs-input-background-color" type="color" value="${esc(payload.inputBackgroundColor || "#000000")}"></label>

        <label class="bmwc-pref-label"><span>${esc(labels.textShadow || "Text shadow")}</span></label>
        <select class="bmwc-input bmwc-pref-select" id="bmwc-prefs-text-shadow-mode">
          <option value="none" ${payload.textShadowMode === "none" ? "selected" : ""}>${esc(labels.textShadowNone || "None")}</option>
          <option value="auto" ${payload.textShadowMode === "auto" ? "selected" : ""}>${esc(labels.textShadowAuto || "Auto")}</option>
          <option value="dark" ${payload.textShadowMode === "dark" ? "selected" : ""}>${esc(labels.textShadowDark || "Dark shadow")}</option>
          <option value="light" ${payload.textShadowMode === "light" ? "selected" : ""}>${esc(labels.textShadowLight || "Light shadow")}</option>
          <option value="custom" ${payload.textShadowMode === "custom" ? "selected" : ""}>${esc(labels.textShadowCustom || "Custom")}</option>
        </select>
        <div class="bmwc-shadow-custom-panel" id="bmwc-prefs-text-shadow-custom-panel">
          <label class="bmwc-pref-label"><span>${esc(labels.textShadowCustomColor || "Shadow color")}</span><input class="bmwc-pref-color-input" id="bmwc-prefs-text-shadow-color" type="color"></label>
          <label class="bmwc-pref-label"><span>${esc(labels.textShadowCustomX || "X offset")}</span><strong id="bmwc-prefs-text-shadow-x-value">0px</strong></label>
          <input class="bmwc-pref-range" id="bmwc-prefs-text-shadow-x" type="range" min="-12" max="12" step="0.1">
          <label class="bmwc-pref-label"><span>${esc(labels.textShadowCustomY || "Y offset")}</span><strong id="bmwc-prefs-text-shadow-y-value">1px</strong></label>
          <input class="bmwc-pref-range" id="bmwc-prefs-text-shadow-y" type="range" min="-12" max="12" step="0.1">
          <label class="bmwc-pref-label"><span>${esc(labels.textShadowCustomBlur || "Blur")}</span><strong id="bmwc-prefs-text-shadow-blur-value">2px</strong></label>
          <input class="bmwc-pref-range" id="bmwc-prefs-text-shadow-blur" type="range" min="0" max="24" step="0.1">
          <label class="bmwc-pref-label"><span>${esc(labels.textShadowCustomOpacity || "Opacity")}</span><strong id="bmwc-prefs-text-shadow-opacity-value">85%</strong></label>
          <input class="bmwc-pref-range" id="bmwc-prefs-text-shadow-opacity" type="range" min="0" max="100" step="1">
          <div class="bmwc-shadow-preview" id="bmwc-prefs-text-shadow-preview">${esc(labels.textShadowCustomPreview || "Shadow preview")}</div>
        </div>

        <label class="bmwc-pref-label"><span>${esc(labels.language || "Language")}</span></label>
        <select class="bmwc-input bmwc-pref-select" id="bmwc-prefs-language">${optionListHtml(payload.languageOptions, payload.language)}</select>

        <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:12px;">
          <button class="bmwc-button" id="bmwc-prefs-reset">${esc(labels.reset || "Reset")}</button>
        </div>
        <p class="bmwc-opacity-note">${preferencesNoteHtml(labels, includeDragNote, esc)}</p>
      </div>
    `;
    document.body.appendChild(wrap);
    makeModalDraggable(wrap, "bmwc.localUserPrefsModalPos");

    const themeSelect = wrap.querySelector("#bmwc-prefs-theme");
    const opacityInput = wrap.querySelector("#bmwc-prefs-opacity");
    const opacityValue = wrap.querySelector("#bmwc-prefs-opacity-value");
    const sizeInput = wrap.querySelector("#bmwc-prefs-font-size");
    const sizeValue = wrap.querySelector("#bmwc-prefs-font-size-value");
    const familySelect = wrap.querySelector("#bmwc-prefs-font-family");
    const familyCustomInput = wrap.querySelector("#bmwc-prefs-font-family-custom");
    const familyApplyButton = wrap.querySelector("#bmwc-prefs-font-family-apply");
    const familyTestButton = wrap.querySelector("#bmwc-prefs-font-family-test");
    const familyStatus = wrap.querySelector("#bmwc-prefs-font-family-status");
    const textColorInput = wrap.querySelector("#bmwc-prefs-text-color");
    const uiTextColorInput = wrap.querySelector("#bmwc-prefs-ui-text-color");
    const textShadowModeInput = wrap.querySelector("#bmwc-prefs-text-shadow-mode");
    const textShadowCustomPanel = wrap.querySelector("#bmwc-prefs-text-shadow-custom-panel");
    const textShadowColorInput = wrap.querySelector("#bmwc-prefs-text-shadow-color");
    const textShadowXInput = wrap.querySelector("#bmwc-prefs-text-shadow-x");
    const textShadowYInput = wrap.querySelector("#bmwc-prefs-text-shadow-y");
    const textShadowBlurInput = wrap.querySelector("#bmwc-prefs-text-shadow-blur");
    const textShadowOpacityInput = wrap.querySelector("#bmwc-prefs-text-shadow-opacity");
    const textShadowXValue = wrap.querySelector("#bmwc-prefs-text-shadow-x-value");
    const textShadowYValue = wrap.querySelector("#bmwc-prefs-text-shadow-y-value");
    const textShadowBlurValue = wrap.querySelector("#bmwc-prefs-text-shadow-blur-value");
    const textShadowOpacityValue = wrap.querySelector("#bmwc-prefs-text-shadow-opacity-value");
    const textShadowPreview = wrap.querySelector("#bmwc-prefs-text-shadow-preview");
    const backgroundColorInput = wrap.querySelector("#bmwc-prefs-background-color");
    const inputBackgroundColorInput = wrap.querySelector("#bmwc-prefs-input-background-color");
    const languageSelect = wrap.querySelector("#bmwc-prefs-language");

    const close = () => { wrap.remove(); state.prefsModalOpen = false; };
    wrap.querySelector("#bmwc-prefs-close").onclick = close;
    wrap.addEventListener("click", e => { if (e.target === wrap) close(); });

    if (themeSelect) themeSelect.addEventListener("change", () => setUserTheme(themeSelect.value));

    opacityInput.addEventListener("input", () => {
      const v = Math.max(10, Math.min(100, Number(opacityInput.value) || payload.defaultOpacityPercent || 100));
      opacityValue.textContent = Math.round(v) + "%";
      setUserOpacity(v / 100, false);
    });
    opacityInput.addEventListener("change", () => setUserOpacity((Number(opacityInput.value) || payload.defaultOpacityPercent || 100) / 100, true));
    opacityInput.addEventListener("pointerup", () => setUserOpacity((Number(opacityInput.value) || payload.defaultOpacityPercent || 100) / 100, true));

    sizeInput.addEventListener("input", () => {
      const v = Math.max(8, Math.min(36, Number(sizeInput.value) || payload.defaultFontSizePx || 13));
      sizeValue.textContent = pxLabel(v);
      setUserFontSize(v, false);
    });
    sizeInput.addEventListener("change", () => setUserFontSize(Number(sizeInput.value) || payload.defaultFontSizePx || 13, true));
    sizeInput.addEventListener("pointerup", () => setUserFontSize(Number(sizeInput.value) || payload.defaultFontSizePx || 13, true));

    familySelect.addEventListener("change", () => {
      if (familyCustomInput) familyCustomInput.value = familySelect.value;
      setUserFontFamily(familySelect.value);
    });
    const fontStatusText = status => {
      const name = status && status.name ? status.name : "";
      if (!status || status.state === "empty") return "";
      if (status.state === "detected") return fmt("preferences.fontDetected", "Detected in this browser: {name}", {name});
      if (status.state === "notDetected") return t("preferences.fontNotDetected", "Not detected. Check the font family name or install the font on this device.");
      if (status.state === "generic") return fmt("preferences.fontGeneric", "Generic CSS family: {name}", {name});
      return t("preferences.fontUnknown", "Could not test this font in this browser.");
    };
    const updateFontStatus = () => {
      if (!familyStatus) return;
      const value = familyCustomInput ? familyCustomInput.value : (familySelect ? familySelect.value : "");
      const status = fontDetectionStatus(value);
      familyStatus.textContent = fontStatusText(status);
      familyStatus.dataset.state = status.state || "";
    };
    const applyCustomFont = () => {
      setUserFontFamily(familyCustomInput ? familyCustomInput.value : "");
      updateFontStatus();
    };
    if (familyTestButton) familyTestButton.addEventListener("click", updateFontStatus);
    if (familyApplyButton) familyApplyButton.addEventListener("click", applyCustomFont);
    if (familyCustomInput) familyCustomInput.addEventListener("keydown", event => {
      if (event.key !== "Enter" || event.isComposing) return;
      event.preventDefault();
      updateFontStatus();
    });
    if (familyCustomInput) familyCustomInput.addEventListener("input", () => {
      if (familyStatus) familyStatus.textContent = "";
    });
    textColorInput.addEventListener("input", () => setUserTextColor(textColorInput.value));
    uiTextColorInput.addEventListener("input", () => setUserUiTextColor(uiTextColorInput.value));
    const readShadowParts = () => ({
      color: textShadowColorInput ? textShadowColorInput.value : "#000000",
      x: textShadowXInput ? Number(textShadowXInput.value) : 0,
      y: textShadowYInput ? Number(textShadowYInput.value) : 1,
      blur: textShadowBlurInput ? Number(textShadowBlurInput.value) : 2,
      opacity: textShadowOpacityInput ? Number(textShadowOpacityInput.value) : 85
    });
    const syncShadowControls = (parts = parseTextShadowParts(payload.textShadowCustom)) => {
      if (textShadowColorInput) textShadowColorInput.value = parts.color;
      if (textShadowXInput) textShadowXInput.value = formatDecimalNumber(parts.x, 2);
      if (textShadowYInput) textShadowYInput.value = formatDecimalNumber(parts.y, 2);
      if (textShadowBlurInput) textShadowBlurInput.value = formatDecimalNumber(parts.blur, 2);
      if (textShadowOpacityInput) textShadowOpacityInput.value = String(parts.opacity);
      if (textShadowXValue) textShadowXValue.textContent = pxLabel(parts.x);
      if (textShadowYValue) textShadowYValue.textContent = pxLabel(parts.y);
      if (textShadowBlurValue) textShadowBlurValue.textContent = pxLabel(parts.blur);
      if (textShadowOpacityValue) textShadowOpacityValue.textContent = parts.opacity + "%";
      const css = buildTextShadowFromParts(parts);
      if (textShadowPreview) textShadowPreview.style.textShadow = css;
    };
    const updateShadowCustomFromControls = () => {
      const parts = readShadowParts();
      syncShadowControls(parts);
      if (textShadowModeInput && textShadowModeInput.value !== "custom") {
        textShadowModeInput.value = "custom";
        setUserTextShadowMode("custom");
      }
      setUserTextShadowCustom(buildTextShadowFromParts(parts));
    };
    const updateShadowPanelVisibility = () => {
      if (textShadowCustomPanel) textShadowCustomPanel.classList.toggle("bmwc-hidden", !textShadowModeInput || textShadowModeInput.value !== "custom");
    };
    syncShadowControls(parseTextShadowParts(payload.textShadowCustom));
    updateShadowPanelVisibility();
    if (textShadowModeInput) textShadowModeInput.addEventListener("change", () => {
      setUserTextShadowMode(textShadowModeInput.value);
      updateShadowPanelVisibility();
    });
    [textShadowColorInput, textShadowXInput, textShadowYInput, textShadowBlurInput, textShadowOpacityInput].forEach(input => {
      if (input) input.addEventListener("input", updateShadowCustomFromControls);
    });
    backgroundColorInput.addEventListener("input", () => setUserBackgroundColor(backgroundColorInput.value));
    inputBackgroundColorInput.addEventListener("input", () => setUserInputBackgroundColor(inputBackgroundColorInput.value));
    languageSelect.addEventListener("change", () => setUserLanguage(languageSelect.value));

    wrap.querySelector("#bmwc-prefs-reset").onclick = () => {
      resetUserOpacity();
      resetUserFontSize();
      resetUserFontFamily();
      if (familySelect) familySelect.value = "";
      if (familyCustomInput) familyCustomInput.value = "";
      resetUserTextColor();
      resetUserUiTextColor();
      resetUserTextShadowMode();
      resetUserTextShadowCustom();
      if (textShadowModeInput) textShadowModeInput.value = payload.textShadowMode || "auto";
      syncShadowControls(parseTextShadowParts(payload.textShadowCustom));
      updateShadowPanelVisibility();
      resetUserBackgroundColor();
      resetUserInputBackgroundColor();
      localStorage.removeItem("bmwc.userTheme");
      resetUserLanguage();
      wrap.remove();
      state.prefsModalOpen = false;
    };
  }

  function openUserPreferencesModal(force = false) {
    if ((state.prefsModalOpen && !force) || !state.config || state.config.uiUserPreferencesControl === false) return;
    state.prefsModalOpen = true;
    const payload = buildUserPreferencesPayload();
    if (state.isPip || window.parent === window) {
      openLocalUserPreferencesModal(payload);
      return;
    }
    postFrame("openUserPreferences", payload);
  }


  function openLoginModal() {
    if (state.minimized) {
      toggleMin();
    }
    state.loginModalOpen = true;
    updateFrameSize();

    if (state.token) {
      state.loginModalOpen = false;
      openAccountModal();
      return;
    }

    const wrap = document.createElement("div");
    wrap.className = "bmwc-modal-backdrop";
    wrap.innerHTML = `
      <div class="bmwc-modal">
        <h3>${t("login.title", "BlueMap Chat Login")}</h3>
        <div class="bmwc-tabs">
          <button class="bmwc-button bmwc-tab" id="bmwc-tab-login">${t("login.tabLogin", "Login")}</button>
          <button class="bmwc-button bmwc-tab" id="bmwc-tab-link">${t("login.tabLink", "Link")}</button>
        </div>

        <div id="bmwc-login-pane">
          <p>${t("login.description", "Log in with an already linked account.")}</p>
          <input class="bmwc-input" id="bmwc-login-id" placeholder="${t("placeholder.username", "username")}">
          <br><br>
          <input class="bmwc-input" id="bmwc-login-pw" type="password" placeholder="${t("placeholder.password", "password")}">
          <br><br>
          <button class="bmwc-button" id="bmwc-login-submit">${t("button.login", "Login")}</button>
          <button class="bmwc-button" id="bmwc-close">${t("button.close", "Close")}</button>
        </div>

        <div id="bmwc-link-pane" class="bmwc-hidden">
          <p>${t("link.description", "Run the command below in game.")}</p>
          <div class="bmwc-code" id="bmwc-link-code">----</div>
          <p><code>${t("link.commandHint", "/bmchat auth <code>").replace("<", "&lt;").replace(">", "&gt;")}</code></p>
          <p id="bmwc-link-status">${t("link.statusReady", "Press Start to issue a code.")}</p>
          <button class="bmwc-button" id="bmwc-link-start">${t("button.start", "Start")}</button>
          <button class="bmwc-button" id="bmwc-close2">${t("button.close", "Close")}</button>
        </div>
      </div>
    `;
    document.body.appendChild(wrap);

    const loginPane = wrap.querySelector("#bmwc-login-pane");
    const linkPane = wrap.querySelector("#bmwc-link-pane");

    wrap.querySelector("#bmwc-tab-login").onclick = () => {
      loginPane.classList.remove("bmwc-hidden");
      linkPane.classList.add("bmwc-hidden");
    };
    wrap.querySelector("#bmwc-tab-link").onclick = () => {
      loginPane.classList.add("bmwc-hidden");
      linkPane.classList.remove("bmwc-hidden");
    };
    const closeLoginModal = () => {
      wrap.remove();
      state.loginModalOpen = false;
      updateFrameSize();
    };
    wrap.querySelector("#bmwc-close").onclick = closeLoginModal;
    wrap.querySelector("#bmwc-close2").onclick = closeLoginModal;

    const submitLogin = async () => {
      const submit = wrap.querySelector("#bmwc-login-submit");
      if (submit && submit.disabled) return;
      const username = wrap.querySelector("#bmwc-login-id").value.trim();
      const password = wrap.querySelector("#bmwc-login-pw").value;
      if (submit) submit.disabled = true;
      try {
        const res = await api("/auth/login", {method: "POST", body: JSON.stringify({username, password})});
        if (!res.ok) {
          alertResponse("alert.loginFailed", "Login failed: {error}", res);
          return;
        }
        setLogin(res);
        wrap.remove();
        state.loginModalOpen = false;
        updateFrameSize();
      } finally {
        if (submit && document.body.contains(wrap)) submit.disabled = false;
      }
    };

    wrap.querySelector("#bmwc-login-submit").onclick = submitLogin;
    const loginIdInput = wrap.querySelector("#bmwc-login-id");
    const loginPasswordInput = wrap.querySelector("#bmwc-login-pw");
    if (loginIdInput) {
      loginIdInput.addEventListener("keydown", event => {
        if (event.key !== "Enter" || event.isComposing) return;
        event.preventDefault();
        if (loginPasswordInput) loginPasswordInput.focus();
      });
    }
    if (loginPasswordInput) {
      loginPasswordInput.addEventListener("keydown", event => {
        if (event.key !== "Enter" || event.isComposing) return;
        event.preventDefault();
        submitLogin();
      });
    }
    if (loginIdInput) setTimeout(() => loginIdInput.focus(), 0);

    wrap.querySelector("#bmwc-link-start").onclick = async () => {
      const res = await api("/auth/code", {method: "POST", body: "{}"});
      if (!res.ok) {
        alertResponse("alert.codeFailed", "Failed to issue code: {error}", res);
        return;
      }
      wrap.querySelector("#bmwc-link-code").textContent = res.code;
      wrap.querySelector("#bmwc-link-status").textContent = fmt("link.statusWaiting", "Waiting for /bmchat auth {code} in game...", {code: res.code});
      pollLink(res.poll, wrap);
    };
  }

  async function pollLink(poll, modal) {
    let tries = 0;
    const timer = setInterval(async () => {
      tries++;
      if (!document.body.contains(modal) || tries > 180) {
        clearInterval(timer);
        return;
      }
      const res = await api("/auth/status?poll=" + encodeURIComponent(poll));
      if (res.status === "linked") {
        clearInterval(timer);
        setLogin(res);
        modal.querySelector("#bmwc-link-status").textContent = t("link.statusLinked", "Linked.");
        if (!res.passwordSet) {
          setTimeout(() => {
            modal.remove();
            state.loginModalOpen = false;
            updateFrameSize();
            openSetPasswordModal();
          }, 300);
        } else {
          setTimeout(() => {
            modal.remove();
            state.loginModalOpen = false;
            updateFrameSize();
          }, 500);
        }
      } else if (res.status === "expired") {
        clearInterval(timer);
        modal.querySelector("#bmwc-link-status").textContent = t("link.statusExpired", "Code expired.");
      }
    }, 1000);
  }

  function openSetPasswordModal() {
    const wrap = document.createElement("div");
    wrap.className = "bmwc-modal-backdrop";
    wrap.innerHTML = `
      <div class="bmwc-modal">
        <h3>${t("password.title", "Set password")}</h3>
        <p>${t("password.description", "Set a web password so you can log in without joining the game next time.")}</p>
        <input class="bmwc-input" id="bmwc-new-pw" type="password" placeholder="${t("placeholder.newPassword", "new password")}">
        <br><br>
        <button class="bmwc-button" id="bmwc-save-pw">${t("button.save", "Save")}</button>
        <button class="bmwc-button" id="bmwc-skip-pw">${t("button.skip", "Skip")}</button>
      </div>
    `;
    document.body.appendChild(wrap);
    wrap.querySelector("#bmwc-save-pw").onclick = async () => {
      const password = wrap.querySelector("#bmwc-new-pw").value;
      const res = await api("/auth/set-password", {method: "POST", body: JSON.stringify({token: state.token, password})});
      if (!res.ok) {
        alertResponse("alert.saveFailed", "Save failed: {error}", res);
        return;
      }
      wrap.remove();
    };
    wrap.querySelector("#bmwc-skip-pw").onclick = () => wrap.remove();
  }

  function openAccountModal() {
    const wrap = document.createElement("div");
    wrap.className = "bmwc-modal-backdrop";
    wrap.innerHTML = `
      <div class="bmwc-modal">
        <h3>${esc(state.username)}</h3>
        <p>${t("account.role", "Role")}: ${esc(state.role)}</p>
        ${(!state.config || state.config.uiUserPreferencesControl !== false) ? `<button class="bmwc-button" id="bmwc-user-prefs">${t("preferences.title", "Chat settings")}</button>` : ""}
        <button class="bmwc-button" id="bmwc-set-pw">${t("button.setPassword", "Set password")}</button>
        <button class="bmwc-button" id="bmwc-logout">${t("button.logout", "Logout")}</button>
        <button class="bmwc-button" id="bmwc-close">${t("button.close", "Close")}</button>
      </div>
    `;
    document.body.appendChild(wrap);
    wrap.querySelector("#bmwc-close").onclick = () => { wrap.remove(); state.loginModalOpen = false; };
    const prefsBtn = wrap.querySelector("#bmwc-user-prefs");
    if (prefsBtn) prefsBtn.onclick = () => {
      wrap.remove();
      state.loginModalOpen = false;
      state.prefsModalOpen = false;
      openUserPreferencesModal();
    };
    wrap.querySelector("#bmwc-set-pw").onclick = () => { wrap.remove(); openSetPasswordModal(); };
    wrap.querySelector("#bmwc-logout").onclick = async () => {
      try { await api("/auth/logout", {method: "POST", body: JSON.stringify({token: state.token})}); } catch (_) {}
      state.token = ""; state.username = ""; state.role = "";
      localStorage.removeItem("bmwc.token");
      localStorage.removeItem("bmwc.username");
      localStorage.removeItem("bmwc.role");
      updateLoginState();
      await loadPins();
      await loadCommands();
      await refreshCaptcha();
      wrap.remove();
    };
  }

  function setLogin(res) {
    state.token = res.token;
    state.username = res.username;
    state.role = res.role;
    localStorage.setItem("bmwc.token", state.token);
    localStorage.setItem("bmwc.username", state.username);
    localStorage.setItem("bmwc.role", state.role);
    updateLoginState();
    updateGuestVisibility();
    refreshCaptcha();
    loadPins();
    loadCommands();
  }

  async function verifyStoredToken() {
    if (!state.token) return;
    try {
      const res = await api("/auth/me?token=" + encodeURIComponent(state.token));
      if (!res.ok) {
        state.token = ""; state.username = ""; state.role = "";
        localStorage.removeItem("bmwc.token");
        localStorage.removeItem("bmwc.username");
        localStorage.removeItem("bmwc.role");
      } else {
        state.username = res.username;
        state.role = res.role;
      }
    } catch (_) {}
    updateLoginState();
    updateGuestVisibility();
    await loadPins();
    await loadCommands();
  }

  async function start() {
    installFrameFocusBridge();
    installMapPointerRelayBridge();
    installParentResizeBridge();
    installResumeRefreshHandlers();
    await loadConfig();
    await loadLang();
    makeRoot();
    await loadEmojis();
    installTimeDisplayDelegation();
    updateFrameSize();
    updateGuestVisibility();
    await refreshCaptcha();
    await verifyStoredToken();
    await loadPins();
    await loadCommands();
    await loadHistory();
    connectStream();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
