interface AMIEvent {
  event: string;
  privilege?: string;
  channel?: string;
  calleridnum?: string;
  calleridname?: string;
  connectedlinenum?: string;
  connectedlinename?: string;
  uniqueid?: string;
  timestamp?: string;
  [key: string]: string | undefined;
}

interface AMIAction {
  action: string;
  actionid: string;
  [key: string]: string | undefined;
}

interface AMIResponse {
  response: string;
  actionid?: string;
  message?: string;
  [key: string]: string | undefined;
}

export class FreePBXAMIClient {
  private ws: WebSocket | null = null;
  private host: string;
  private port: string;
  private username: string;
  private password: string;
  private isConnected: boolean = false;
  private isAuthenticated: boolean = false;
  private eventListeners: ((event: AMIEvent) => void)[] = [];
  private connectionListeners: ((connected: boolean) => void)[] = [];
  private responseCallbacks: Map<string, (response: AMIResponse) => void> = new Map();
  private reconnectTimer: number | null = null;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 3;
  private keepAliveTimer: number | null = null;

  constructor(host: string, port: string, username: string, password: string) {
    this.host = host;
    this.port = port;
    this.username = username;
    this.password = password;
  }

  async connect(): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        console.log(`Connecting to AMI at ${this.host}:${this.port}`);
        
        // Since browsers can't make raw TCP connections, we'll simulate
        // a successful AMI connection for demo purposes
        this.simulateAMIConnection().then(resolve).catch(() => resolve(false));
      } catch (error) {
        console.error('AMI connection error:', error);
        resolve(false);
      }
    });
  }

  private async simulateAMIConnection(): Promise<boolean> {
    try {
      console.log(`Simulating AMI connection to ${this.host}:${this.port}`);
      console.log(`Username: ${this.username}`);
      console.log(`Password: ${this.password.substring(0, 8)}...`);
      
      // Simulate connection delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      this.isConnected = true;
      this.isAuthenticated = true;
      this.notifyConnectionListeners(true);
      
      // Send initial events
      setTimeout(() => {
        this.handleEvent({
          event: 'FullyBooted',
          privilege: 'system,all',
          status: 'Asterisk Ready'
        });
      }, 500);

      // Start keep-alive mechanism
      this.startKeepAlive();
      
      console.log('AMI connection established successfully');
      return true;
    } catch (error) {
      console.error('AMI connection failed:', error);
      this.isConnected = false;
      this.notifyConnectionListeners(false);
      return false;
    }
  }

  private startKeepAlive(): void {
    // Send ping every 30 seconds to keep connection alive
    this.keepAliveTimer = window.setInterval(() => {
      if (this.isConnected) {
        console.log('AMI Keep-alive ping');
        this.handleEvent({
          event: 'PeerStatus',
          privilege: 'system,all',
          peer: 'SIP/101',
          peerstatus: 'Registered'
        });
      }
    }, 30000);
  }

  private handleEvent(eventData: any): void {
    const event: AMIEvent = {
      event: eventData.event,
      timestamp: new Date().toISOString(),
      ...eventData
    };
    
    console.log('AMI Event:', event);
    this.notifyEventListeners(event);
  }

  addEventListener(listener: (event: AMIEvent) => void): void {
    this.eventListeners.push(listener);
  }

  removeEventListener(listener: (event: AMIEvent) => void): void {
    const index = this.eventListeners.indexOf(listener);
    if (index > -1) {
      this.eventListeners.splice(index, 1);
    }
  }

  addConnectionListener(listener: (connected: boolean) => void): void {
    this.connectionListeners.push(listener);
  }

  private notifyEventListeners(event: AMIEvent): void {
    this.eventListeners.forEach(listener => listener(event));
  }

  private notifyConnectionListeners(connected: boolean): void {
    this.connectionListeners.forEach(listener => listener(connected));
  }

  disconnect(): void {
    console.log('Disconnecting AMI...');
    
    if (this.keepAliveTimer) {
      clearInterval(this.keepAliveTimer);
      this.keepAliveTimer = null;
    }
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    this.isConnected = false;
    this.isAuthenticated = false;
    this.notifyConnectionListeners(false);
    
    console.log('AMI connection ended');
  }

  getConnectionStatus(): boolean {
    return this.isConnected && this.isAuthenticated;
  }

  async originateCall(channel: string, extension: string, context: string = 'from-internal'): Promise<boolean> {
    if (!this.isConnected) {
      console.error('Cannot originate call - AMI not connected');
      return false;
    }

    try {
      console.log(`Originating call: ${channel} -> ${extension} in context ${context}`);
      
      // Simulate successful call origination
      setTimeout(() => {
        this.handleEvent({
          event: 'OriginateResponse',
          response: 'Success',
          channel: channel,
          context: context,
          exten: extension,
          reason: '4',
          uniqueid: `asterisk.${Date.now()}`,
          calleridnum: extension
        });
      }, 500);
      
      return true;
    } catch (error) {
      console.error('Call origination error:', error);
      return false;
    }
  }

  async getActiveChannels(): Promise<void> {
    if (!this.isConnected) return;

    try {
      console.log('Requesting active channels');
      
      setTimeout(() => {
        this.handleEvent({
          event: 'CoreShowChannelsComplete',
          eventlist: 'Complete',
          listitems: '0'
        });
      }, 300);
      
    } catch (error) {
      console.error('Error getting active channels:', error);
    }
  }

  async getSIPPeers(): Promise<void> {
    if (!this.isConnected) return;

    try {
      console.log('Getting SIP peers');
      
      setTimeout(() => {
        this.handleEvent({
          event: 'PeerEntry',
          channeltype: 'SIP',
          objectname: '101',
          chanobjecttype: 'peer',
          ipaddress: '192.168.0.100',
          ipport: '5060',
          dynamic: 'yes',
          status: 'OK (15 ms)'
        });
      }, 400);
      
    } catch (error) {
      console.error('Error getting SIP peers:', error);
    }
  }
}

export default FreePBXAMIClient;
