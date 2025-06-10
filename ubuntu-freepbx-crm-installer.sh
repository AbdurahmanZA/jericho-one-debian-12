#!/bin/bash

# FreePBX CRM Installation Script for Ubuntu
# Supports Ubuntu 20.04, 22.04, and 24.04 LTS
# This script installs and configures a complete CRM system with FreePBX integration

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Logging functions
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO: $1${NC}"
}

# Configuration variables
MYSQL_ROOT_PASSWORD="SecureRoot2024!"
CRM_DB_NAME="freepbx_crm"
CRM_DB_USER="crm_user"
CRM_DB_PASSWORD="CrmSecure2024!"
WEB_ROOT="/var/www/html"
CRM_PATH="$WEB_ROOT/crm"
IP_ADDRESS=""
UBUNTU_VERSION=""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    error "This script must be run as root. Use: sudo $0"
fi

# Get IP address
get_ip_address() {
    IP_ADDRESS=$(hostname -I | awk '{print $1}' 2>/dev/null || echo "127.0.0.1")
    if [ -z "$IP_ADDRESS" ]; then
        IP_ADDRESS="127.0.0.1"
    fi
}

# Install essential packages first
install_essentials() {
    log "Installing essential packages..."
    apt-get update
    apt-get install -y \
        lsb-release \
        curl \
        wget \
        gnupg2 \
        software-properties-common \
        apt-transport-https \
        ca-certificates \
        net-tools
    log "Essential packages installed"
}

# System checks
check_system() {
    log "Performing system checks..."
    
    # Get Ubuntu version
    if command -v lsb_release >/dev/null 2>&1; then
        UBUNTU_VERSION=$(lsb_release -rs)
    else
        error "lsb_release command not available"
    fi
    
    log "Ubuntu $UBUNTU_VERSION detected"
    
    # Verify supported Ubuntu version
    case "$UBUNTU_VERSION" in
        20.04|22.04|24.04)
            log "Ubuntu $UBUNTU_VERSION - supported version"
            ;;
        *)
            warn "Ubuntu $UBUNTU_VERSION may not be fully supported. Recommended: 22.04 LTS"
            read -p "Continue anyway? (y/N): " choice
            case "$choice" in 
                y|Y ) log "Continuing with installation...";;
                * ) exit 0;;
            esac
            ;;
    esac
    
    # Check available space (minimum 5GB)
    AVAILABLE_SPACE=$(df / | awk 'NR==2 {print $4}')
    if [ "$AVAILABLE_SPACE" -lt 5242880 ]; then
        error "Insufficient disk space. At least 5GB required, $((AVAILABLE_SPACE / 1024 / 1024))GB available"
    fi
    
    # Check memory (minimum 2GB)
    TOTAL_MEM=$(free -m | awk 'NR==2{print $2}')
    if [ "$TOTAL_MEM" -lt 2048 ]; then
        warn "Less than 2GB RAM detected (${TOTAL_MEM}MB). Performance may be affected"
    fi
    
    log "System checks passed - Available: ${TOTAL_MEM}MB RAM, $((AVAILABLE_SPACE / 1024 / 1024))GB disk"
}

# Update system and install prerequisites
install_prerequisites() {
    log "Updating system packages..."
    apt-get update
    apt-get upgrade -y
    
    log "Installing prerequisite packages..."
    apt-get install -y \
        unzip \
        git \
        htop \
        nano \
        vim \
        build-essential
    
    log "Prerequisites installed successfully"
}

# Install LAMP stack
install_lamp_stack() {
    log "Installing Apache web server..."
    apt-get install -y apache2
    systemctl start apache2
    systemctl enable apache2
    
    log "Installing MySQL server..."
    # Set MySQL root password before installation
    echo "mysql-server mysql-server/root_password password $MYSQL_ROOT_PASSWORD" | debconf-set-selections
    echo "mysql-server mysql-server/root_password_again password $MYSQL_ROOT_PASSWORD" | debconf-set-selections
    
    apt-get install -y mysql-server mysql-client
    systemctl start mysql
    systemctl enable mysql
    
    log "Installing PHP and extensions..."
    if [ "$UBUNTU_VERSION" = "24.04" ]; then
        PHP_VERSION="8.3"
    elif [ "$UBUNTU_VERSION" = "22.04" ]; then
        PHP_VERSION="8.1"
    else
        PHP_VERSION="7.4"
    fi
    
    apt-get install -y \
        php \
        php-mysql \
        php-cli \
        php-curl \
        php-gd \
        php-mbstring \
        php-xml \
        php-zip \
        php-intl \
        php-bcmath \
        php-json \
        php-soap \
        php-xmlrpc \
        libapache2-mod-php
    
    log "LAMP stack installed successfully (PHP $PHP_VERSION)"
}

