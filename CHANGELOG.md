# Changelog

## 4.1.1

### Pinned messages and player display

- Fixed collapsed pinned-message summaries so raw Minecraft color codes such as `&7`, `§7`, and `&#RRGGBB` do not leak into the compact pinned bar or tooltip.
- Ensured `player-display.mode` and `player-display.strip-colors` are applied consistently to Minecraft-origin chat, web-authenticated player names, stored display-name fallbacks, pinned messages, and web rendering.
- Stripped raw Minecraft color codes from Discord output even when sender-name colors are preserved for the web UI.

### Discord relay

- Improved game-side custom emoji URL appending for Discord, including augmentation of DiscordSRV native Minecraft-to-Discord relay messages when possible.
- Removed the hard-coded reply arrow from Discord reply preview lines; the reply marker now applies only to the actual replied message line.

### Reply relay and game chat output

- Added separate game-side reply preview and reply prefix settings.
- Ensured `reply.game-preview.format` and `reply.game-prefix.text` translate Minecraft legacy `&` color codes before broadcasting to game chat.
- Changed mixed token/URL game-chat fallback to keep a single plain Minecraft chat line instead of repeating URL reference lines.
- Fixed image-only upload URLs in Minecraft chat so normal sender labels before `https://` are no longer mistaken for custom emoji tokens, preserving clickable URL output.

### History loading and edge notices

- Added scrollbar-drag and touch-scroll handling for the bottom-edge no-more-history notice.

## 4.1.0

### Pinned message ordering

- Added manual pinned-message ordering with up/down controls in the pinned-message management UI.
- Added the `/admin/move-pin` API and persistent `sortOrder` storage while keeping backward compatibility with existing pinned messages.

### Custom emoji relay compatibility

- Preserved custom emoji token text by default for game-side emoji plugins such as ImageEmojis.
- Kept `link` and `label` game-link modes for servers that do not use a game-side emoji plugin, and added an explicit `preserve` mode for token-preserving behavior.
- Removed ImageEmojis-specific glyph/resource-pack conversion paths from BM Web Chat; token text is now the canonical relay format.
- Improved game-to-web original-message capture with optional Paper/Purpur `AsyncChatEvent` support and Bukkit/Spigot fallback handling.

### Custom emoji sidecars and WebP support

- Generalized PNG sidecar generation for GIF/JPG/JPEG/WEBP custom emoji files whenever custom emoji support is enabled.
- Added WebP ImageIO support through TwelveMonkeys ImageIO so WebP custom emoji files can generate PNG sidecars reliably.
- Kept the web UI rendering the original uploaded emoji file so animated GIFs remain animated in the browser.

### Discord relay

- Kept optional web-to-Discord custom emoji image URL appending for BM Web Chat emoji tokens, disabled by default.
- Added optional game-to-Discord relay with game-side custom emoji URL appending, disabled by default to avoid duplicate DiscordSRV Minecraft chat relay.
- Fixed Discord reply relay so `discordsrv.reply-relay.enabled`, `prefix-enabled`, and `preview-enabled` are respected independently from game-side reply settings.
- Kept Discord-to-web image attachment relay and Minecraft legacy color-code stripping for Discord output.

### History loading and edge notices

- Improved top and bottom edge history loading retries when older or newer messages are still available.
- Added a bottom-edge “No more messages to display” toast after repeated extra-scroll attempts at the latest loaded message while keeping newer-history retry requests immediate.
- Kept the existing top-edge no-more-history notice for the oldest loaded history edge.
## 4.0.1

### Discord relay fixes

- Fixed Discord -> web image attachment relay by appending Discord image attachment URLs to the web message so the existing media preview system can render them.
- Stripped Minecraft legacy formatting codes from BM Web Chat's web -> Discord output, including standard codes such as `§a`, `§l`, `§r` and RGB sequences such as `§x§8§a§b§4§f§e`.
- Added optional Discord-side image preview links for BM Web Chat custom emoji tokens such as `:pack/name:`.
- Added `discordsrv.append-web-emoji-links` and `discordsrv.max-emoji-links-per-message`.

