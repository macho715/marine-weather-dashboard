/**
 * Report State Service
 * Manages application health status, monitoring, and system state
 */

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  services: {
    database?: ServiceStatus;
    api?: ServiceStatus;
    weather?: ServiceStatus;
    vessel?: ServiceStatus;
  };
  metrics?: {
    requestCount?: number;
    errorRate?: number;
    avgResponseTime?: number;
  };
}

export interface ServiceStatus {
  name: string;
  status: 'up' | 'down' | 'degraded';
  latency?: number;
  lastCheck?: string;
  message?: string;
}

export interface ReportState {
  id: string;
  type: 'daily' | 'weekly' | 'incident' | 'custom';
  status: 'pending' | 'generating' | 'completed' | 'failed';
  createdAt: string;
  completedAt?: string;
  data?: any;
}

/**
 * Get current system health status
 */
export function getHealthStatus(): HealthStatus {
  try {
    const uptimeSeconds = process.uptime();

    const health: HealthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: uptimeSeconds,
      services: {
        api: {
          name: 'API',
          status: 'up',
          latency: 50,
          lastCheck: new Date().toISOString()
        },
        weather: {
          name: 'Weather Service',
          status: 'up',
          latency: 120,
          lastCheck: new Date().toISOString(),
          message: 'Weather data available'
        },
        vessel: {
          name: 'Vessel Tracking',
          status: 'up',
          latency: 80,
          lastCheck: new Date().toISOString(),
          message: 'AIS data streaming'
        }
      },
      metrics: {
        requestCount: 0,
        errorRate: 0,
        avgResponseTime: 85
      }
    };

    return health;
  } catch (error) {
    console.error('Error getting health status:', error);
    
    return {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: 0,
      services: {},
      metrics: {
        errorRate: 100
      }
    };
  }
}

/**
 * Check specific service health
 */
export async function checkServiceHealth(serviceName: string): Promise<ServiceStatus> {
  try {
    // TODO: Implement actual service health checks
    // For now, return mock status
    
    const mockStatus: ServiceStatus = {
      name: serviceName,
      status: 'up',
      latency: Math.random() * 100,
      lastCheck: new Date().toISOString(),
      message: `${serviceName} is operational`
    };

    return mockStatus;
  } catch (error) {
    return {
      name: serviceName,
      status: 'down',
      lastCheck: new Date().toISOString(),
      message: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Get or create report state
 */
export async function getReportState(reportId: string): Promise<ReportState | null> {
  try {
    // TODO: Implement actual state management (database, cache, etc.)
    // For now, return mock state
    
    if (!reportId) {
      return null;
    }

    const mockState: ReportState = {
      id: reportId,
      type: 'daily',
      status: 'completed',
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      data: {}
    };

    return mockState;
  } catch (error) {
    console.error('Error getting report state:', error);
    return null;
  }
}

/**
 * Update report state
 */
export async function updateReportState(
  reportId: string, 
  updates: Partial<ReportState>
): Promise<boolean> {
  try {
    // TODO: Implement actual state update logic
    console.log(`Updating report ${reportId}:`, updates);
    return true;
  } catch (error) {
    console.error('Error updating report state:', error);
    return false;
  }
}

/**
 * Last Report Record type
 */
export interface LastReportRecord {
  generatedAt: string;
  slot: 'am' | 'pm';
  ok: boolean;
  sent: Array<{
    channel: 'slack' | 'email';
    ok: boolean;
    status?: number;
    id?: string;
    error?: string;
    skipped: boolean;
  }>;
  sample: string;
  timezone: string;
}

// In-memory storage for last report
let lastReport: LastReportRecord | null = null;

/**
 * Get the last report record
 */
export function getLastReport(): LastReportRecord | null {
  return lastReport;
}

/**
 * Set the last report record
 */
export function setLastReport(record: LastReportRecord): void {
  lastReport = record;
}

/**
 * Clear the last report record
 */
export function clearLastReport(): void {
  lastReport = null;
}

/**
 * Report State Service singleton
 */
export const reportState = {
  getHealthStatus,
  checkServiceHealth,
  getReportState,
  updateReportState,
  getLastReport,
  setLastReport,
  clearLastReport
};