/**
 * Simple logger for backend (can be replaced with pino/winston)
 */
export const logger = {
  info: (msg: string, meta?: object) => console.log(`[INFO] ${msg}`, meta ?? ''),
  warn: (msg: string, meta?: object) => console.warn(`[WARN] ${msg}`, meta ?? ''),
  error: (msg: string, err?: unknown) => console.error(`[ERROR] ${msg}`, err ?? ''),
};
