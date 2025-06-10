
#!/bin/bash

source "$(dirname "$0")/utils.sh"

install_mysql() {
    log "Installing MySQL Server..."
    
    # Try to install MySQL from official repository
    if ! command -v mysql &> /dev/null; then
        log "Adding MySQL official repository..."
        
        # Download and install MySQL APT repository package
        cd /tmp
        wget https://dev.mysql.com/get/mysql-apt-config_0.8.29-1_all.deb
        
        # Install the repository package (this will add MySQL repos)
        DEBIAN_FRONTEND=noninteractive dpkg -i mysql-apt-config_0.8.29-1_all.deb || true
        apt-get update
        
        # Try to install MySQL
        if apt-get install -y mysql-server mysql-client; then
            log "MySQL installed successfully from official repository"
        else
            warning "MySQL installation failed, falling back to MariaDB..."
            install_mariadb
        fi
        
        # Clean up
        rm -f mysql-apt-config_0.8.29-1_all.deb
    else
        log "MySQL is already installed"
    fi
}

install_mariadb() {
    log "Installing MariaDB as MySQL alternative..."
    apt-get install -y mariadb-server mariadb-client
    
    # Create mysql symlinks for compatibility
    if [ ! -f /usr/bin/mysql ] && [ -f /usr/bin/mariadb ]; then
        ln -sf /usr/bin/mariadb /usr/bin/mysql
    fi
    
    if [ ! -f /usr/bin/mysqladmin ] && [ -f /usr/bin/mariadb-admin ]; then
        ln -sf /usr/bin/mariadb-admin /usr/bin/mysqladmin
    fi
    
    log "MariaDB installed successfully"
}

install_packages() {
    log "Updating system packages..."
    apt-get update && apt-get upgrade -y

    log "Installing main application dependencies..."

    # Web server dependencies
    WEB_DEPS=(
        "apache2"
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
        "wget"
        "curl"
        "gnupg2"
        "apt-transport-https"
        "ca-certificates"
        "software-properties-common"
    )

    # Install all dependencies in groups
    log "Installing web server dependencies..."
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

    # Install MySQL/MariaDB separately with proper handling
    install_mysql

    log "Package installation completed"
}
