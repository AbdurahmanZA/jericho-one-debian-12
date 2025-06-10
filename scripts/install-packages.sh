
#!/bin/bash

source "$(dirname "$0")/utils.sh"

install_packages() {
    log "Updating system packages..."
    apt-get update && apt-get upgrade -y

    log "Installing main application dependencies..."

    # Web server and database dependencies
    WEB_DEPS=(
        "apache2"
        "mysql-server"
        "mysql-client"
    )

    # PHP and extensions
    PHP_DEPS=(
        "php"
        "php-mysql"
        "php-cli"
        "php-curl"
        "php-xml"
        "php-zip"
        "php-gd"
        "php-mbstring"
        "php-json"
        "php-intl"
        "libapache2-mod-php"
    )

    # Development and build tools
    BUILD_DEPS=(
        "build-essential"
        "git"
        "unzip"
        "zip"
        "nodejs"
        "npm"
    )

    # Asterisk and telephony
    ASTERISK_DEPS=(
        "asterisk"
        "asterisk-modules"
        "asterisk-config"
        "asterisk-core-sounds-en"
        "asterisk-core-sounds-en-wav"
    )

    # Security and monitoring
    SECURITY_DEPS=(
        "fail2ban"
        "ufw"
        "iptables"
        "rsyslog"
    )

    # SSL/TLS support
    SSL_DEPS=(
        "certbot"
        "python3-certbot-apache"
        "openssl"
    )

    # System utilities
    SYSTEM_DEPS=(
        "cron"
        "logrotate"
        "htop"
        "nano"
        "vim"
        "net-tools"
        "dnsutils"
    )

    # Install all dependencies in groups
    log "Installing web server and database dependencies..."
    apt-get install -y "${WEB_DEPS[@]}"

    log "Installing PHP and extensions..."
    apt-get install -y "${PHP_DEPS[@]}"

    log "Installing build and development tools..."
    apt-get install -y "${BUILD_DEPS[@]}"

    log "Installing Asterisk and telephony components..."
    apt-get install -y "${ASTERISK_DEPS[@]}"

    log "Installing security and monitoring tools..."
    apt-get install -y "${SECURITY_DEPS[@]}"

    log "Installing SSL/TLS support..."
    apt-get install -y "${SSL_DEPS[@]}"

    log "Installing system utilities..."
    apt-get install -y "${SYSTEM_DEPS[@]}"

    log "Package installation completed"
}
