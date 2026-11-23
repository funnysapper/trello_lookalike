import pino from 'pino';

const logger = pino({
    level: process.env.LEVEL ?? 'info',
    transport: process.env.NODE_ENV != 'production' ? {target:'pino-pretty', options : {colorize:true}} 
    : undefined
})

export default logger;