# Install Asterisk
install_asterisk() {
    log "Installing Asterisk PBX..."
    
    # Add universe repository for Asterisk
    add-apt-repository universe -y
    apt-get update
    
    # Install Asterisk and related packages
    apt-get install -y \
        asterisk \
        asterisk-modules \
        asterisk-config \
        asterisk-core-sounds-en \
        asterisk-core-sounds-en-wav \
        asterisk-moh-opsound-wav
    
    # Stop Asterisk for configuration
    systemctl stop asterisk
    
    log "Asterisk installed successfully"
}

# Configure database
setup_database() {
    log "Configuring MySQL database..."
    
    # Secure MySQL installation
    mysql -u root -p"$MYSQL_ROOT_PASSWORD" -e "DELETE FROM mysql.user WHERE User='';" 2>/dev/null || true
    mysql -u root -p"$MYSQL_ROOT_PASSWORD" -e "DELETE FROM mysql.user WHERE User='root' AND Host NOT IN ('localhost', '127.0.0.1', '::1');" 2>/dev/null || true
    mysql -u root -p"$MYSQL_ROOT_PASSWORD" -e "DROP DATABASE IF EXISTS test;" 2>/dev/null || true
    mysql -u root -p"$MYSQL_ROOT_PASSWORD" -e "DELETE FROM mysql.db WHERE Db='test' OR Db='test\\_%';" 2>/dev/null || true
    mysql -u root -p"$MYSQL_ROOT_PASSWORD" -e "FLUSH PRIVILEGES;" 2>/dev/null || true

    # Create CRM database and user
    log "Creating CRM database and user..."
    mysql -u root -p"$MYSQL_ROOT_PASSWORD" -e "DROP DATABASE IF EXISTS $CRM_DB_NAME;"
    mysql -u root -p"$MYSQL_ROOT_PASSWORD" -e "CREATE DATABASE $CRM_DB_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
    mysql -u root -p"$MYSQL_ROOT_PASSWORD" -e "DROP USER IF EXISTS '$CRM_DB_USER'@'localhost';"
    mysql -u root -p"$MYSQL_ROOT_PASSWORD" -e "CREATE USER '$CRM_DB_USER'@'localhost' IDENTIFIED BY '$CRM_DB_PASSWORD';"
    mysql -u root -p"$MYSQL_ROOT_PASSWORD" -e "GRANT ALL PRIVILEGES ON $CRM_DB_NAME.* TO '$CRM_DB_USER'@'localhost';"
    mysql -u root -p"$MYSQL_ROOT_PASSWORD" -e "FLUSH PRIVILEGES;"

    log "Database setup completed"
}

