
#!/bin/bash

# FreePBX CentOS 7 AMI Bridge Installer
# Complete installation script for the AMI bridge server

set -e

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

info() {
    echo -e "${BLUE}[INFO] $1${NC}"
}

# Check if running as root
check_root() {
    if [ "$EUID" -ne 0 ]; then
        error "This script must be run as root. Use: sudo $0"
        exit 1
    fi
}

# Create service user
create_service_user() {
    local service_user="$1"
    local ami_bridge_dir="$2"
    
    log "Creating service user..."
    
    if ! id "$service_user" &>/dev/null; then
        useradd -r -s /bin/false -d "$ami_bridge_dir" "$service_user"
        log "Created user: $service_user"
    else
        warning "User $service_user already exists"
    fi
}

# Install Node.js 16 (Compatible with CentOS 7)
install_nodejs() {
    log "Installing Node.js 16 LTS (CentOS 7 compatible)..."
    
    # Remove existing Node.js
    yum remove -y nodejs npm 2>/dev/null || true
    
    # Clean up any existing NodeSource repos
    rm -f /etc/yum.repos.d/nodesource*.repo
    
    # Install Node.js 16 from NodeSource (compatible with CentOS 7)
    curl -fsSL https://rpm.nodesource.com/setup_16.x | bash -
    yum install -y nodejs
    
    # Verify installation
    NODE_VERSION=$(node --version)
    NPM_VERSION=$(npm --version)
    log "Node.js installed: $NODE_VERSION"
    log "NPM installed: $NPM_VERSION"
    
    # Verify compatibility
    if [[ "$NODE_VERSION" < "v16" ]]; then
        error "Node.js version is too old. Expected v16+, got $NODE_VERSION"
        exit 1
    fi
}

# Create application directory and files
create_application() {
    local ami_bridge_dir="$1"
    local service_user="$2"
    local ami_user="$3"
    local ami_password="$4"
    
    log "Creating AMI Bridge application..."
    
    # Create directory
    mkdir -p "$ami_bridge_dir"
    cd "$ami_bridge_dir"
    
    # Create package.json with Node 16 compatible dependencies
    cat > package.json << 'EOF'
{
  "name": "freepbx-ami-bridge",
  "version": "1.0.0",
  "description": "AMI Bridge for FreePBX CRM integration",
  "main": "ami-bridge.js",
  "scripts": {
    "start": "node ami-bridge.js",
    "dev": "nodemon ami-bridge.js"
  },
  "engines": {
    "node": ">=16.0.0"
  },
  "dependencies": {
    "express": "^4.18.2",
    "ws": "^8.13.0",
    "cors": "^2.8.5"
  },
  "devDependencies": {
    "nodemon": "^2.0.22"
  }
}
EOF

    # Install dependencies
    log "Installing Node.js dependencies..."
    npm install --production

    # ... keep existing code (ami-bridge.js creation and configuration files)
    
    # Set permissions
    chown -R "$service_user:$service_user" "$ami_bridge_dir"
    chmod 755 "$ami_bridge_dir"
    chmod 600 "$ami_bridge_dir/config.json"
    chmod 644 "$ami_bridge_dir/config.example.json"
    
    log "AMI Bridge application created"
}

# Configure FreePBX AMI
configure_freepbx_ami() {
    local ami_user="$1"
    local ami_password="$2"
    
    log "Configuring FreePBX AMI..."
    
    # Backup original manager.conf
    cp /etc/asterisk/manager.conf /etc/asterisk/manager.conf.backup.$(date +%Y%m%d_%H%M%S) 2>/dev/null || true
    
    # Check if AMI user already exists
    if ! grep -q "\[$ami_user\]" /etc/asterisk/manager.conf; then
        cat >> /etc/asterisk/manager.conf << EOF

[$ami_user]
secret = $ami_password
permit = 127.0.0.1/255.255.255.255
read = system,call,log,verbose,command,agent,user,config,dtmf,reporting,cdr,dialplan
write = system,call,log,verbose,command,agent,user,config,dtmf,reporting,cdr,dialplan
EOF
        log "Added AMI user: $ami_user"
    else
        warning "AMI user $ami_user already exists in manager.conf"
    fi
    
    # Ensure AMI is enabled
    sed -i 's/enabled = no/enabled = yes/' /etc/asterisk/manager.conf
    sed -i 's/^;enabled = yes/enabled = yes/' /etc/asterisk/manager.conf
    
    # Reload Asterisk manager
    asterisk -rx "manager reload" 2>/dev/null || true
    
    log "FreePBX AMI configured"
}

