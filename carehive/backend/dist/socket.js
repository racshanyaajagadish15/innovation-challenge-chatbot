let io = null;
export function setIO(server) {
    io = server;
}
export function getIO() {
    if (!io)
        throw new Error('Socket.IO not initialized');
    return io;
}
