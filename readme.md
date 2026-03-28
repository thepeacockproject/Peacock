# 🦚 Peacock Dockerized

**A fully containerized, automated build of The Peacock Project** — the premier server replacement for the HITMAN™ World of Assassination trilogy.

This fork is optimized for headless Linux servers, VPS environments, and home labs. It automatically builds and publishes fresh Docker images nightly, ensuring you always have the latest upstream features without manual compilation.

---

## ✨ Features

- **Zero-Dependency Host** – No need for Node.js or Yarn. Everything runs strictly inside the container.
- **Persistent Storage** – Your custom contracts, saves, and user data are safely stored in Docker volumes.
- **Auto-Updating** – Integrated GitHub Actions pull the latest code and push fresh images to [`lana20/peacock:latest`](https://hub.docker.com/r/lana20/peacock).
- **Reverse Proxy Ready** – Seamlessly compatible with Nginx Proxy Manager, Traefik, or Cloudflare Tunnel.

---

## 🚀 Deployment Instructions

### Option A: Standard Docker Compose (CLI)

1. **Create a directory and the compose file:**

   ```bash
   mkdir peacock-server && cd peacock-server
   nano docker-compose.yml
   ```

2. **Paste this configuration:**

```ymal
services:
  peacock:
    image: lana20/peacock:latest
    container_name: peacock-server
    restart: unless-stopped
    ports: [] # Server listens on port 80 internally
    environment:
      - NODE_ENV=production
    volumes:
      - /opt/peacock-data/userdata:/app/userdata
      - /opt/peacock-data/Contracts:/app/Contracts
      - /opt/peacock-data/plugins:/app/plugins
      - /opt/peacock-data/options.ini:/app/options.ini
    networks:
      - Internal_Shared_Network # Please note rename this network to what evernetwork NPM or cloudflare or your chosesen proxy manger uses. or remove it if you dont use one.
      - peacock_network

networks:
  Internal_Shared_Network: # Please note rename this network to what evernetwork NPM or cloudflare or your chosesen proxy manger uses. or remove it if you dont use one.
    external: true
  peacock_network:
    driver: bridge
    enable_ipv6: true
```

3. **Start the server:**

   ```bash
   docker compose up -d
```

### Option B: Portainer (GUI)

1. Open your Portainer Dashboard.
2. Navigate to **Stacks** > **Add stack**.
3. Name it `peacock`.
4. Paste the YAML configuration from Option A into the web editor.
5. Click **Deploy the stack**.

---

## 🌐 Network Configuration

### Using a Custom Domain

To use a domain like `peacock.yourdomain.com`:

- **DNS:** Point an `A` record to your VPS/server IP or a CNAME reccord poting to the domain that has the ip pointing to it. IE hitman-peacock.yourdomain.com pointing to gameservers.yourdomain.com 
- **Reverse Proxy:** Route incoming traffic for your domain to the container's internal IP on port `80`.
- **SSL:** Ensure you have a certificate (e.g., Let's Encrypt) active for a secure connection.

---

## 🎮 How to Connect

1. Download the latest [Peacock Patcher](https://github.com/thepeacockproject/PeacockPatcher/releases) from the official releases.
2. Run `PeacockPatcher.exe`.
3. In the **Custom Server** box, enter your domain or IP:
   - Example: `https://peacock.yourdomain.com` or `http://your-vps-ip:8080`
4. Click **Patch and Launch**.

---

## 📝 Credits & Legal

- **Original Project:** [The Peacock Project Team](https://github.com/thepeacockproject/Peacock)
- **License:** AGPL-3.0 License
- **Disclaimer:** This is a community-driven server emulator and is not affiliated with IO Interactive.
