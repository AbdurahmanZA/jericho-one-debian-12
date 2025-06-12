
#!/bin/bash

# FreePBX CentOS 7 AMI Bridge - FreePBX Configuration

source "$(dirname "$0")/bridge-utils.sh"

# Configure FreePBX AMI
configure_freepbx_ami() {
    local ami_user="$1"
    local ami_password="$2"
    
    log "Configuring FreePBX AMI..."
    
    # Backup original manager.conf
    cp /etc/asterisk/manager.conf /etc/asterisk/manager.conf.backup.$(date +%Y%m%d_%H%M%S) 2>/dev/null || true
    
    # Check if AMI user already exists
    if ! grep -q "\[$ami_user\]" /etc/asterisk/manager.conf; then
        cat >> /etc/asterisk/manager.conf << EOF

[$ami_user]
secret = $ami_password
permit = 127.0.0.1/255.255.255.255
read = system,call,log,verbose,command,agent,user,config,dtmf,reporting,cdr,dialplan
write = system,call,log,verbose,command,agent,user,config,dtmf,reporting,cdr,dialplan
EOF
        log "Added AMI user: $ami_user"
    else
        warning "AMI user $ami_user already exists in manager.conf"
    fi
    
    # Ensure AMI is enabled
    sed -i 's/enabled = no/enabled = yes/' /etc/asterisk/manager.conf
    sed -i 's/^;enabled = yes/enabled = yes/' /etc/asterisk/manager.conf
    
    # Reload Asterisk manager
    asterisk -rx "manager reload" 2>/dev/null || true
    
    log "FreePBX AMI configured"
}
