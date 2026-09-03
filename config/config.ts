export const PING_CONFIG = {
  /** Server used to test the connection */
  TARGET_HOST: "1.1.1.1",
  /** Limit to first 3 crucial hops (Router, CMTS/Hub, ISP Edge).
   * If it's necessary to test troubles like CloudFare outages, this number can be increased */
  MAX_HOPS: 3,
  /** Timeout per probe in ms to prevent app hanging */
  TIMEOUT_MS: 1000,
} as const;
