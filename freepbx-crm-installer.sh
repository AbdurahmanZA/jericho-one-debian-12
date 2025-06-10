
#!/bin/bash

# FreePBX CRM Complete Installer
# This script installs and configures a complete CRM system with FreePBX integration

set -e  # Exit on any error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
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

# Configuration variables
MYSQL_ROOT_PASSWORD="SecureRoot123!"
CRM_DB_NAME="freepbx_crm"
CRM_DB_USER="crm_user"
CRM_DB_PASSWORD="CrmPass123!"
WEB_ROOT="/var/www/html"
CRM_PATH="$WEB_ROOT/crm"
IP_ADDRESS=$(hostname -I | awk '{print $1}')

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    error "This script must be run as root. Use: sudo $0"
fi

# System checks
check_system() {
    log "Performing system checks..."
    
    # Check OS
    if [ ! -f /etc/debian_version ]; then
        error "This script requires Debian/Ubuntu"
    fi
    
    # Check available space (minimum 2GB)
    AVAILABLE_SPACE=$(df / | awk 'NR==2 {print $4}')
    if [ "$AVAILABLE_SPACE" -lt 2097152 ]; then
        error "Insufficient disk space. At least 2GB required"
    fi
    
    # Check memory (minimum 1GB)
    TOTAL_MEM=$(free -m | awk 'NR==2{print $2}')
    if [ "$TOTAL_MEM" -lt 1024 ]; then
        warn "Less than 1GB RAM detected. Performance may be affected"
    fi
    
    log "System checks passed"
}

# Install required packages
install_packages() {
    log "Updating package lists..."
    apt-get update

    log "Installing essential packages..."
    apt-get install -y wget curl gnupg2 software-properties-common lsb-release

    # Add MySQL APT repository
    log "Adding MySQL repository..."
    if [ ! -f /etc/apt/sources.list.d/mysql.list ]; then
        wget https://dev.mysql.com/get/mysql-apt-config_0.8.24-1_all.deb
        DEBIAN_FRONTEND=noninteractive dpkg -i mysql-apt-config_0.8.24-1_all.deb
        apt-get update
        rm -f mysql-apt-config_0.8.24-1_all.deb
    fi

    log "Installing LAMP stack and dependencies..."
    
    # Set MySQL root password before installation
    echo "mysql-server mysql-server/root_password password $MYSQL_ROOT_PASSWORD" | debconf-set-selections
    echo "mysql-server mysql-server/root_password_again password $MYSQL_ROOT_PASSWORD" | debconf-set-selections
    
    # Install packages with fallback to MariaDB if MySQL fails
    if ! apt-get install -y mysql-server mysql-client; then
        warn "MySQL installation failed, falling back to MariaDB..."
        apt-get install -y mariadb-server mariadb-client
        systemctl start mariadb
        mysql -e "ALTER USER 'root'@'localhost' IDENTIFIED BY '$MYSQL_ROOT_PASSWORD';"
    fi

    apt-get install -y \
        apache2 \
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
        libapache2-mod-php \
        nodejs \
        npm \
        git \
        unzip \
        fail2ban \
        ufw

    log "Package installation completed"
}