# Create systemd service
create_systemd_service() {
    local service_user="$1"
    local ami_bridge_dir="$2"
    
    log "Creating systemd service..."
    
    cat > /etc/systemd/system/ami-bridge.service << EOF
[Unit]
Description=FreePBX AMI Bridge
After=network.target asterisk.service
Wants=asterisk.service

[Service]
Type=simple
User=$service_user
WorkingDirectory=$ami_bridge_dir
ExecStart=/usr/bin/node ami-bridge.js
Restart=always
RestartSec=5
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

    # Reload systemd and enable service
    systemctl daemon-reload
    systemctl enable ami-bridge
    
    log "Systemd service created"
}

# Configure firewall
configure_firewall() {
    log "Configuring firewall..."
    
    # Check if firewalld is running
    if systemctl is-active --quiet firewalld; then
        firewall-cmd --permanent --add-port=3001/tcp
        firewall-cmd --permanent --add-port=8080/tcp
        firewall-cmd --reload
        log "Firewalld rules added"
    # Check if iptables is available
    elif command -v iptables >/dev/null; then
        iptables -A INPUT -p tcp --dport 3001 -j ACCEPT
        iptables -A INPUT -p tcp --dport 8080 -j ACCEPT
        service iptables save 2>/dev/null || true
        log "Iptables rules added"
    else
        warning "No firewall detected. Please manually open ports 3001 and 8080"
    fi
}

# Start services
start_services() {
    log "Starting AMI Bridge service..."
    
    systemctl start ami-bridge
    sleep 3
    
    if systemctl is-active --quiet ami-bridge; then
        log "AMI Bridge service started successfully"
    else
        error "Failed to start AMI Bridge service"
        systemctl status ami-bridge
        exit 1
    fi
}

# Create management script
create_management_script() {
    cat > /usr/local/bin/ami-bridge-status << 'EOF'
#!/bin/bash
echo "FreePBX AMI Bridge Status"
echo "========================"
echo "Service Status: $(systemctl is-active ami-bridge)"
echo "Service Enabled: $(systemctl is-enabled ami-bridge)"
echo ""
echo "Network Ports:"
netstat -tlnp | grep -E ':(3001|8080)' || echo "No listening ports found"
echo ""
echo "Service Logs (last 10 lines):"
journalctl -u ami-bridge --no-pager -n 10
EOF

    chmod +x /usr/local/bin/ami-bridge-status
    
    cat > /usr/local/bin/ami-bridge-restart << 'EOF'
#!/bin/bash
echo "Restarting AMI Bridge service..."
systemctl restart ami-bridge
sleep 2
systemctl status ami-bridge
EOF

    chmod +x /usr/local/bin/ami-bridge-restart
}

# Configuration
AMI_BRIDGE_DIR="/opt/ami-bridge"
SERVICE_USER="amibridge"
AMI_USER="crm-user"
AMI_PASSWORD="$(openssl rand -base64 32)"

# Check if running as root
check_root

log "Starting FreePBX AMI Bridge installation for CentOS 7"

# Main installation function
main() {
    log "Starting installation..."
    
    install_nodejs
    create_service_user "$SERVICE_USER" "$AMI_BRIDGE_DIR"
    create_application "$AMI_BRIDGE_DIR" "$SERVICE_USER" "$AMI_USER" "$AMI_PASSWORD"
    configure_freepbx_ami "$AMI_USER" "$AMI_PASSWORD"
    create_systemd_service "$SERVICE_USER" "$AMI_BRIDGE_DIR"
    configure_firewall
    start_services
    create_management_script
    
    log "Installation completed successfully!"
    echo ""
    echo "================================================================"
    echo "FreePBX AMI Bridge Installation Complete!"
    echo "================================================================"
    echo ""
    echo "Service Information:"
    echo "  Installation Directory: $AMI_BRIDGE_DIR"
    echo "  Service User: $SERVICE_USER"
    echo "  API Port: 3001"
    echo "  WebSocket Port: 8080"
    echo ""
    echo "AMI Configuration:"
    echo "  AMI User: $AMI_USER"
    echo "  AMI Password: $AMI_PASSWORD"
    echo ""
    echo "Management Commands:"
    echo "  Check Status: ami-bridge-status"
    echo "  Restart Service: ami-bridge-restart"
    echo "  View Logs: journalctl -u ami-bridge -f"
    echo ""
    echo "API Endpoints:"
    echo "  http://localhost:3001/api/ami/status"
    echo "  http://localhost:3001/api/ami/connect"
    echo "  http://localhost:3001/api/ami/originate"
    echo ""
    echo "WebSocket: ws://localhost:8080"
    echo "================================================================"
    echo ""
    echo "IMPORTANT: Save the AMI password shown above!"
    echo "You'll need it to configure your CRM frontend."
    echo ""
    echo "Next steps:"
    echo "1. Test the service: ami-bridge-status"
    echo "2. Check API: curl http://localhost:3001/api/ami/status"
    echo "3. Configure your frontend to use this bridge"
}

# Run installation
main "$@"
