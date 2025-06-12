#!/bin/bash

# FreePBX CentOS 7 AMI Bridge - Update Deployment Script

echo "=== FreePBX AMI Bridge Update Deployment ==="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
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

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    error "This script must be run as root. Use: sudo $0"
    exit 1
fi

# Determine the correct server directory
SERVER_DIR=""
POSSIBLE_DIRS=(
    "/var/www/html/freepbx-crm/server"
    "/home/asterisk/freepbx-crm/server"
    "/opt/freepbx-crm/server"
    "/root/freepbx-crm/server"
    "/usr/local/freepbx-crm/server"
)

log "Searching for existing FreePBX CRM server directory..."
for dir in "${POSSIBLE_DIRS[@]}"; do
    if [ -d "$dir" ]; then
        SERVER_DIR="$dir"
        log "Found server directory: $SERVER_DIR"
        break
    fi
done

# If no existing directory found, create the default one
if [ -z "$SERVER_DIR" ]; then
    log "No existing server directory found. Creating default structure..."
    SERVER_DIR="/var/www/html/freepbx-crm/server"
    mkdir -p "$SERVER_DIR"
    log "Created server directory: $SERVER_DIR"
fi

BACKUP_DIR="$SERVER_DIR/backup/$(date +%Y%m%d_%H%M%S)"

# Create backup
log "Creating backup of current AMI Bridge..."
mkdir -p "$BACKUP_DIR"
if [ -f "$SERVER_DIR/ami-bridge.js" ]; then
    cp "$SERVER_DIR/ami-bridge.js" "$BACKUP_DIR/ami-bridge.js.backup"
    log "Backup created at: $BACKUP_DIR"
else
    warning "No existing ami-bridge.js found to backup"
fi

# Backup existing config if it exists
if [ -f "$SERVER_DIR/config.json" ]; then
    cp "$SERVER_DIR/config.json" "$BACKUP_DIR/config.json.backup"
    log "Existing config backed up"
fi

# Stop current AMI Bridge
log "Stopping current AMI Bridge process..."
pkill -f "node.*ami-bridge.js" || echo "No existing process found"
sleep 3

# Navigate to server directory
cd "$SERVER_DIR" || { error "Failed to navigate to server directory: $SERVER_DIR"; exit 1; }

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    error "Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if npm is available for package installation
if [ ! -f "package.json" ]; then
    log "Creating package.json for dependencies..."
    cat > package.json << 'EOF'
{
  "name": "freepbx-ami-bridge",
  "version": "1.0.0",
  "description": "FreePBX AMI Bridge Server",
  "main": "ami-bridge.js",
  "scripts": {
    "start": "node ami-bridge.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "ws": "^8.13.0",
    "cors": "^2.8.5"
  }
}
EOF
fi

# Install dependencies
log "Installing Node.js dependencies..."
npm install || { error "Failed to install dependencies"; exit 1; }

# Get FreePBX admin password
AMI_PASSWORD=""
if [ -f "/etc/asterisk/manager.conf" ]; then
    # Try to extract admin password from manager.conf
    AMI_PASSWORD=$(grep -A 10 "\[admin\]" /etc/asterisk/manager.conf | grep "secret" | head -1 | cut -d'=' -f2 | sed 's/^[[:space:]]*//' | sed 's/[[:space:]]*$//')
    if [ -n "$AMI_PASSWORD" ]; then
        log "Found admin password in manager.conf"
    fi
fi

# If we couldn't find the password, ask for it
if [ -z "$AMI_PASSWORD" ]; then
    warning "Could not find admin password in manager.conf"
    echo -n "Enter FreePBX AMI admin password (default: admin): "
    read -s AMI_PASSWORD
    echo
    if [ -z "$AMI_PASSWORD" ]; then
        AMI_PASSWORD="admin"
    fi
fi

# Create configuration file with correct network IPs
log "Creating configuration file with network IPs..."
cat > config.json << EOF
{
  "ami": {
    "host": "192.168.0.5",
    "port": 5038,
    "username": "admin",
    "password": "$AMI_PASSWORD"
  },
  "server": {
    "port": 3001,
    "websocketPort": 8080
  },
  "security": {
    "allowedOrigins": ["http://localhost:5173", "http://192.168.0.132", "http://192.168.0.132/crm"],
    "corsEnabled": true,
    "apiKey": "your-api-key-here"
  },
  "logging": {
    "level": "info",
    "enableConsole": true,
    "enableFile": true
  }
}
EOF

