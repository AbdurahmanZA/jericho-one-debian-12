interface AMIBridgeConfig {
  serverUrl: string;
  websocketUrl: string;
}

interface OriginateCallRequest {
  channel: string;
  extension: string;
  context?: string;
  callerID?: string;
}

interface AMIEvent {
  event: string;
  [key: string]: string | undefined;
}

interface PJSIPPeer {
  objectName: string;
  endpoint: string;
  status: string;
  contact?: string;
}

class AMIBridgeClient {
  private config: AMIBridgeConfig;
  private websocket: WebSocket | null = null;
  private eventCallbacks: ((event: AMIEvent) => void)[] = [];
  private statusCallbacks: ((connected: boolean) => void)[] = [];

  constructor(config: AMIBridgeConfig) {
    this.config = config;
  }

  async connect(amiConfig: { host: string; port: string; username: string; password: string }): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.serverUrl}/api/ami/connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(amiConfig),
      });

      const result = await response.json();
      
      if (result.success) {
        this.connectWebSocket();
        return true;
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('[AMI Bridge Client] Connection error:', error);
      return false;
    }
  }

  async disconnect(): Promise<boolean> {
    try {
      if (this.websocket) {
        this.websocket.close();
        this.websocket = null;
      }

      const response = await fetch(`${this.config.serverUrl}/api/ami/disconnect`, {
        method: 'POST',
      });

      const result = await response.json();
      return result.success;
    } catch (error) {
      console.error('[AMI Bridge Client] Disconnect error:', error);
      return false;
    }
  }

  async getStatus(): Promise<{ connected: boolean; timestamp: string }> {
    try {
      const response = await fetch(`${this.config.serverUrl}/api/ami/status`);
      return await response.json();
    } catch (error) {
      console.error('[AMI Bridge Client] Status error:', error);
      return { connected: false, timestamp: new Date().toISOString() };
    }
  }

  async originateCall(request: OriginateCallRequest): Promise<boolean> {
    try {
      console.log('[AMI Bridge Client] Originating call:', request);
      
      const response = await fetch(`${this.config.serverUrl}/api/ami/originate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          channel: request.channel,
          extension: request.extension,
          context: request.context || 'from-internal',
          callerID: request.callerID
        }),
      });

      const result = await response.json();
      console.log('[AMI Bridge Client] Originate result:', result);
      
      return result.success;
    } catch (error) {
      console.error('[AMI Bridge Client] Originate error:', error);
      return false;
    }
  }

  async getActiveChannels(): Promise<any> {
    try {
      const response = await fetch(`${this.config.serverUrl}/api/ami/channels`);
      const result = await response.json();
      return result.success ? result.data : null;
    } catch (error) {
      console.error('[AMI Bridge Client] Get channels error:', error);
      return null;
    }
  }

  async getPJSIPEndpoints(): Promise<PJSIPPeer[]> {
    try {
      console.log('[AMI Bridge Client] Fetching PJSIP endpoints');
      
      const response = await fetch(`${this.config.serverUrl}/api/ami/pjsip-endpoints`);
      const result = await response.json();
      
      if (result.success) {
        console.log('[AMI Bridge Client] PJSIP endpoints:', result.data);
        return result.data || [];
      } else {
        console.error('[AMI Bridge Client] Failed to get PJSIP endpoints:', result.error);
        return [];
      }
    } catch (error) {
      console.error('[AMI Bridge Client] Get PJSIP endpoints error:', error);
      return [];
    }
  }

  private connectWebSocket() {
    if (this.websocket) {
      this.websocket.close();
    }

    this.websocket = new WebSocket(this.config.websocketUrl);

    this.websocket.onopen = () => {
      console.log('[AMI Bridge Client] WebSocket connected');
    };

    this.websocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'status') {
          this.statusCallbacks.forEach(callback => callback(data.connected));
        } else if (data.type === 'event') {
          this.eventCallbacks.forEach(callback => callback(data.data));
        }
      } catch (error) {
        console.error('[AMI Bridge Client] WebSocket message error:', error);
      }
    };

    this.websocket.onclose = () => {
      console.log('[AMI Bridge Client] WebSocket disconnected');
      // Attempt to reconnect after 5 seconds
      setTimeout(() => {
        if (this.websocket?.readyState === WebSocket.CLOSED) {
          this.connectWebSocket();
        }
      }, 5000);
    };

    this.websocket.onerror = (error) => {
      console.error('[AMI Bridge Client] WebSocket error:', error);
    };
  }

  onEvent(callback: (event: AMIEvent) => void) {
    this.eventCallbacks.push(callback);
  }

  onStatusChange(callback: (connected: boolean) => void) {
    this.statusCallbacks.push(callback);
  }

  removeEventListener(callback: (event: AMIEvent) => void) {
    const index = this.eventCallbacks.indexOf(callback);
    if (index > -1) {
      this.eventCallbacks.splice(index, 1);
    }
  }

  removeStatusListener(callback: (connected: boolean) => void) {
    const index = this.statusCallbacks.indexOf(callback);
    if (index > -1) {
      this.statusCallbacks.splice(index, 1);
    }
  }
}

// Create singleton instance with correct PBX IP
export const amiBridgeClient = new AMIBridgeClient({
  serverUrl: 'http://192.168.0.5:3001',
  websocketUrl: 'ws://192.168.0.5:8080'
});

export default AMIBridgeClient;