### Reply relay fixes

- Changed game-side reply labeling to render the normal web -> game relay line first and then replace the source label with the configured reply label.
- Changed reply relay output from `[Web] Player: message` to `↪ [Reply] Player: message` by default.
- Applied the same reply preview and reply label behavior to web -> Discord relay output.

### Release cleanup

- Bumped the project version to `4.0.1`.
- Refreshed default configuration comments, README files, configuration references, and i18n documentation for the 4.0.1 release.
- Documented the Discord attachment, color-code cleanup, and custom emoji link behavior.

## 4.0.0

### Replies, history, and scrolling

- Fixed Paper game-to-web chat capture so web relay uses the player's original typed message, preserving `:pack/name:` emoji tokens before any game-side emoji plugin renders them in game.
- Added web chat replies with referenced-message previews.
- Added jump-to-replied-message behavior, including loading older history around the target message when needed.
- Improved virtual scrolling around media-heavy histories and reply jumps.
- Added a safe media-preview wrapper so preview parser errors cannot break message rendering or virtual scrolling.

### Custom emoji and game-link cleanup

- Changed `emoji.game-link.plain-broadcast-with-urls` to split mixed emoji/URL messages: the original line stays plain for game-side emoji rendering, and each URL is repeated on a separate clickable reference line.

- Simplified web-to-game custom emoji relay to two modes: `link` and `label`.
- Removed the misleading ImageEmojis-specific game-link subsection from the default config and documentation.
- Moved `plain-broadcast-with-urls`, `default-pack`, and `aliases` directly under `emoji.game-link`.
- Clarified that BM Web Chat sends token text only; game-side emoji rendering is handled independently by external plugins that know the same token names.
- Fixed missing Java helper definitions after the resource-pack cleanup so game-link labels and game-side reply previews compile again.
- Fixed URL-before-custom-emoji rendering so `https://example.com :pack/name:` is linkified and the emoji token still renders; the frontend now avoids treating URL scheme colons as emoji token starts.
- Added the admin custom emoji manager for creating, uploading, renaming, and deleting emoji packs/files.
- Added emoji storage usage/limit display and upload warnings when the total emoji size limit is exceeded.
- Added same-folder PNG sidecars for GIF/JPG/JPEG/WEBP custom emoji files for compatibility with game-side emoji plugins that only read PNG files.
- Kept the web UI on the original uploaded emoji file so animated GIFs remain animated in the browser.
- Hid PNG sidecars from the web emoji catalog when a same-base non-PNG original exists.
- Improved emoji picker resizing, scrollbar spacing, and wheel-row snapping.

### Media previews

- Fixed YouTube embed Error 153 by using `strict-origin-when-cross-origin` referrer policy and an embed `origin` parameter.
- Added YouTube Shorts handling through the normal YouTube preview path, with a vertical player and loop parameters.
- Added optional TikTok and X/Twitter social embeds behind disabled-by-default provider switches.
- TikTok now uses the official `player/v1` iframe with `description=0` and `music_info=0` to avoid variable-height caption/music sections creating inner scrollbars.
- Added an external "Open on TikTok" link for full TikTok post details.
- Kept social embeds click-to-load by default so third-party content loads only after the user opens a preview.

### UI, settings, and localization

- Added UI text color, input background, theme, and text-shadow options.
- Applied font settings to collapsed pinned-message areas.
- Added latest-message and no-more-history notices.
- Added localized media/social preview labels for English, Korean, Japanese, and Simplified Chinese.

### Reliability and cleanup

- Improved SSE reconnect and post-reconnect config/history resynchronization.
- Guarded repeated Enter sends immediately after reconnect.
- Reduced stale web-asset problems by keeping generated asset version tokens.
- Removed project-specific examples from default configuration and documentation.
- Aligned bundled config, README, docs, and proxy override examples so `web-addon` appears before `standalone-web`.
- Removed game-to-web glyph reverse-conversion paths; game-to-web relay now depends on original chat text capture instead of glyph lookup.
- Simplified PNG sidecar behavior so it is a general compatibility helper for game-side emoji plugins.



