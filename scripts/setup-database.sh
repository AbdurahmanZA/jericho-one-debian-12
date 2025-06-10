
#!/bin/bash

source "$(dirname "$0")/utils.sh"

setup_database() {
    log "Configuring database server..."
    
    # Determine if we're using MySQL or MariaDB
    if systemctl list-units --full -all | grep -Fq "mysql.service"; then
        DB_SERVICE="mysql"
        log "Using MySQL server"
    elif systemctl list-units --full -all | grep -Fq "mariadb.service"; then
        DB_SERVICE="mariadb"
        log "Using MariaDB server"
    else
        error "No database service found (mysql or mariadb)"
        exit 1
    fi
    
    systemctl start $DB_SERVICE
    systemctl enable $DB_SERVICE

    # Wait for database to be ready
    sleep 5

    # Secure database installation
    log "Securing database installation..."
    mysql -e "ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY '$MYSQL_ROOT_PASSWORD';" 2>/dev/null || \
    mysql -e "SET PASSWORD FOR 'root'@'localhost' = PASSWORD('$MYSQL_ROOT_PASSWORD');" 2>/dev/null || \
    mysqladmin -u root password "$MYSQL_ROOT_PASSWORD" 2>/dev/null || true

    mysql -u root -p$MYSQL_ROOT_PASSWORD -e "DELETE FROM mysql.user WHERE User='';" 2>/dev/null || true
    mysql -u root -p$MYSQL_ROOT_PASSWORD -e "DELETE FROM mysql.user WHERE User='root' AND Host NOT IN ('localhost', '127.0.0.1', '::1');" 2>/dev/null || true
    mysql -u root -p$MYSQL_ROOT_PASSWORD -e "DROP DATABASE IF EXISTS test;" 2>/dev/null || true
    mysql -u root -p$MYSQL_ROOT_PASSWORD -e "DELETE FROM mysql.db WHERE Db='test' OR Db='test\\_%';" 2>/dev/null || true
    mysql -u root -p$MYSQL_ROOT_PASSWORD -e "FLUSH PRIVILEGES;" 2>/dev/null || true

    # Create CRM database and user
    log "Creating CRM database..."
    mysql -u root -p$MYSQL_ROOT_PASSWORD -e "DROP DATABASE IF EXISTS $CRM_DB_NAME;"
    mysql -u root -p$MYSQL_ROOT_PASSWORD -e "CREATE DATABASE $CRM_DB_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
    mysql -u root -p$MYSQL_ROOT_PASSWORD -e "DROP USER IF EXISTS '$CRM_DB_USER'@'localhost';" 2>/dev/null || true
    mysql -u root -p$MYSQL_ROOT_PASSWORD -e "CREATE USER '$CRM_DB_USER'@'localhost' IDENTIFIED BY '$CRM_DB_PASSWORD';"
    mysql -u root -p$MYSQL_ROOT_PASSWORD -e "GRANT ALL PRIVILEGES ON $CRM_DB_NAME.* TO '$CRM_DB_USER'@'localhost';"
    mysql -u root -p$MYSQL_ROOT_PASSWORD -e "FLUSH PRIVILEGES;"

    log "Database setup completed"
}
