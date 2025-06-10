
#!/bin/bash

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
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
    if [[ $EUID -ne 0 ]]; then
       error "This script must be run as root (use sudo)"
       exit 1
    fi
}

# Get system information
get_system_info() {
    export HOSTNAME=$(hostname -f)
    export IP_ADDRESS=$(hostname -I | awk '{print $1}')
}

# Configuration variables
set_config_vars() {
    export MYSQL_ROOT_PASSWORD="FreePBX2024!"
    export CRM_DB_NAME="freepbx_crm"
    export CRM_DB_USER="crm_user"
    export CRM_DB_PASSWORD="CRM_Pass2024!"
    export ASTERISK_USER="asterisk"
    export WEB_ROOT="/var/www/html"
    export CRM_PATH="$WEB_ROOT/crm"
}
