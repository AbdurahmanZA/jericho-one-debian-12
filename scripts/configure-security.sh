
#!/bin/bash

source "$(dirname "$0")/utils.sh"

configure_security() {
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

    log "Security configuration completed"
}

restart_services() {
    log "Restarting services..."
    systemctl restart apache2
    systemctl restart mysql
    systemctl restart asterisk
}

create_status_script() {
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
}

create_installation_summary() {
    log "Creating installation summary..."
    cat > $CRM_PATH/INSTALLATION_INFO.txt << EOF
FreePBX CRM Installation Summary
===============================
Installation Date: $(date)
System: $(cat /etc/os-release | grep PRETTY_NAME | cut -d'"' -f2)
IP Address: $IP_ADDRESS
Hostname: $HOSTNAME

Access Information:
- Web Interface: http://$IP_ADDRESS/crm/
- Default Username: admin
- Default Password: admin123

Security Features:
- Firewall: UFW enabled
- Intrusion Prevention: Fail2ban active
- SSL Ready: Certbot installed

For system status: freepbx-crm-status
EOF
}
