
#!/bin/bash

# FreePBX CentOS 7 AMI Bridge - Node.js Installation

source "$(dirname "$0")/bridge-utils.sh"

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
