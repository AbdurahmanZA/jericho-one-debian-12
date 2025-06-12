
const express = require('express');
const WebSocket = require('ws');
const net = require('net');
const cors = require('cors');
const { EventEmitter } = require('events');

class AMIBridge extends EventEmitter {
  constructor(config) {
    super();
    this.config = config;
    this.socket = null;
    this.isConnected = false;
    this.actionId = 0;
    this.pendingActions = new Map();
    this.buffer = '';
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
      });

      this.socket.on('error', (error) => {
        console.error('[AMI Bridge] Connection error:', error);
        reject(error);
      });
    });
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
          console.log('[AMI Bridge] PJSIP endpoint query timeout - returning found endpoints');
          resolve(endpoints);
        }, 15000);
        
        // Handle individual endpoint data
        const dataHandler = (data) => {
          if (data.ActionID === actionIdStr) {
            console.log('[AMI Bridge] Processing endpoint data:', data);
            
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
                status: data.DeviceState || data.State || 'Available',
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
        
        console.log('[AMI Bridge] Sending PJSIP query with ActionID:', actionIdStr);
        this.socket.write(message);
      });
    } catch (error) {
      console.error('[AMI Bridge] Get PJSIP endpoints error:', error);
      return [];
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

// Express server setup
const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// AMI Bridge instance
let amiBridge = null;

// WebSocket server for real-time events
const wss = new WebSocket.Server({ port: 8080 });

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
    
    console.log(`[API] Connecting to AMI: ${host}:${port} with user ${username}`);
    
    if (amiBridge) {
      console.log('[API] Disconnecting existing AMI bridge');
      amiBridge.disconnect();
    }

    amiBridge = new AMIBridge({ host, port, username, password });
    
    await amiBridge.connect();
    
    console.log('[API] AMI Bridge connected successfully');
    res.json({ success: true, message: 'Connected to AMI successfully' });
  } catch (error) {
    console.error('[API] AMI connection failed:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/ami/disconnect', (req, res) => {
  if (amiBridge) {
    console.log('[API] Disconnecting AMI bridge');
    amiBridge.disconnect();
    amiBridge = null;
  }
  res.json({ success: true, message: 'Disconnected from AMI' });
});

app.get('/api/ami/status', (req, res) => {
  const status = {
    connected: amiBridge ? amiBridge.isConnected : false,
    timestamp: new Date().toISOString()
  };
  console.log('[API] Status check:', status);
  res.json(status);
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
    console.error('[API] Originate call error:', error);
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
      console.log('[API] PJSIP endpoints request - AMI not connected');
      return res.status(400).json({ success: false, error: 'Not connected to AMI' });
    }

    console.log('[API] Fetching PJSIP endpoints via AMI');
    const endpoints = await amiBridge.getPJSIPEndpoints();
    
    console.log(`[API] Found ${endpoints.length} PJSIP endpoints:`, endpoints);
    
    res.json({ 
      success: true, 
      data: endpoints,
      message: `Found ${endpoints.length} PJSIP endpoints`
    });
  } catch (error) {
    console.error('[API] PJSIP endpoints error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(port, () => {
  console.log(`[AMI Bridge Server] Running on port ${port}`);
  console.log(`[WebSocket Server] Running on port 8080`);
  console.log('Available endpoints:');
  console.log('  POST /api/ami/connect - Connect to AMI');
  console.log('  POST /api/ami/disconnect - Disconnect from AMI');
  console.log('  GET  /api/ami/status - Get connection status');
  console.log('  POST /api/ami/originate - Originate a call');
  console.log('  GET  /api/ami/channels - Get active channels');
  console.log('  GET  /api/ami/pjsip-endpoints - Get PJSIP endpoints');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[AMI Bridge] Shutting down...');
  if (amiBridge) {
    amiBridge.disconnect();
  }
  process.exit(0);
});

module.exports = { AMIBridge };
