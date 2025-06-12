
#!/bin/bash

# FreePBX CentOS 7 AMI Bridge - Utility Functions

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
