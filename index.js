const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

var totalUsers = 0;

const users = {};

io.on('connection', (socket) => {
    console.log('a user connected');

    socket.on('setUsername', (username, callback) => {
        if (users[username]) {
            callback({ success: false, message: 'Username is already taken' });
        } else {
            users[username] = socket.id;
            totalUsers++;
            io.emit('totalUsers', totalUsers);
            callback({ success: true });
        }
    });

    socket.on('disconnect', () => {
        for (let username in users) {
            if (users[username] === socket.id) {
                delete users[username];
                totalUsers--;
                io.emit('totalUsers', totalUsers);
                console.log(`${username} disconnected`);
                break;
            }
        }
    });

    socket.on('chat', (msg) => {
        var user = Object.keys(users).find(key => users[key] === socket.id);
        console.log('message: ' + user + ' - ' + msg.message);
        msg = {
            username: user,
            message: msg.message
        };
        io.emit('chat', msg);
    });
});

const socketPort = process.env.PORT || 3000;
server.listen(socketPort, () => {
    console.log(`Server is running on port ${socketPort}`);
});

app.get('/', (req, res) => {
    res.render('index');
});