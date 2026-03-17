/**
 * CAREHIVE Backend - Express API + Socket.io
 */
import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import routes from './routes/index.js';
import { logger } from './utils/logger.js';
import { setIO } from './socket.js';
const app = express();
const httpServer = createServer(app);
const frontendOrigin = process.env.FRONTEND_ORIGIN || 'http://localhost:3000';
app.use(cors({ origin: frontendOrigin, credentials: true }));
app.use(express.json());
app.use('/api', routes);
app.get('/health', (_req, res) => res.json({ status: 'ok' }));
const io = new Server(httpServer, {
    cors: { origin: frontendOrigin },
});
setIO(io);
io.on('connection', (socket) => {
    logger.info('Client connected', { id: socket.id });
    socket.on('subscribe', (userId) => {
        if (userId)
            socket.join(`user:${userId}`);
    });
    socket.on('disconnect', () => logger.info('Client disconnected', { id: socket.id }));
});
const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => {
    logger.info(`CAREHIVE API + WebSocket on port ${PORT}`);
});
