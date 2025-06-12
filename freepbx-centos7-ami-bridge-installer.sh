
#!/bin/bash

# FreePBX CentOS 7 AMI Bridge Installer
# Complete installation script for the AMI bridge server

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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
if [ "$EUID" -ne 0 ]; then
    error "This script must be run as root. Use: sudo $0"
    exit 1
fi

# Configuration
AMI_BRIDGE_DIR="/opt/ami-bridge"
SERVICE_USER="amibridge"
AMI_USER="crm-user"
AMI_PASSWORD="$(openssl rand -base64 32)"

log "Starting FreePBX AMI Bridge installation for CentOS 7"

# Install Node.js 18 (LTS)
install_nodejs() {
    log "Installing Node.js 18..."
    
    # Remove existing Node.js
    yum remove -y nodejs npm 2>/dev/null || true
    
    # Install Node.js 18 from NodeSource
    curl -fsSL https://rpm.nodesource.com/setup_18.x | bash -
    yum install -y nodejs
    
    # Verify installation
    NODE_VERSION=$(node --version)
    NPM_VERSION=$(npm --version)
    log "Node.js installed: $NODE_VERSION"
    log "NPM installed: $NPM_VERSION"
}

# Create service user
create_service_user() {
    log "Creating service user..."
    
    if ! id "$SERVICE_USER" &>/dev/null; then
        useradd -r -s /bin/false -d "$AMI_BRIDGE_DIR" "$SERVICE_USER"
        log "Created user: $SERVICE_USER"
    else
        warning "User $SERVICE_USER already exists"
    fi
}

