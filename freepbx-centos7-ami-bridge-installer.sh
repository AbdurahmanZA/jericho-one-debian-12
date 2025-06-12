
#!/bin/bash

# FreePBX CentOS 7 AMI Bridge Installer
# Refactored modular installation script for the AMI bridge server

set -e

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Source utility functions
source "$SCRIPT_DIR/scripts/bridge-utils.sh"
source "$SCRIPT_DIR/scripts/bridge-nodejs-setup.sh"
source "$SCRIPT_DIR/scripts/bridge-app-setup.sh"
source "$SCRIPT_DIR/scripts/bridge-freepbx-config.sh"
source "$SCRIPT_DIR/scripts/bridge-service-setup.sh"

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