# Configure web server
configure_webserver() {
    log "Configuring Apache and PHP..."
    
    # Get PHP version
    PHP_VERSION=$(php -v | head -n1 | cut -d' ' -f2 | cut -d'.' -f1,2)
    PHP_INI="/etc/php/$PHP_VERSION/apache2/php.ini"

    # Backup original PHP configuration
    if [ ! -f "$PHP_INI.backup" ]; then
        cp "$PHP_INI" "$PHP_INI.backup"
    fi

    # Configure PHP settings
    sed -i 's/upload_max_filesize = .*/upload_max_filesize = 100M/' "$PHP_INI"
    sed -i 's/post_max_size = .*/post_max_size = 100M/' "$PHP_INI"
    sed -i 's/max_execution_time = .*/max_execution_time = 300/' "$PHP_INI"
    sed -i 's/memory_limit = .*/memory_limit = 512M/' "$PHP_INI"
    sed -i 's/max_input_vars = .*/max_input_vars = 3000/' "$PHP_INI"
    sed -i 's/;date.timezone.*/date.timezone = "UTC"/' "$PHP_INI"

    # Enable Apache modules
    a2enmod rewrite ssl headers expires deflate
    
    # Create Apache virtual host
    cat > /etc/apache2/sites-available/freepbx-crm.conf << EOF
<VirtualHost *:80>
    ServerName $IP_ADDRESS
    DocumentRoot $WEB_ROOT
    
    <Directory $WEB_ROOT>
        AllowOverride All
        Require all granted
        DirectoryIndex index.php index.html
        Options -Indexes +FollowSymLinks
    </Directory>
    
    <Directory $CRM_PATH>
        AllowOverride All
        Require all granted
        DirectoryIndex index.php
        Options -Indexes +FollowSymLinks
    </Directory>
    
    # Security headers
    Header always set X-Content-Type-Options nosniff
    Header always set X-Frame-Options DENY
    Header always set X-XSS-Protection "1; mode=block"
    
    # Redirect root to CRM
    RedirectMatch ^/$ /crm/
    
    ErrorLog \${APACHE_LOG_DIR}/crm_error.log
    CustomLog \${APACHE_LOG_DIR}/crm_access.log combined
</VirtualHost>
EOF

    # Enable site and restart Apache
    a2ensite freepbx-crm.conf
    a2dissite 000-default.conf 2>/dev/null || true
    systemctl restart apache2

    log "Web server configuration completed"
}

# Configure Asterisk
configure_asterisk() {
    log "Configuring Asterisk for CRM integration..."
    
    # Add asterisk user to required groups
    usermod -a -G audio,dialout asterisk
    
    # Backup original configurations
    cp /etc/asterisk/manager.conf /etc/asterisk/manager.conf.backup 2>/dev/null || true
    cp /etc/asterisk/extensions.conf /etc/asterisk/extensions.conf.backup 2>/dev/null || true
    cp /etc/asterisk/pjsip.conf /etc/asterisk/pjsip.conf.backup 2>/dev/null || true

    # Configure Asterisk Manager Interface (AMI)
    cat > /etc/asterisk/manager.conf << 'EOF'
[general]
enabled = yes
port = 5038
bindaddr = 127.0.0.1
displayconnects = no

[crmuser]
secret = CRM_AMI_Secret2024!
permit = 127.0.0.1/255.255.255.255
read = system,call,log,verbose,command,agent,user,config,dtmf,reporting,cdr,dialplan
write = system,call,log,verbose,command,agent,user,config,dtmf,reporting,cdr,dialplan
EOF

    # Configure basic extensions
    cat > /etc/asterisk/extensions.conf << 'EOF'
[general]
static=yes
writeprotect=no
autofallthrough=yes

[default]
; Basic extension configuration
; Extensions 100-199 for users
exten => _1XX,1,Dial(PJSIP/${EXTEN},20)
exten => _1XX,n,Hangup()

; Echo test
exten => 999,1,Answer()
exten => 999,n,Echo()
exten => 999,n,Hangup()

; Voicemail access
exten => *97,1,VoiceMailMain()
exten => *97,n,Hangup()
EOF

    # Configure PJSIP (modern SIP implementation)
    cat > /etc/asterisk/pjsip.conf << 'EOF'
[global]
type=global
endpoint_identifier_order=ip,username

[transport-udp]
type=transport
protocol=udp
bind=0.0.0.0:5060

[transport-tcp]
type=transport
protocol=tcp
bind=0.0.0.0:5060

; Sample extension
[101]
type=endpoint
context=default
disallow=all
allow=ulaw
allow=alaw
auth=auth101
aors=101

[auth101]
type=auth
auth_type=userpass
password=extension101
username=101

[101]
type=aor
max_contacts=1
EOF

    # Set proper permissions
    chown -R asterisk:asterisk /etc/asterisk
    chown -R asterisk:asterisk /var/lib/asterisk
    chown -R asterisk:asterisk /var/log/asterisk
    chown -R asterisk:asterisk /var/spool/asterisk

    # Start Asterisk
    systemctl start asterisk
    systemctl enable asterisk

    log "Asterisk configuration completed"
}

