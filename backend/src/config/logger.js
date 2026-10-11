import winston from 'winston';

const isProduction = process.env.NODE_ENV === 'production';

const logFormat = isProduction
  ? winston.format.json()
  : winston.format.combine(
      winston.format.colorize({ all: true }),
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.errors({ stack: true }),
      winston.format.printf(({ level, message, timestamp, stack, ...meta }) => {
        const metaPart = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
        const stackPart = stack ? `\n${stack}` : '';
        return `${timestamp} [${level}]: ${message}${metaPart}${stackPart}`;
      })
    );

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'cecyte-backend' },
  transports: [
    new winston.transports.Console({
      stdout: true,
      stderr: true,
    }),
  ],
});
