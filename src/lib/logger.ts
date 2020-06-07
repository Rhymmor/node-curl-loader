import pino from 'pino';

export const logger = pino({ prettyPrint: true, level: process.env.LOG_LEVEL || 'debug' });
