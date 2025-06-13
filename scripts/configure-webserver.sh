
#!/bin/bash

source "$(dirname "$0")/utils.sh"

configure_webserver() {
    log "Configuring PHP for Jericho CRM..."
    PHP_VERSION=$(php -v | head -n1 | cut -d' ' -f2 | cut -d'.' -f1,2)
    PHP_INI="/etc/php/$PHP_VERSION/apache2/php.ini"

    # Backup original PHP configuration
    cp $PHP_INI $PHP_INI.backup

    # Configure PHP settings for Jericho CRM
    sed -i 's/upload_max_filesize = .*/upload_max_filesize = 100M/' $PHP_INI
    sed -i 's/post_max_size = .*/post_max_size = 100M/' $PHP_INI
    sed -i 's/max_execution_time = .*/max_execution_time = 300/' $PHP_INI
    sed -i 's/memory_limit = .*/memory_limit = 512M/' $PHP_INI
    sed -i 's/max_input_vars = .*/max_input_vars = 3000/' $PHP_INI
    sed -i 's/;date.timezone.*/date.timezone = "UTC"/' $PHP_INI

    log "Configuring Apache for Jericho deployment..."
    a2enmod rewrite ssl headers expires deflate
    systemctl start apache2
    systemctl enable apache2

    # Create Apache virtual host for Jericho CRM at /jericho path
    cat > /etc/apache2/sites-available/jericho-crm.conf << EOF
<VirtualHost *:80>
    ServerName $IP_ADDRESS
    DocumentRoot $WEB_ROOT
    
    # Main document root
    <Directory $WEB_ROOT>
        AllowOverride All
        Require all granted
        DirectoryIndex index.php index.html
        Options -Indexes +FollowSymLinks
    </Directory>
    
    # Jericho CRM application directory
    <Directory $CRM_PATH>
        AllowOverride All
        Require all granted
        DirectoryIndex index.html
        Options -Indexes +FollowSymLinks
        
        # Security headers for Jericho
        Header always set X-Content-Type-Options nosniff
        Header always set X-Frame-Options SAMEORIGIN
        Header always set X-XSS-Protection "1; mode=block"
        Header always set Referrer-Policy "strict-origin-when-cross-origin"
        
        # Cache control for static assets
        <FilesMatch "\.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf)$">
            ExpiresActive On
            ExpiresDefault "access plus 1 month"
            Header append Cache-Control "public, immutable"
        </FilesMatch>
    </Directory>
    
    # API endpoint protection
    <LocationMatch "^/jericho/api/">
        Header always set Access-Control-Allow-Origin "http://$IP_ADDRESS"
        Header always set Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS"
        Header always set Access-Control-Allow-Headers "Content-Type, Authorization"
    </LocationMatch>
    
    # FreePBX integration - reverse proxy for AMI if needed
    # ProxyPreserveHost On
    # ProxyPass /jericho/api/ami/ http://127.0.0.1:5038/
    # ProxyPassReverse /jericho/api/ami/ http://127.0.0.1:5038/
    
    # Default redirect to FreePBX admin (optional)
    RedirectMatch ^/$ /admin/
    
    # Logging for Jericho
    ErrorLog \${APACHE_LOG_DIR}/jericho_error.log
    CustomLog \${APACHE_LOG_DIR}/jericho_access.log combined
    
    # Custom log format for debugging
    LogFormat "%h %l %u %t \"%r\" %>s %O \"%{Referer}i\" \"%{User-Agent}i\" %D" jericho_combined
    CustomLog \${APACHE_LOG_DIR}/jericho_debug.log jericho_combined
</VirtualHost>

# HTTPS configuration (uncomment and configure certificates as needed)
# <VirtualHost *:443>
#     ServerName $IP_ADDRESS
#     DocumentRoot $WEB_ROOT
#     
#     SSLEngine on
#     SSLCertificateFile /etc/ssl/certs/jericho.crt
#     SSLCertificateKeyFile /etc/ssl/private/jericho.key
#     
#     # Include same directory configurations as HTTP
# </VirtualHost>
EOF

    # Enable Jericho site and disable default
    a2ensite jericho-crm.conf
    a2dissite 000-default.conf || true

    # Create Jericho-specific Apache configuration
    cat > /etc/apache2/conf-available/jericho-security.conf << EOF
# Jericho CRM Security Configuration

# Hide Apache version
ServerTokens Prod
ServerSignature Off

# Security headers
Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains"
Header always set Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'"

# Prevent access to sensitive files
<FilesMatch "(^#.*#|\.(bak|conf|dist|fla|inc|ini|log|psd|sh|sql|sw[op])|~)$">
    Require all denied
</FilesMatch>

# Prevent access to .htaccess and .htpasswd files
<Files ".ht*">
    Require all denied
</Files>

# Prevent access to version control directories
<DirectoryMatch "/\.(svn|git|hg|bzr)">
    Require all denied
</DirectoryMatch>
EOF

    a2enconf jericho-security

    # Create .htaccess for Jericho CRM
    cat > "$CRM_PATH/.htaccess" << EOF
# Jericho CRM .htaccess Configuration

# Enable URL rewriting
RewriteEngine On

# Handle client-side routing (React Router)
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /jericho/index.html [L]

# Security headers
Header always set X-Content-Type-Options nosniff
Header always set X-Frame-Options SAMEORIGIN
Header always set X-XSS-Protection "1; mode=block"

# Cache control
<FilesMatch "\.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf)$">
    ExpiresActive On
    ExpiresDefault "access plus 1 month"
    Header append Cache-Control "public, immutable"
</FilesMatch>

# Prevent access to sensitive files in Jericho
<FilesMatch "(package\.json|\.env|config\.js|\.map)$">
    Require all denied
</FilesMatch>
EOF

    log "Apache configuration for Jericho completed"
    log "Jericho CRM will be accessible at: http://$IP_ADDRESS/jericho/"
}
