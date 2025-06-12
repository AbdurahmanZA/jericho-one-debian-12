
#!/bin/bash

# FreePBX CentOS 7 AMI Bridge - Service and Security Setup

source "$(dirname "$0")/bridge-utils.sh"

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
