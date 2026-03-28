# 🦚 Peacock Dockerized

[![Docker Image Size](https://img.shields.io/docker/image-size/lana20/peacock/latest?style=flat-square)](https://hub.docker.com/r/lana20/peacock)
[![License: AGPL 3.0](https://img.shields.io/badge/License-AGPL%203.0-blue.svg?style=flat-square)](https://opensource.org/licenses/AGPL-3.0)

This repository provides a fully containerized, automated build of **[The Peacock Project](https://thepeacockproject.org/)**—the premier server replacement for the *HITMAN™ World of Assassination* trilogy. 

This fork is optimized for headless Linux servers, VPS environments, and home labs. It automatically builds and publishes fresh Docker images nightly, ensuring you always have the latest upstream server features without needing to compile code manually.

---

## ✨ Features
* **Zero-Dependency Host:** No need to install Node.js or Yarn on your host. Everything runs inside the container.
* **Persistent Storage:** Your custom contracts, saves, and user data are safely stored in Docker volumes.
* **Auto-Updating:** Built-in GitHub Actions pull the latest code and push fresh images to Docker Hub (`lana20/peacock:latest`).
* **Reverse Proxy Ready:** Easily sit this container behind Nginx Proxy Manager, Traefik, or Cloudflare to route traffic through a clean domain name.

---

## 🚀 Deployment Instructions

### Option A: Standard Docker Compose (CLI)

1. **Create a directory and the compose file:**
   ```bash
   mkdir peacock-server && cd peacock-server
   nano docker-compose.yml



Paste this configuration:

YAML
version: '3.8'

services:
  peacock:
    image: lana20/peacock:latest
    container_name: peacock-server
    restart: unless-stopped
    ports:
      - "8080:8080"
    environment:
      - NODE_ENV=production
    volumes:
      - peacock-data:/app/userdata

volumes:
  peacock-data:
Start the server:

Bash
docker compose up -d
Option B: Portainer Deployment (Easiest)
Open your Portainer Dashboard.

Go to Stacks > Add stack.

Name it peacock.

Paste the YAML code from Step 2 above into the web editor.

Click Deploy the stack.

🌐 Using a Custom Domain
To use a domain like peacock.yourdomain.com:

DNS: Point an A Record to your VPS IP.

Reverse Proxy: Route incoming traffic for your domain to the container’s internal IP on port 8080.

SSL: Ensure you have a certificate (Let's Encrypt) active for a secure connection.

🎮 Connecting with Peacock Patcher
Download the latest Peacock Patcher from the official releases.

Run PeacockPatcher.exe.

In the Custom Server box, enter your domain or IP:

Example: https://peacock.yourdomain.com or http://your-vps-ip:8080

Click Patch and Launch.

📝 Credits & Legal
Original Project: The Peacock Project Team.

License: AGPL-3.0 License.

Disclaimer: This project is a community-driven server emulator and is not affiliated with IO Interactive.
