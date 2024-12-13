const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("./"));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

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
    socket.on('chat', (msg) => {
        console.log('message: ' + msg);
        io.emit('chat', msg);
    });
});

const socketPort = process.env.PORT || 3000;
const frontendPort = process.env.PORT || 8000;
server.listen(socketPort, () => {
    console.log(`Server is running on port ${socketPort}`);
});

app.get('/', (req, res) => {
    res.render('index');
});

app.listen(frontendPort, () => {
    console.log(`Frontend is running on port ${frontendPort}`);
});