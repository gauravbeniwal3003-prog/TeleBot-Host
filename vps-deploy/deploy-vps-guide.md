# TeleBot Host - 1-Click Production VPS Deployment Guide
**Target Architecture:** Intel Xeon Platinum 8168 CPU @ 2.70GHz (Cloud On Fire / Any VPS Provider)
**OS:** Ubuntu 24.04.3 LTS (Kernel 6.8+ with native cgroups v2)

---

## 🚀 Quick Setup Instructions (3 Steps)

### Step 1: Connect to your VPS via SSH
```bash
ssh root@YOUR_VPS_IP_ADDRESS
```

### Step 2: Run the Automated 1-Click Setup Script
Run this single command to automatically install Node.js 22, Python 3.12, pre-baked Telegram bot dependencies, cgroups v2 80MB RAM limits, Nginx, and system security:

```bash
curl -sSL https://raw.githubusercontent.com/your-repo/telebot-host/main/vps-deploy/setup-vps.sh | bash
```

*(Or copy `/vps-deploy/setup-vps.sh` directly to your VPS and run `sudo bash setup-vps.sh`)*

---

### Step 3: Deploy Application Code & Start Service
1. Copy the project files into `/opt/telebot-host/`:
```bash
cd /opt/telebot-host
# Clone repo or extract build archive
npm install
npm run build
```

2. Create `.env` file from the production template:
```bash
cp vps-deploy/.env.vps.example .env
nano .env
```
*(Enter your Cashfree APP_ID, Secret Key, and JWT Secret)*

3. Start & Enable TeleBot Host Service:
```bash
systemctl enable telebot-host
systemctl start telebot-host
systemctl status telebot-host
```

---

## 🔒 Security & Multi-Tenant Isolation Specifications
- **80MB RAM Limit per Bot**: Enforced at the Linux kernel level via `systemd-run` and `cgroups v2` (`MemoryMax=80M`, `MemoryHigh=72M`).
- **Unprivileged User Isolation**: All customer bots run under dedicated user `telebot-runner` (UID `10001`) with `/sbin/nologin`. No user can access root (`/root`), shadow files (`/etc/shadow`), or other users' bot subdirectories (`/var/telebot-data/bots`).
- **Zero Host Access**: Path traversal is blocked at both Node.js level and system filesystem permissions level (`chmod 700`).
- **Pre-baked Sub-Second Deployment**: All popular Telegram libraries (`aiogram`, `telethon`, `pyrogram`, `python-telegram-bot`, `telebot`, `requests`, `aiohttp`, etc.) are pre-baked globally on the VPS. Custom `requirements.txt` dependencies auto-install into target directories upon clicking "Start Bot".
- **Instant Cashfree Payments**: Cashfree webhooks (`/api/payments/cashfree-webhook`) automatically activate plans, grant storage quotas, and launch bots as soon as payment is completed.

---

## 🌐 SSL Certificate Setup (Free HTTPS via Let's Encrypt)
To enable HTTPS for your VPS domain:
```bash
certbot --nginx -d your-vps-domain.com -d www.your-vps-domain.com
```
Certbot will configure SSL automatically in Nginx!
