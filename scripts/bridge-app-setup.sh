
#!/bin/bash

# FreePBX CentOS 7 AMI Bridge - Application Setup

source "$(dirname "$0")/bridge-utils.sh"

# Create application directory and files
create_application() {
    local ami_bridge_dir="$1"
    local service_user="$2"
    local ami_user="$3"
    local ami_password="$4"
    
    log "Creating AMI Bridge application..."
    
    # Create directory
    mkdir -p "$ami_bridge_dir"
    cd "$ami_bridge_dir"
    
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
    "username": "$ami_user",
    "password": "$ami_password"
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
    chown -R "$service_user:$service_user" "$ami_bridge_dir"
    chmod 755 "$ami_bridge_dir"
    chmod 600 "$ami_bridge_dir/config.json"
    chmod 644 "$ami_bridge_dir/config.example.json"
    
    log "AMI Bridge application created"
}
