
#!/bin/bash

source "$(dirname "$0")/utils.sh"

setup_crm_application() {
    # Delete existing CRM folder if it exists
    if [ -d "$CRM_PATH" ]; then
        warning "Existing CRM folder found at $CRM_PATH - removing it..."
        rm -rf "$CRM_PATH"
        log "Existing CRM folder removed successfully"
    fi

    log "Setting up CRM application structure at $CRM_PATH..."
    mkdir -p $CRM_PATH/{api,assets,config,includes,uploads,recordings,logs,backup}

    # Create database schema
    cat > $CRM_PATH/schema.sql << 'EOF'
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
VALUES ('admin', 'admin@company.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'administrator', 'System', 'Administrator')
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

    # Create configuration files and application files
    create_config_files
    create_application_files

    log "CRM application setup completed"
}

create_config_files() {
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
}

create_application_files() {
    # Create application files in separate script for better organization
    source "$(dirname "$0")/create-app-files.sh"
    create_main_files
    create_api_files
    create_includes_files
    create_asset_files
}
