
#!/bin/bash

# Jericho CRM Deployment Script for /jericho folder
# This script deploys the built React application to /var/www/html/jericho

set -e

# Configuration
BUILD_DIR="dist"
DEPLOY_DIR="/var/www/html/jericho"
BACKUP_DIR="/var/backups/jericho-$(date +%Y%m%d-%H%M%S)"
WEB_USER="www-data"
WEB_GROUP="www-data"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[DEPLOY]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        error "This script must be run as root (use sudo)"
        exit 1
    fi
}

# Validate build directory exists
validate_build() {
    if [[ ! -d "$BUILD_DIR" ]]; then
        error "Build directory '$BUILD_DIR' not found. Run 'npm run build' first."
        exit 1
    fi
    
    if [[ ! -f "$BUILD_DIR/index.html" ]]; then
        error "index.html not found in build directory. Build may have failed."
        exit 1
    fi
    
    log "Build directory validated: $BUILD_DIR"
}

# Create backup of existing deployment
create_backup() {
    if [[ -d "$DEPLOY_DIR" ]]; then
        log "Creating backup of existing deployment..."
        mkdir -p "$(dirname "$BACKUP_DIR")"
        cp -r "$DEPLOY_DIR" "$BACKUP_DIR"
        log "Backup created: $BACKUP_DIR"
    fi
}

# Deploy application
deploy_application() {
    log "Deploying Jericho CRM to $DEPLOY_DIR..."
    
    # Create deployment directory
    mkdir -p "$DEPLOY_DIR"
    
    # Copy built files
    cp -r "$BUILD_DIR"/* "$DEPLOY_DIR/"
    
    # Create .htaccess for React Router
    cat > "$DEPLOY_DIR/.htaccess" << 'EOF'
# Jericho CRM - React Router Configuration
RewriteEngine On

# Handle client-side routing
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /jericho/index.html [L]

# Security headers
Header always set X-Content-Type-Options nosniff
Header always set X-Frame-Options SAMEORIGIN
Header always set X-XSS-Protection "1; mode=block"

# Cache static assets
<FilesMatch "\.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf)$">
    ExpiresActive On
    ExpiresDefault "access plus 1 month"
    Header append Cache-Control "public, immutable"
</FilesMatch>

# Prevent access to source maps in production
<FilesMatch "\.map$">
    Require all denied
</FilesMatch>
EOF
    
    # Set proper permissions
    chown -R "$WEB_USER:$WEB_GROUP" "$DEPLOY_DIR"
    chmod -R 755 "$DEPLOY_DIR"
    chmod 644 "$DEPLOY_DIR/.htaccess"
    
    log "Application deployed successfully"
}

# Update base path in index.html for /jericho deployment
update_base_path() {
    log "Updating base path for /jericho deployment..."
    
    # Update any absolute paths to relative paths for /jericho
    sed -i 's|href="/|href="/jericho/|g' "$DEPLOY_DIR/index.html"
    sed -i 's|src="/|src="/jericho/|g' "$DEPLOY_DIR/index.html"
    
    # Add base tag if not present
    if ! grep -q '<base' "$DEPLOY_DIR/index.html"; then
        sed -i 's|<head>|<head>\n    <base href="/jericho/">|' "$DEPLOY_DIR/index.html"
    fi
    
    log "Base path updated for /jericho deployment"
}

# Create deployment info file
create_deployment_info() {
    cat > "$DEPLOY_DIR/DEPLOYMENT_INFO.txt" << EOF
Jericho CRM Deployment Information
=================================

Deployment Date: $(date)
Deployed By: $(whoami)
Deployment Path: $DEPLOY_DIR
Build Source: $BUILD_DIR
Backup Location: $BACKUP_DIR

FreePBX Integration:
- AMI Host: 127.0.0.1:5038
- Direct AMI Connection (no bridge)
- Deployment: /jericho subfolder

Access URLs:
- Application: http://$(hostname -I | awk '{print $1}')/jericho/
- Health Check: http://$(hostname -I | awk '{print $1}')/jericho/

Files Deployed:
$(find "$DEPLOY_DIR" -type f | wc -l) files
$(du -sh "$DEPLOY_DIR" | cut -f1) total size

Permissions:
Owner: $WEB_USER:$WEB_GROUP
Permissions: 755 (directories), 644 (files)
EOF
    
    log "Deployment info created: $DEPLOY_DIR/DEPLOYMENT_INFO.txt"
}

# Validate deployment
validate_deployment() {
    log "Validating deployment..."
    
    # Check required files
    local required_files=("index.html" ".htaccess" "DEPLOYMENT_INFO.txt")
    for file in "${required_files[@]}"; do
        if [[ ! -f "$DEPLOY_DIR/$file" ]]; then
            error "Required file missing: $file"
            return 1
        fi
    done
    
    # Check permissions
    local actual_owner=$(stat -c "%U:%G" "$DEPLOY_DIR")
    if [[ "$actual_owner" != "$WEB_USER:$WEB_GROUP" ]]; then
        warn "Unexpected owner: $actual_owner (expected: $WEB_USER:$WEB_GROUP)"
    fi
    
    log "Deployment validation completed"
}

# Restart web server
restart_webserver() {
    log "Restarting Apache web server..."
    systemctl reload apache2
    
    if systemctl is-active --quiet apache2; then
        log "Apache restarted successfully"
    else
        error "Apache failed to restart"
        return 1
    fi
}

# Display completion message
show_completion() {
    local server_ip=$(hostname -I | awk '{print $1}')
    
    echo ""
    echo "================================================================"
    echo "          Jericho CRM Deployment Complete"
    echo "================================================================"
    echo ""
    echo "🚀 Application URL: http://$server_ip/jericho/"
    echo "📁 Deployment Path: $DEPLOY_DIR"
    echo "💾 Backup Location: $BACKUP_DIR"
    echo ""
    echo "📋 Next Steps:"
    echo "1. Open http://$server_ip/jericho/ in your browser"
    echo "2. Configure FreePBX AMI credentials in Integration Settings"
    echo "3. Test call origination functionality"
    echo ""
    echo "📞 FreePBX Integration:"
    echo "- AMI Host: 127.0.0.1:5038"
    echo "- Configure manager.conf with jericho-ami user"
    echo "- Restart Asterisk after AMI configuration"
    echo ""
    echo "================================================================"
}

# Main deployment function
main() {
    log "Starting Jericho CRM deployment to /jericho folder"
    
    check_root
    validate_build
    create_backup
    deploy_application
    update_base_path
    create_deployment_info
    validate_deployment
    restart_webserver
    show_completion
    
    log "Deployment completed successfully!"
}

# Run deployment
main "$@"
