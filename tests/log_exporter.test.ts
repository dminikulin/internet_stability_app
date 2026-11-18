import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  exportLogs,
  formatTracerouteLog,
} from '../electron/utils/log_exporter.ts';

describe('Functionality of formatTracerouteLog', () => {
  let temporaryDirectory: string | undefined;

  afterEach(async () => {
    if (temporaryDirectory) {
      await rm(temporaryDirectory, { recursive: true, force: true });
      temporaryDirectory = undefined;
    }
  });

  it('writes formatted diagnostic logs to the selected file', async () => {
    temporaryDirectory = await mkdtemp(path.join(tmpdir(), 'internet-stability-'));
    const destinationPath = path.join(temporaryDirectory, 'traceroute.txt');
    const content = formatTracerouteLog(
      {
        status: 'failed',
        failureOrigin: 'isp',
        message: 'Signal lost at Hop 2.',
        totalHops: 3,
        avgLatency: 0,
        rawOutput: '1 192.168.1.1 1 ms\n2 * * *',
      },
      '1.1.1.1',
    );

    await expect(exportLogs(content, destinationPath)).resolves.toBe(destinationPath);
    await expect(readFile(destinationPath, 'utf8')).resolves.toContain(
      'Raw traceroute output:',
    );
  });

  it('includes the ISP failure summary and raw output', () => {
    const content = formatTracerouteLog({
      status: 'failed',
      failureOrigin: 'isp',
      message: 'Signal lost at Hop 2.',
      totalHops: 3,
      avgLatency: 0,
      rawOutput: '2 * * *',
    });

    expect(content).toContain('Failure origin: isp');
    expect(content).toContain('Signal lost at Hop 2.');
    expect(content).toContain('2 * * *');
  });
});
