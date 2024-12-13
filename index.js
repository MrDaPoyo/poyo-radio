const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

var songLength = 0;
var pastSong = null;
var currentSong = null;
var songStartTime = null;

function findSong(song) {
    fs.readFile(path.join(__dirname, 'songs.json'), 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading songs.json:', err);
            return;
        }
        const songs = JSON.parse(data);
        const songDetails = songs.find(s => s.title === song.title);
        const songFile = fs.readdirSync(path.join(__dirname, 'public/songs')).find(f => f.startsWith(song.cleanPath));
        if (songDetails) {
            song.url = `/static/${songDetails.file}`;
            song.author = songDetails.author;
            song.title = songDetails.title;
            const audioFilePath = path.join(__dirname, 'public/static', songFile);
            const audio = new Audio(audioFilePath);
            audio.onloadedmetadata = () => {
                song.length = audio.duration;
                songLength = audio.duration;
            };
            currentSong = song;
            songStartTime = Date.now();
            io.emit('playSong', song);
        } else {
            console.error('Song not found in songs.json');
        }
    });
}

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