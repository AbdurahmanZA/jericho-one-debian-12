
#!/bin/bash

# FreePBX CRM Integration - Jericho Installation Script for Debian 12
# Deploys to /jericho folder with direct AMI integration

set -e

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCRIPTS_DIR="$SCRIPT_DIR/scripts"

# Source utilities and configuration
source "$SCRIPTS_DIR/utils.sh"

# Override configuration for Jericho deployment
override_config_for_jericho() {
    # Set Jericho-specific paths
    export WEB_ROOT="/var/www/html"
    export CRM_PATH="/var/www/html/jericho"
    export CRM_DATA_PATH="/var/lib/jericho"
    export CRM_LOG_PATH="/var/log/jericho"
    export JERICHO_CONFIG_PATH="/etc/jericho"
    
    # FreePBX integration settings for localhost
    export FREEPBX_HOST="127.0.0.1"
    export FREEPBX_AMI_PORT="5038"
    export FREEPBX_AMI_USER="jericho-ami"
    export FREEPBX_AMI_SECRET="jericho123!"
    
    # Database settings for Jericho
    export DB_NAME="jericho_crm"
    export DB_USER="jericho_user"
    export DB_PASS="jericho_db_pass_$(date +%s)"
    
    log "Jericho deployment configuration:"
    log "  CRM Path: $CRM_PATH"
    log "  Data Path: $CRM_DATA_PATH"
    log "  Config Path: $JERICHO_CONFIG_PATH"
    log "  FreePBX Host: $FREEPBX_HOST"
    log "  AMI Port: $FREEPBX_AMI_PORT"
}

# Create Jericho directory structure
create_jericho_structure() {
    log "Creating Jericho directory structure..."
    
    # Create main directories
    mkdir -p "$CRM_PATH"
    mkdir -p "$CRM_DATA_PATH"
    mkdir -p "$CRM_LOG_PATH"
    mkdir -p "$JERICHO_CONFIG_PATH"
    mkdir -p "$CRM_PATH/assets"
    mkdir -p "$CRM_PATH/api"
    mkdir -p "$CRM_DATA_PATH/uploads"
    mkdir -p "$CRM_DATA_PATH/backups"
    
    # Set permissions
    chown -R www-data:www-data "$CRM_PATH"
    chown -R www-data:www-data "$CRM_DATA_PATH"
    chown -R www-data:www-data "$CRM_LOG_PATH"
    chmod -R 755 "$CRM_PATH"
    chmod -R 750 "$CRM_DATA_PATH"
    chmod -R 755 "$CRM_LOG_PATH"
    
    log "Jericho directory structure created successfully"
}

# Configure AMI user for Jericho
configure_freepbx_ami() {
    log "Configuring FreePBX AMI for Jericho..."
    
    # Create AMI user configuration
    cat > "$JERICHO_CONFIG_PATH/ami.conf" << EOF
# Jericho CRM AMI Configuration
[jericho-ami]
secret = $FREEPBX_AMI_SECRET
read = system,call,log,verbose,agent,user,config,dtmf,reporting,cdr,dialplan
write = system,call,agent,user,config,command,reporting,originate
deny = 0.0.0.0/0.0.0.0
permit = 127.0.0.1/255.255.255.255
permit = 192.168.0.0/255.255.0.0
permit = 10.0.0.0/255.0.0.0
permit = 172.16.0.0/255.240.0.0
writetimeout = 5000
EOF

    # Instructions for FreePBX AMI setup
    log "AMI configuration created. Manual FreePBX setup required:"
    log "1. Add the following to /etc/asterisk/manager.conf:"
    cat "$JERICHO_CONFIG_PATH/ami.conf"
    log "2. Restart Asterisk: sudo systemctl restart asterisk"
    log "3. Verify AMI connection: sudo asterisk -rx 'manager show connected'"
}

# Main installation function
main() {
    log "Starting Jericho CRM installation for Debian 12 with FreePBX integration"
    
    # Initialize with Jericho-specific configuration
    check_root
    get_system_info
    override_config_for_jericho
    
    log "Hostname: $HOSTNAME"
    log "IP Address: $IP_ADDRESS"
    log "Deployment: Jericho CRM at $CRM_PATH"
    
    # Execute installation steps
    source "$SCRIPTS_DIR/check-system.sh"
    check_dependencies
    check_system_requirements
    
    source "$SCRIPTS_DIR/install-packages.sh"
    install_packages
    
    # Create Jericho structure before database setup
    create_jericho_structure
    
    source "$SCRIPTS_DIR/setup-database.sh"
    setup_database
    
    source "$SCRIPTS_DIR/configure-webserver.sh"
    configure_webserver
    
    # Configure FreePBX AMI integration
    configure_freepbx_ami
    
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
    log "Jericho CRM installation completed successfully!"
    echo ""
    echo "================================================================"
    echo "Jericho CRM - FreePBX Integration Complete"
    echo "================================================================"
    echo ""
    echo "System Information:"
    echo "  Hostname: $HOSTNAME"
    echo "  IP Address: $IP_ADDRESS"
    echo "  Jericho CRM: http://$IP_ADDRESS/jericho/"
    echo ""
    echo "Default Credentials:"
    echo "  Username: admin"
    echo "  Password: admin123"
    echo ""
    echo "FreePBX Integration:"
    echo "  AMI Host: $FREEPBX_HOST"
    echo "  AMI Port: $FREEPBX_AMI_PORT"
    echo "  AMI User: $FREEPBX_AMI_USER"
    echo "  AMI Secret: $FREEPBX_AMI_SECRET"
    echo ""
    echo "Installed Components:"
    echo "  ✓ Apache Web Server (Jericho at /jericho)"
    echo "  ✓ MySQL Database Server ($DB_NAME)"
    echo "  ✓ PHP $(php -v | head -n1 | cut -d' ' -f2)"
    echo "  ✓ Jericho CRM Application"
    echo "  ✓ Direct AMI Integration (no bridge required)"
    echo "  ✓ Security (UFW + Fail2ban)"
    echo ""
    echo "Manual FreePBX Setup Required:"
    echo "  1. Copy AMI config from: $JERICHO_CONFIG_PATH/ami.conf"
    echo "  2. Add to /etc/asterisk/manager.conf"
    echo "  3. Restart Asterisk service"
    echo ""
    echo "Important Security Notes:"
    echo "  - Change ALL default passwords immediately"
    echo "  - Configure SSL certificate for production use"
    echo "  - Review firewall rules for your environment"
    echo "  - Configure regular database backups"
    echo ""
    echo "Status Check Command: jericho-status"
    echo "Installation Details: $CRM_PATH/INSTALLATION_INFO.txt"
    echo "================================================================"
}

# Run main installation
main "$@"
