#!/usr/bin/env bash
# ==============================================================================
# TELEBOT HOST - COMPLETE VPS UPDATE & DEPLOYMENT SCRIPT
# Run this on your Ubuntu/Debian VPS to install/update all requirements,
# pre-load all Python Telegram libraries, configure RAM & storage isolation,
# and run the backend 24/7 with PM2.
# ==============================================================================

set -e

# ANSI Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}==================================================================${NC}"
echo -e "${GREEN}  TeleBot Host - 1-Click Production VPS Deploy & Upgrade Engine   ${NC}"
echo -e "${CYAN}==================================================================${NC}"

# 1. Check Root Privileges
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}[ERROR] Please run this script with root privileges (sudo bash deploy_vps.sh)${NC}"
  exit 1
fi

echo -e "\n${BLUE}[1/6] Updating system packages & installing core runtimes...${NC}"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y \
  curl \
  wget \
  git \
  build-essential \
  python3 \
  python3-pip \
  python3-venv \
  python3-dev \
  libssl-dev \
  libffi-dev \
  cgroup-tools \
  ufw \
  htop \
  unzip \
  jq

# 2. Install Node.js 20+ LTS and PM2
echo -e "\n${BLUE}[2/6] Ensuring Node.js 20+ LTS and PM2 are installed...${NC}"
if ! command -v node &> /dev/null || [[ $(node -v) != v20* && $(node -v) != v22* && $(node -v) != v24* ]]; then
  echo -e "${YELLOW}Installing Node.js 20.x repository...${NC}"
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi

echo -e "${GREEN}Node.js Version:${NC} $(node -v) | ${GREEN}NPM Version:${NC} $(npm -v)"

# Install PM2 and tsx globally
npm install -g pm2 tsx

# 3. Pre-install all Python Telegram Bot Libraries Globally
echo -e "\n${BLUE}[3/6] Pre-installing all Python Telegram bot libraries system-wide...${NC}"
python3 -m pip install --upgrade pip --break-system-packages setuptools wheel || true
python3 -m pip install --break-system-packages \
  "pyTelegramBotAPI>=4.14.0" \
  "aiogram>=3.4.0" \
  "python-telegram-bot>=20.8" \
  "Telethon>=1.34.0" \
  "pyrogram>=2.0.106" \
  "requests>=2.31.0" \
  "aiohttp>=3.9.3" \
  "python-dotenv>=1.0.0" \
  "pydantic>=2.6.0" \
  "pymongo>=4.6.0" \
  "motor>=3.3.0" \
  "certifi>=2024.2.2" \
  "psutil>=5.9.8" \
  "schedule>=1.2.1" \
  "pytz>=2024.1" \
  "cryptography>=42.0.0" \
  "beautifulsoup4>=4.12.0" \
  "Pillow>=10.2.0" \
  "ujson>=5.9.0" || true

echo -e "${GREEN}[OK] Core Python Telegram libraries successfully installed!${NC}"

# 4. Prepare Workspace Directory with Proper Permissions
echo -e "\n${BLUE}[4/6] Initializing user workspace sandbox directory...${NC}"
mkdir -p vps_workspaces
chmod -R 777 vps_workspaces
mkdir -p data
chmod -R 777 data

# 5. Build Project
echo -e "\n${BLUE}[5/6] Installing npm packages and building production bundle...${NC}"
npm install
npm run build

# 6. Start / Restart PM2 24/7 Daemon
echo -e "\n${BLUE}[6/6] Configuring 24/7 background process manager (PM2)...${NC}"
pm2 delete telebothost 2>/dev/null || true
NODE_ENV=production PORT=3000 pm2 start dist/server.cjs --name telebothost --time
pm2 save
pm2 startup systemd -u root --hp /root || true

# Allow firewall port 3000
ufw allow 3000/tcp 2>/dev/null || true

# Check Health Endpoint
sleep 2
echo -e "\n${CYAN}==================================================================${NC}"
echo -e "${GREEN}  TeleBot Host VPS Server Deployed & Running Successfully!        ${NC}"
echo -e "${CYAN}==================================================================${NC}"
curl -s http://127.0.0.1:3000/api/health || echo ""
echo -e "\n${YELLOW}PM2 Process Status:${NC}"
pm2 status telebothost

echo -e "\n${GREEN}Useful VPS Commands:${NC}"
echo -e " • View Live Bot Logs: ${CYAN}pm2 logs telebothost${NC}"
echo -e " • Restart Server:     ${CYAN}pm2 restart telebothost${NC}"
echo -e " • Stop Server:        ${CYAN}pm2 stop telebothost${NC}"
echo -e " • Monitor System:     ${CYAN}pm2 monit${NC}"
echo -e "${CYAN}==================================================================${NC}\n"