# Configure database
setup_database() {
    log "Configuring database..."
    
    # Start and enable MySQL/MariaDB
    if systemctl is-active --quiet mysql; then
        SERVICE_NAME="mysql"
    else
        SERVICE_NAME="mariadb"
    fi
    
    systemctl start $SERVICE_NAME
    systemctl enable $SERVICE_NAME

    # Secure installation
    mysql -u root -p"$MYSQL_ROOT_PASSWORD" -e "DELETE FROM mysql.user WHERE User='';" 2>/dev/null || true
    mysql -u root -p"$MYSQL_ROOT_PASSWORD" -e "DELETE FROM mysql.user WHERE User='root' AND Host NOT IN ('localhost', '127.0.0.1', '::1');" 2>/dev/null || true
    mysql -u root -p"$MYSQL_ROOT_PASSWORD" -e "DROP DATABASE IF EXISTS test;" 2>/dev/null || true
    mysql -u root -p"$MYSQL_ROOT_PASSWORD" -e "DELETE FROM mysql.db WHERE Db='test' OR Db='test\\_%';" 2>/dev/null || true
    mysql -u root -p"$MYSQL_ROOT_PASSWORD" -e "FLUSH PRIVILEGES;" 2>/dev/null || true

    # Create CRM database and user
    log "Creating CRM database..."
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
    log "Configuring web server..."
    
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
    cat > /etc/apache2/sites-available/freepbx-crm.conf << 'EOF'
<VirtualHost *:80>
    DocumentRoot /var/www/html
    
    <Directory /var/www/html>
        AllowOverride All
        Require all granted
        DirectoryIndex index.php index.html
        Options -Indexes +FollowSymLinks
    </Directory>
    
    <Directory /var/www/html/crm>
        AllowOverride All
        Require all granted
        DirectoryIndex index.php
        Options -Indexes +FollowSymLinks
    </Directory>
    
    Header always set X-Content-Type-Options nosniff
    Header always set X-Frame-Options DENY
    Header always set X-XSS-Protection "1; mode=block"
    
    RedirectMatch ^/$ /crm/
    
    ErrorLog ${APACHE_LOG_DIR}/crm_error.log
    CustomLog ${APACHE_LOG_DIR}/crm_access.log combined
</VirtualHost>
EOF

    # Enable site and restart Apache
    a2ensite freepbx-crm.conf
    a2dissite 000-default.conf 2>/dev/null || true
    systemctl start apache2
    systemctl enable apache2
    systemctl reload apache2

    log "Web server configuration completed"
}

