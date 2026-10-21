import "dotenv/config";
import express from "express";
import { errorHandler } from "./middleware/errorhandler.ts";
import authRoutes from './routes/auth.route.ts';
import workspaceRoutes from './routes/workspace.route.ts';
import cookieParser from 'cookie-parser';
import boardRoutes from './routes/board.route.ts'; 
import columnRoutes from './routes/column.route.ts';
import cardRoutes from './routes/card.route.ts';

const server = express();
server.use(express.json());
server.use(cookieParser());
server.use('/auth', authRoutes);
server.use('/workspace', workspaceRoutes);
server.use('/board', boardRoutes); 
server.use('/column', columnRoutes);
server.use('/card', cardRoutes);



server.use(errorHandler);
export default server;