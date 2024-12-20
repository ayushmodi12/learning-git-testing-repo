const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

io.on('connection', (socket) => {
    console.log('A user connected: ', socket.id);

    socket.on('offer', (data) => {
        socket.to(data.target).emit('offer', data);
    });

    socket.on('answer', (data) => {
        socket.to(data.target).emit('answer', data);
    });

    socket.on('candidate', (data) => {
        socket.to(data.target).emit('candidate', data);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected: ', socket.id);
    });
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
