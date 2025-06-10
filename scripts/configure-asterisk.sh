
#!/bin/bash

source "$(dirname "$0")/utils.sh"

configure_asterisk() {
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

    log "Asterisk configuration completed"
}
