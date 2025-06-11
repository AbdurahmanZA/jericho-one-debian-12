
interface AMIMessage {
  [key: string]: string;
}

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

export class AsteriskAMIClient {
  private ws: WebSocket | null = null;
  private host: string;
  private port: string;
  private username: string;
  private password: string;
  private isConnected: boolean = false;
  private eventListeners: ((event: AMIEvent) => void)[] = [];
  private connectionListeners: ((connected: boolean) => void)[] = [];

  constructor(host: string, port: string, username: string, password: string) {
    this.host = host;
    this.port = port;
    this.username = username;
    this.password = password;
  }

  async connect(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      try {
        // Use WebSocket to connect to AMI (requires WebSocket proxy or AMI WebSocket module)
        const wsUrl = `ws://${this.host}:${this.port}/ws`;
        console.log(`Attempting AMI WebSocket connection to: ${wsUrl}`);
        
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          console.log('WebSocket connection established');
          this.login().then((success) => {
            if (success) {
              this.isConnected = true;
              this.notifyConnectionListeners(true);
              resolve(true);
            } else {
              reject(new Error('AMI login failed'));
            }
          }).catch(reject);
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };

        this.ws.onclose = () => {
          console.log('AMI WebSocket connection closed');
          this.isConnected = false;
          this.notifyConnectionListeners(false);
        };

        this.ws.onerror = (error) => {
          console.error('AMI WebSocket error:', error);
          reject(new Error('Failed to connect to AMI WebSocket'));
        };

        // Timeout after 10 seconds
        setTimeout(() => {
          if (!this.isConnected) {
            this.disconnect();
            reject(new Error('Connection timeout - AMI WebSocket not responding'));
          }
        }, 10000);

      } catch (error) {
        reject(error);
      }
    });
  }

  private async login(): Promise<boolean> {
    return new Promise((resolve) => {
      const actionId = `login_${Date.now()}`;
      const loginMessage = this.formatAction('Login', {
        Username: this.username,
        Secret: this.password,
        ActionID: actionId
      });

      const responseHandler = (event: AMIEvent) => {
        if (event.actionid === actionId) {
          if (event.response === 'Success') {
            console.log('AMI login successful');
            resolve(true);
          } else {
            console.error('AMI login failed:', event.message);
            resolve(false);
          }
          this.removeEventListener(responseHandler);
        }
      };

      this.addEventListener(responseHandler);
      this.sendMessage(loginMessage);
    });
  }

  private formatAction(action: string, params: { [key: string]: string }): string {
    let message = `Action: ${action}\r\n`;
    for (const [key, value] of Object.entries(params)) {
      message += `${key}: ${value}\r\n`;
    }
    message += '\r\n';
    return message;
  }

  private sendMessage(message: string): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(message);
    }
  }

  private handleMessage(data: string): void {
    const lines = data.split('\r\n');
    const event: AMIEvent = { event: '' };

    for (const line of lines) {
      if (line.trim() === '') continue;
      const [key, ...valueParts] = line.split(': ');
      if (key && valueParts.length > 0) {
        const value = valueParts.join(': ');
        event[key.toLowerCase()] = value;
      }
    }

    if (event.event || event.response) {
      console.log('AMI Event received:', event);
      this.notifyEventListeners(event);
    }
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
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
  }

  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  // Method to originate a call
  async originateCall(channel: string, extension: string, context: string): Promise<boolean> {
    if (!this.isConnected) return false;

    const actionId = `originate_${Date.now()}`;
    const originateMessage = this.formatAction('Originate', {
      Channel: channel,
      Exten: extension,
      Context: context,
      Priority: '1',
      ActionID: actionId,
      Async: 'true'
    });

    this.sendMessage(originateMessage);
    return true;
  }

  // Method to get active channels
  async getActiveChannels(): Promise<void> {
    if (!this.isConnected) return;

    const actionId = `status_${Date.now()}`;
    const statusMessage = this.formatAction('Status', {
      ActionID: actionId
    });

    this.sendMessage(statusMessage);
  }
}

export default AsteriskAMIClient;
