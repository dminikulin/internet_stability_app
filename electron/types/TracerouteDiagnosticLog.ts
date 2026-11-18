export interface TracerouteDiagnosticLog {
  status: 'stable' | 'degraded' | 'failed';
  failureOrigin?: 'local' | 'isp' | 'none';
  message?: string;
  totalHops: number;
  avgLatency: number;
  rawOutput?: string;
}