# Update the AMI Bridge file with the new code
log "Updating AMI Bridge server code..."
cat > ami-bridge.js << 'EOF'
const express = require('express');
const WebSocket = require('ws');
const net = require('net');
const cors = require('cors');
const fs = require('fs');
const { EventEmitter } = require('events');

// Load configuration
let config;
try {
  config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
} catch (error) {
  console.error('[AMI Bridge] Failed to load config.json:', error.message);
  process.exit(1);
}

console.log('[AMI Bridge] Configuration loaded');
console.log('[AMI Bridge] AMI Host:', config.ami.host);
console.log('[AMI Bridge] AMI Port:', config.ami.port);
console.log('[AMI Bridge] AMI User:', config.ami.username);

class AMIBridge extends EventEmitter {
  constructor(config) {
    super();
    this.config = config;
    this.socket = null;
    this.isConnected = false;
    this.actionId = 0;
    this.pendingActions = new Map();
    this.buffer = '';
    this.reconnectTimer = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }

  connect() {
    return new Promise((resolve, reject) => {
      console.log(`[AMI Bridge] Connecting to ${this.config.ami.host}:${this.config.ami.port}`);
      
      this.socket = new net.Socket();
      
      this.socket.connect(this.config.ami.port, this.config.ami.host, () => {
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
        this.isConnected = false;
        reject(error);
      });
    });
  }