# Create application directory and files
create_application() {
    log "Creating AMI Bridge application..."
    
    # Create directory
    mkdir -p "$AMI_BRIDGE_DIR"
    cd "$AMI_BRIDGE_DIR"
    
    # Create package.json
    cat > package.json << 'EOF'
{
  "name": "freepbx-ami-bridge",
  "version": "1.0.0",
  "description": "AMI Bridge for FreePBX CRM integration",
  "main": "ami-bridge.js",
  "scripts": {
    "start": "node ami-bridge.js",
    "dev": "nodemon ami-bridge.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "ws": "^8.14.2",
    "cors": "^2.8.5"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  }
}
EOF

    # Install dependencies
    log "Installing Node.js dependencies..."
    npm install

    # Create main application file
    cat > ami-bridge.js << 'EOF'
const express = require('express');
const WebSocket = require('ws');
const net = require('net');
const cors = require('cors');
const { EventEmitter } = require('events');
const fs = require('fs');
const path = require('path');

class AMIBridge extends EventEmitter {
  constructor(config) {
    super();
    this.config = config;
    this.socket = null;
    this.isConnected = false;
    this.actionId = 0;
    this.pendingActions = new Map();
    this.buffer = '';
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }

  connect() {
    return new Promise((resolve, reject) => {
      console.log(`[AMI Bridge] Connecting to ${this.config.host}:${this.config.port}`);
      
      this.socket = new net.Socket();
      
      this.socket.connect(this.config.port, this.config.host, () => {
        console.log('[AMI Bridge] Connected to Asterisk Manager Interface');
        this.login().then(resolve).catch(reject);
      });

      this.socket.on('data', (data) => {
        this.handleData(data);
      });

      this.socket.on('close', () => {
        console.log('[AMI Bridge] AMI connection closed');
        this.isConnected = false;
        this.emit('disconnected');
        this.scheduleReconnect();
      });

      this.socket.on('error', (error) => {
        console.error('[AMI Bridge] Connection error:', error);
        reject(error);
      });
    });
  }

  scheduleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`[AMI Bridge] Reconnecting in 5 seconds (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      setTimeout(() => {
        this.connect().catch((error) => {
          console.error('[AMI Bridge] Reconnection failed:', error);
        });
      }, 5000);
    }
  }

  async login() {
    const loginAction = {
      Action: 'Login',
      Username: this.config.username,
      Secret: this.config.password,
      Events: 'on'
    };

    const response = await this.sendAction(loginAction);
    if (response.Response === 'Success') {
      this.isConnected = true;
      this.reconnectAttempts = 0;
      console.log('[AMI Bridge] Successfully logged in to AMI');
      return true;
    } else {
      throw new Error('AMI Login failed: ' + response.Message);
    }
  }

  sendAction(action) {
    return new Promise((resolve, reject) => {
      if (!this.socket || !this.isConnected) {
        reject(new Error('Not connected to AMI'));
        return;
      }

      const actionId = ++this.actionId;
      action.ActionID = actionId.toString();

      let message = '';
      for (const [key, value] of Object.entries(action)) {
        message += `${key}: ${value}\r\n`;
      }
      message += '\r\n';

      this.pendingActions.set(actionId.toString(), { resolve, reject, timestamp: Date.now() });

      console.log('[AMI Bridge] Sending action:', action);
      this.socket.write(message);

      setTimeout(() => {
        if (this.pendingActions.has(actionId.toString())) {
          this.pendingActions.delete(actionId.toString());
          reject(new Error('Action timeout'));
        }
      }, 10000);
    });
  }

  handleData(data) {
    this.buffer += data.toString();
    
    while (true) {
      const messageEnd = this.buffer.indexOf('\r\n\r\n');
      if (messageEnd === -1) break;

      const messageData = this.buffer.substring(0, messageEnd);
      this.buffer = this.buffer.substring(messageEnd + 4);

      const message = this.parseMessage(messageData);
      this.handleMessage(message);
    }
  }

  parseMessage(data) {
    const lines = data.split('\r\n');
    const message = {};
    
    for (const line of lines) {
      const colonIndex = line.indexOf(':');
      if (colonIndex !== -1) {
        const key = line.substring(0, colonIndex).trim();
        const value = line.substring(colonIndex + 1).trim();
        message[key] = value;
      }
    }
    
    return message;
  }

  handleMessage(message) {
    console.log('[AMI Bridge] Received message:', message);

    if (message.ActionID && this.pendingActions.has(message.ActionID)) {
      const pending = this.pendingActions.get(message.ActionID);
      this.pendingActions.delete(message.ActionID);
      pending.resolve(message);
    }

    if (message.Event) {
      this.emit('event', message);
    }
  }

  async originateCall(channel, extension, context = 'from-internal', callerID = null) {
    const originateAction = {
      Action: 'Originate',
      Channel: channel,
      Exten: extension,
      Context: context,
      Priority: '1',
      Timeout: '30000',
      CallerID: callerID || `CRM Call <${extension}>`,
      Async: 'true'
    };

    try {
      const response = await this.sendAction(originateAction);
      console.log('[AMI Bridge] Originate response:', response);
      return response.Response === 'Success';
    } catch (error) {
      console.error('[AMI Bridge] Originate error:', error);
      return false;
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.end();
      this.socket = null;
      this.isConnected = false;
    }
  }
}

// Load configuration
let config;
try {
  config = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8'));
} catch (error) {
  console.error('Configuration file not found or invalid. Please create config.json');
  process.exit(1);
}

// Express server setup
const app = express();
const port = config.server?.port || 3001;
const wsPort = config.server?.websocketPort || 8080;

app.use(cors({
  origin: config.security?.allowedOrigins || ['http://localhost:5173'],
  credentials: true
}));
app.use(express.json());

// AMI Bridge instance
let amiBridge = null;

// WebSocket server
const wss = new WebSocket.Server({ port: wsPort });

wss.on('connection', (ws) => {
  console.log('[WebSocket] Client connected');

  if (amiBridge) {
    ws.send(JSON.stringify({
      type: 'status',
      connected: amiBridge.isConnected
    }));

    const eventHandler = (event) => {
      ws.send(JSON.stringify({
        type: 'event',
        data: event
      }));
    };

    amiBridge.on('event', eventHandler);

    ws.on('close', () => {
      console.log('[WebSocket] Client disconnected');
      if (amiBridge) {
        amiBridge.removeListener('event', eventHandler);
      }
    });
  }
});

// API Routes
app.post('/api/ami/connect', async (req, res) => {
  try {
    const { host, port, username, password } = req.body;
    
    if (amiBridge) {
      amiBridge.disconnect();
    }

    amiBridge = new AMIBridge({ host, port, username, password });
    await amiBridge.connect();
    
    res.json({ success: true, message: 'Connected to AMI successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/ami/originate', async (req, res) => {
  try {
    if (!amiBridge || !amiBridge.isConnected) {
      return res.status(400).json({ success: false, error: 'Not connected to AMI' });
    }

    const { channel, extension, context, callerID } = req.body;
    
    if (!channel || !extension) {
      return res.status(400).json({ success: false, error: 'Channel and extension are required' });
    }

    const success = await amiBridge.originateCall(channel, extension, context, callerID);
    
    res.json({ 
      success, 
      message: success ? 'Call originated successfully' : 'Failed to originate call'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/ami/status', (req, res) => {
  res.json({
    connected: amiBridge ? amiBridge.isConnected : false,
    timestamp: new Date().toISOString()
  });
});

app.post('/api/ami/disconnect', (req, res) => {
  if (amiBridge) {
    amiBridge.disconnect();
    amiBridge = null;
  }
  res.json({ success: true, message: 'Disconnected from AMI' });
});

// Auto-connect if configuration exists
if (config.ami) {
  console.log('[AMI Bridge] Auto-connecting with configuration...');
  amiBridge = new AMIBridge(config.ami);
  amiBridge.connect().catch((error) => {
    console.error('[AMI Bridge] Auto-connect failed:', error);
  });
}

app.listen(port, () => {
  console.log(`[AMI Bridge Server] Running on port ${port}`);
  console.log(`[WebSocket Server] Running on port ${wsPort}`);
});

process.on('SIGINT', () => {
  console.log('\n[AMI Bridge] Shutting down...');
  if (amiBridge) {
    amiBridge.disconnect();
  }
  process.exit(0);
});
EOF

    # Create configuration file
    cat > config.json << EOF
{
  "ami": {
    "host": "127.0.0.1",
    "port": 5038,
    "username": "$AMI_USER",
    "password": "$AMI_PASSWORD"
  },
  "server": {
    "port": 3001,
    "websocketPort": 8080
  },
  "security": {
    "allowedOrigins": ["http://localhost:5173", "https://yourdomain.com"]
  }
}
EOF

    # Set permissions
    chown -R "$SERVICE_USER:$SERVICE_USER" "$AMI_BRIDGE_DIR"
    chmod 755 "$AMI_BRIDGE_DIR"
    chmod 600 "$AMI_BRIDGE_DIR/config.json"
    
    log "AMI Bridge application created"
}

# Configure FreePBX AMI
configure_freepbx_ami() {
    log "Configuring FreePBX AMI..."
    
    # Backup original manager.conf
    cp /etc/asterisk/manager.conf /etc/asterisk/manager.conf.backup.$(date +%Y%m%d_%H%M%S) 2>/dev/null || true
    
    # Check if AMI user already exists
    if ! grep -q "\[$AMI_USER\]" /etc/asterisk/manager.conf; then
        cat >> /etc/asterisk/manager.conf << EOF

[$AMI_USER]
secret = $AMI_PASSWORD
permit = 127.0.0.1/255.255.255.255
read = system,call,log,verbose,command,agent,user,config,dtmf,reporting,cdr,dialplan
write = system,call,log,verbose,command,agent,user,config,dtmf,reporting,cdr,dialplan
EOF
        log "Added AMI user: $AMI_USER"
    else
        warning "AMI user $AMI_USER already exists in manager.conf"
    fi
    
    # Ensure AMI is enabled
    sed -i 's/enabled = no/enabled = yes/' /etc/asterisk/manager.conf
    sed -i 's/^;enabled = yes/enabled = yes/' /etc/asterisk/manager.conf
    
    # Reload Asterisk manager
    asterisk -rx "manager reload" 2>/dev/null || true
    
    log "FreePBX AMI configured"
}

# Create systemd service
create_systemd_service() {
    log "Creating systemd service..."
    
    cat > /etc/systemd/system/ami-bridge.service << EOF
[Unit]
Description=FreePBX AMI Bridge
After=network.target asterisk.service
Wants=asterisk.service

[Service]
Type=simple
User=$SERVICE_USER
WorkingDirectory=$AMI_BRIDGE_DIR
ExecStart=/usr/bin/node ami-bridge.js
Restart=always
RestartSec=5
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

    # Reload systemd and enable service
    systemctl daemon-reload
    systemctl enable ami-bridge
    
    log "Systemd service created"
}

# Configure firewall
configure_firewall() {
    log "Configuring firewall..."
    
    # Check if firewalld is running
    if systemctl is-active --quiet firewalld; then
        firewall-cmd --permanent --add-port=3001/tcp
        firewall-cmd --permanent --add-port=8080/tcp
        firewall-cmd --reload
        log "Firewalld rules added"
    # Check if iptables is available
    elif command -v iptables >/dev/null; then
        iptables -A INPUT -p tcp --dport 3001 -j ACCEPT
        iptables -A INPUT -p tcp --dport 8080 -j ACCEPT
        service iptables save 2>/dev/null || true
        log "Iptables rules added"
    else
        warning "No firewall detected. Please manually open ports 3001 and 8080"
    fi
}

# Start services
start_services() {
    log "Starting AMI Bridge service..."
    
    systemctl start ami-bridge
    sleep 3
    
    if systemctl is-active --quiet ami-bridge; then
        log "AMI Bridge service started successfully"
    else
        error "Failed to start AMI Bridge service"
        systemctl status ami-bridge
        exit 1
    fi
}

# Create management script
create_management_script() {
    cat > /usr/local/bin/ami-bridge-status << 'EOF'
#!/bin/bash
echo "FreePBX AMI Bridge Status"
echo "========================"
echo "Service Status: $(systemctl is-active ami-bridge)"
echo "Service Enabled: $(systemctl is-enabled ami-bridge)"
echo ""
echo "Network Ports:"
netstat -tlnp | grep -E ':(3001|8080)' || echo "No listening ports found"
echo ""
echo "Service Logs (last 10 lines):"
journalctl -u ami-bridge --no-pager -n 10
EOF

    chmod +x /usr/local/bin/ami-bridge-status
    
    cat > /usr/local/bin/ami-bridge-restart << 'EOF'
#!/bin/bash
echo "Restarting AMI Bridge service..."
systemctl restart ami-bridge
sleep 2
systemctl status ami-bridge
EOF

    chmod +x /usr/local/bin/ami-bridge-restart
}

# Main installation
main() {
    log "Starting installation..."
    
    install_nodejs
    create_service_user
    create_application
    configure_freepbx_ami
    create_systemd_service
    configure_firewall
    start_services
    create_management_script
    
    log "Installation completed successfully!"
    echo ""
    echo "================================================================"
    echo "FreePBX AMI Bridge Installation Complete!"
    echo "================================================================"
    echo ""
    echo "Service Information:"
    echo "  Installation Directory: $AMI_BRIDGE_DIR"
    echo "  Service User: $SERVICE_USER"
    echo "  API Port: 3001"
    echo "  WebSocket Port: 8080"
    echo ""
    echo "AMI Configuration:"
    echo "  AMI User: $AMI_USER"
    echo "  AMI Password: $AMI_PASSWORD"
    echo ""
    echo "Management Commands:"
    echo "  Check Status: ami-bridge-status"
    echo "  Restart Service: ami-bridge-restart"
    echo "  View Logs: journalctl -u ami-bridge -f"
    echo ""
    echo "API Endpoints:"
    echo "  http://localhost:3001/api/ami/status"
    echo "  http://localhost:3001/api/ami/connect"
    echo "  http://localhost:3001/api/ami/originate"
    echo ""
    echo "WebSocket: ws://localhost:8080"
    echo "================================================================"
    echo ""
    echo "IMPORTANT: Save the AMI password shown above!"
    echo "You'll need it to configure your CRM frontend."
}

# Run installation
main "$@"
EOF
