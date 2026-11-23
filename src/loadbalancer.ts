import express from 'express';
import http from 'http';
import { createProxyMiddleware } from 'http-proxy-middleware';
import logger from './config/logger.ts';

const loadBalancer = express();

const servers = ['http://localhost:3001', 'http://localhost:3002'];
let nextServer = 0;

function pickServer() {
    const target = servers[nextServer];
    nextServer = (nextServer + 1) % servers.length;
    return target;
}

const proxy = createProxyMiddleware({
    router: () => pickServer(),
    target: servers[0],
    changeOrigin: true,
    ws: true,
    on: {
        proxyReq: (proxyReq, req) => {
            logger.info(`[LB] ${req.method} ${req.url} -> ${proxyReq.host}`);
        },
        error: (err, req, res) => {
            logger.error(`[LB] proxy error: ${err.message}`);
        },
    },
});

loadBalancer.use(proxy);

const httpServer = http.createServer(loadBalancer);

httpServer.on('upgrade', proxy.upgrade);

httpServer.listen(3000, () => {
    logger.info('[LB] Load balancer running on port 3000');
});