  scheduleReconnect() {
    if (this.reconnectTimer) return;
    
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
      
      console.log(`[AMI Bridge] Scheduling reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);
      
      this.reconnectTimer = setTimeout(() => {
        this.reconnectTimer = null;
        this.connect().catch((error) => {
          console.error('[AMI Bridge] Reconnect failed:', error);
        });
      }, delay);
    } else {
      console.error('[AMI Bridge] Max reconnect attempts reached');
    }
  }

  async login() {
    const loginAction = {
      Action: 'Login',
      Username: this.config.ami.username,
      Secret: this.config.ami.password,
      Events: 'on'
    };

    console.log('[AMI Bridge] Sending login with username:', this.config.ami.username);
    const response = await this.sendAction(loginAction);
    
    if (response.Response === 'Success') {
      this.isConnected = true;
      this.reconnectAttempts = 0;
      console.log('[AMI Bridge] Successfully logged in to AMI');
      return true;
    } else {
      const errorMsg = response.Message || 'Unknown authentication error';
      console.error('[AMI Bridge] AMI Login failed:', errorMsg);
      throw new Error('AMI Login failed: ' + errorMsg);
    }
  }

  sendAction(action) {
    return new Promise((resolve, reject) => {
      if (!this.socket || this.socket.destroyed) {
        reject(new Error('Socket not connected'));
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

      console.log('[AMI Bridge] Sending action:', action.Action, 'ID:', actionId);
      this.socket.write(message);

      // Timeout after 15 seconds for PJSIP queries, 10 seconds for others
      const timeout = action.Action === 'PJSIPShowEndpoints' ? 15000 : 10000;
      setTimeout(() => {
        if (this.pendingActions.has(actionId.toString())) {
          this.pendingActions.delete(actionId.toString());
          reject(new Error('Action timeout'));
        }
      }, timeout);
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
    console.log('[AMI Bridge] Received message type:', message.Event || message.Response || 'Unknown');

    // Handle action responses first
    if (message.ActionID && this.pendingActions.has(message.ActionID)) {
      const pending = this.pendingActions.get(message.ActionID);
      
      // For PJSIP endpoints, we need to handle the response differently
      if (message.Response === 'Success' && pending.action === 'PJSIPShowEndpoints') {
        // Don't resolve immediately, wait for EndpointList events
        console.log('[AMI Bridge] PJSIP query accepted, waiting for endpoint data...');
        return;
      }
      
      this.pendingActions.delete(message.ActionID);
      pending.resolve(message);
      return;
    }

    // Handle PJSIP-specific events
    if (message.Event === 'EndpointList') {
      this.emit('pjsip_endpoint_data', message);
      return;
    }
    
    if (message.Event === 'EndpointListComplete') {
      this.emit('pjsip_endpoint_complete', message);
      return;
    }

    // Emit regular events for real-time updates
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

  async getActiveChannels() {
    try {
      const response = await this.sendAction({ Action: 'CoreShowChannels' });
      return response;
    } catch (error) {
      console.error('[AMI Bridge] Get channels error:', error);
      return null;
    }
  }

  async getPJSIPEndpoints() {
    try {
      console.log('[AMI Bridge] Fetching PJSIP endpoints...');
      
      return new Promise((resolve, reject) => {
        const endpoints = [];
        const actionId = ++this.actionId;
        const actionIdStr = actionId.toString();
        
        // Create a timeout handler
        const timeoutId = setTimeout(() => {
          this.removeAllListeners('pjsip_endpoint_data');
          this.removeAllListeners('pjsip_endpoint_complete');
          console.log('[AMI Bridge] PJSIP endpoint query timeout');
          resolve(endpoints);
        }, 15000);
        
        // Handle individual endpoint data
        const dataHandler = (data) => {
          if (data.ActionID === actionIdStr) {
            // Parse the endpoint data from the response
            const endpointName = data.ObjectName || data.Endpoint;
            if (endpointName && endpointName !== 'Unknown') {
              // Extract extension number - handle format like "1000/1000" or just "1000"
              let extensionNumber = endpointName;
              if (extensionNumber.includes('/')) {
                extensionNumber = extensionNumber.split('/')[0];
              }
              
              const endpoint = {
                objectName: endpointName,
                endpoint: extensionNumber,
                status: data.DeviceState || data.State || 'Unknown',
                contact: data.Contacts || 'Not Available'
              };
              
              // Only add if it looks like a numeric extension
              if (/^\d+$/.test(extensionNumber)) {
                endpoints.push(endpoint);
                console.log('[AMI Bridge] Found PJSIP endpoint:', endpoint);
              }
            }
          }
        };
        
        // Handle completion
        const completeHandler = (data) => {
          if (data.ActionID === actionIdStr) {
            clearTimeout(timeoutId);
            this.removeAllListeners('pjsip_endpoint_data');
            this.removeAllListeners('pjsip_endpoint_complete');
            console.log(`[AMI Bridge] PJSIP endpoint query completed: ${endpoints.length} endpoints found`);
            resolve(endpoints);
          }
        };
        
        // Set up event listeners
        this.on('pjsip_endpoint_data', dataHandler);
        this.on('pjsip_endpoint_complete', completeHandler);
        
        // Send the PJSIPShowEndpoints action
        const action = {
          Action: 'PJSIPShowEndpoints',
          ActionID: actionIdStr
        };
        
        let message = '';
        for (const [key, value] of Object.entries(action)) {
          message += `${key}: ${value}\r\n`;
        }
        message += '\r\n';
        
        console.log('[AMI Bridge] Sending PJSIP query');
        this.socket.write(message);
      });
    } catch (error) {
      console.error('[AMI Bridge] Get PJSIP endpoints error:', error);
      return [];
    }
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.socket) {
      this.socket.end();
      this.socket = null;
      this.isConnected = false;
    }
  }
}

// Express server setup
const app = express();
const port = config.server.port || 3001;

app.use(cors({
  origin: config.security.allowedOrigins || ['*'],
  credentials: true
}));
app.use(express.json());

// AMI Bridge instance
let amiBridge = null;

// WebSocket server for real-time events
const wss = new WebSocket.Server({ port: config.server.websocketPort || 8080 });

wss.on('connection', (ws) => {
  console.log('[WebSocket] Client connected');

  if (amiBridge) {
    // Send current connection status
    ws.send(JSON.stringify({
      type: 'status',
      connected: amiBridge.isConnected
    }));

    // Forward AMI events to WebSocket clients
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

// REST API endpoints
app.post('/api/ami/connect', async (req, res) => {
  try {
    const { host, port, username, password } = req.body;
    
    if (amiBridge) {
      amiBridge.disconnect();
    }

    const amiConfig = {
      host: host || config.ami.host,
      port: port || config.ami.port,
      username: username || config.ami.username,
      password: password || config.ami.password
    };

    amiBridge = new AMIBridge({ ami: amiConfig });
    
    await amiBridge.connect();
    
    res.json({ success: true, message: 'Connected to AMI successfully' });
  } catch (error) {
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

app.get('/api/ami/status', (req, res) => {
  res.json({
    connected: amiBridge ? amiBridge.isConnected : false,
    timestamp: new Date().toISOString(),
    config: {
      host: config.ami.host,
      port: config.ami.port,
      username: config.ami.username
    }
  });
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

    console.log(`[API] Originating call: ${channel} -> ${extension}`);
    
    const success = await amiBridge.originateCall(channel, extension, context, callerID);
    
    res.json({ 
      success, 
      message: success ? 'Call originated successfully' : 'Failed to originate call',
      details: { channel, extension, context }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/ami/channels', async (req, res) => {
  try {
    if (!amiBridge || !amiBridge.isConnected) {
      return res.status(400).json({ success: false, error: 'Not connected to AMI' });
    }

    const channels = await amiBridge.getActiveChannels();
    res.json({ success: true, data: channels });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/ami/pjsip-endpoints', async (req, res) => {
  try {
    if (!amiBridge || !amiBridge.isConnected) {
      return res.status(400).json({ success: false, error: 'Not connected to AMI' });
    }

    console.log('[API] Fetching PJSIP endpoints');
    const endpoints = await amiBridge.getPJSIPEndpoints();
    
    res.json({ 
      success: true, 
      data: endpoints,
      message: `Found ${endpoints.length} PJSIP endpoints`
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(port, () => {
  console.log(`[AMI Bridge Server] Running on port ${port}`);
  console.log(`[WebSocket Server] Running on port ${config.server.websocketPort || 8080}`);
  console.log('Available endpoints:');
  console.log('  POST /api/ami/connect - Connect to AMI');
  console.log('  POST /api/ami/disconnect - Disconnect from AMI');
  console.log('  GET  /api/ami/status - Get connection status');
  console.log('  POST /api/ami/originate - Originate a call');
  console.log('  GET  /api/ami/channels - Get active channels');
  console.log('  GET  /api/ami/pjsip-endpoints - Get PJSIP endpoints');
});

// Auto-connect on startup
if (config.ami.host && config.ami.username && config.ami.password) {
  amiBridge = new AMIBridge(config);
  amiBridge.connect().catch((error) => {
    console.error('[AMI Bridge] Initial connection failed:', error.message);
  });
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[AMI Bridge] Shutting down...');
  if (amiBridge) {
    amiBridge.disconnect();
  }
  process.exit(0);
});

module.exports = { AMIBridge };
EOF

# Set proper permissions
chown asterisk:asterisk ami-bridge.js config.json 2>/dev/null || chown apache:apache ami-bridge.js config.json 2>/dev/null || true
chmod 644 ami-bridge.js config.json

# Start the AMI Bridge server
log "Starting updated AMI Bridge server..."
nohup node ami-bridge.js > ami-bridge.log 2>&1 &

# Wait for startup
sleep 3

# Check if process started successfully
NEW_PID=$(pgrep -f "node.*ami-bridge.js")
if [ ! -z "$NEW_PID" ]; then
    log "✅ AMI Bridge updated and restarted successfully!"
    log "Process ID: $NEW_PID"
    log "Server directory: $SERVER_DIR"
    log "Log file: $SERVER_DIR/ami-bridge.log"
    log ""
    log "Network Configuration:"
    log "  FreePBX Host: 192.168.0.5:5038"
    log "  CRM Host: 192.168.0.132"
    log "  AMI User: admin"
    log "  HTTP API: http://192.168.0.5:3001"
    log "  WebSocket: ws://192.168.0.5:8080"
    log ""
    log "Testing connection:"
    sleep 2
    curl -s "http://localhost:3001/api/ami/status" | python -m json.tool 2>/dev/null || echo "API call completed"
else
    error "❌ Failed to start updated AMI Bridge!"
    error "Check the log for errors: cat $SERVER_DIR/ami-bridge.log"
    log "Restoring backup..."
    if [ -f "$BACKUP_DIR/ami-bridge.js.backup" ]; then
        cp "$BACKUP_DIR/ami-bridge.js.backup" "$SERVER_DIR/ami-bridge.js"
        if [ -f "$BACKUP_DIR/config.json.backup" ]; then
            cp "$BACKUP_DIR/config.json.backup" "$SERVER_DIR/config.json"
        fi
        nohup node ami-bridge.js > ami-bridge.log 2>&1 &
        log "Backup restored and started"
    fi
    exit 1
fi

log ""
log "Update deployment completed successfully!"
log "Directory used: $SERVER_DIR"
log "Configuration file: $SERVER_DIR/config.json"
log ""
log "Network Setup:"
log "  FreePBX Server: 192.168.0.5"
log "  CRM Server: 192.168.0.132"
log "  AMI Bridge: Running on FreePBX server (192.168.0.5)"
log ""
log "To customize credentials later, edit: $SERVER_DIR/config.json"
log "Then restart with: pkill -f node.*ami-bridge.js && cd $SERVER_DIR && nohup node ami-bridge.js > ami-bridge.log 2>&1 &"
log ""
log "You can now test extension fetching in your CRM interface at http://192.168.0.132"
