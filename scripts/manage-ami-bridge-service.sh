
#!/bin/bash

# FreePBX AMI Bridge - Service Management Script

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${GREEN}$1${NC}"
}

error() {
    echo -e "${RED}$1${NC}" >&2
}

warning() {
    echo -e "${YELLOW}$1${NC}"
}

info() {
    echo -e "${BLUE}$1${NC}"
}

show_usage() {
    echo "AMI Bridge Service Management"
    echo "============================"
    echo ""
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  status      - Show service status and basic info"
    echo "  start       - Start the AMI Bridge service"
    echo "  stop        - Stop the AMI Bridge service"
    echo "  restart     - Restart the AMI Bridge service"
    echo "  enable      - Enable auto-start on boot"
    echo "  disable     - Disable auto-start on boot"
    echo "  logs        - Show recent service logs"
    echo "  tail        - Follow service logs in real-time"
    echo "  test        - Test API connectivity"
    echo "  install     - Install/setup the systemd service"
    echo "  uninstall   - Remove the systemd service"
    echo ""
}

check_service_exists() {
    if ! systemctl list-unit-files | grep -q "ami-bridge.service"; then
        error "AMI Bridge service is not installed!"
        echo ""
        info "To install the service, run: $0 install"
        exit 1
    fi
}

show_status() {
    check_service_exists
    
    echo "=== AMI Bridge Service Status ==="
    echo ""
    
    # Service status
    if systemctl is-active --quiet ami-bridge.service; then
        log "✅ Service Status: RUNNING"
    else
        error "❌ Service Status: STOPPED"
    fi
    
    # Auto-start status
    if systemctl is-enabled --quiet ami-bridge.service; then
        log "✅ Auto-start: ENABLED (will start on boot)"
    else
        warning "⚠️  Auto-start: DISABLED (manual start required)"
    fi
    
    # Service details
    echo ""
    systemctl status ami-bridge.service --no-pager -l
    
    # Test API
    echo ""
    info "Testing API connectivity..."
    if curl -s "http://localhost:3001/api/ami/status" >/dev/null 2>&1; then
        log "✅ API responding on port 3001"
    else
        error "❌ API not responding on port 3001"
    fi
    
    # Port status
    echo ""
    info "Port status:"
    netstat -tlnp | grep -E ":(3001|8080)" || echo "No AMI Bridge ports found listening"
}

case "${1:-status}" in
    "status")
        show_status
        ;;
    "start")
        check_service_exists
        log "Starting AMI Bridge service..."
        sudo systemctl start ami-bridge.service
        sleep 2
        show_status
        ;;
    "stop")
        check_service_exists
        warning "Stopping AMI Bridge service..."
        sudo systemctl stop ami-bridge.service
        sleep 2
        show_status
        ;;
    "restart")
        check_service_exists
        info "Restarting AMI Bridge service..."
        sudo systemctl restart ami-bridge.service
        sleep 3
        show_status
        ;;
    "enable")
        check_service_exists
        log "Enabling auto-start on boot..."
        sudo systemctl enable ami-bridge.service
        log "✅ AMI Bridge will now start automatically on system boot"
        ;;
    "disable")
        check_service_exists
        warning "Disabling auto-start on boot..."
        sudo systemctl disable ami-bridge.service
        warning "⚠️  AMI Bridge will no longer start automatically on boot"
        echo "You can still start it manually with: sudo systemctl start ami-bridge"
        ;;
    "logs")
        check_service_exists
        echo "=== Recent AMI Bridge Logs ==="
        sudo journalctl -u ami-bridge --no-pager -n 50
        ;;
    "tail")
        check_service_exists
        echo "=== Following AMI Bridge Logs (Ctrl+C to exit) ==="
        sudo journalctl -u ami-bridge -f
        ;;
    "test")
        echo "=== Testing AMI Bridge Connectivity ==="
        echo ""
        info "Testing HTTP API (port 3001)..."
        if curl -s "http://localhost:3001/api/ami/status" | python -m json.tool 2>/dev/null; then
            log "✅ HTTP API test successful"
        else
            error "❌ HTTP API test failed"
        fi
        
        echo ""
        info "Testing WebSocket port (8080)..."
        if nc -z localhost 8080 2>/dev/null; then
            log "✅ WebSocket port accessible"
        else
            error "❌ WebSocket port not accessible"
        fi
        ;;
    "install")
        info "Installing AMI Bridge systemd service..."
        if [ "$EUID" -ne 0 ]; then
            error "Installation requires root privileges. Use: sudo $0 install"
            exit 1
        fi
        
        # Find and run the setup script
        SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
        if [ -f "$SCRIPT_DIR/setup-ami-bridge-service.sh" ]; then
            bash "$SCRIPT_DIR/setup-ami-bridge-service.sh"
        else
            error "Setup script not found: $SCRIPT_DIR/setup-ami-bridge-service.sh"
            exit 1
        fi
        ;;
    "uninstall")
        if [ "$EUID" -ne 0 ]; then
            error "Uninstall requires root privileges. Use: sudo $0 uninstall"
            exit 1
        fi
        
        warning "Removing AMI Bridge systemd service..."
        sudo systemctl stop ami-bridge.service 2>/dev/null || true
        sudo systemctl disable ami-bridge.service 2>/dev/null || true
        sudo rm -f /etc/systemd/system/ami-bridge.service
        sudo systemctl daemon-reload
        warning "✅ AMI Bridge service removed"
        ;;
    "help"|"-h"|"--help")
        show_usage
        ;;
    *)
        error "Unknown command: $1"
        echo ""
        show_usage
        exit 1
        ;;
esac
