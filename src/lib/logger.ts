import pino from 'pino';

export const logger = pino({
    prettyPrint: { translateTime: true, colorize: true },
    level: process.env.LOG_LEVEL || 'debug'
});
