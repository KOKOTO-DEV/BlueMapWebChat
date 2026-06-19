# BlueMapWebChat Upload Security Notes

File upload is convenient but can be abused on public servers. The default configuration keeps guest uploads disabled.

## Recommended defaults

```yaml
upload:
  enabled: true
  allow-guest-upload: false
  allow-user-upload: true
  allow-moderator-upload: true
  allow-admin-upload: true
  max-file-size-mb: 20
  max-files-per-message: 3
  cooldown-seconds: 5
  max-uploads-per-minute: 4
  retention-days: 5
```

## Public servers

For public servers, keep guest uploads disabled unless you have a separate moderation process. If guest uploads are enabled, lower file size limits and use a short retention period.

## Public URL

Direct HTTP example:

```yaml
upload:
  public-base-url: ""
```

Same-domain HTTPS reverse proxy example:

```yaml
web-addon:
  api-base-url: "/bmwc/api"

upload:
  public-base-url: "/bmwc/api/uploads"
```

A leading slash is treated as a same-origin browser path. You do not need to use a full FQDN for same-domain proxy deployments.

## Allowed extensions

Only allow file types you actually want to display or share in chat.

```yaml
upload:
  allowed-extensions:
    - png
    - jpg
    - jpeg
    - gif
    - webp
    - mp4
    - webm
    - mp3
    - m4a
    - ogg
    - wav
    - flac
```

BlueMapWebChat limits by extension and size, but it is still recommended to serve uploads from a constrained directory and use HTTPS for public deployment.

Archive formats such as `zip` are not included in the default public-server example. Add them manually only when you intentionally want general file sharing.
