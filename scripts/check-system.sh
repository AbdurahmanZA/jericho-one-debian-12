
#!/bin/bash

source "$(dirname "$0")/utils.sh"

check_system_requirements() {
    log "Checking system requirements..."

    # Check available memory (minimum 2GB)
    TOTAL_MEM=$(free -m | awk 'NR==2{printf "%.0f", $2}')
    if [ "$TOTAL_MEM" -lt 2048 ]; then
        warning "System has less than 2GB RAM ($TOTAL_MEM MB). Performance may be affected."
    fi

    # Check available disk space (minimum 20GB)
    AVAILABLE_SPACE=$(df / | awk 'NR==2 {printf "%.0f", $4/1024/1024}')
    if [ "$AVAILABLE_SPACE" -lt 20 ]; then
        warning "Less than 20GB disk space available (${AVAILABLE_SPACE}GB). Installation may fail."
    fi

    # Check Debian version
    if ! grep -q "bookworm\|12" /etc/os-release; then
        warning "This script is designed for Debian 12 (Bookworm). Current system may not be compatible."
    fi

    log "System requirements check completed"
    log "Available RAM: ${TOTAL_MEM}MB"
    log "Available Disk: ${AVAILABLE_SPACE}GB"
}

check_dependencies() {
    log "Checking pre-installation dependencies..."

    REQUIRED_DEPS=("curl" "wget" "gnupg2" "apt-transport-https" "ca-certificates")
    MISSING_DEPS=()

    for dep in "${REQUIRED_DEPS[@]}"; do
        if ! command -v "$dep" &> /dev/null && ! dpkg -l | grep -q "^ii  $dep "; then
            MISSING_DEPS+=("$dep")
        fi
    done

    if [ ${#MISSING_DEPS[@]} -ne 0 ]; then
        warning "Missing required dependencies: ${MISSING_DEPS[*]}"
        log "Installing missing dependencies..."
        apt-get update
        apt-get install -y "${MISSING_DEPS[@]}"
    fi

    log "Dependencies check completed"
}