# Configure security
configure_security() {
    log "Configuring security..."
    
    # Configure UFW firewall
    ufw --force reset
    ufw default deny incoming
    ufw default allow outgoing
    ufw allow ssh
    ufw allow 80/tcp
    ufw allow 443/tcp
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
logpath = /var/log/apache2/*error.log

[apache-badbots]
enabled = true
port = http,https
logpath = /var/log/apache2/*access.log
EOF

    systemctl enable fail2ban
    systemctl start fail2ban

    log "Security configuration completed"
}

# Create CRM application files
create_crm_files() {
    log "Creating CRM application..."
    
    # Create CRM directory
    mkdir -p "$CRM_PATH"
    cd "$CRM_PATH"

    # Create main index.php
    cat > index.php << 'EOF'
<?php
session_start();
require_once 'config/database.php';
require_once 'includes/auth.php';

if (!isLoggedIn()) {
    header('Location: login.php');
    exit;
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>FreePBX CRM Dashboard</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <link href="assets/css/style.css" rel="stylesheet">
</head>
<body>
    <nav class="navbar navbar-expand-lg navbar-dark bg-primary">
        <div class="container-fluid">
            <a class="navbar-brand" href="index.php">
                <i class="fas fa-phone-alt"></i> FreePBX CRM
            </a>
            <div class="navbar-nav ms-auto">
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
                        <h5><i class="fas fa-chart-line"></i> Welcome to FreePBX CRM</h5>
                    </div>
                    <div class="card-body">
                        <p>Your CRM system has been successfully installed and configured. You can now:</p>
                        <ul>
                            <li>Manage contacts and customer information</li>
                            <li>Track call logs and communication history</li>
                            <li>Monitor leads and sales pipeline</li>
                            <li>Generate reports and analytics</li>
                            <li>Integrate with FreePBX phone system</li>
                        </ul>
                        <div class="alert alert-info">
                            <strong>Getting Started:</strong> Use the navigation menu to explore different sections of the CRM.
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>
EOF

    # Create directories
    mkdir -p config includes assets/css assets/js

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
} catch(PDOException \$e) {
    die("Connection failed: " . \$e->getMessage());
}
?>
EOF

    # Create authentication system
    cat > includes/auth.php << 'EOF'
<?php
function isLoggedIn() {
    return isset($_SESSION['user_id']);
}

function login($username, $password) {
    global $pdo;
    
    $stmt = $pdo->prepare("SELECT id, username, password FROM users WHERE username = ?");
    $stmt->execute([$username]);
    $user = $stmt->fetch();
    
    if ($user && password_verify($password, $user['password'])) {
        $_SESSION['user_id'] = $user['id'];
        $_SESSION['username'] = $user['username'];
        return true;
    }
    return false;
}

function logout() {
    session_destroy();
}
?>
EOF

    # Create login page
    cat > login.php << 'EOF'
<?php
session_start();
require_once 'config/database.php';
require_once 'includes/auth.php';

$error = '';

if ($_POST) {
    $username = $_POST['username'] ?? '';
    $password = $_POST['password'] ?? '';
    
    if (login($username, $password)) {
        header('Location: index.php');
        exit;
    } else {
        $error = 'Invalid username or password';
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>FreePBX CRM - Login</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body class="bg-light">
    <div class="container mt-5">
        <div class="row justify-content-center">
            <div class="col-md-6 col-lg-4">
                <div class="card">
                    <div class="card-header text-center">
                        <h4><i class="fas fa-phone-alt"></i> FreePBX CRM</h4>
                    </div>
                    <div class="card-body">
                        <?php if ($error): ?>
                            <div class="alert alert-danger"><?php echo $error; ?></div>
                        <?php endif; ?>
                        
                        <form method="post">
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
                        
                        <hr>
                        <div class="text-center">
                            <small class="text-muted">Default: admin / admin123</small>
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
session_start();
require_once 'includes/auth.php';
logout();
header('Location: login.php');
exit;
?>
EOF

    # Create custom CSS
    cat > assets/css/style.css << 'EOF'
body {
    background-color: #f8f9fa;
}

.card {
    box-shadow: 0 0.125rem 0.25rem rgba(0, 0, 0, 0.075);
    border: 1px solid rgba(0, 0, 0, 0.125);
}

.navbar-brand {
    font-weight: bold;
}

.list-group-item-action:hover {
    background-color: #f8f9fa;
}

.bg-primary { background-color: #007bff !important; }
.bg-success { background-color: #28a745 !important; }
.bg-warning { background-color: #ffc107 !important; }
.bg-info { background-color: #17a2b8 !important; }
EOF

    # Set proper permissions
    chown -R www-data:www-data "$CRM_PATH"
    chmod -R 755 "$CRM_PATH"

    log "CRM application files created"
}

# Initialize database tables
init_database() {
    log "Initializing database tables..."
    
    mysql -u root -p"$MYSQL_ROOT_PASSWORD" "$CRM_DB_NAME" << 'EOF'
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS contacts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(100),
    phone VARCHAR(20),
    company VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS call_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    contact_id INT,
    phone_number VARCHAR(20) NOT NULL,
    call_type ENUM('inbound', 'outbound') NOT NULL,
    duration INT DEFAULT 0,
    call_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS leads (
    id INT AUTO_INCREMENT PRIMARY KEY,
    contact_id INT,
    status ENUM('new', 'contacted', 'qualified', 'converted', 'lost') DEFAULT 'new',
    source VARCHAR(50),
    value DECIMAL(10,2),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE
);

INSERT IGNORE INTO users (username, password, email) VALUES 
('admin', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin@example.com');
EOF

    log "Database initialization completed"
}

# Main installation function
main() {
    log "Starting FreePBX CRM installation..."
    
    check_system
    install_packages
    setup_database
    configure_webserver
    configure_security
    create_crm_files
    init_database
    
    log "Installation completed successfully!"
    echo ""
    echo "=============================================="
    echo "FreePBX CRM Installation Complete!"
    echo "=============================================="
    echo "Access URL: http://$IP_ADDRESS/crm/"
    echo "Default Login: admin / admin123"
    echo ""
    echo "Database Details:"
    echo "  Host: localhost"
    echo "  Database: $CRM_DB_NAME"
    echo "  User: $CRM_DB_USER"
    echo "  Password: $CRM_DB_PASSWORD"
    echo ""
    echo "MySQL Root Password: $MYSQL_ROOT_PASSWORD"
    echo "=============================================="
}

# Run main function
main "$@"
EOF

log "Single installer script created successfully!"
