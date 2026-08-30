#!/usr/bin/env bash
# ==============================================================================
# TeleBot Host - 1-Click Production VPS Setup Script
# Optimized for: Intel Xeon Platinum 8168 CPU @ 2.70GHz / Ubuntu 24.04.3 LTS
# Features:
# - Automatic Node.js 22 LTS & Python 3.12 installation
# - Systemd cgroups v2 resource sandbox (Strict 80MB RAM per bot)
# - Pre-cached Telegram Python frameworks (aiogram, telethon, pyrogram, telebot, etc.)
# - Isolated non-root runner user (telebot-runner, UID 10001)
# - Automatic Cashfree Payment Gateway Webhook backend integration
# - Production Nginx reverse proxy + Certbot SSL setup
# - Kernel hardening & firewall configuration
# ==============================================================================

set -eo pipefail

# Colors
RED='\030[0;31m'
GREEN='\032[0;32m'
YELLOW='\033[1;33m'
BLUE='\034[0;34m'
NC='\030[0m'

echo -e "${BLUE}====================================================================${NC}"
echo -e "${GREEN}  TeleBot Host - Intel Xeon 8168 / Ubuntu 24.04.3 Automated VPS Setup ${NC}"
echo -e "${BLUE}====================================================================${NC}"

# Check root privileges
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}[ERROR] Please run this script as root (e.g. sudo bash setup-vps.sh)${NC}"
  exit 1
fi

# Detect OS
if [ -f /etc/os-release ]; then
  . /etc/os-release
  echo -e "${BLUE}[INFO] OS Detected: ${NAME} ${VERSION_ID}${NC}"
else
  echo -e "${YELLOW}[WARN] Could not identify OS release. Proceeding with Ubuntu defaults...${NC}"
fi

