import "dotenv/config";
import express from "express";
import { errorHandler } from "./middleware/errorhandler.ts";
import authRoutes from './routes/auth.route.ts';
import workspaceRoutes from './routes/workspace.route.ts';
import cookieParser from 'cookie-parser';

const server = express();
server.use(express.json());
server.use(cookieParser());
server.use('/auth', authRoutes);
server.use('/workspace', workspaceRoutes);



server.use(errorHandler);
export default server;