import "dotenv/config";
import express from "express";
import { errorHandler } from "./middleware/errorhandler.ts";
import authRoutes from './routes/auth.route.ts';
import workspaceRoutes from './routes/workspace.route.ts';
import cookieParser from 'cookie-parser';
import boardRoutes from './routes/board.route.ts'; 
import columnRoutes from './routes/column.route.ts';
import cardRoutes from './routes/card.route.ts';
import path from "path";
import { fileURLToPath } from "url";
import logger from "./config/logger.ts";
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pinoHttp = require('pino-http');

const PORT= Number(process.env.PORT);
const INSTANCE = process.env.INSTANCE_ID ?? 'A';
const server = express();
const _dirname = path.dirname(fileURLToPath(import.meta.url));



server.use(express.json());
server.use(cookieParser());
server.use((req, res, next) => {
    logger.info(`[Backend Instance ${INSTANCE} on Port ${PORT}] Received ${req.method} ${req.originalUrl}`);
    next();
});
server.use(pinoHttp({ logger }));
server.use('/auth', authRoutes);
server.use('/workspace', workspaceRoutes);
server.use('/board', boardRoutes); 
server.use('/column', columnRoutes);
server.use('/card', cardRoutes);
server.get('/', (req,res)=>{
    res.sendFile(path.join(_dirname,'test.html'))
});


server.use(errorHandler);
export default server;