export const PING_CONFIG = {
  /** Server used to test the connection */
  TARGET_HOST: "1.1.1.1",
  /** Port 80 allows standard TCP connection checks without admin rights */
  TARGET_PORT: 80,
  /** How long (in ms) to wait for a reply before declaring a packet 'dropped' */
  PING_TIMEOUT: 1500,
  /** Time (in ms) to wait between individual ping requests */
  PING_DELAY: 2000,
  /** Number of successfully received handshakes to stop the program */
  SUCCESS_BOUNDARY: 50,
  /** Number of consecutive failures to stop the program */
  CONSECUTIVE_FAILURES: 15,
} as const;