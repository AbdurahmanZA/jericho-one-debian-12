#!/bin/bash

# FreePBX CRM Integration - Complete Installation Script for Debian 12
# This script installs and configures the complete CRM system with FreePBX integration
# 
# DEPENDENCIES REQUIRED BEFORE RUNNING:
# ====================================
# System Requirements:
# - Debian 12 (Bookworm) - Fresh installation recommended
# - Root access (sudo privileges)
# - Minimum 2GB RAM, 20GB disk space
# - Internet connection for package downloads
# 
# Pre-installation Dependencies:
# - curl (for downloading packages)
# - wget (for file downloads) 
# - gnupg2 (for package verification)
# - software-properties-common (for repository management)
# - apt-transport-https (for secure package downloads)
# - ca-certificates (for SSL certificate verification)
# 
# Install pre-dependencies with:
# sudo apt-get update
# sudo apt-get install -y curl wget gnupg2 software-properties-common apt-transport-https ca-certificates
#
# Network Requirements:
# - Port 80 (HTTP) - Web interface
# - Port 443 (HTTPS) - Secure web interface  
# - Port 5060 (UDP) - SIP signaling
# - Port 5038 (TCP) - Asterisk Manager Interface
# - Ports 10000-20000 (UDP) - RTP media streams
# - Port 22 (TCP) - SSH access
# - Port 3306 (TCP) - MySQL (localhost only)

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
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
if [[ $EUID -ne 0 ]]; then
   error "This script must be run as root (use sudo)"
   exit 1
fi

# Pre-installation dependency check
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

# System requirements check
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

# Get system information
HOSTNAME=$(hostname -f)
IP_ADDRESS=$(hostname -I | awk '{print $1}')

log "Starting FreePBX CRM Integration installation on Debian 12"
log "Hostname: $HOSTNAME"
log "IP Address: $IP_ADDRESS"
log "Available RAM: ${TOTAL_MEM}MB"
log "Available Disk: ${AVAILABLE_SPACE}GB"

# Configuration variables
MYSQL_ROOT_PASSWORD="FreePBX2024!"
CRM_DB_NAME="freepbx_crm"
CRM_DB_USER="crm_user"
CRM_DB_PASSWORD="CRM_Pass2024!"
ASTERISK_USER="asterisk"
WEB_ROOT="/var/www/html"
CRM_PATH="$WEB_ROOT/crm"

# Delete existing CRM folder if it exists
if [ -d "$CRM_PATH" ]; then
    warning "Existing CRM folder found at $CRM_PATH - removing it..."
    rm -rf "$CRM_PATH"
    log "Existing CRM folder removed successfully"
fi

# Update system
log "Updating system packages..."
apt-get update && apt-get upgrade -y

# Install main application dependencies
log "Installing main application dependencies..."

# Web server and database dependencies
WEB_DEPS=(
    "apache2"                    # Web server
    "mysql-server"              # Database server
    "mysql-client"              # Database client
)

# PHP and extensions
PHP_DEPS=(
    "php"                       # PHP runtime
    "php-mysql"                 # MySQL PHP extension
    "php-cli"                   # PHP command line interface
    "php-curl"                  # cURL extension for HTTP requests
    "php-xml"                   # XML processing extension
    "php-zip"                   # ZIP archive extension
    "php-gd"                    # Graphics extension
    "php-mbstring"              # Multibyte string extension
    "php-json"                  # JSON extension
    "php-intl"                  # Internationalization extension
    "libapache2-mod-php"        # Apache PHP module
)

# Development and build tools
BUILD_DEPS=(
    "build-essential"           # Essential build tools
    "git"                       # Version control
    "unzip"                     # Archive extraction
    "zip"                       # Archive creation
    "nodejs"                    # Node.js runtime
    "npm"                       # Node package manager
)