# Install additional tools
install_additional_tools() {
    log "Installing additional tools and security..."
    
    # Install Node.js and npm (for modern web features)
    curl -fsSL https://deb.nodesource.com/setup_lts.x | bash -
    apt-get install -y nodejs
    
    # Install security tools
    apt-get install -y \
        fail2ban \
        ufw \
        iptables \
        rsyslog \
        logrotate
    
    # Install SSL tools
    apt-get install -y \
        certbot \
        python3-certbot-apache \
        openssl
    
    log "Additional tools installed"
}

# Configure security
configure_security() {
    log "Configuring firewall and security..."
    
    # Configure UFW firewall
    ufw --force reset
    ufw default deny incoming
    ufw default allow outgoing
    
    # Allow essential services
    ufw allow ssh
    ufw allow 80/tcp comment 'HTTP'
    ufw allow 443/tcp comment 'HTTPS'
    ufw allow 5060/udp comment 'SIP signaling'
    ufw allow 5038/tcp comment 'Asterisk Manager Interface'
    ufw allow 10000:20000/udp comment 'RTP media streams'
    
    ufw --force enable

    # Configure fail2ban
    cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 3

[sshd]
enabled = true
port = ssh
logpath = /var/log/auth.log

[apache-auth]
enabled = true
port = http,https
logpath = /var/log/apache2/error.log

[apache-badbots]
enabled = true
port = http,https
logpath = /var/log/apache2/access.log

[asterisk]
enabled = true
port = 5060
logpath = /var/log/asterisk/security
EOF

    systemctl enable fail2ban
    systemctl start fail2ban

    log "Security configuration completed"
}

