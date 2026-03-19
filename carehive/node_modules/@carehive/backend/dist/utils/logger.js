/**
 * Simple logger for backend (can be replaced with pino/winston)
 */
export const logger = {
    info: (msg, meta) => console.log(`[INFO] ${msg}`, meta ?? ''),
    warn: (msg, meta) => console.warn(`[WARN] ${msg}`, meta ?? ''),
    error: (msg, err) => console.error(`[ERROR] ${msg}`, err ?? ''),
};
