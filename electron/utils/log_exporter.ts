import { writeFile } from 'node:fs/promises';
import { TracerouteDiagnosticLog } from '../types/TracerouteDiagnosticLog';

export const formatTracerouteLog = (
  diagnostic: TracerouteDiagnosticLog,
  targetHost?: string,
): string => {
  const lines = [
    'Internet Stability App - Traceroute Log',
    `Exported: ${new Date().toISOString()}`,
  ];

  if (targetHost) {
    lines.push(`Target: ${targetHost}`);
  }

  lines.push(
    `Status: ${diagnostic.status}`,
    `Failure origin: ${diagnostic.failureOrigin ?? 'none'}`,
    `Message: ${diagnostic.message ?? 'Diagnostic completed.'}`,
    `Hops checked: ${diagnostic.totalHops}`,
    `Average latency: ${diagnostic.avgLatency > 0 ? `${diagnostic.avgLatency} ms` : 'N/A'}`,
    '',
    'Raw traceroute output:',
    diagnostic.rawOutput?.trim() || 'No raw traceroute output was captured.',
  );

  return `${lines.join('\n')}\n`;
};

export const exportLogs = async (
  content: string,
  destinationPath: string,
): Promise<string> => {
  await writeFile(destinationPath, content, 'utf8');
  return destinationPath;
};