# Asterisk and telephony
ASTERISK_DEPS=(
    "asterisk"                  # Asterisk PBX
    "asterisk-modules"          # Additional Asterisk modules
    "asterisk-config"           # Asterisk configuration files
    "asterisk-core-sounds-en"   # English sound files
    "asterisk-core-sounds-en-wav" # WAV format sound files
)

# Security and monitoring
SECURITY_DEPS=(
    "fail2ban"                  # Intrusion prevention
    "ufw"                       # Uncomplicated firewall
    "iptables"                  # Firewall rules
    "rsyslog"                   # System logging
)

# SSL/TLS support
SSL_DEPS=(
    "certbot"                   # Let's Encrypt client
    "python3-certbot-apache"    # Apache plugin for certbot
    "openssl"                   # SSL/TLS toolkit
)

# System utilities
SYSTEM_DEPS=(
    "cron"                      # Task scheduler
    "logrotate"                 # Log rotation
    "htop"                      # Process monitor
    "nano"                      # Text editor
    "vim"                       # Advanced text editor
    "net-tools"                 # Network utilities
    "dnsutils"                  # DNS utilities
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

# Configure MySQL
log "Configuring MySQL..."
systemctl start mysql
systemctl enable mysql

# Secure MySQL installation
mysql -e "ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY '$MYSQL_ROOT_PASSWORD';"
mysql -u root -p$MYSQL_ROOT_PASSWORD -e "DELETE FROM mysql.user WHERE User='';"
mysql -u root -p$MYSQL_ROOT_PASSWORD -e "DELETE FROM mysql.user WHERE User='root' AND Host NOT IN ('localhost', '127.0.0.1', '::1');"
mysql -u root -p$MYSQL_ROOT_PASSWORD -e "DROP DATABASE IF EXISTS test;"
mysql -u root -p$MYSQL_ROOT_PASSWORD -e "DELETE FROM mysql.db WHERE Db='test' OR Db='test\\_%';"
mysql -u root -p$MYSQL_ROOT_PASSWORD -e "FLUSH PRIVILEGES;"

# Create CRM database and user
log "Creating CRM database..."
mysql -u root -p$MYSQL_ROOT_PASSWORD -e "DROP DATABASE IF EXISTS $CRM_DB_NAME;"
mysql -u root -p$MYSQL_ROOT_PASSWORD -e "CREATE DATABASE $CRM_DB_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -u root -p$MYSQL_ROOT_PASSWORD -e "DROP USER IF EXISTS '$CRM_DB_USER'@'localhost';"
mysql -u root -p$MYSQL_ROOT_PASSWORD -e "CREATE USER '$CRM_DB_USER'@'localhost' IDENTIFIED BY '$CRM_DB_PASSWORD';"
mysql -u root -p$MYSQL_ROOT_PASSWORD -e "GRANT ALL PRIVILEGES ON $CRM_DB_NAME.* TO '$CRM_DB_USER'@'localhost';"
mysql -u root -p$MYSQL_ROOT_PASSWORD -e "FLUSH PRIVILEGES;"

# Configure PHP
log "Configuring PHP..."
PHP_VERSION=$(php -v | head -n1 | cut -d' ' -f2 | cut -d'.' -f1,2)
PHP_INI="/etc/php/$PHP_VERSION/apache2/php.ini"

# Backup original PHP configuration
cp $PHP_INI $PHP_INI.backup

# Configure PHP settings for CRM
sed -i 's/upload_max_filesize = .*/upload_max_filesize = 100M/' $PHP_INI
sed -i 's/post_max_size = .*/post_max_size = 100M/' $PHP_INI
sed -i 's/max_execution_time = .*/max_execution_time = 300/' $PHP_INI
sed -i 's/memory_limit = .*/memory_limit = 512M/' $PHP_INI
sed -i 's/max_input_vars = .*/max_input_vars = 3000/' $PHP_INI
sed -i 's/;date.timezone.*/date.timezone = "UTC"/' $PHP_INI

# Configure Apache
log "Configuring Apache..."
a2enmod rewrite ssl headers expires deflate
systemctl start apache2
systemctl enable apache2

# Create Apache virtual host for CRM with /crm path
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
    
    # Redirect root to CRM for convenience
    RedirectMatch ^/$ /crm/
    
    ErrorLog \${APACHE_LOG_DIR}/crm_error.log
    CustomLog \${APACHE_LOG_DIR}/crm_access.log combined
</VirtualHost>
EOF

a2ensite freepbx-crm.conf
a2dissite 000-default.conf

# Configure Asterisk
log "Configuring Asterisk..."
systemctl stop asterisk

# Add asterisk user to required groups
usermod -a -G audio,dialout $ASTERISK_USER

# Backup original Asterisk configuration
cp /etc/asterisk/manager.conf /etc/asterisk/manager.conf.backup 2>/dev/null || true
cp /etc/asterisk/extensions.conf /etc/asterisk/extensions.conf.backup 2>/dev/null || true
cp /etc/asterisk/sip.conf /etc/asterisk/sip.conf.backup 2>/dev/null || true

# Configure Asterisk Manager Interface (AMI)
cat > /etc/asterisk/manager.conf << EOF
[general]
enabled = yes
port = 5038
bindaddr = 127.0.0.1
displayconnects = no

[crmuser]
secret = CRM_AMI_Secret2024!
permit = 127.0.0.1/255.255.255.255
read = system,call,log,verbose,command,agent,user,config,command,dtmf,reporting,cdr,dialplan
write = system,call,log,verbose,command,agent,user,config,command,dtmf,reporting,cdr,dialplan
EOF

# Configure basic Asterisk extensions
cat > /etc/asterisk/extensions.conf << EOF
[general]
static=yes
writeprotect=no

[default]
; Basic extension configuration
; Extensions 100-199 for users
exten => _1XX,1,Dial(SIP/\${EXTEN},20)
exten => _1XX,n,Hangup()

; Echo test
exten => 999,1,Answer()
exten => 999,n,Echo()
exten => 999,n,Hangup()
EOF

# Configure SIP
cat > /etc/asterisk/sip.conf << EOF
[general]
context=default
bindport=5060
bindaddr=0.0.0.0
tcpenable=yes
tcpbindaddr=0.0.0.0

; Sample SIP user
[101]
type=friend
host=dynamic
secret=extension101
context=default
EOF

# Set proper permissions for Asterisk
chown -R $ASTERISK_USER:$ASTERISK_USER /etc/asterisk
chown -R $ASTERISK_USER:$ASTERISK_USER /var/lib/asterisk
chown -R $ASTERISK_USER:$ASTERISK_USER /var/log/asterisk
chown -R $ASTERISK_USER:$ASTERISK_USER /var/spool/asterisk

# Start Asterisk
systemctl start asterisk
systemctl enable asterisk

# Create CRM application structure
log "Setting up CRM application structure at $CRM_PATH..."
mkdir -p $CRM_PATH/{api,assets,config,includes,uploads,recordings,logs,backup}

# Create database schema
cat > $CRM_PATH/schema.sql << EOF
-- FreePBX CRM Database Schema

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('agent', 'manager', 'administrator') DEFAULT 'agent',
    extension VARCHAR(10),
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS leads (
    id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(100),
    company VARCHAR(100),
    source VARCHAR(50),
    status ENUM('new', 'contacted', 'qualified', 'converted', 'do_not_call') DEFAULT 'new',
    priority ENUM('low', 'medium', 'high') DEFAULT 'medium',
    assigned_agent_id INT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (assigned_agent_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_phone (phone),
    INDEX idx_status (status),
    INDEX idx_assigned_agent (assigned_agent_id)
);

CREATE TABLE IF NOT EXISTS call_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    lead_id INT NOT NULL,
    agent_id INT NOT NULL,
    call_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    call_end TIMESTAMP NULL,
    duration INT DEFAULT 0,
    status ENUM('connected', 'busy', 'no_answer', 'failed', 'voicemail') DEFAULT 'connected',
    recording_path VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
    FOREIGN KEY (agent_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_lead_id (lead_id),
    INDEX idx_agent_id (agent_id),
    INDEX idx_call_start (call_start)
);

-- Insert default admin user (password: admin123)
INSERT INTO users (username, email, password_hash, role, first_name, last_name) 
VALUES ('admin', 'admin@company.com', '\$2y\$10\$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'administrator', 'System', 'Administrator')
ON DUPLICATE KEY UPDATE id=id;

-- Insert sample leads
INSERT INTO leads (first_name, last_name, phone, email, company, source, status, priority) VALUES
('John', 'Doe', '+1234567890', 'john.doe@email.com', 'Tech Corp', 'website', 'new', 'high'),
('Jane', 'Smith', '+1234567891', 'jane.smith@email.com', 'Marketing Inc', 'referral', 'new', 'medium'),
('Bob', 'Johnson', '+1234567892', 'bob.johnson@email.com', 'Sales LLC', 'cold_call', 'contacted', 'low')
ON DUPLICATE KEY UPDATE id=id;
EOF

# Import database schema
mysql -u $CRM_DB_USER -p$CRM_DB_PASSWORD $CRM_DB_NAME < $CRM_PATH/schema.sql

# Create PHP configuration file
cat > $CRM_PATH/config/database.php << EOF
<?php
return [
    'host' => 'localhost',
    'database' => '$CRM_DB_NAME',
    'username' => '$CRM_DB_USER',
    'password' => '$CRM_DB_PASSWORD',
    'charset' => 'utf8mb4',
    'options' => [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]
];
EOF

# Create FreePBX AMI configuration
cat > $CRM_PATH/config/asterisk.php << EOF
<?php
return [
    'ami' => [
        'host' => '127.0.0.1',
        'port' => 5038,
        'username' => 'crmuser',
        'password' => 'CRM_AMI_Secret2024!',
        'timeout' => 10
    ],
    'recordings_path' => '/var/spool/asterisk/monitor/',
    'default_context' => 'default'
];
EOF

# Create main CRM application file
cat > $CRM_PATH/index.php << EOF
<?php
session_start();
require_once 'includes/auth.php';
require_once 'includes/database.php';

// Check if user is logged in
if (!isLoggedIn()) {
    header('Location: login.php');
    exit;
}

\$user = getCurrentUser();
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>FreePBX CRM Integration</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <link href="assets/style.css" rel="stylesheet">
</head>
<body>
    <div class="container-fluid">
        <div class="row">
            <!-- Sidebar -->
            <nav class="col-md-2 d-none d-md-block bg-dark sidebar">
                <div class="sidebar-sticky">
                    <h5 class="text-white p-3">FreePBX CRM</h5>
                    <ul class="nav flex-column">
                        <li class="nav-item">
                            <a class="nav-link text-white" href="#leads" onclick="loadSection('leads')">
                                <i class="fas fa-users"></i> Leads
                            </a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link text-white" href="#calls" onclick="loadSection('calls')">
                                <i class="fas fa-phone"></i> Call Center
                            </a>
                        </li>
                        <?php if (\$user['role'] === 'manager' || \$user['role'] === 'administrator'): ?>
                        <li class="nav-item">
                            <a class="nav-link text-white" href="#reports" onclick="loadSection('reports')">
                                <i class="fas fa-chart-bar"></i> Reports
                            </a>
                        </li>
                        <?php endif; ?>
                        <?php if (\$user['role'] === 'administrator'): ?>
                        <li class="nav-item">
                            <a class="nav-link text-white" href="#users" onclick="loadSection('users')">
                                <i class="fas fa-user-cog"></i> Users
                            </a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link text-white" href="#settings" onclick="loadSection('settings')">
                                <i class="fas fa-cog"></i> Settings
                            </a>
                        </li>
                        <?php endif; ?>
                    </ul>
                    <div class="mt-auto p-3">
                        <div class="text-white-50">
                            <small>Welcome, <?= htmlspecialchars(\$user['first_name']) ?></small><br>
                            <small>Role: <?= htmlspecialchars(\$user['role']) ?></small>
                        </div>
                        <a href="logout.php" class="btn btn-outline-light btn-sm mt-2">Logout</a>
                    </div>
                </div>
            </nav>

            <!-- Main content -->
            <main role="main" class="col-md-10 ml-sm-auto px-4">
                <div id="main-content">
                    <!-- Content will be loaded here -->
                </div>
            </main>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js"></script>
    <script src="assets/app.js"></script>
</body>
</html>
EOF

# Create Click-to-Dial API (based on the GitHub script you mentioned)
cat > $CRM_PATH/api/click_to_dial.php << EOF
<?php
require_once '../includes/auth.php';
require_once '../includes/asterisk.php';

header('Content-Type: application/json');

if (!isLoggedIn()) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

if (\$_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

\$input = json_decode(file_get_contents('php://input'), true);
\$phone = \$input['phone'] ?? '';
\$extension = \$input['extension'] ?? '';

if (empty(\$phone) || empty(\$extension)) {
    http_response_code(400);
    echo json_encode(['error' => 'Phone and extension required']);
    exit;
}

try {
    \$result = initiateCall(\$extension, \$phone);
    if (\$result) {
        echo json_encode(['success' => true, 'message' => 'Call initiated']);
    } else {
        echo json_encode(['success' => false, 'error' => 'Failed to initiate call']);
    }
} catch (Exception \$e) {
    http_response_code(500);
    echo json_encode(['error' => 'Server error: ' . \$e->getMessage()]);
}
?>
EOF

# Create Asterisk AMI interface
cat > $CRM_PATH/includes/asterisk.php << EOF
<?php
function initiateCall(\$extension, \$phone) {
    \$config = require '../config/asterisk.php';
    \$ami = \$config['ami'];
    
    \$socket = fsockopen(\$ami['host'], \$ami['port'], \$errno, \$errstr, \$ami['timeout']);
    
    if (!\$socket) {
        throw new Exception("Cannot connect to Asterisk: \$errstr (\$errno)");
    }
    
    // Read welcome message
    fgets(\$socket);
    
    // Login
    \$login = "Action: Login\\r\\n";
    \$login .= "Username: {\$ami['username']}\\r\\n";
    \$login .= "Secret: {\$ami['password']}\\r\\n\\r\\n";
    
    fputs(\$socket, \$login);
    
    // Read login response
    \$response = '';
    while ((\$line = fgets(\$socket)) !== false) {
        \$response .= \$line;
        if (trim(\$line) === '') break;
    }
    
    if (strpos(\$response, 'Success') === false) {
        fclose(\$socket);
        throw new Exception('AMI login failed');
    }
    
    // Initiate call
    \$originate = "Action: Originate\\r\\n";
    \$originate .= "Channel: SIP/\$extension\\r\\n";
    \$originate .= "Context: default\\r\\n";
    \$originate .= "Exten: \$phone\\r\\n";
    \$originate .= "Priority: 1\\r\\n";
    \$originate .= "CallerID: CRM <\$extension>\\r\\n";
    \$originate .= "Timeout: 30000\\r\\n\\r\\n";
    
    fputs(\$socket, \$originate);
    
    // Read originate response
    \$response = '';
    while ((\$line = fgets(\$socket)) !== false) {
        \$response .= \$line;
        if (trim(\$line) === '') break;
    }
    
    // Logout
    fputs(\$socket, "Action: Logoff\\r\\n\\r\\n");
    fclose(\$socket);
    
    return strpos(\$response, 'Success') !== false;
}
?>
EOF

# Create authentication system
cat > $CRM_PATH/includes/auth.php << EOF
<?php
require_once 'database.php';

function isLoggedIn() {
    return isset(\$_SESSION['user_id']);
}

function getCurrentUser() {
    if (!isLoggedIn()) {
        return null;
    }
    
    \$db = getDatabase();
    \$stmt = \$db->prepare("SELECT * FROM users WHERE id = ? AND active = 1");
    \$stmt->execute([\$_SESSION['user_id']]);
    return \$stmt->fetch();
}

function login(\$username, \$password) {
    \$db = getDatabase();
    \$stmt = \$db->prepare("SELECT * FROM users WHERE username = ? AND active = 1");
    \$stmt->execute([\$username]);
    \$user = \$stmt->fetch();
    
    if (\$user && password_verify(\$password, \$user['password_hash'])) {
        \$_SESSION['user_id'] = \$user['id'];
        return true;
    }
    
    return false;
}

function logout() {
    session_destroy();
}
?>
EOF

# Create database connection
cat > $CRM_PATH/includes/database.php << EOF
<?php
function getDatabase() {
    static \$pdo = null;
    
    if (\$pdo === null) {
        \$config = require '../config/database.php';
        \$dsn = "mysql:host={\$config['host']};dbname={\$config['database']};charset={\$config['charset']}";
        \$pdo = new PDO(\$dsn, \$config['username'], \$config['password'], \$config['options']);
    }
    
    return \$pdo;
}
?>
EOF

# Create login page
cat > $CRM_PATH/login.php << EOF
<?php
session_start();
require_once 'includes/auth.php';

if (isLoggedIn()) {
    header('Location: index.php');
    exit;
}

\$error = '';
if (\$_SERVER['REQUEST_METHOD'] === 'POST') {
    \$username = \$_POST['username'] ?? '';
    \$password = \$_POST['password'] ?? '';
    
    if (login(\$username, \$password)) {
        header('Location: index.php');
        exit;
    } else {
        \$error = 'Invalid username or password';
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login - FreePBX CRM</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body class="bg-light">
    <div class="container">
        <div class="row justify-content-center">
            <div class="col-md-6 col-lg-4">
                <div class="card mt-5">
                    <div class="card-header">
                        <h4 class="text-center">FreePBX CRM Login</h4>
                    </div>
                    <div class="card-body">
                        <?php if (\$error): ?>
                            <div class="alert alert-danger"><?= htmlspecialchars(\$error) ?></div>
                        <?php endif; ?>
                        <form method="POST">
                            <div class="mb-3">
                                <label for="username" class="form-label">Username</label>
                                <input type="text" class="form-control" id="username" name="username" required>
                            </div>
                            <div class="mb-3">
                                <label for="password" class="form-label">Password</label>
                                <input type="password" class="form-control" id="password" name="password" required>
                            </div>
                            <button type="submit" class="btn btn-primary w-100">Login</button>
                        </form>
                        <div class="mt-3 text-center">
                            <small class="text-muted">
                                Default login: admin / admin123
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

# Create CSS file
cat > $CRM_PATH/assets/style.css << EOF
.sidebar {
    position: fixed;
    top: 0;
    bottom: 0;
    left: 0;
    z-index: 100;
    padding: 0;
    box-shadow: inset -1px 0 0 rgba(0, 0, 0, .1);
}

.sidebar-sticky {
    position: sticky;
    top: 0;
    height: 100vh;
    padding-top: 0;
    overflow-x: hidden;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
}

.nav-link {
    color: rgba(255, 255, 255, .75);
}

.nav-link:hover {
    color: rgba(255, 255, 255, 1);
}

.click-to-dial {
    cursor: pointer;
    transition: all 0.2s;
}

.click-to-dial:hover {
    transform: scale(1.1);
}

.lead-card {
    transition: all 0.2s;
}

.lead-card:hover {
    box-shadow: 0 4px 8px rgba(0,0,0,0.1);
}

.status-new { border-left: 4px solid #007bff; }
.status-contacted { border-left: 4px solid #28a745; }
.status-qualified { border-left: 4px solid #ffc107; }
.status-converted { border-left: 4px solid #28a745; }
.status-do_not_call { border-left: 4px solid #dc3545; }

.priority-high { background: rgba(220, 53, 69, 0.1); }
.priority-medium { background: rgba(255, 193, 7, 0.1); }
.priority-low { background: rgba(108, 117, 125, 0.1); }
EOF

# Create JavaScript file
cat > $CRM_PATH/assets/app.js << EOF
// Main application JavaScript

function loadSection(section) {
    const content = document.getElementById('main-content');
    
    switch(section) {
        case 'leads':
            loadLeads();
            break;
        case 'calls':
            loadCalls();
            break;
        case 'reports':
            loadReports();
            break;
        case 'users':
            loadUsers();
            break;
        case 'settings':
            loadSettings();
            break;
        default:
            loadLeads();
    }
}

function loadLeads() {
    fetch('api/leads.php')
        .then(response => response.json())
        .then(data => {
            let html = '<h2>Lead Management</h2>';
            html += '<div class="row">';
            
            data.forEach(lead => {
                html += \`
                    <div class="col-md-4 mb-3">
                        <div class="card lead-card status-\${lead.status} priority-\${lead.priority}">
                            <div class="card-body">
                                <h5 class="card-title">\${lead.first_name} \${lead.last_name}</h5>
                                <p class="card-text">
                                    <i class="fas fa-phone"></i> \${lead.phone}<br>
                                    <i class="fas fa-envelope"></i> \${lead.email}<br>
                                    <i class="fas fa-building"></i> \${lead.company}
                                </p>
                                <div class="d-flex justify-content-between">
                                    <span class="badge bg-secondary">\${lead.status}</span>
                                    <button class="btn btn-success btn-sm click-to-dial" 
                                            onclick="makeCall('\${lead.phone}')">
                                        <i class="fas fa-phone"></i> Call
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                \`;
            });
            
            html += '</div>';
            document.getElementById('main-content').innerHTML = html;
        })
        .catch(error => {
            console.error('Error loading leads:', error);
            document.getElementById('main-content').innerHTML = '<div class="alert alert-danger">Error loading leads</div>';
        });
}

function makeCall(phone) {
    const extension = prompt('Enter your extension:');
    if (!extension) return;
    
    fetch('api/click_to_dial.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            phone: phone,
            extension: extension
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('Call initiated successfully!');
        } else {
            alert('Failed to initiate call: ' + (data.error || 'Unknown error'));
        }
    })
    .catch(error => {
        console.error('Error making call:', error);
        alert('Error making call');
    });
}

// Load leads by default when page loads
document.addEventListener('DOMContentLoaded', function() {
    loadLeads();
});
EOF

# Create leads API
cat > $CRM_PATH/api/leads.php << EOF
<?php
require_once '../includes/auth.php';
require_once '../includes/database.php';

header('Content-Type: application/json');

if (!isLoggedIn()) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

\$db = getDatabase();
\$stmt = \$db->query("SELECT * FROM leads ORDER BY priority DESC, created_at DESC LIMIT 50");
\$leads = \$stmt->fetchAll();

echo json_encode(\$leads);
?>
EOF

# Create logout script
cat > $CRM_PATH/logout.php << EOF
<?php
session_start();
require_once 'includes/auth.php';
logout();
header('Location: login.php');
exit;
?>
EOF

# Set proper permissions
log "Setting proper file permissions..."

# Set ownership to web server user
chown -R www-data:www-data $WEB_ROOT
chown -R www-data:www-data $CRM_PATH

# Set base permissions
find $CRM_PATH -type d -exec chmod 755 {} \;
find $CRM_PATH -type f -exec chmod 644 {} \;

# Set write permissions for specific directories
chmod -R 777 $CRM_PATH/uploads
chmod -R 777 $CRM_PATH/recordings
chmod -R 777 $CRM_PATH/logs
chmod -R 777 $CRM_PATH/backup

# Set read-only for configuration files
chmod 644 $CRM_PATH/config/*.php

# Configure firewall with all required ports
log "Configuring firewall..."
ufw --force reset
ufw default deny incoming
ufw default allow outgoing

# Essential services
ufw allow 22/tcp comment 'SSH'
ufw allow 80/tcp comment 'HTTP'
ufw allow 443/tcp comment 'HTTPS'

# Asterisk/FreePBX ports
ufw allow 5060/udp comment 'SIP signaling'
ufw allow 5038/tcp comment 'Asterisk Manager Interface'
ufw allow 10000:20000/udp comment 'RTP media streams'

# Database (localhost only)
ufw allow from 127.0.0.1 to any port 3306 comment 'MySQL localhost'

ufw --force enable

# Configure fail2ban
log "Configuring fail2ban..."
cat > /etc/fail2ban/jail.local << EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true

[apache-auth]
enabled = true

[apache-badbots]
enabled = true

[asterisk]
enabled = true
port = 5060
logpath = /var/log/asterisk/security
EOF

systemctl start fail2ban
systemctl enable fail2ban

# Restart all services
log "Restarting services..."
systemctl restart apache2
systemctl restart mysql
systemctl restart asterisk

# Create enhanced status check script
cat > /usr/local/bin/freepbx-crm-status << EOF
#!/bin/bash
echo "FreePBX CRM System Status"
echo "========================"
echo "Services:"
echo "  Apache: \$(systemctl is-active apache2)"
echo "  MySQL: \$(systemctl is-active mysql)"
echo "  Asterisk: \$(systemctl is-active asterisk)"
echo "  Fail2ban: \$(systemctl is-active fail2ban)"
echo ""
echo "Network:"
echo "  IP Address: $IP_ADDRESS"
echo "  Web Interface: http://$IP_ADDRESS/crm/"
echo ""
echo "Database:"
echo "  Status: \$(systemctl is-active mysql)"
echo "  CRM Database: $CRM_DB_NAME"
echo ""
echo "Firewall:"
ufw status numbered
echo ""
echo "Disk Usage:"
df -h $CRM_PATH
echo ""
echo "Memory Usage:"
free -h
EOF

chmod +x /usr/local/bin/freepbx-crm-status

# Create installation summary
log "Creating installation summary..."
cat > $CRM_PATH/INSTALLATION_INFO.txt << EOF
FreePBX CRM Installation Summary
===============================
Installation Date: $(date)
System: $(cat /etc/os-release | grep PRETTY_NAME | cut -d'"' -f2)
IP Address: $IP_ADDRESS
Hostname: $HOSTNAME

Installed Dependencies:
- Web Server: Apache $(apache2 -v | head -n1 | cut -d' ' -f3)
- Database: MySQL $(mysql --version | cut -d' ' -f3)
- PHP: $(php -v | head -n1 | cut -d' ' -f2)
- Asterisk: $(asterisk -V | cut -d' ' -f2)
- Node.js: $(node --version)
- NPM: $(npm --version)

Access Information:
- Web Interface: http://$IP_ADDRESS/crm/
- Default Username: admin
- Default Password: admin123

Security Features:
- Firewall: UFW enabled
- Intrusion Prevention: Fail2ban active
- SSL Ready: Certbot installed

Next Steps:
1. Access the web interface
2. Change default passwords
3. Configure SIP extensions
4. Test click-to-dial functionality
5. Configure SSL certificate for production

For system status: freepbx-crm-status
EOF

# Final system status
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

# Create installation log
echo "Installation completed successfully at $(date)" > /var/log/freepbx-crm-install.log
echo "All dependencies installed and configured" >> /var/log/freepbx-crm-install.log
echo "System ready for production use" >> /var/log/freepbx-crm-install.log
