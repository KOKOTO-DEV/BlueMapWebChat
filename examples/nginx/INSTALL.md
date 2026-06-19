# nginx + Certbot example install notes

1. Point `map.example.com` to the server IP.
2. Open `80/tcp` and `443/tcp`.
3. Install nginx and Certbot.

Debian / Ubuntu example using the official Certbot snap method:

```bash
sudo apt update
sudo apt install -y nginx snapd
sudo snap install core
sudo snap refresh core
sudo snap install --classic certbot
sudo ln -sf /snap/bin/certbot /usr/bin/certbot
sudo ufw allow 'Nginx Full'
```

4. Issue a certificate:

```bash
sudo certbot --nginx -d map.example.com
sudo certbot renew --dry-run
```

5. Edit `bluemapwebchat.conf`, replace `map.example.com`, and copy it if you manage the server block manually:

```bash
sudo cp bluemapwebchat.conf /etc/nginx/sites-available/bluemapwebchat.conf
sudo ln -sf /etc/nginx/sites-available/bluemapwebchat.conf /etc/nginx/sites-enabled/bluemapwebchat.conf
sudo nginx -t
sudo systemctl reload nginx
```

6. Apply `BlueMapWebChat-config-overrides.yml` values to `plugins/BlueMapWebChat/config.yml`.
7. Run `/bmchat reload` or restart the Minecraft server.

See `docs/NGINX_HTTPS_EN.md` for the full guide.
