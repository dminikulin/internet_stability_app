import { describe, expect, it } from 'vitest';
import { parseTracerouteOutput } from '../electron/utils/parser.ts';

describe(`Functionality of parseTracerouteOutput(), depending on network status`, () => {
  it(`correctly determines the network is stable if there is a healthy connection`, () => {
    const terminalOutput = `
      1  192.168.1.1  1.2 ms  1.1 ms  1.0 ms
      2  10.20.0.1   12.4 ms 11.8 ms 13.1 ms
      3  100.64.1.5  14.2 ms 15.0 ms 14.1 ms
    `;

    const res = parseTracerouteOutput(terminalOutput);

    expect(res.status).toBe('stable');
    expect(res.failureOrigin).toBe('none');
    expect(res.totalHops).toBe(3);
  });

  it(`correctly determines the network is degraded if there is a significant delay in command output`, () => {
    const terminalOutput = `
      1  192.168.1.1  143.2 ms  122.1 ms  150.0 ms
      2  10.20.0.1   167.4 ms 140.8 ms 164.1 ms
      3  100.64.1.5  189.2 ms 159.0 ms 173.1 ms
    `;

    const res = parseTracerouteOutput(terminalOutput);

    expect(res.status).toBe('degraded');
    expect(res.failureOrigin).toBe('none');
    expect(res.avgLatency).toBeGreaterThan(150);
  });

  it(`correctly determines a router failure when Hop 1 fails`, () => {
    const terminalOutput = `
      1  * * *
      2  * * *
      3. * * *
    `;

    const res = parseTracerouteOutput(terminalOutput);

    expect(res.status).toBe('failed');
    expect(res.failureOrigin).toBe('local');
  });

  it(`correctly determines an ISP outage when Hop 1 succeeds, but Hops 2-3 fail`, () => {
    const terminalOutput = `
      1  192.168.1.1  1.2 ms  1.1 ms  1.0 ms
      2  * * *
      3. * * *
    `;

    const res = parseTracerouteOutput(terminalOutput);

    expect(res.status).toBe('failed');
    expect(res.failureOrigin).toBe('isp');
  });
});