## 3.2.x

### Reply and history navigation

* Added web chat reply support: hover a message to reply, send with a referenced-message preview, and click the preview to jump to the original message.
* Added `/history/around` lookup so replies to older messages can load and render the target message neighborhood directly.
* Fixed reply fallback compilation and hover-only reply button visibility after virtual-scroll action synchronization.

### Admin emoji manager improvements

* Added admin custom emoji rename support for emoji folders and individual emoji files while preserving file extensions.
* Added emoji storage usage/limit display options and localized warnings when uploads exceed the configured total emoji storage limit.
* Improved admin emoji upload error handling so HTTP 413 JSON responses are shown as user-visible alerts.
* Refined the admin emoji manager layout with clearer folder selection, emoji counts, selected-file display, select-all/delete-selected actions, and better button spacing.
* Simplified emoji item cards by removing secondary path lines, centering display names, and preventing long names from squeezing action buttons.

### URL and reverse-proxy behavior

* Reworked public URL resolution for direct HTTP, BlueMap addon mode, standalone mode, uploads, and custom emoji files.
* Made `web-addon.api-base-url` the primary public API base for reverse-proxy deployments.
* Made empty `standalone-web.api-base-url`, `upload.public-base-url`, and `emoji.public-base-url` consistently follow the active public API base.
* Kept compatibility with explicit legacy values such as `/bmwc/api`, `/bmwc/api/uploads`, and `/bmwc/api/emojis`.
* Documented absolute paths, full resource paths, relative shorthand values resolved through `http.cors-origin`, and full `https://...` URLs consistently.
* Reordered the default config so `web-addon` appears before `standalone-web`, making the reverse-proxy API base setting easier to find.

### Theme and user settings

