type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const currentLevel = import.meta.env.DEV ? 'debug' : 'warn';

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel];
}

export const logger = {
  debug: (...args: Parameters<typeof console.log>) => {
    if (shouldLog('debug')) console.debug('[DEBUG]', ...args);
  },
  info: (...args: Parameters<typeof console.info>) => {
    if (shouldLog('info')) console.info('[INFO]', ...args);
  },
  warn: (...args: Parameters<typeof console.warn>) => {
    if (shouldLog('warn')) console.warn('[WARN]', ...args);
  },
  error: (...args: Parameters<typeof console.error>) => {
    if (shouldLog('error')) console.error('[ERROR]', ...args);
  },
};

export default logger;
