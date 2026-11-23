#!/bin/bash
# Reelhouse server setup for an Oracle Cloud "Always Free" Ubuntu server.
# Paste this whole file into "Initialization script" (cloud-init) when you create
# the server, or run it once as root: sudo bash oracle-setup.sh
#
# ---- Change this line before you paste: the password for your studio ----
REELHOUSE_PASSWORD="change-me-to-something-long"
# -------------------------------------------------------------------------
# Optional:
REELHOUSE_USER="reelhouse"          # the user name the browser asks for
REPO="https://github.com/iwul-iwul/AI2DVIDEOS.git"
BRANCH="main"                       # falls back to the review branch while main is empty
FALLBACK_BRANCH="claude/project-thread-gpqu1x"

set -euo pipefail
exec > >(tee -a /var/log/reelhouse-setup.log) 2>&1
echo "=== Reelhouse setup started $(date) ==="
export DEBIAN_FRONTEND=noninteractive
APP=/opt/reelhouse/app

# 1. System packages: git, Python for the voices, and the libraries the video renderer's browser needs.
apt-get update
apt-get install -y git curl ca-certificates gnupg python3 python3-venv python3-pip build-essential \
  libnss3 libdbus-1-3 libatk1.0-0 libgbm1 libxrandr2 libxkbcommon0 libxfixes3 libxcomposite1 \
  libxdamage1 libatk-bridge2.0-0 libpango-1.0-0 libcairo2 libcups2 iptables-persistent debian-keyring debian-archive-keyring apt-transport-https
apt-get install -y libasound2t64 || apt-get install -y libasound2

# 2. Some breathing room for builds.
if ! swapon --show | grep -q /swapfile; then
  fallocate -l 4G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

# 3. Node.js 22.
if ! command -v node >/dev/null || [ "$(node -p 'process.versions.node.split(".")[0]')" -lt 20 ]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi

# 4. Ollama (the free story writer) and its model.
if ! command -v ollama >/dev/null; then curl -fsSL https://ollama.com/install.sh | sh; fi
systemctl enable --now ollama
for i in $(seq 1 30); do curl -fs http://127.0.0.1:11434/api/tags >/dev/null && break; sleep 2; done
MEM_GB=$(awk '/MemTotal/ {print int($2/1048576)}' /proc/meminfo)
MODEL="qwen2.5:7b"
[ "$MEM_GB" -lt 12 ] && MODEL="qwen2.5:3b"
ollama pull "$MODEL"

# 5. The app, run by its own user.
id reelhouse >/dev/null 2>&1 || useradd --system --create-home --home-dir /opt/reelhouse --shell /bin/bash reelhouse
if [ ! -d "$APP/.git" ]; then
  sudo -u reelhouse git clone "$REPO" "$APP"
fi
cd "$APP"
sudo -u reelhouse git fetch origin
if sudo -u reelhouse git cat-file -e "origin/$BRANCH:package.json" 2>/dev/null; then USE="$BRANCH"; else USE="$FALLBACK_BRANCH"; fi
sudo -u reelhouse git checkout -B "$USE" "origin/$USE"
echo "$USE" > /opt/reelhouse/branch

cat > "$APP/.env.local" <<ENV
REELHOUSE_PASSWORD=$REELHOUSE_PASSWORD
REELHOUSE_USER=$REELHOUSE_USER
OLLAMA_MODEL=$MODEL
ENV
chown reelhouse:reelhouse "$APP/.env.local"
chmod 600 "$APP/.env.local"

sudo -u reelhouse npm ci --no-audit --no-fund
sudo -u reelhouse node scripts/setup-voice.mjs || echo "!! Voice setup failed; videos will have music but no narration."
sudo -u reelhouse npx remotion browser ensure || echo "!! Couldn't pre-download the render browser; it will download on the first video."
sudo -u reelhouse npm run build

cat > /etc/systemd/system/reelhouse.service <<UNIT
[Unit]
Description=Reelhouse story studio
After=network-online.target ollama.service
Wants=network-online.target

[Service]
User=reelhouse
WorkingDirectory=$APP
Environment=NODE_ENV=production
Environment=OLLAMA_MODEL=$MODEL
ExecStart=/usr/bin/npm start -- -p 3000 -H 127.0.0.1
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
UNIT

# 6. Nightly update: picks up new versions of Reelhouse from GitHub at 4 AM server time.
cat > /opt/reelhouse/update.sh <<'UPD'
#!/bin/bash
set -euo pipefail
cd /opt/reelhouse/app
BR=$(cat /opt/reelhouse/branch)
sudo -u reelhouse git fetch origin
if sudo -u reelhouse git cat-file -e origin/main:package.json 2>/dev/null && [ "$BR" != main ]; then BR=main; echo main > /opt/reelhouse/branch; fi
if [ "$(sudo -u reelhouse git rev-parse HEAD)" != "$(sudo -u reelhouse git rev-parse origin/$BR)" ]; then
  sudo -u reelhouse git checkout -B "$BR" "origin/$BR"
  sudo -u reelhouse npm ci --no-audit --no-fund
  sudo -u reelhouse npm run build
  systemctl restart reelhouse
  echo "Updated to $(sudo -u reelhouse git rev-parse --short HEAD)"
fi
UPD
chmod +x /opt/reelhouse/update.sh
cat > /etc/systemd/system/reelhouse-update.service <<'UNIT'
[Unit]
Description=Update Reelhouse from GitHub
[Service]
Type=oneshot
ExecStart=/opt/reelhouse/update.sh
UNIT
cat > /etc/systemd/system/reelhouse-update.timer <<'UNIT'
[Unit]
Description=Nightly Reelhouse update
[Timer]
OnCalendar=*-*-* 04:00:00
Persistent=true
[Install]
WantedBy=timers.target
UNIT

systemctl daemon-reload
systemctl enable --now reelhouse reelhouse-update.timer

# 7. A secure web address: Caddy gets a free HTTPS certificate for <your-ip>.sslip.io.
if ! command -v caddy >/dev/null; then
  curl -1sLf https://dl.cloudsmith.io/public/caddy/stable/gpg.key | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt > /etc/apt/sources.list.d/caddy-stable.list
  apt-get update
  apt-get install -y caddy
fi
IP=$(curl -fs https://api.ipify.org || curl -fs https://ifconfig.me)
HOST="$(echo "$IP" | tr . -).sslip.io"
cat > /etc/caddy/Caddyfile <<CADDY
$HOST {
  encode gzip
  reverse_proxy 127.0.0.1:3000
}
CADDY
systemctl restart caddy

# Oracle's Ubuntu images block web traffic in the server's own firewall; open 80 and 443.
iptables -C INPUT -p tcp -m multiport --dports 80,443 -j ACCEPT 2>/dev/null || iptables -I INPUT 1 -p tcp -m multiport --dports 80,443 -j ACCEPT
netfilter-persistent save

echo "https://$HOST" > /opt/reelhouse/ADDRESS.txt
echo "=== Reelhouse is ready at https://$HOST (user: $REELHOUSE_USER) $(date) ==="
