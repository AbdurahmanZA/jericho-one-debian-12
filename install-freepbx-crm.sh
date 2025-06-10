
#!/bin/bash

# FreePBX CRM Integration - Main Installation Script for Debian 12
# This script orchestrates the complete CRM system installation

set -e

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCRIPTS_DIR="$SCRIPT_DIR/scripts"

# Source utilities and configuration
source "$SCRIPTS_DIR/utils.sh"

# Main installation function
main() {
    log "Starting FreePBX CRM Integration installation on Debian 12"
    
    # Initialize
    check_root
    get_system_info
    set_config_vars
    
    log "Hostname: $HOSTNAME"
    log "IP Address: $IP_ADDRESS"
    
    # Execute installation steps
    source "$SCRIPTS_DIR/check-system.sh"
    check_dependencies
    check_system_requirements
    
    source "$SCRIPTS_DIR/install-packages.sh"
    install_packages
    
    source "$SCRIPTS_DIR/setup-database.sh"
    setup_database
    
    source "$SCRIPTS_DIR/configure-webserver.sh"
    configure_webserver
    
    source "$SCRIPTS_DIR/configure-asterisk.sh"
    configure_asterisk
    
    source "$SCRIPTS_DIR/setup-crm.sh"
    setup_crm_application
    
    source "$SCRIPTS_DIR/configure-security.sh"
    configure_security
    restart_services
    create_status_script
    create_installation_summary
    
    # Final status
    display_completion_message
}

display_completion_message() {
    log "Installation completed successfully!"
    echo ""
    echo "================================================================"
    echo "FreePBX CRM Integration - Installation Complete"
    echo "================================================================"
    echo ""
    echo "System Information:"
    echo "  Hostname: $HOSTNAME"
    echo "  IP Address: $IP_ADDRESS"
    echo "  Web Interface: http://$IP_ADDRESS/crm/"
    echo ""
    echo "Default Credentials:"
    echo "  Username: admin"
    echo "  Password: admin123"
    echo ""
    echo "Installed Components:"
    echo "  ✓ Apache Web Server"
    echo "  ✓ MySQL Database Server"
    echo "  ✓ PHP $(php -v | head -n1 | cut -d' ' -f2)"
    echo "  ✓ Asterisk PBX"
    echo "  ✓ FreePBX CRM Application"
    echo "  ✓ Security (UFW + Fail2ban)"
    echo ""
    echo "Important Security Notes:"
    echo "  - Change ALL default passwords immediately"
    echo "  - Configure SSL certificate for production use"
    echo "  - Review firewall rules for your environment"
    echo "  - Configure regular database backups"
    echo ""
    echo "Status Check Command: freepbx-crm-status"
    echo "Installation Details: $CRM_PATH/INSTALLATION_INFO.txt"
    echo "================================================================"
}

# Run main installation
main "$@"
