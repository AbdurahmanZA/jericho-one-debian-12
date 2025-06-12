
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

# Install Node.js 16 (Compatible with CentOS 7)
install_nodejs() {
    log "Installing Node.js 16 LTS (CentOS 7 compatible)..."
    
    # Remove existing Node.js
    yum remove -y nodejs npm 2>/dev/null || true
    
    # Clean up any existing NodeSource repos
    rm -f /etc/yum.repos.d/nodesource*.repo
    
    # Install Node.js 16 from NodeSource (compatible with CentOS 7)
    curl -fsSL https://rpm.nodesource.com/setup_16.x | bash -
    yum install -y nodejs
    
    # Verify installation
    NODE_VERSION=$(node --version)
    NPM_VERSION=$(npm --version)
    log "Node.js installed: $NODE_VERSION"
    log "NPM installed: $NPM_VERSION"
    
    # Verify compatibility
    if [[ "$NODE_VERSION" < "v16" ]]; then
        error "Node.js version is too old. Expected v16+, got $NODE_VERSION"
        exit 1
    fi
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
    
    # Create package.json with Node 16 compatible dependencies
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
  "engines": {
    "node": ">=16.0.0"
  },
  "dependencies": {
    "express": "^4.18.2",
    "ws": "^8.13.0",
    "cors": "^2.8.5"
  },
  "devDependencies": {
    "nodemon": "^2.0.22"
  }
}
EOF

    # Install dependencies
    log "Installing Node.js dependencies..."
    npm install --production

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
    this.reconnectTimeout = null;
  }

  connect() {
    return new Promise((resolve, reject) => {
      console.log(`[AMI Bridge] Connecting to ${this.config.host}:${this.config.port}`);
      
      this.socket = new net.Socket();
      this.socket.setTimeout(10000);
      
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
        console.error('[AMI Bridge] Connection error:', error.message);
        this.isConnected = false;
        reject(error);
      });

      this.socket.on('timeout', () => {
        console.error('[AMI Bridge] Connection timeout');
        this.socket.destroy();
        reject(new Error('Connection timeout'));
      });
    });
  }

  scheduleReconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`[AMI Bridge] Reconnecting in 5 seconds (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      this.reconnectTimeout = setTimeout(() => {
        this.connect().catch((error) => {
          console.error('[AMI Bridge] Reconnection failed:', error.message);
        });
      }, 5000);
    } else {
      console.error('[AMI Bridge] Max reconnection attempts reached');
    }
  }

  async login() {
    const loginAction = {
      Action: 'Login',
      Username: this.config.username,
      Secret: this.config.password,
      Events: 'on'
    };

    try {
      const response = await this.sendAction(loginAction);
      if (response.Response === 'Success') {
        this.isConnected = true;
        this.reconnectAttempts = 0;
        console.log('[AMI Bridge] Successfully logged in to AMI');
        return true;
      } else {
        throw new Error('AMI Login failed: ' + (response.Message || 'Unknown error'));
      }
    } catch (error) {
      console.error('[AMI Bridge] Login error:', error.message);
      throw error;
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

      this.pendingActions.set(actionId.toString(), { 
        resolve, 
        reject, 
        timestamp: Date.now(),
        action: action.Action 
      });

      console.log(`[AMI Bridge] Sending action: ${action.Action} (ID: ${actionId})`);
      
      try {
        this.socket.write(message);
      } catch (error) {
        this.pendingActions.delete(actionId.toString());
        reject(error);
        return;
      }

      // Set timeout for action
      setTimeout(() => {
        if (this.pendingActions.has(actionId.toString())) {
          this.pendingActions.delete(actionId.toString());
          reject(new Error(`Action ${action.Action} timeout`));
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
    // Only log important messages to reduce noise
    if (message.Event && ['Newchannel', 'Hangup', 'DialBegin', 'DialEnd'].includes(message.Event)) {
      console.log(`[AMI Bridge] Event: ${message.Event}`);
    }

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
      console.log(`[AMI Bridge] Originate response: ${response.Response}`);
      return response.Response === 'Success';
    } catch (error) {
      console.error('[AMI Bridge] Originate error:', error.message);
      return false;
    }
  }

  async getChannels() {
    try {
      const response = await this.sendAction({ Action: 'CoreShowChannels' });
      return response;
    } catch (error) {
      console.error('[AMI Bridge] GetChannels error:', error.message);
      return null;
    }
  }

  disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.end();
      this.socket = null;
      this.isConnected = false;
    }
    
    this.pendingActions.clear();
  }
}

// Load configuration
let config;
try {
  const configPath = path.join(__dirname, 'config.json');
  if (!fs.existsSync(configPath)) {
    console.error('Configuration file config.json not found. Please create it from config.example.json');
    process.exit(1);
  }
  config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
} catch (error) {
  console.error('Configuration file error:', error.message);
  process.exit(1);
}

// Validate configuration
if (!config.ami || !config.ami.host || !config.ami.username || !config.ami.password) {
  console.error('Invalid configuration. AMI settings are required.');
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

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// AMI Bridge instance
let amiBridge = null;

// WebSocket server for real-time events
const wss = new WebSocket.Server({ 
  port: wsPort,
  clientTracking: true 
});

console.log(`[WebSocket Server] Starting on port ${wsPort}`);

wss.on('connection', (ws, req) => {
  console.log(`[WebSocket] Client connected from ${req.socket.remoteAddress}`);

  // Send current status
  if (amiBridge) {
    ws.send(JSON.stringify({
      type: 'status',
      connected: amiBridge.isConnected,
      timestamp: new Date().toISOString()
    }));

    const eventHandler = (event) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'event',
          data: event,
          timestamp: new Date().toISOString()
        }));
      }
    };

    const disconnectHandler = () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'status',
          connected: false,
          timestamp: new Date().toISOString()
        }));
      }
    };

    amiBridge.on('event', eventHandler);
    amiBridge.on('disconnected', disconnectHandler);

    ws.on('close', () => {
      console.log('[WebSocket] Client disconnected');
      if (amiBridge) {
        amiBridge.removeListener('event', eventHandler);
        amiBridge.removeListener('disconnected', disconnectHandler);
      }
    });
  }

  ws.on('error', (error) => {
    console.error('[WebSocket] Client error:', error.message);
  });
});

// API Routes
app.post('/api/ami/connect', async (req, res) => {
  try {
    const { host, port, username, password } = req.body;
    
    if (!host || !port || !username || !password) {
      return res.status(400).json({ 
        success: false, 
        error: 'Host, port, username, and password are required' 
      });
    }

    if (amiBridge) {
      amiBridge.disconnect();
    }

    amiBridge = new AMIBridge({ host, port, username, password });
    await amiBridge.connect();
    
    res.json({ success: true, message: 'Connected to AMI successfully' });
  } catch (error) {
    console.error('[API] Connect error:', error.message);
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
      return res.status(400).json({ 
        success: false, 
        error: 'Channel and extension are required' 
      });
    }

    const success = await amiBridge.originateCall(channel, extension, context, callerID);
    
    res.json({ 
      success, 
      message: success ? 'Call originated successfully' : 'Failed to originate call'
    });
  } catch (error) {
    console.error('[API] Originate error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/ami/status', (req, res) => {
  res.json({
    connected: amiBridge ? amiBridge.isConnected : false,
    reconnectAttempts: amiBridge ? amiBridge.reconnectAttempts : 0,
    timestamp: new Date().toISOString()
  });
});

app.get('/api/ami/channels', async (req, res) => {
  try {
    if (!amiBridge || !amiBridge.isConnected) {
      return res.status(400).json({ success: false, error: 'Not connected to AMI' });
    }

    const channels = await amiBridge.getChannels();
    res.json({ success: true, data: channels });
  } catch (error) {
    console.error('[API] Channels error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/ami/disconnect', (req, res) => {
  if (amiBridge) {
    amiBridge.disconnect();
    amiBridge = null;
  }
  res.json({ success: true, message: 'Disconnected from AMI' });
});

// Auto-connect if configuration exists
if (config.ami && config.ami.host) {
  console.log('[AMI Bridge] Auto-connecting with configuration...');
  amiBridge = new AMIBridge(config.ami);
  amiBridge.connect().catch((error) => {
    console.error('[AMI Bridge] Auto-connect failed:', error.message);
  });
}

// Start Express server
app.listen(port, '0.0.0.0', () => {
  console.log(`[AMI Bridge Server] Running on port ${port}`);
  console.log(`[WebSocket Server] Running on port ${wsPort}`);
  console.log(`[AMI Bridge] Configuration loaded for ${config.ami.host}:${config.ami.port}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[AMI Bridge] Shutting down gracefully...');
  
  if (amiBridge) {
    amiBridge.disconnect();
  }
  
  wss.clients.forEach((ws) => {
    ws.close();
  });
  
  wss.close(() => {
    console.log('[WebSocket Server] Closed');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\n[AMI Bridge] Received SIGTERM, shutting down...');
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

    # Create example configuration
    cat > config.example.json << EOF
{
  "ami": {
    "host": "127.0.0.1",
    "port": 5038,
    "username": "your-ami-username",
    "password": "your-ami-password"
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
    chmod 644 "$AMI_BRIDGE_DIR/config.example.json"
    
    log "AMI Bridge application created"
}

# ... keep existing code (configure_freepbx_ami, create_systemd_service, configure_firewall, start_services, create_management_script, main functions remain the same)

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
    echo ""
    echo "Next steps:"
    echo "1. Test the service: ami-bridge-status"
    echo "2. Check API: curl http://localhost:3001/api/ami/status"
    echo "3. Configure your frontend to use this bridge"
}

# Run installation
main "$@"