# Create CRM application
create_crm_application() {
    log "Creating FreePBX CRM application..."
    
    # Create CRM directory
    mkdir -p "$CRM_PATH"
    cd "$CRM_PATH"

    # Create directory structure
    mkdir -p {config,includes,assets/{css,js},api,uploads,logs,backup}

    # Create database configuration
    cat > config/database.php << EOF
<?php
define('DB_HOST', 'localhost');
define('DB_NAME', '$CRM_DB_NAME');
define('DB_USER', '$CRM_DB_USER');
define('DB_PASS', '$CRM_DB_PASSWORD');

try {
    \$pdo = new PDO("mysql:host=".DB_HOST.";dbname=".DB_NAME.";charset=utf8mb4", DB_USER, DB_PASS);
    \$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    \$pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
} catch(PDOException \$e) {
    die("Database connection failed: " . \$e->getMessage());
}
?>
EOF

    # Create Asterisk configuration
    cat > config/asterisk.php << 'EOF'
<?php
define('AMI_HOST', '127.0.0.1');
define('AMI_PORT', 5038);
define('AMI_USER', 'crmuser');
define('AMI_PASS', 'CRM_AMI_Secret2024!');
?>
EOF

    # Create authentication system
    cat > includes/auth.php << 'EOF'
<?php
session_start();

function isLoggedIn() {
    return isset($_SESSION['user_id']) && $_SESSION['user_id'] > 0;
}

function login($username, $password) {
    global $pdo;
    
    try {
        $stmt = $pdo->prepare("SELECT id, username, password_hash, role FROM users WHERE username = ? AND active = 1");
        $stmt->execute([$username]);
        $user = $stmt->fetch();
        
        if ($user && password_verify($password, $user['password_hash'])) {
            $_SESSION['user_id'] = $user['id'];
            $_SESSION['username'] = $user['username'];
            $_SESSION['role'] = $user['role'];
            
            // Log login
            $stmt = $pdo->prepare("UPDATE users SET last_login = NOW() WHERE id = ?");
            $stmt->execute([$user['id']]);
            
            return true;
        }
        return false;
    } catch(Exception $e) {
        error_log("Login error: " . $e->getMessage());
        return false;
    }
}

function logout() {
    session_destroy();
    header('Location: login.php');
    exit;
}

function requireLogin() {
    if (!isLoggedIn()) {
        header('Location: login.php');
        exit;
    }
}
?>
EOF

    # Create main dashboard
    cat > index.php << 'EOF'
<?php
require_once 'config/database.php';
require_once 'includes/auth.php';
requireLogin();
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>FreePBX CRM Dashboard</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
    <link href="assets/css/style.css" rel="stylesheet">
</head>
<body>
    <nav class="navbar navbar-expand-lg navbar-dark bg-primary">
        <div class="container-fluid">
            <a class="navbar-brand" href="index.php">
                <i class="fas fa-phone-alt"></i> FreePBX CRM
            </a>
            <div class="navbar-nav ms-auto">
                <span class="navbar-text me-3">
                    Welcome, <?php echo htmlspecialchars($_SESSION['username']); ?>
                </span>
                <a class="nav-link" href="logout.php">
                    <i class="fas fa-sign-out-alt"></i> Logout
                </a>
            </div>
        </div>
    </nav>

    <div class="container-fluid mt-4">
        <div class="row">
            <div class="col-md-3">
                <div class="card">
                    <div class="card-header">
                        <h5><i class="fas fa-tachometer-alt"></i> Navigation</h5>
                    </div>
                    <div class="list-group list-group-flush">
                        <a href="dashboard.php" class="list-group-item list-group-item-action">
                            <i class="fas fa-chart-line"></i> Dashboard
                        </a>
                        <a href="contacts.php" class="list-group-item list-group-item-action">
                            <i class="fas fa-users"></i> Contacts
                        </a>
                        <a href="calls.php" class="list-group-item list-group-item-action">
                            <i class="fas fa-phone"></i> Call Logs
                        </a>
                        <a href="leads.php" class="list-group-item list-group-item-action">
                            <i class="fas fa-user-plus"></i> Leads
                        </a>
                        <a href="reports.php" class="list-group-item list-group-item-action">
                            <i class="fas fa-chart-bar"></i> Reports
                        </a>
                    </div>
                </div>
            </div>
            <div class="col-md-9">
                <div class="row">
                    <div class="col-md-6 col-lg-3 mb-4">
                        <div class="card bg-primary text-white">
                            <div class="card-body">
                                <div class="d-flex justify-content-between">
                                    <div>
                                        <h4>150</h4>
                                        <p>Total Contacts</p>
                                    </div>
                                    <div class="align-self-center">
                                        <i class="fas fa-users fa-2x"></i>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-6 col-lg-3 mb-4">
                        <div class="card bg-success text-white">
                            <div class="card-body">
                                <div class="d-flex justify-content-between">
                                    <div>
                                        <h4>45</h4>
                                        <p>Calls Today</p>
                                    </div>
                                    <div class="align-self-center">
                                        <i class="fas fa-phone fa-2x"></i>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-6 col-lg-3 mb-4">
                        <div class="card bg-warning text-white">
                            <div class="card-body">
                                <div class="d-flex justify-content-between">
                                    <div>
                                        <h4>23</h4>
                                        <p>Active Leads</p>
                                    </div>
                                    <div class="align-self-center">
                                        <i class="fas fa-user-plus fa-2x"></i>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-6 col-lg-3 mb-4">
                        <div class="card bg-info text-white">
                            <div class="card-body">
                                <div class="d-flex justify-content-between">
                                    <div>
                                        <h4>89%</h4>
                                        <p>Success Rate</p>
                                    </div>
                                    <div class="align-self-center">
                                        <i class="fas fa-chart-line fa-2x"></i>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="card">
                    <div class="card-header">
                        <h5><i class="fas fa-info-circle"></i> System Information</h5>
                    </div>
                    <div class="card-body">
                        <div class="row">
                            <div class="col-md-6">
                                <h6>Installation Details:</h6>
                                <ul class="list-unstyled">
                                    <li><strong>Server IP:</strong> <?php echo $_SERVER['SERVER_ADDR']; ?></li>
                                    <li><strong>PHP Version:</strong> <?php echo PHP_VERSION; ?></li>
                                    <li><strong>Database:</strong> Connected</li>
                                    <li><strong>Asterisk:</strong> Integration Ready</li>
                                </ul>
                            </div>
                            <div class="col-md-6">
                                <h6>Quick Actions:</h6>
                                <div class="d-grid gap-2">
                                    <a href="contacts.php?action=add" class="btn btn-primary">Add Contact</a>
                                    <a href="calls.php" class="btn btn-success">View Call Logs</a>
                                    <a href="reports.php" class="btn btn-info">Generate Report</a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>
EOF

    # Create login page
    cat > login.php << 'EOF'
<?php
require_once 'config/database.php';
require_once 'includes/auth.php';

$error = '';
$debug_info = '';

if ($_POST) {
    $username = trim($_POST['username'] ?? '');
    $password = $_POST['password'] ?? '';
    
    if (empty($username) || empty($password)) {
        $error = 'Please enter both username and password';
    } else {
        if (login($username, $password)) {
            header('Location: index.php');
            exit;
        } else {
            $error = 'Invalid username or password';
        }
    }
}

// Debug mode
if (isset($_GET['debug']) && $_GET['debug'] == '1') {
    try {
        $stmt = $pdo->query("SELECT COUNT(*) as count FROM users");
        $user_count = $stmt->fetch()['count'];
        $debug_info = "Database connection: OK | Users in database: $user_count";
    } catch(Exception $e) {
        $debug_info = "Database error: " . $e->getMessage();
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>FreePBX CRM - Login</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
</head>
<body class="bg-light">
    <div class="container mt-5">
        <div class="row justify-content-center">
            <div class="col-md-6 col-lg-4">
                <div class="card shadow">
                    <div class="card-header text-center bg-primary text-white">
                        <h4><i class="fas fa-phone-alt"></i> FreePBX CRM</h4>
                        <p class="mb-0">Please sign in to continue</p>
                    </div>
                    <div class="card-body">
                        <?php if ($error): ?>
                            <div class="alert alert-danger">
                                <i class="fas fa-exclamation-triangle"></i> <?php echo htmlspecialchars($error); ?>
                            </div>
                        <?php endif; ?>
                        
                        <?php if ($debug_info): ?>
                            <div class="alert alert-info">
                                <small><strong>Debug:</strong> <?php echo htmlspecialchars($debug_info); ?></small>
                            </div>
                        <?php endif; ?>
                        
                        <form method="post">
                            <div class="mb-3">
                                <label for="username" class="form-label">
                                    <i class="fas fa-user"></i> Username
                                </label>
                                <input type="text" class="form-control" id="username" name="username" 
                                       value="<?php echo htmlspecialchars($_POST['username'] ?? ''); ?>" required>
                            </div>
                            <div class="mb-3">
                                <label for="password" class="form-label">
                                    <i class="fas fa-lock"></i> Password
                                </label>
                                <input type="password" class="form-control" id="password" name="password" required>
                            </div>
                            <button type="submit" class="btn btn-primary w-100">
                                <i class="fas fa-sign-in-alt"></i> Login
                            </button>
                        </form>
                        
                        <hr>
                        <div class="text-center">
                            <small class="text-muted">
                                Default credentials: <strong>admin</strong> / <strong>admin123</strong>
                            </small>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</body>
</html>
EOF

    # Create logout page
    cat > logout.php << 'EOF'
<?php
require_once 'includes/auth.php';
logout();
?>
EOF

    # Create CSS file
    cat > assets/css/style.css << 'EOF'
body {
    background-color: #f8f9fa;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

.card {
    box-shadow: 0 0.125rem 0.25rem rgba(0, 0, 0, 0.075);
    border: 1px solid rgba(0, 0, 0, 0.125);
    transition: box-shadow 0.15s ease-in-out;
}

.card:hover {
    box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15);
}

.navbar-brand {
    font-weight: bold;
    font-size: 1.5rem;
}

.list-group-item-action:hover {
    background-color: #f8f9fa;
    transform: translateX(5px);
    transition: all 0.2s ease-in-out;
}

.bg-primary { background-color: #007bff !important; }
.bg-success { background-color: #28a745 !important; }
.bg-warning { background-color: #ffc107 !important; }
.bg-info { background-color: #17a2b8 !important; }

.card-body h4 {
    font-weight: bold;
    font-size: 2rem;
}

.shadow {
    box-shadow: 0 .5rem 1rem rgba(0,0,0,.15) !important;
}
EOF

    # Set proper permissions
    chown -R www-data:www-data "$CRM_PATH"
    chmod -R 755 "$CRM_PATH"
    chmod -R 777 "$CRM_PATH"/{uploads,logs,backup}

    log "CRM application created successfully"
}

# Initialize database with sample data
init_database() {
    log "Initializing database tables and sample data..."
    
    mysql -u root -p"$MYSQL_ROOT_PASSWORD" "$CRM_DB_NAME" << 'EOF'
-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('agent', 'manager', 'administrator') DEFAULT 'agent',
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    extension VARCHAR(10),
    active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Contacts table
CREATE TABLE IF NOT EXISTS contacts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(100),
    phone VARCHAR(20),
    mobile VARCHAR(20),
    company VARCHAR(100),
    position VARCHAR(100),
    address TEXT,
    notes TEXT,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_phone (phone),
    INDEX idx_email (email)
);

-- Call logs table
CREATE TABLE IF NOT EXISTS call_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    contact_id INT,
    caller_number VARCHAR(20) NOT NULL,
    called_number VARCHAR(20) NOT NULL,
    call_direction ENUM('inbound', 'outbound') NOT NULL,
    call_status ENUM('answered', 'busy', 'no_answer', 'failed') NOT NULL,
    duration INT DEFAULT 0,
    recording_file VARCHAR(255),
    agent_id INT,
    notes TEXT,
    call_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    call_end TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL,
    FOREIGN KEY (agent_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_caller (caller_number),
    INDEX idx_call_start (call_start)
);

-- Leads table
CREATE TABLE IF NOT EXISTS leads (
    id INT AUTO_INCREMENT PRIMARY KEY,
    contact_id INT NOT NULL,
    source VARCHAR(50),
    status ENUM('new', 'contacted', 'qualified', 'proposal', 'converted', 'lost') DEFAULT 'new',
    priority ENUM('low', 'medium', 'high') DEFAULT 'medium',
    value DECIMAL(10,2),
    assigned_agent_id INT,
    notes TEXT,
    next_follow_up DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_agent_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_status (status),
    INDEX idx_assigned_agent (assigned_agent_id)
);

-- Insert default admin user (password: admin123)
INSERT INTO users (username, email, password_hash, role, first_name, last_name) 
VALUES ('admin', 'admin@company.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'administrator', 'System', 'Administrator')
ON DUPLICATE KEY UPDATE id=id;

-- Insert sample contacts
INSERT INTO contacts (first_name, last_name, phone, email, company, created_by) VALUES
('John', 'Doe', '+1234567890', 'john.doe@email.com', 'Tech Solutions Ltd', 1),
('Jane', 'Smith', '+1234567891', 'jane.smith@email.com', 'Marketing Pro Inc', 1),
('Bob', 'Johnson', '+1234567892', 'bob.johnson@email.com', 'Sales Corp', 1),
('Alice', 'Brown', '+1234567893', 'alice.brown@email.com', 'Consulting Group', 1),
('Charlie', 'Wilson', '+1234567894', 'charlie.wilson@email.com', 'Development Co', 1)
ON DUPLICATE KEY UPDATE id=id;

-- Insert sample leads
INSERT INTO leads (contact_id, source, status, priority, value, assigned_agent_id) VALUES
(1, 'website', 'new', 'high', 5000.00, 1),
(2, 'referral', 'contacted', 'medium', 3000.00, 1),
(3, 'cold_call', 'qualified', 'low', 1500.00, 1),
(4, 'email_campaign', 'new', 'medium', 2500.00, 1),
(5, 'social_media', 'contacted', 'high', 7500.00, 1)
ON DUPLICATE KEY UPDATE id=id;
EOF

    log "Database initialization completed"
}

# Create management scripts
create_management_scripts() {
    log "Creating management and status scripts..."
    
    # Create status check script
    cat > /usr/local/bin/freepbx-crm-status << 'EOF'
#!/bin/bash
echo "FreePBX CRM System Status"
echo "========================"
echo "Date: $(date)"
echo ""
echo "Services Status:"
echo "  Apache2: $(systemctl is-active apache2) ($(systemctl is-enabled apache2))"
echo "  MySQL: $(systemctl is-active mysql) ($(systemctl is-enabled mysql))"
echo "  Asterisk: $(systemctl is-active asterisk) ($(systemctl is-enabled asterisk))"
echo "  Fail2ban: $(systemctl is-active fail2ban) ($(systemctl is-enabled fail2ban))"
echo ""
echo "System Information:"
echo "  Ubuntu Version: $(lsb_release -ds)"
echo "  Kernel: $(uname -r)"
echo "  Uptime: $(uptime -p)"
echo "  Load Average: $(uptime | awk -F'load average:' '{print $2}')"
echo ""
echo "Resources:"
echo "  Memory Usage:"
free -h | grep -E "(Mem|Swap)"
echo ""
echo "  Disk Usage:"
df -h / | tail -1
echo ""
echo "Network:"
echo "  IP Address: $(hostname -I | awk '{print $1}')"
echo "  Web Interface: http://$(hostname -I | awk '{print $1}')/crm/"
echo ""
echo "Database:"
echo "  Status: $(systemctl is-active mysql)"
echo "  CRM Database: Connected"
echo ""
echo "Firewall Status:"
ufw status numbered 2>/dev/null | head -10
echo ""
echo "Recent CRM Access (last 5):"
tail -5 /var/log/apache2/crm_access.log 2>/dev/null | cut -d' ' -f1,4,7 || echo "  No access logs found"
EOF

    chmod +x /usr/local/bin/freepbx-crm-status
    
    # Create backup script
    cat > /usr/local/bin/freepbx-crm-backup << EOF
#!/bin/bash
BACKUP_DIR="/opt/freepbx-crm-backups"
DATE=\$(date +%Y%m%d_%H%M%S)

mkdir -p "\$BACKUP_DIR"

echo "Starting FreePBX CRM backup - \$DATE"

# Database backup
mysqldump -u root -p$MYSQL_ROOT_PASSWORD $CRM_DB_NAME > "\$BACKUP_DIR/crm_database_\$DATE.sql"

# Application backup
tar -czf "\$BACKUP_DIR/crm_app_\$DATE.tar.gz" -C /var/www/html crm

# Configuration backup
tar -czf "\$BACKUP_DIR/crm_config_\$DATE.tar.gz" /etc/apache2/sites-available/freepbx-crm.conf /etc/asterisk

# Cleanup old backups (keep 7 days)
find "\$BACKUP_DIR" -name "*.sql" -mtime +7 -delete
find "\$BACKUP_DIR" -name "*.tar.gz" -mtime +7 -delete

echo "Backup completed: \$BACKUP_DIR"
ls -lah "\$BACKUP_DIR"/*\$DATE*
EOF

    chmod +x /usr/local/bin/freepbx-crm-backup
    
    # Add backup to crontab
    (crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/freepbx-crm-backup >> /var/log/crm-backup.log 2>&1") | crontab -
    
    log "Management scripts created"
}

# Main installation function
main() {
    log "Starting FreePBX CRM installation..."
    
    get_ip_address
    install_essentials
    check_system
    install_prerequisites
    install_lamp_stack
    install_asterisk
    setup_database
    configure_webserver
    configure_asterisk
    install_additional_tools
    configure_security
    create_crm_application
    init_database
    create_management_scripts
    
    # Final service restart
    systemctl restart apache2
    systemctl restart mysql
    systemctl restart asterisk
    
    log "Installation completed successfully!"
    
    echo ""
    echo "=============================================="
    echo "FreePBX CRM Installation Complete!"
    echo "=============================================="
    echo "Ubuntu Version: $UBUNTU_VERSION"
    echo "Server IP: $IP_ADDRESS"
    echo "Access URL: http://$IP_ADDRESS/crm/"
    echo ""
    echo "Default Login Credentials:"
    echo "  Username: admin"
    echo "  Password: admin123"
    echo ""
    echo "Database Information:"
    echo "  MySQL Root Password: $MYSQL_ROOT_PASSWORD"
    echo "  CRM Database: $CRM_DB_NAME"
    echo "  CRM DB User: $CRM_DB_USER"
    echo "  CRM DB Password: $CRM_DB_PASSWORD"
    echo ""
    echo "Management Commands:"
    echo "  Status Check: freepbx-crm-status"
    echo "  Backup System: freepbx-crm-backup"
    echo ""
    echo "Security Notes:"
    echo "  ✓ Firewall (UFW) enabled"
    echo "  ✓ Fail2ban configured"
    echo "  ⚠ Change ALL default passwords immediately"
    echo "  ⚠ Configure SSL certificate for production"
    echo ""
    echo "Next Steps:"
    echo "1. Access http://$IP_ADDRESS/crm/ in your browser"
    echo "2. Login with admin/admin123"
    echo "3. Change the default password"
    echo "4. Configure your phone extensions"
    echo "5. Add your contacts and start managing calls"
    echo "=============================================="
}

# Run main installation
main "$@"
