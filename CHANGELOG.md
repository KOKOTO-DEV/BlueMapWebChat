# Changelog

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
