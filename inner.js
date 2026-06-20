(() => {
  const BMWC_INNER_IFRAME_MARKER_296 = true;
  const cfg = window.BlueMapWebChatConfig || {};
  const apiBase = cfg.apiBase || cfg.apiBaseUrl || (location.origin + "/bmwc/api");
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
    historyOldestId: "",
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
    pendingMediaRender: false,
    scrollInteractionUntil: 0,
    scrollIdleTimer: null,
    scrollbarDragActive: false,
    touchScrollActive: false,
    pendingScrollRenderOptions: null,
    pendingOlderHistoryLoad: false,
    pendingTopOlderHistoryTimer: null,
    pendingTopOlderHistoryDueAt: 0,
    olderHistorySettleUntil: 0,
    lastTopOlderHistoryRequestAt: 0,
    historyLoadingSince: 0,
    historyLoadSeq: 0,
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

  function minecraftNameHtml(value, renderColors = shouldRenderMinecraftNameColors()) {
    const text = String(value ?? "");
    if (!renderColors) return esc(stripMinecraftColorCodes(text));

    let out = "";
    let buf = "";
    let style = {};
    let open = false;

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
      out += attr ? `<span style="${esc(attr)}">${esc(buf)}</span>` : esc(buf);
      buf = "";
    };
    const resetFormatting = () => {
      style = {};
      open = false;
    };
    const setColor = color => {
      style = {color};
      open = true;
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
          open = true;
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

  function safePreviewUrl(raw) {
    // Preview URLs may be external http(s) URLs or same-origin relative API
    // URLs generated by BlueMapWebChat, such as /bmwc/api/external-media?... .
    return safeHttpUrl(raw, {allowRelative: true});
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

    const selector = "[data-delete], [data-pin], [data-unpin], [data-open-pins], a.bmwc-link, a.bmwc-image-link";
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

  function youtubeVideoId(raw) {
    if (!state.config || state.config.youtubeEmbedEnabled === false) return "";
    try {
      const u = new URL(normalizeUrl(raw), location.href);
      const host = u.hostname.toLowerCase().replace(/^www\./, "");
      if (host === "youtu.be") {
        const id = u.pathname.split("/").filter(Boolean)[0] || "";
        return /^[A-Za-z0-9_-]{6,20}$/.test(id) ? id : "";
      }
      if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com" || host === "youtube-nocookie.com") {
        let id = u.searchParams.get("v") || "";
        if (!id && u.pathname.startsWith("/shorts/")) id = u.pathname.split("/").filter(Boolean)[1] || "";
        if (!id && u.pathname.startsWith("/embed/")) id = u.pathname.split("/").filter(Boolean)[1] || "";
        return /^[A-Za-z0-9_-]{6,20}$/.test(id) ? id : "";
      }
    } catch (_) {}
    return "";
  }

  function youtubeEmbedUrl(id, autoplay = false) {
    const host = state.config && state.config.youtubeNoCookie === false ? "www.youtube.com" : "www.youtube-nocookie.com";
    const params = new URLSearchParams();
    params.set("rel", "0");
    params.set("modestbranding", "1");
    params.set("playsinline", "1");
    if (autoplay) params.set("autoplay", "1");
    return "https://" + host + "/embed/" + encodeURIComponent(id) + "?" + params.toString();
  }

  function youtubeThumbUrl(id) {
    return "https://i.ytimg.com/vi/" + encodeURIComponent(id) + "/hqdefault.jpg";
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
      const youtubeId = youtubeVideoId(url);
      const discordPreview = safePreviewUrl(discordCdnPreviewUrl(url));
      const drivePreview = safePreviewUrl(googleDrivePreviewUrl(url));
      if (items.some(item => item.href === href || item.linkHref === href || (discordPreview && item.href === discordPreview) || (drivePreview && item.href === drivePreview) || (youtubeId && item.youtubeId === youtubeId))) continue;
      const imageKey = previewKey("image", drivePreview || discordPreview || href);
      const videoKey = previewKey("video", discordPreview || href);
      const audioKey = previewKey("audio", discordPreview || href);
      if (youtubeId) {
        const configuredYoutubeMax = Number(state.config.youtubeMaxEmbedsPerMessage);
        const maxYoutube = Number.isFinite(configuredYoutubeMax) ? Math.max(0, Math.floor(configuredYoutubeMax)) : 1;
        const youtubeCount = items.filter(item => item.type === "youtube").length;
        if (maxYoutube === 0 || youtubeCount < maxYoutube) items.push({type: "youtube", href, youtubeId, youtubeKey: String(messageKey || "message") + ":" + youtubeId});
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
        const shouldAutoplay = state.config && state.config.youtubeAutoplayOnOpen === true;
        const embed = safeYouTubeEmbedUrl(youtubeEmbedUrl(id, shouldAutoplay));
        if (!embed) return "";
        const rememberedOpen = state.config.youtubeRememberExpanded !== false && state.youtubeExpanded.has(key);
        const currentlyOpen = state.youtubeOpen.has(key);
        if (state.config.youtubeClickToLoad === false || rememberedOpen || currentlyOpen) {
          return `<div class="bmwc-youtube-wrap" data-youtube-key="${esc(key)}" style="position:relative;width:100%;aspect-ratio:16/9;${maxHeightCss}border-radius:10px;overflow:hidden;background:#000;margin-top:6px;">
            <iframe class="bmwc-youtube-frame" style="position:absolute;inset:0;width:100%;height:100%;border:0;" src="${esc(embed)}" title="${esc(t("media.youtubeTitle", "YouTube video"))}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
          </div>`;
        }
        return `<button type="button" class="bmwc-youtube-card" data-youtube-embed="${esc(embed)}" data-youtube-key="${esc(key)}" style="position:relative;width:100%;aspect-ratio:16/9;${maxHeightCss}border:0;border-radius:10px;overflow:hidden;background-size:cover;background-position:center;cursor:pointer;color:#fff;background-image:url('${esc(thumb)}')">
          <span class="bmwc-youtube-play" style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);font-size:34px;text-shadow:0 2px 8px rgba(0,0,0,.85);">▶</span>
          <span class="bmwc-youtube-label" style="position:absolute;left:8px;bottom:8px;font-size:12px;font-weight:700;text-shadow:0 2px 8px rgba(0,0,0,.85);">${esc(t("media.youtube", "YouTube"))}</span>
        </button>`;
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
    opts.headers = Object.assign({"Content-Type": "application/json"}, opts.headers || {});
    return fetch(apiBase + path, opts).then(r => r.json());
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

  function messageTextHtml(msg) {
    return linkifyText(plainDisplayMessageText(msg));
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
        <div class="bmwc-form">
          <div class="bmwc-row" id="bmwc-guest-row">
            <input class="bmwc-input" id="bmwc-guest-name" maxlength="16" placeholder="${t("placeholder.guestName", "Guest name")}">
          </div>
          <div class="bmwc-row bmwc-captcha" id="bmwc-captcha-row">
            <span id="bmwc-captcha-q"></span>
            <input class="bmwc-input" id="bmwc-captcha-a" maxlength="6" placeholder="${t("placeholder.captchaAnswer", "answer")}">
          </div>
          <div class="bmwc-row">
            <input class="bmwc-input" id="bmwc-message" maxlength="2048" placeholder="${t("placeholder.message", "message")}">
            <button class="bmwc-button bmwc-command bmwc-hidden" id="bmwc-command" title="${t("button.commands", "Commands")}">/</button>
            <button class="bmwc-button bmwc-upload bmwc-hidden" id="bmwc-upload" title="${t("button.upload", "Attach")}">&#128206;</button>
            <button class="bmwc-button bmwc-send" id="bmwc-send">${t("button.send", "Send")}</button>
            <input type="file" id="bmwc-file" class="bmwc-file-input" multiple hidden style="display:none !important;">
          </div>
          <div class="bmwc-command-panel bmwc-hidden" id="bmwc-command-panel"></div>
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
      const box = document.getElementById("bmwc-messages");
      state.preventBottomStickUntil = 0;
      state.autoFollowLatest = true;
      renderVirtualMessages({stickToBottom: true, preserveScroll: false, allowDuringMedia: true, allowDuringVisibleMedia: true, deferDuringScroll: false, deferDuringMediaLayout: false, allowBottomStickDuringLock: true});
      if (box) stickToBottomStable(box);
      refreshScrollAffordances(box);
    });
    const commandBtn = document.getElementById("bmwc-command");
    if (commandBtn) commandBtn.addEventListener("click", () => openCommandModal());
    document.getElementById("bmwc-upload").addEventListener("click", () => {
      const input = document.getElementById("bmwc-file");
      if (input) input.click();
    });
    document.getElementById("bmwc-file").addEventListener("change", uploadSelectedFiles);
    installDragAndDropUpload(root);
    const uploadCancelBtn = document.getElementById("bmwc-upload-cancel");
    if (uploadCancelBtn) uploadCancelBtn.addEventListener("click", cancelCurrentUpload);
    document.getElementById("bmwc-message").addEventListener("paste", handlePasteUpload);
    const messageInput = document.getElementById("bmwc-message");
    messageInput.addEventListener("keydown", e => {
      if (e.key === "Enter") {
        e.preventDefault();
        if (e.repeat || state.sendInFlight) return;
        sendMessage();
      }
      if (e.key === "Escape") hideCommandPanel();
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
      updateFrameSize();
      return;
    }

    if (!state.minimized) {
      if (box) box.classList.remove("bmwc-hidden");
      if (form) form.classList.remove("bmwc-hidden");
    }
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
    const commandBtn = document.getElementById("bmwc-command");
    if (!btn || !status) return;
    status.classList.remove("bmwc-status-role-ADMIN", "bmwc-status-role-MODERATOR", "bmwc-status-role-USER", "bmwc-status-role-GUEST");

    const adminPanelAllowed = !state.config || state.config.allowWebAdminPanel !== false;
    const moderationEnabled = !state.config || state.config.moderationEnabled !== false;
    const canManageMutes = moderationEnabled && state.token && (state.role === "ADMIN" || (state.role === "MODERATOR" && (!state.config || state.config.allowModeratorGuestMute !== false)));
    const canUseAdminPanel = state.token && adminPanelAllowed && (state.role === "ADMIN" || canManageMutes);
    if (adminBtn) adminBtn.classList.toggle("bmwc-hidden", !canUseAdminPanel);
    if (uploadBtn) uploadBtn.classList.toggle("bmwc-hidden", !canUpload());
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
      if (!state.historyHasMore || state.historyLoading || !state.autoFollowLatest || !state.historyOldestId) return;
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

  function ensureHistoryEndNotice(box) {
    if (!box) box = document.getElementById("bmwc-messages");
    const root = document.getElementById("bmwc-root");
    const panel = root && root.querySelector ? root.querySelector(".bmwc-panel") : null;
    if (!box || !panel) return null;
    let notice = document.getElementById("bmwc-history-end");
    if (!notice) {
      notice = document.createElement("div");
      notice.className = "bmwc-history-end bmwc-hidden";
      notice.id = "bmwc-history-end";
    }
    notice.textContent = t("history.end", "No more messages to display.");

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
    if (clearPending) state.historyEndNoticePendingUserTopUntil = 0;
    const notice = document.getElementById("bmwc-history-end");
    if (notice) notice.classList.add("bmwc-hidden");
  }

  function showHistoryEndNoticeToast(box, reason = "") {
    if (!box) box = document.getElementById("bmwc-messages");
    const notice = ensureHistoryEndNotice(box);
    if (!notice || !box) return;
    if (state.minimized || guestChatHidden() || !historyEndEligible() || !historyEndNoticeAtTop(box)) return;

    const now = Date.now();
    // Ignore duplicate callbacks fired in the same frame, but do not latch the
    // notice across focus changes. A new wheel/touch/key/scrollbar input at the
    // top edge can show it again after the previous toast has disappeared.
    if (state.historyEndNoticeVisible && now < Number(state.historyEndNoticeVisibleUntil || 0)) return;
    if (now - Number(state.historyEndNoticeLastShownAt || 0) < 250) return;

    if (state.historyEndNoticeTimer) clearTimeout(state.historyEndNoticeTimer);
    state.historyEndNoticeTimer = null;
    state.historyEndNoticeVisible = true;
    state.historyEndNoticeSticky = false;
    state.historyEndNoticeStickySince = 0;
    state.historyEndNoticeVisibleUntil = now + 2500;
    state.historyEndNoticeLastShownAt = now;
    state.historyEndNoticePendingUserTopUntil = 0;
    notice.classList.remove("bmwc-hidden");

    state.historyEndNoticeTimer = setTimeout(() => {
      if (Date.now() >= Number(state.historyEndNoticeVisibleUntil || 0)) {
        hideHistoryEndNoticeToast(false);
      }
    }, 2550);
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

  function maybeShowHistoryEndNoticeFromUserScroll(box, reason = "") {
    if (!box) box = document.getElementById("bmwc-messages");
    if (!box) return;

    const now = Date.now();
    const atTop = historyEndNoticeAtTop(box);
    if (!atTop) {
      hideHistoryEndNoticeToast(false);
      return;
    }

    const fromRecentScroll = recentHistoryEndUserScrollInput(now);
    const fromPendingTopIntent = Number(state.historyEndNoticePendingUserTopUntil || 0) > now;
    if (!fromRecentScroll && !fromPendingTopIntent) return;

    if (state.minimized || guestChatHidden()) return;
    if (!historyEndEligible()) {
      // While history is still loading or hasMore is still true, keep only the
      // user intent. The load completion path will call this again and show the
      // toast only if the final response proves there is no older history.
      if (fromRecentScroll) state.historyEndNoticePendingUserTopUntil = now + 5000;
      return;
    }

    showHistoryEndNoticeToast(box, reason);
  }

  function updateHistoryEndNotice(box) {
    if (!box) box = document.getElementById("bmwc-messages");
    const notice = ensureHistoryEndNotice(box);
    if (!notice || !box) return;
    updateScrollAffordanceLayout(box);

    const now = Date.now();
    const shouldRemainVisible =
      state.historyEndNoticeVisible &&
      now < Number(state.historyEndNoticeVisibleUntil || 0) &&
      historyEndEligible() &&
      historyEndNoticeAtTop(box) &&
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
    const show = !!root && !state.minimized && !guestChatHidden() && state.messages.length > 0 && !atBottom;
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
    markScrollInteraction();
  }

  function markNonScrollUiAction() {
    state.lastNonScrollUiActionAt = Date.now();
    state.historyEndNoticePendingUserTopUntil = 0;
  }

  function deferRenderUntilScrollIdle(options = {}) {
    state.pendingScrollRenderOptions = mergeRenderOptions(state.pendingScrollRenderOptions, options);
    markScrollInteraction();
  }

  function requestOlderHistoryAfterScrollIdle() {
    state.pendingOlderHistoryLoad = true;
    markScrollInteraction();
  }

  function requestOlderHistoryFromTopInput(reason = "top-input") {
    const box = document.getElementById("bmwc-messages");
    if (!box || state.minimized || guestChatHidden()) return;
    if (!state.historyHasMore || !state.historyOldestId) return;
    if (box.scrollTop > historyPreloadThresholdPx(box)) return;

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
    return remainingBefore <= threshold;
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
    const tolerance = Number(options.tolerancePx || (options.bottomStick ? 3 : 1));
    if (Math.abs(currentTop - requested) <= tolerance) {
      if (requestedGap <= threshold) state.autoFollowLatest = true;
      return;
    }

    state.suppressAutoFollowUpdate = true;
    state.suppressScrollRenderUntil = Date.now() + Math.max(80, Number(options.suppressRenderMs || 140));
    box.scrollTop = requested;
    setTimeout(() => { state.suppressAutoFollowUpdate = false; }, Math.max(40, Number(options.suppressUpdateMs || 100)));
  }

  function bottomGapPx(box) {
    if (!box) return Infinity;
    return Math.max(0, Number(box.scrollHeight || 0) - Number(box.scrollTop || 0) - Number(box.clientHeight || 0));
  }

  function stickToBottomStable(box) {
    if (!box) return;
    state.autoFollowLatest = true;

    const setBottom = (phase, tolerance = 3) => {
      if (!box) return false;
      const maxTop = Math.max(0, Number(box.scrollHeight || 0) - Number(box.clientHeight || 0));
      const gap = bottomGapPx(box);
      if (gap <= tolerance && Math.abs(Number(box.scrollTop || 0) - maxTop) <= tolerance) return false;
      setScrollTopPreserved(box, maxTop, {bottomStick: true, reason: "stick-bottom-" + phase, tolerancePx: tolerance});
      return true;
    };

    setBottom("now", 3);
    requestAnimationFrame(() => {
      if (!box || !state.autoFollowLatest) return;
      // Only do the second correction if layout changes opened a visible gap.
      // This avoids a scroll -> render -> scroll loop while already at maxTop.
      if (bottomGapPx(box) > 8) setBottom("raf", 3);
    });
  }

  function forceLatestChatView(reason = "") {
    const box = document.getElementById("bmwc-messages");
    state.autoFollowLatest = true;
    allowMediaLayoutAutoFollow(4000);
    state.pendingScrollRenderOptions = null;
    state.pendingMediaRender = false;

    if (box) {
      renderVirtualMessages({stickToBottom: true, preserveScroll: false, deferDuringScroll: false, allowDuringMedia: true, allowDuringVisibleMedia: true});
      stickToBottomStable(box);
      setTimeout(() => {
        if (state.autoFollowLatest) stickToBottomStable(box);
      }, 80);
    }
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
    const miniActionsHtml = (canPin || canDelete)
      ? `<span class="bmwc-mini-actions">${canPin ? `<button class="bmwc-mini-action" data-pin="${esc(msg.id)}">${t("button.pin", "pin")}</button>` : ""}${canDelete ? `<button class="bmwc-mini-action" data-delete="${esc(msg.id)}">${t("button.delete", "delete")}</button>` : ""}</span>`
      : "";
    el.classList.toggle("bmwc-has-mini-actions", !!(canPin || canDelete));
    el.innerHTML = `
      <div class="bmwc-meta">
        <span class="bmwc-sender${originalSender ? " bmwc-sender-has-real" : ""}"${senderAttrs}>${originalSender ? senderNameHtml(shownSender, originalSender, msg.source) : minecraftNameHtml(renderedSender, shouldRenderMinecraftNameColors() && sourceMayRenderMinecraftNameColors(msg.source))}</span><span class="bmwc-meta-sep" aria-hidden="true">·</span><span class="bmwc-source-label">${esc(displaySource(msg))}</span><span class="bmwc-meta-sep" aria-hidden="true">·</span><span class="bmwc-time-actions"><span class="bmwc-time" data-time="${esc(msg.time || "")}" title="${esc(timeToggleTitle(msg.time))}" role="button" tabindex="0">${esc(time)}</span>${miniActionsHtml}</span>
      </div>
      <div class="bmwc-text">${messageTextHtml(msg)}</div>
      ${imagePreviews(plainDisplayMessageText(msg), key)}
    `;
    installSenderIdentityToggle(el);
    installTimeToggle(el);
    el.querySelectorAll(".bmwc-youtube-card").forEach(btn => {
      btn.addEventListener("click", () => {
        const embed = btn.dataset.youtubeEmbed || "";
        if (!/^https:\/\/(www\.)?youtube(-nocookie)?\.com\/embed\//i.test(embed)) return;
        const key = btn.dataset.youtubeKey || "";
        if (key) {
          state.youtubeOpen.add(key);
          if (!state.config || state.config.youtubeRememberExpanded !== false) state.youtubeExpanded.add(key);
        }
        const wrap = document.createElement("div");
        wrap.className = "bmwc-youtube-wrap";
        if (key) wrap.setAttribute("data-youtube-key", key);
        wrap.style.cssText = "position:relative;width:100%;aspect-ratio:16/9;border-radius:10px;overflow:hidden;background:#000;margin-top:6px;";
        const safeEmbed = safeYouTubeEmbedUrl(embed);
        if (!safeEmbed) return;
        const iframe = document.createElement("iframe");
        iframe.className = "bmwc-youtube-frame";
        iframe.style.cssText = "position:absolute;inset:0;width:100%;height:100%;border:0;";
        iframe.src = safeEmbed;
        iframe.title = t("media.youtubeTitle", "YouTube video");
        iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
        iframe.allowFullscreen = true;
        wrap.appendChild(iframe);
        btn.replaceWith(wrap);
      }, {once: true});
    });
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
    return {
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
    const hasActions = !!(actions.canPin || actions.canDelete);
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
    else if (anchor) restoreScrollAnchor(box, anchor);
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

  function restoreScrollAnchor(box, anchor) {
    if (!box || !anchor || !anchor.key) return false;
    const el = box.querySelector(`:scope > .bmwc-msg[data-virtual-key="${CSS.escape(anchor.key)}"]`);
    if (!el) return false;
    const viewport = box.getBoundingClientRect();
    const rect = el.getBoundingClientRect();
    const desiredTop = viewport.top + Number(anchor.offset || 0);
    const delta = rect.top - desiredTop;
    if (Math.abs(delta) > 0.5) setScrollTopPreserved(box, box.scrollTop + delta, {allowAwayFromBottom: true, reason: "anchor-restore"});
    return true;
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
      const restoredAnchor = anchor ? restoreScrollAnchor(box, anchor) : false;

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
    const explicitlyStickBottom = !!options.stickToBottom;
    const bottomStickSuppressed = options.forcePreservePosition === true || options.suppressBottomStick === true || (Date.now() < Number(state.preventBottomStickUntil || 0) && options.allowBottomStickDuringLock !== true);
    const actuallyNearBottom = bottomStickSuppressed ? false : isAutoFollowBottom(box);
    const mediaLayoutBottomFollow =
      !bottomStickSuppressed &&
      state.autoFollowLatest &&
      Date.now() <= Number(state.autoFollowMediaLayoutUntil || 0) &&
      !isScrollInteractionActive() &&
      (Date.now() - Number(state.lastUserScrollAt || 0)) > Math.max(250, scrollInteractionIdleMs());
    let shouldStickBottom = !bottomStickSuppressed && (explicitlyStickBottom || actuallyNearBottom || mediaLayoutBottomFollow);
    const preserveBottomAfterRender = !options.anchor && shouldStickBottom;
    if (preserveBottomAfterRender) {
      state.autoFollowLatest = true;
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

    const mediaProbeMargin = Math.max(240, Math.round(viewport * (isMediaCullingRelaxActive() ? 2.5 : 1.25)));
    const mediaInfo = mediaNearbyVirtualRangeInfo(box, mediaProbeMargin);
    const visibleProtectMargin = mediaInfo.hasMedia || isMediaCullingRelaxActive()
      ? Math.max(720, Math.round(viewport * 2.5))
      : Math.max(160, Math.min(720, Math.round(viewport * 0.75)));
    const protectedVisibleIndices = visibleMessageIndices(box, visibleProtectMargin);
    let expanded = expandVirtualRangeForVisibleMessages(start, end, protectedVisibleIndices, count, mediaInfo.hasMedia ? 8 : 3);
    start = expanded.start;
    end = expanded.end;
    expanded = expandVirtualRangeForMediaStability(start, end, count, mediaInfo, protectedVisibleIndices, viewport);
    start = expanded.start;
    end = expanded.end;

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
    } else if (options.anchor && restoreScrollAnchor(box, options.anchor)) {
      // Anchor restore keeps the user's current viewport stable after prepending older history.
    } else if (visualAnchor && restoreScrollAnchor(box, visualAnchor)) {
      // Normal scroll/media renders should keep the visible message in place.
      // The scrollbar can resize, but already visible images/text should not
      // jump after scroll idle when spacers are recalculated.
    } else if (shouldStickBottom && state.autoFollowLatest) stickToBottomStable(box);
    else if (options.preserveScroll !== false) setScrollTopPreserved(box, prevScrollTop);

    // A failed/late media load can shrink a message after the range has already
    // been calculated. If the DOM still contains messages but the viewport is
    // effectively empty, immediately re-render a wider rescue range instead of
    // waiting for the user to scroll again.
    maybeScheduleBlankRescueRender(box, options);
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
    // Auto-follow new incoming chat whenever the viewport is already near the
    // bottom. Do not depend only on the cached state.autoFollowLatest flag,
    // because it can become stale after virtual rendering or media layout changes.
    const wasNearBottom = !options.prepend && (options.forceStickToBottom || isAutoFollowBottom(box));
    if (wasNearBottom) {
      state.autoFollowLatest = true;
      if (!options.skipRender) allowMediaLayoutAutoFollow(4000);
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
        stickToBottom: !options.prepend && wasNearBottom,
        preserveScroll: !wasNearBottom,
        deferDuringScroll: !wasNearBottom,
        allowDuringMedia: true,
        allowDuringVisibleMedia: true,
        // New incoming messages must not be held behind the media-layout quiet
        // window. Active media nodes are preserved by renderVirtualMessages(),
        // so delaying here can make SSE updates appear stuck.
        deferDuringMediaLayout: false
      };
      if (!options.prepend && !wasNearBottom && isScrollInteractionActive()) deferRenderUntilScrollIdle(renderOptions);
      else renderVirtualMessages(renderOptions);
      if (!options.prepend && wasNearBottom) stickToBottomStable(box);
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

  function fontPx(value, fallback) {
    value = Number(value);
    if (!Number.isFinite(value) || value <= 0) value = fallback;
    return Math.round(Math.max(8, Math.min(32, value))) + "px";
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
      localStorage.setItem("bmwc.userFontSize", String(Math.round(value)));
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

  function clampShadowNumber(value, min, max, fallback) {
    value = Number(value);
    if (!Number.isFinite(value)) value = fallback;
    value = Math.max(min, Math.min(max, value));
    return Math.round(value);
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
    if (numeric.length >= 1) parts.x = clampShadowNumber(numeric[0], -12, 12, parts.x);
    if (numeric.length >= 2) parts.y = clampShadowNumber(numeric[1], -12, 12, parts.y);
    if (numeric.length >= 3) parts.blur = clampShadowNumber(numeric[2], 0, 24, parts.blur);
    return parts;
  }

  function buildTextShadowFromParts(parts) {
    parts = parts || {};
    const x = clampShadowNumber(parts.x, -12, 12, 0);
    const y = clampShadowNumber(parts.y, -12, 12, 1);
    const blur = clampShadowNumber(parts.blur, 0, 24, 2);
    const opacity = clampShadowNumber(parts.opacity, 0, 100, 85) / 100;
    const rgb = rgbFromHex(parts.color || "#000000");
    return `${x}px ${y}px ${blur}px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity.toFixed(2).replace(/0+$/, "").replace(/\.$/, "")})`;
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

  function historyQuery(older) {
    const configured = Number(state.historyPageSize);
    const limit = Number.isFinite(configured) && configured >= 0 ? Math.floor(configured) : 20;
    let url = "/history?limit=" + encodeURIComponent(limit);
    if (older && state.historyOldestId) url += "&before=" + encodeURIComponent(state.historyOldestId);
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
            ".bmwc-media-card, .bmwc-youtube-card"
          ));
        } catch (_) {
          return false;
        }
      };

      box.addEventListener("wheel", (ev) => {
        markDirectScrollInput();
        rememberUserTopIntent(box);
        if (ev.deltaY < 0) {
          markHistoryEndTopUserIntent(box, "wheel-top");
          requestOlderHistoryFromTopInput("wheel");
        }
        setTimeout(() => maybeShowHistoryEndNoticeFromUserScroll(box, "wheel"), 0);
      }, {passive: true});
      box.addEventListener("keydown", (ev) => {
        if (["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "].includes(ev.key)) {
          markDirectScrollInput();
          rememberUserTopIntent(box);
          if (["ArrowUp", "PageUp", "Home"].includes(ev.key)) markHistoryEndTopUserIntent(box, "key-top");
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
            "button, input, textarea, select, a, [data-delete], [data-pin], [data-unpin], [data-open-pins], " +
            ".bmwc-modal, .bmwc-modal-backdrop, .bmwc-login, .bmwc-admin-modal, .bmwc-preferences-modal, " +
            ".bmwc-media-card, .bmwc-youtube-card"
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
      const programmaticScroll = Date.now() < Number(state.suppressScrollRenderUntil || 0);
      const keepBottom = isAutoFollowBottom(box);
      const shouldLoadOlder = box.scrollTop <= historyPreloadThresholdPx(box);
      refreshScrollAffordances(box);
      if (!programmaticScroll) {
        if (shouldLoadOlder) markHistoryEndTopUserIntent(box, "scroll-top");
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
      if (programmaticScroll && !shouldLoadOlder) return;

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
    }, {passive: true});

    if (window.ResizeObserver && !state.virtualResizeObserver) {
      state.virtualResizeObserver = new ResizeObserver(() => {
        const keepBottom = isAutoFollowBottom(box);
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
    const wasNearBottom = box ? isAutoFollowBottom(box) : true;

    const historyLoadSeq = ++state.historyLoadSeq;
    state.historyLoading = true;
    state.historyLoadingSince = Date.now();
    if (older) markOlderHistorySettling();
    if (!older) state.historyViewportFillAttempts = 0;
    try {
      const data = await api(historyQuery(older));
      if (historyLoadSeq !== state.historyLoadSeq) return;
      if (data.ok && Array.isArray(data.messages)) {
        const nextHasMore = !!data.hasMore;
        const nextOldestId = data.oldestId || state.historyOldestId;
        if (!older && state.messages.length > 0 && latestHistoryPageUnchanged(data.messages)) {
          state.historyHasMore = nextHasMore;
          state.historyOldestId = nextOldestId;
          refreshScrollAffordances(box);
          scheduleHistoryViewportFill("unchanged-history");
          return;
        }
        if (older) {
          const lockedVisibleMedia = isActiveMediaVisible();
          const anchor = captureScrollAnchor(box);
          const beforeCount = state.messages.length;
          [...data.messages].reverse().forEach(msg => addMessage(msg, {prepend: true, skipRender: true}));
          const addedCount = Math.max(0, state.messages.length - beforeCount);
          state.historyHasMore = nextHasMore;
          state.historyOldestId = nextOldestId;
          if (options.viewportFill && state.autoFollowLatest) {
            renderVirtualMessages({stickToBottom: true, preserveScroll: false, allowDuringMedia: true, allowDuringVisibleMedia: true, deferDuringMediaLayout: false});
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
          if (options.viewportFill && state.autoFollowLatest) {
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
          data.messages.forEach(msg => addMessage(msg, {skipRender: true}));
          state.historyHasMore = nextHasMore;
          state.historyOldestId = nextOldestId || (box && box.firstElementChild && box.firstElementChild.dataset.id) || "";
          state.autoFollowLatest = wasNearBottom || state.messages.length === 0;
          renderVirtualMessages({stickToBottom: state.autoFollowLatest, preserveScroll: !state.autoFollowLatest, allowDuringMedia: true, allowDuringVisibleMedia: true, deferDuringMediaLayout: false});
          if (box && !state.autoFollowLatest) setScrollTopPreserved(box, prevTop);
          if (state.autoFollowLatest) scheduleHistoryViewportFill("initial-history");
        }

        state.historyHasMore = nextHasMore;
        state.historyOldestId = nextOldestId || (box && box.firstElementChild && box.firstElementChild.dataset.id) || "";
      }
    } catch (e) {
      console.warn("history failed", e);
    } finally {
      if (historyLoadSeq === state.historyLoadSeq) {
        state.historyLoading = false;
        state.historyLoadingSince = 0;
        if (older) markOlderHistorySettling();
        const finalBox = document.getElementById("bmwc-messages");
        const hasPendingHistoryEndTopIntent = Number(state.historyEndNoticePendingUserTopUntil || 0) > Date.now();
        if (finalBox && (older || hasPendingHistoryEndTopIntent)) {
          setTimeout(() => maybeShowHistoryEndNoticeFromUserScroll(finalBox, older ? "history-loaded" : "history-refreshed"), 0);
          setTimeout(() => maybeShowHistoryEndNoticeFromUserScroll(finalBox, older ? "history-loaded-late" : "history-refreshed-late"), 120);
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
      try { addMessage(JSON.parse(e.data)); } catch (_) {}
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
      state.historyOldestId = "";
    });
    es.onerror = () => {
      if (generation !== state.streamGeneration || state.eventSource !== es) return;
      scheduleStreamReconnect("stream-error");
    };
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
    state.pins.forEach(pin => list.appendChild(renderPinnedItem(pin)));
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

  function renderPinnedItem(pin) {
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
        const unpin = document.createElement("button");
        unpin.className = "bmwc-mini-action";
        unpin.setAttribute("data-unpin", pin.pinId);
        unpin.textContent = t("button.unpin", "unpin");
        meta.appendChild(unpin);
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
    const list = document.getElementById("bmwc-pinned-list");
    if (list) {
      list.innerHTML = "";
      state.pins.forEach(pin => list.appendChild(renderPinnedItem(pin)));
      if (!state.pins.length) list.innerHTML = `<p>${esc(t("pinned.empty", "No pinned messages."))}</p>`;
    }
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
      state.pins.forEach(pin => list.appendChild(renderPinnedItem(pin)));
    }
    wrap.querySelector("#bmwc-pinned-close").onclick = () => wrap.remove();
    wrap.addEventListener("click", e => {
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
      fontSizePx: Math.round(Number(effectiveBaseFontSize()) || 13),
      defaultFontSizePx: Math.round(Number(state.config.uiFontSize || 13)),
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

        <label class="bmwc-pref-label"><span>${esc(labels.fontSize || "Font size")}</span><strong id="bmwc-prefs-font-size-value">${Math.round(payload.fontSizePx || 13)}px</strong></label>
        <input class="bmwc-pref-range" id="bmwc-prefs-font-size" type="range" min="8" max="36" step="1" value="${Math.round(payload.fontSizePx || 13)}">
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
          <input class="bmwc-pref-range" id="bmwc-prefs-text-shadow-x" type="range" min="-12" max="12" step="1">
          <label class="bmwc-pref-label"><span>${esc(labels.textShadowCustomY || "Y offset")}</span><strong id="bmwc-prefs-text-shadow-y-value">1px</strong></label>
          <input class="bmwc-pref-range" id="bmwc-prefs-text-shadow-y" type="range" min="-12" max="12" step="1">
          <label class="bmwc-pref-label"><span>${esc(labels.textShadowCustomBlur || "Blur")}</span><strong id="bmwc-prefs-text-shadow-blur-value">2px</strong></label>
          <input class="bmwc-pref-range" id="bmwc-prefs-text-shadow-blur" type="range" min="0" max="24" step="1">
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
      sizeValue.textContent = Math.round(v) + "px";
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
      if (textShadowXInput) textShadowXInput.value = String(parts.x);
      if (textShadowYInput) textShadowYInput.value = String(parts.y);
      if (textShadowBlurInput) textShadowBlurInput.value = String(parts.blur);
      if (textShadowOpacityInput) textShadowOpacityInput.value = String(parts.opacity);
      if (textShadowXValue) textShadowXValue.textContent = parts.x + "px";
      if (textShadowYValue) textShadowYValue.textContent = parts.y + "px";
      if (textShadowBlurValue) textShadowBlurValue.textContent = parts.blur + "px";
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
