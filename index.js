const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

var totalUsers = 0;

io.on('connection', (socket) => {
    console.log('a user connected');
    totalUsers++;
    io.emit('totalUsers', totalUsers);
    socket.on('disconnect', () => {
        totalUsers--;
        io.emit('totalUsers', totalUsers);
        console.log('user disconnected');
    });
    socket.on('chat message', (msg) => {
        io.emit('chat message', msg);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});