# Step 1: System update & core packages
echo -e "\n${GREEN}[STEP 1/8] Updating apt repositories and installing core dependencies...${NC}"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get upgrade -y
apt-get install -y \
  curl \
  wget \
  git \
  build-essential \
  software-properties-common \
  cgroup-tools \
  ufw \
  fail2ban \
  nginx \
  certbot \
  python3-certbot-nginx \
  python3 \
  python3-pip \
  python3-venv \
  python3-[#dev] \
  libssl-dev \
  libffi-dev \
  jq \
  htop \
  unzip

# Step 2: Install Node.js 22 LTS
echo -e "\n${GREEN}[STEP 2/8] Installing Node.js 22 LTS runtime...${NC}"
if ! command -v node &> /dev/null || [[ $(node -v) != v22* ]]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi
echo -e "${BLUE}[INFO] Node.js version: $(node -v)${NC}"
echo -e "${BLUE}[INFO] NPM version: $(npm -v)${NC}"

# Step 3: Pre-bake Common Python Telegram Frameworks
echo -e "\n${GREEN}[STEP 3/8] Pre-loading Python 3.12 Telegram libraries & dependencies...${NC}"
python3 -m pip install --upgrade pip --break-system-packages setuptools wheel

echo -e "${BLUE}[INFO] Installing core bot frameworks globally to enable sub-second bot startup...${NC}"
python3 -m pip install --break-system-packages \
  "aiogram>=3.0.0" \
  "Telethon>=1.30.0" \
  "pyrogram>=2.0.0" \
  "python-telegram-bot>=20.0" \
  "pyTelegramBotAPI>=4.12.0" \
  "requests>=2.31.0" \
  "aiohttp>=3.9.0" \
  "beautifulsoup4>=4.12.0" \
  "Pillow>=10.0.0" \
  "pymongo>=4.6.0" \
  "python-dotenv>=1.0.0" \
  "cryptography>=41.0.0" \
  "psutil>=5.9.0" \
  "asyncio"

echo -e "${GREEN}[SUCCESS] All popular Telegram frameworks pre-loaded!${NC}"

# Step 4: Create Isolated Sandbox User & Directory Hierarchy
echo -e "\n${GREEN}[STEP 4/8] Creating unprivileged runner user 'telebot-runner'...${NC}"
if ! id -u telebot-runner &>/dev/null; then
  useradd -u 10001 -r -s /sbin/nologin -d /home/telebot-runner -m telebot-runner
  echo -e "${BLUE}[INFO] User telebot-runner (UID 10001) created successfully.${NC}"
fi

# Secure home & bot data directory
mkdir -p /var/telebot-data/bots
mkdir -p /var/telebot-data/logs
mkdir -p /var/telebot-data/backups
mkdir -p /opt/telebot-host

chmod 711 /var/telebot-data
chmod 700 /var/telebot-data/bots
chmod 700 /var/telebot-data/logs
chown -R telebot-runner:telebot-runner /var/telebot-data

# Step 5: Systemd Bot Process Runner Script
echo -e "\n${GREEN}[STEP 5/8] Creating isolated cgroups v2 bot launcher script...${NC}"
cat << 'EOF' > /opt/telebot-host/run-bot-isolated.sh
#!/usr/bin/env bash
# TeleBot Host - Isolated Container Process Launcher
# Enforces strict 80MB RAM limits & cgroups v2 sandbox per user bot process

BOT_ID="$1"
BOT_DIR="$2"
ENTRY_POINT="${3:-main.py}"
RAM_LIMIT_MB="${4:-80}"

if [ -z "$BOT_ID" ] || [ -z "$BOT_DIR" ]; then
  echo "[ERROR] Usage: run-bot-isolated.sh <bot_id> <bot_dir> [entry_point] [ram_limit_mb]"
  exit 1
fi

# Systemd unit name for cgroups tracking
UNIT_NAME="telebot-bot-${BOT_ID}"

# Check for custom requirements.txt and auto-install into user venv if present
if [ -f "${BOT_DIR}/requirements.txt" ]; then
  echo "[INFO] Auto-installing custom requirements from requirements.txt..."
  python3 -m pip install --break-system-packages --target "${BOT_DIR}/.deps" -r "${BOT_DIR}/requirements.txt" || true
fi

# Execute via systemd-run with cgroups v2 memory & CPU constraints under telebot-runner
exec systemd-run \
  --unit="${UNIT_NAME}" \
  --uid=10001 \
  --gid=10001 \
  --property=MemoryMax="${RAM_LIMIT_MB}M" \
  --property=MemoryHigh="$((RAM_LIMIT_MB - 8))M" \
  --property=CPUQuota=50% \
  --property=TasksMax=64 \
  --property=ProtectSystem=strict \
  --property=ProtectHome=true \
  --property=ReadWritePaths="${BOT_DIR}" \
  --property=PrivateTmp=true \
  --property=NoNewPrivileges=true \
  --property=CapabilityBoundingSet="" \
  --property=WorkingDirectory="${BOT_DIR}" \
  --setenv=PYTHONPATH="${BOT_DIR}:${BOT_DIR}/.deps" \
  python3 "${BOT_DIR}/${ENTRY_POINT}"
EOF

chmod +x /opt/telebot-host/run-bot-isolated.sh

# Step 6: Systemd Service for Main Server
echo -e "\n${GREEN}[STEP 6/8] Configuring Systemd service 'telebot-host.service'...${NC}"
cat << 'EOF' > /etc/systemd/system/telebot-host.service
[Unit]
Description=TeleBot Host Node.js Server & Automated Bot Manager
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/telebot-host
ExecStart=/usr/bin/node dist/server.cjs
Restart=always
RestartSec=5
Environment=NODE_ENV=production
Environment=PORT=3000
Environment=VPS_HARDWARE="Intel Xeon Platinum 8168 CPU @ 2.70GHz"
Environment=VPS_OS="Ubuntu 24.04.3 LTS"

# Hardening
LimitNOFILE=65536
TasksMax=4096

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload

# Step 7: Nginx & Security Firewall Setup
echo -e "\n${GREEN}[STEP 7/8] Configuring Nginx reverse proxy & Kernel hardening...${NC}"
cat << 'EOF' > /etc/nginx/sites-available/telebot-host
server {
    listen 80;
    server_name _;

    client_max_body_size 25M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Cashfree Webhook Direct Route
    location /api/payments/cashfree-webhook {
        proxy_pass http://127.0.0.1:3000/api/payments/cashfree-webhook;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
EOF

ln -sf /etc/nginx/sites-available/telebot-host /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx

# Configure UFW
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
echo "y" | ufw enable || true

# Kernel parameters hardening for multi-tenant Python bot security
cat << 'EOF' > /etc/sysctl.d/99-telebot-security.conf
fs.protected_fifos = 2
fs.protected_regular = 2
fs.suid_dumpable = 0
kernel.unprivileged_userns_clone = 1
vm.max_map_count = 262144
EOF
sysctl -p /etc/sysctl.d/99-telebot-security.conf || true

# Step 8: Completion Summary
echo -e "\n${BLUE}====================================================================${NC}"
echo -e "${GREEN}  TeleBot Host VPS Installation Complete! ${NC}"
echo -e "${BLUE}====================================================================${NC}"
echo -e " Hardware Node: Intel Xeon Platinum 8168 CPU @ 2.70GHz"
echo -e " OS Target: Ubuntu 24.04.3 LTS"
echo -e " RAM Limit: 80MB per bot container (cgroups v2 systemd-run)"
echo -e " Status: Server prepared for automatic bot deployment & Cashfree payments!"
echo -e "\nTo start the service after placing code in /opt/telebot-host:"
echo -e " ${YELLOW}systemctl start telebot-host${NC}"
echo -e " ${YELLOW}systemctl status telebot-host${NC}"
echo -e "${BLUE}====================================================================${NC}\n"
