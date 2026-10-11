const isServer = typeof window === 'undefined';
const isDev = import.meta.env?.DEV || import.meta.env?.MODE === 'development' || 
              (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production');

const levels = {
  trace: 10,
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
  fatal: 60
};

const currentLevel = isDev ? levels.debug : levels.info;

let pinoLogger = null;

if (isServer) {
  try {
    const pino = await import('pino');
    if (isDev) {
      const pinoPretty = await import('pino-pretty');
      pinoLogger = pino.default({
        level: 'debug',
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss Z',
            ignore: 'pid,hostname',
            messageFormat: '{msg}'
          }
        }
      });
    } else {
      pinoLogger = pino.default({
        level: 'info',
        formatters: {
          level: (label) => ({ level: label })
        },
        timestamp: pino.default.stdTimeFunctions.isoTime,
        redact: {
          paths: [
            '*.password',
            '*.token',
            '*.secret',
            '*.authorization',
            '*.cookie',
            'req.headers.authorization',
            'req.headers.cookie'
          ],
          censor: '[REDACTED]'
        }
      });
    }
  } catch (e) {
    pinoLogger = null;
  }
}

function formatArgs(level, context, args) {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level.toUpperCase()}]${context ? ` [${context}]` : ''}`;
  
  if (isDev) {
    const colors = {
      trace: '\x1b[90m',
      debug: '\x1b[36m',
      info: '\x1b[32m',
      warn: '\x1b[33m',
      error: '\x1b[31m',
      fatal: '\x1b[35m',
      reset: '\x1b[0m'
    };
    const color = colors[level] || '';
    const reset = colors.reset;
    return [`${color}${prefix}${reset}`, ...args];
  }
  
  return [JSON.stringify({ 
    timestamp, 
    level, 
    context, 
    message: args.map(a => 
      typeof a === 'object' && a !== null ? JSON.stringify(a) : String(a)
    ).join(' ') 
  })];
}

function createBrowserLogger(context) {
  const logger = {};
  
  Object.keys(levels).forEach(level => {
    if (levels[level] >= currentLevel) {
      logger[level] = (...args) => {
        const formatted = formatArgs(level, context, args);
        const consoleMethod = level === 'fatal' ? 'error' : level;
        console[consoleMethod].apply(console, formatted);
      };
    } else {
      logger[level] = () => {};
    }
  });
  
  logger.child = (childContext) => createBrowserLogger(
    context ? `${context}:${childContext}` : childContext
  );
  
  return logger;
}

function createLogger(context) {
  if (isServer && pinoLogger) {
    return pinoLogger.child({ context });
  }
  return createBrowserLogger(context);
}

const rootLogger = createLogger('app');

export const log = rootLogger;
export { createLogger };
export default rootLogger;