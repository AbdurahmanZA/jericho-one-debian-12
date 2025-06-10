
#!/bin/bash

source "$(dirname "$0")/utils.sh"

configure_webserver() {
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

    log "Web server configuration completed"
}