* Improved light/system-light theme behavior so panel, modal, button, input, emoji/admin surfaces, and surrounding areasalone-web`, making the reverse-proxy API base setting easier to find.
* Improved light use the same user-selected background and text-color variables as dark theme.
* Changed light-theme panel, modal, button, and emoji resize-handle backgrounds from gradients to solid colors so custom colors render cleanly.
* Allowed decimal pixel values for user settings where fractional CSS pixels are safe, including font size and custom text-shadow X/Y/blur controls.

### Documentation and localization

* Updated `config.yml` comments, README files, HTTPS proxy guides, standalone notes, upload/security notes, and proxy example overrides to match the unified URL behavior.
* Updated bundled language files and documentation variants for the new admin emoji, URL, reply, and settings behavior.
* Verified bundled translation YAML files for syntax and key consistency.



## 3.1.x

### Custom emoji system

* Added server-managed custom emoji support.
* Added an admin emoji manager for creating emoji packs, uploading emoji files, renaming, deleting, and refreshing emoji lists from the web UI.
* Added support for PNG, JPG, JPEG, GIF, and WebP custom emoji uploads.
* Preserved Unicode emoji filenames where possible, allowing Korean, Unicode, and spaced emoji names to resolve correctly.
* Added custom emoji pack support through subfolders under the emoji directory.
* Added configurable emoji render size, picker size, per-file size limit, total storage limit, and per-message emoji token limit.
* Increased custom emoji size clamps up to 1024px for servers that want oversized emoji previews.
* Improved emoji sorting, empty-pack display, tooltips, and admin emoji list usability for large emoji collections.

### Emoji picker improvements

* Added an emoji picker button next to the attachment button.
* Added a draggable emoji picker resize handle between the message list and input area.
* Remembered emoji picker height per browser.
* Improved emoji picker minimum-height calculation so one full emoji row remains visible at small sizes.
* Reworked the emoji picker layout so pack tabs stay separate from the scrollable emoji grid.
* Added row-aligned mouse-wheel scrolling for cleaner emoji navigation.
* Improved resize and scroll behavior to reduce jitter and avoid partial-row clipping.

### Upload, preview, and URL handling

* Unified upload and emoji public URLs with the active web chat API base when public override values are left empty.
* Added `emoji.public-base-url` as a compatibility override for reverse proxy deployments.
* Clarified HTTP, HTTPS, reverse proxy, standalone, upload, and emoji URL defaults in configuration comments and documentation.
* Added Discord CDN media cache support for expiring external media URLs.
* Improved image, video, audio, and custom emoji preview handling.

### Standalone and reverse proxy support

* Fixed standalone mode API base resolution when opened through a reverse proxy path.
* Preserved standalone runtime mode inside the embedded chat iframe.
* Added standalone diagnostics to generated page configuration.
* Improved behavior when BlueMapWebChat is served from non-root API paths.

### Minimized window behavior

* Improved minimized-window anchoring so the chat collapses and restores from the nearest bottom edge based on its current position.
* Made windows near the right edge restore from the bottom-right, and windows near the left edge restore from the bottom-left.
* Cleaned up the minimized header display in light theme.

### Chat scrolling and history resilience

* Improved latest-message auto-follow so mid-history views are no longer pulled down unexpectedly by incoming messages, media layout changes, resume refreshes, or history refreshes.
* Added a latest-message jump path that bypasses stale viewport protection.
* Improved virtual scrolling, scroll anchoring, spacer recalculation, and idle viewport maintenance to reduce small viewport jitter.
* Added delayed-loading and failure notices for older message history when the network is slow, offline, or timed out.
* Added request timeouts for older-history loading so a failed request does not permanently block future history loads.
* Added better handling for large emoji lists and long chat histories.

### Web command and UI refinements

* Improved the server command modal layout so the command input and Run button align cleanly.
* Fixed web command execution notices so the executor display name is shown correctly even with older language files.
* Updated bundled translation files for YAML validity and key alignment.



## 3.1.0

### UI and theme settings

- Added a theme selector to Chat settings.
- Improved contrast for buttons, surfaces, and input fields in the light theme.
- Added a separate UI text color setting for labels such as role badges, source badges, timestamps, controls, and placeholders.
- Added text-shadow presets: `none`, `auto`, `dark`, `light`, and `custom`.
- Replaced raw custom text-shadow input with color picker and slider controls.
- Applied font settings to collapsed and expanded pinned-message areas.

### Navigation and history UI

- Added a jump-to-latest-message button when viewing older chat history.
- Added a "No more messages to display" notice at the top of history when there are no older messages left.
- Made the history-end notice and jump-to-latest button follow the active theme colors instead of user-overridden UI text colors.

### Message deletion and moderation actions

- Prevented duplicate delete confirmation handling.
- Refreshed deleted messages immediately after deletion.
- Improved scroll anchoring so deleting a message is less likely to pull the view down to the latest messages.

### Reconnection and sending

- Added automatic SSE reconnection after a server restart.
- Resynchronized config and the latest history page after reconnection.
- Prevented duplicate sends from repeated Enter presses immediately after reconnection.

### Media previews and link insertion

- Changed the default media preview max height to `720px`.
- Documented that unlimited or excessively large media preview heights can cause visible scroll jumps with virtual scrolling.
- Capped image, video, and YouTube previews so they do not exceed the current chat viewport even when the configured max height is very large or unlimited.
- Added trailing spaces when inserting multiple media links so preview detection can parse each link separately.

### HTTPS proxy documentation

- Expanded the Caddy HTTPS setup guide.
- Expanded the nginx + Certbot HTTPS setup guide.
- Added installation examples under `examples/caddy` and `examples/nginx`.



## Legacy internal changelog note

BlueMapWebChat was developed privately before its public release. Some internal changelog entries before the 3.0.x line were incomplete, duplicated, or partially lost during packaging. For this reason, the public changelog below focuses on the cleaned 3.0.x release line; older internal builds are intentionally not listed in full.
