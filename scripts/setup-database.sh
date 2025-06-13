
#!/bin/bash

source "$(dirname "$0")/utils.sh"

setup_database() {
    log "Configuring MySQL..."
    systemctl start mysql
    systemctl enable mysql

    # Set config vars if not already set
    if [[ -z "${MYSQL_ROOT_PASSWORD}" ]]; then
        set_config_vars
    fi

    # Use Jericho-specific database variables if available
    local db_name="${DB_NAME:-${CRM_DB_NAME}}"
    local db_user="${DB_USER:-${CRM_DB_USER}}"
    local db_pass="${DB_PASS:-${CRM_DB_PASSWORD}}"

    log "Setting up database: ${db_name}"

    # Secure MySQL installation
    mysql -e "ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY '${MYSQL_ROOT_PASSWORD}';" || true
    mysql -u root -p"${MYSQL_ROOT_PASSWORD}" -e "DELETE FROM mysql.user WHERE User='';" || true
    mysql -u root -p"${MYSQL_ROOT_PASSWORD}" -e "DELETE FROM mysql.user WHERE User='root' AND Host NOT IN ('localhost', '127.0.0.1', '::1');" || true
    mysql -u root -p"${MYSQL_ROOT_PASSWORD}" -e "DROP DATABASE IF EXISTS test;" || true
    mysql -u root -p"${MYSQL_ROOT_PASSWORD}" -e "DELETE FROM mysql.db WHERE Db='test' OR Db='test\\_%';" || true
    mysql -u root -p"${MYSQL_ROOT_PASSWORD}" -e "FLUSH PRIVILEGES;" || true

    # Create CRM database and user
    log "Creating CRM database: ${db_name}"
    mysql -u root -p"${MYSQL_ROOT_PASSWORD}" -e "DROP DATABASE IF EXISTS ${db_name};" || true
    mysql -u root -p"${MYSQL_ROOT_PASSWORD}" -e "CREATE DATABASE ${db_name} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
    mysql -u root -p"${MYSQL_ROOT_PASSWORD}" -e "DROP USER IF EXISTS '${db_user}'@'localhost';" || true
    mysql -u root -p"${MYSQL_ROOT_PASSWORD}" -e "CREATE USER '${db_user}'@'localhost' IDENTIFIED BY '${db_pass}';"
    mysql -u root -p"${MYSQL_ROOT_PASSWORD}" -e "GRANT ALL PRIVILEGES ON ${db_name}.* TO '${db_user}'@'localhost';"
    mysql -u root -p"${MYSQL_ROOT_PASSWORD}" -e "FLUSH PRIVILEGES;"

    log "Database setup completed"
}
