
export interface CallRecord {
  id: number;
  leadName: string;
  phone: string;
  duration: string;
  outcome: string;
  timestamp: string;
  date: string;
  hasRecording: boolean;
  notes: string;
  agent: string;
  callType: 'incoming' | 'outgoing';
  leadId?: string;
}

class CallRecordsService {
  private records: CallRecord[] = [];
  private listeners: ((records: CallRecord[]) => void)[] = [];

  constructor() {
    // Initialize with some sample data
    this.records = [
      {
        id: 1,
        leadName: "Sarah Johnson",
        phone: "+1-555-0456",
        duration: "00:05:32",
        outcome: "Callback Scheduled",
        timestamp: "10:30 AM",
        date: "2024-06-12",
        hasRecording: true,
        notes: "Interested in premium package, callback scheduled for tomorrow",
        agent: "John Parker",
        callType: "outgoing"
      },
      {
        id: 2,
        leadName: "Mike Davis",
        phone: "+1-555-0789",
        duration: "00:03:45",
        outcome: "Not Interested",
        timestamp: "10:15 AM",
        date: "2024-06-12",
        hasRecording: true,
        notes: "Currently satisfied with existing solution",
        agent: "Sarah Wilson",
        callType: "outgoing"
      }
    ];
  }

  // Get all records
  getRecords(): CallRecord[] {
    return [...this.records];
  }

  // Add a new call record
  addRecord(record: Omit<CallRecord, 'id'>): CallRecord {
    const newRecord: CallRecord = {
      ...record,
      id: Math.max(...this.records.map(r => r.id), 0) + 1,
      date: record.date || new Date().toISOString().split('T')[0],
      timestamp: record.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    this.records.unshift(newRecord);
    this.notifyListeners();
    
    console.log('Call record added:', newRecord);
    return newRecord;
  }

  // Update an existing record
  updateRecord(id: number, updates: Partial<CallRecord>): CallRecord | null {
    const index = this.records.findIndex(r => r.id === id);
    if (index === -1) return null;

    this.records[index] = { ...this.records[index], ...updates };
    this.notifyListeners();
    
    console.log('Call record updated:', this.records[index]);
    return this.records[index];
  }

  // Subscribe to record changes
  subscribe(listener: (records: CallRecord[]) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  // Notify all listeners
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener([...this.records]));
  }

  // Get records by date range
  getRecordsByDateRange(startDate: string, endDate: string): CallRecord[] {
    return this.records.filter(record => {
      const recordDate = new Date(record.date);
      const start = new Date(startDate);
      const end = new Date(endDate);
      return recordDate >= start && recordDate <= end;
    });
  }

  // Get records by agent
  getRecordsByAgent(agent: string): CallRecord[] {
    return this.records.filter(record => 
      record.agent.toLowerCase().includes(agent.toLowerCase())
    );
  }

  // Get summary statistics
  getSummaryStats(): {
    totalCalls: number;
    totalDuration: number;
    qualified: number;
    contactRate: number;
    averageDuration: number;
  } {
    const totalCalls = this.records.length;
    const qualified = this.records.filter(r => r.outcome.toLowerCase().includes('qualified')).length;
    const answered = this.records.filter(r => r.outcome !== 'No Answer' && r.outcome !== 'Not Interested').length;
    
    // Calculate total duration in seconds
    const totalDurationSeconds = this.records.reduce((total, record) => {
      const parts = record.duration.split(':');
      const minutes = parseInt(parts[0]) || 0;
      const seconds = parseInt(parts[1]) || 0;
      return total + (minutes * 60) + seconds;
    }, 0);

    return {
      totalCalls,
      totalDuration: totalDurationSeconds,
      qualified,
      contactRate: totalCalls > 0 ? Math.round((answered / totalCalls) * 100) : 0,
      averageDuration: totalCalls > 0 ? Math.round(totalDurationSeconds / totalCalls) : 0
    };
  }
}

// Create a singleton instance
export const callRecordsService = new CallRecordsService();
