
#!/bin/bash

# FreePBX AMI Bridge - Systemd Service Setup Script

echo "=== Setting up AMI Bridge as systemd service ==="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}" >&2
}

warning() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    error "This script must be run as root. Use: sudo $0"
    exit 1
fi

# Find the server directory
SERVER_DIR=""
POSSIBLE_DIRS=(
    "/var/www/html/freepbx-crm/server"
    "/home/asterisk/freepbx-crm/server"
    "/opt/freepbx-crm/server"
    "/root/freepbx-crm/server"
    "/usr/local/freepbx-crm/server"
)

log "Searching for AMI Bridge server directory..."
for dir in "${POSSIBLE_DIRS[@]}"; do
    if [ -d "$dir" ] && [ -f "$dir/ami-bridge.js" ]; then
        SERVER_DIR="$dir"
        log "Found server directory: $SERVER_DIR"
        break
    fi
done

if [ -z "$SERVER_DIR" ]; then
    error "Could not find AMI Bridge server directory with ami-bridge.js"
    exit 1
fi

# Determine which user should run the service
SERVICE_USER="root"
if id "asterisk" &>/dev/null; then
    SERVICE_USER="asterisk"
    log "Using asterisk user for service"
elif id "apache" &>/dev/null; then
    SERVICE_USER="apache"
    log "Using apache user for service"
else
    log "Using root user for service"
fi

# Stop any existing AMI Bridge processes
log "Stopping existing AMI Bridge processes..."
pkill -f "node.*ami-bridge.js" || true
sleep 3

# Create systemd service file
log "Creating systemd service file..."
cat > /etc/systemd/system/ami-bridge.service << EOF
[Unit]
Description=FreePBX AMI Bridge Server
Documentation=https://github.com/your-repo/freepbx-crm
After=network.target network-online.target
Wants=network-online.target
StartLimitIntervalSec=0

[Service]
Type=simple
User=$SERVICE_USER
WorkingDirectory=$SERVER_DIR
ExecStart=/usr/bin/node ami-bridge.js
Restart=always
RestartSec=5
Environment=NODE_ENV=production

# Logging
StandardOutput=journal
StandardError=journal
SyslogIdentifier=ami-bridge

# Security settings
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=$SERVER_DIR

[Install]
WantedBy=multi-user.target
EOF

# Set proper ownership for the server directory
log "Setting proper ownership for server directory..."
chown -R $SERVICE_USER:$SERVICE_USER "$SERVER_DIR"

# Reload systemd and enable the service
log "Enabling AMI Bridge service..."
systemctl daemon-reload
systemctl enable ami-bridge.service

# Start the service
log "Starting AMI Bridge service..."
systemctl start ami-bridge.service

# Wait a moment for startup
sleep 5

# Check service status
if systemctl is-active --quiet ami-bridge.service; then
    log "✅ AMI Bridge service started successfully!"
    
    # Show service status
    systemctl status ami-bridge.service --no-pager -l
    
    echo ""
    log "Service Management Commands:"
    echo "  Start:    sudo systemctl start ami-bridge"
    echo "  Stop:     sudo systemctl stop ami-bridge"
    echo "  Restart:  sudo systemctl restart ami-bridge"
    echo "  Status:   sudo systemctl status ami-bridge"
    echo "  Logs:     sudo journalctl -u ami-bridge -f"
    echo ""
    log "Auto-start Management:"
    echo "  Enable auto-start:  sudo systemctl enable ami-bridge"
    echo "  Disable auto-start: sudo systemctl disable ami-bridge"
    echo ""
    log "Service will now automatically start on system reboot"
    
else
    error "❌ Failed to start AMI Bridge service!"
    echo ""
    echo "Service status:"
    systemctl status ami-bridge.service --no-pager -l
    echo ""
    echo "Recent logs:"
    journalctl -u ami-bridge --no-pager -n 20
    exit 1
fi

# Test the API
echo ""
log "Testing AMI Bridge API..."
sleep 2
if curl -s "http://localhost:3001/api/ami/status" >/dev/null 2>&1; then
    log "✅ AMI Bridge API is responding"
else
    warning "⚠️  AMI Bridge API test failed - check service logs"
fi

log "AMI Bridge service setup completed!"
