const express = require('express');
const cookieParser = require('cookie-parser');
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

app.use(cookieParser());

var songLength = 0;
var currentSong = null;
var songStartTime = 0;
var elapsedTime = 0;

function findSong(song) {
    fs.readFile(path.join(__dirname, 'songs.json'), 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading songs.json:', err);
            return;
        }
        const songs = JSON.parse(data).songs;
        const songDetails = songs.find(s => s.title === song.title);
        if (songDetails) {
            const songFile = fs.readdirSync(path.join(__dirname, 'public/songs')).find(f => f.startsWith(songDetails.cleanPath));
            if (songFile) {
                song.url = `/songs/${songFile}`;
                song.artist = songDetails.artist;
                song.title = songDetails.title;
                song.songStartTime = Date.now();
                const audioFilePath = path.join(__dirname, 'public/songs', songFile);
                const ffprobe = require('ffprobe');
                const ffprobeStatic = require('ffprobe-static');
                ffprobe(audioFilePath, { path: ffprobeStatic.path }, (err, info) => {
                    if (err) {
                        console.error('Error getting audio metadata:', err);
                        return;
                    }
                    if (info) {
                        song.length = info.streams[0].duration;
                        songLength = info.streams[0].duration;
                    } else {
                        console.error('Audio metadata format is undefined');
                    }
                });
                songStartTime = Date.now();
                elapsedTime = 0;
                currentSong = song;
            } else {
                console.error('Song file not found in public/songs');
            }
        } else {
            console.error('Song not found in songs.json');
        }
        currentSong = song;

        io.emit('currentTrack', song);
    });
    return song;
}

function randomSong() {
    fs.readFile(path.join(__dirname, 'songs.json'), 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading songs.json:', err);
            return;
        }
        const songs = JSON.parse(data).songs;
        var song = songs[Math.floor(Math.random() * songs.length)];
        if (currentSong) {
            if (song.title === currentSong.title) {
                randomSong();
                return;
            }
        }
        song = findSong(song);
    });
}

var totalUsers = 0;
var typingUsers = {};
const users = {};

function updateTypingUsers() {
    const typingUsernames = Object.keys(typingUsers).filter(username => typingUsers[username]);
    io.emit('chat typing', typingUsernames.join(', '));
}

io.on('connection', (socket) => {
    console.log('a user connected');
    socket.on('setUsername', (username, callback) => {
        if (users[username]) {
            callback({ success: false, message: 'Username is already taken' });
        } else if (username.length > 15) {
            callback({ success: false, message: 'Username is too long' });
        } else {
            users[username] = socket.id;
            totalUsers++;
            io.emit('totalUsers', totalUsers);
            socket.emit('currentTrack', currentSong, elapsedTime, songLength);
            callback({ success: true });
        }
    });

    socket.on('disconnect', () => {
        for (let username in users) {
            if (users[username] === socket.id) {
                delete users[username];
                delete typingUsers[username];
                totalUsers--;
                io.emit('totalUsers', totalUsers);
                io.emit(' chat typing', Object.keys(typingUsers).filter(username => typingUsers[username]).join(', '));
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

    socket.on('checkUsername', (username, callback) => {
        if (users[username]) {
            callback(false, 'Username is already taken');
        } else if (username.length > 15) {
            callback(false, 'Username is too long');
        } else {
            callback(true);
        }
    });

    socket.on('chat typing', (username) => {
        typingUsers[username] = true;
        updateTypingUsers();
    });

    socket.on('chat stoppedTyping', (username) => {
        typingUsers[username] = false;
        updateTypingUsers();
    });
    
});

const socketPort = process.env.PORT || 3000;
server.listen(socketPort, () => {
    console.log(`Server is running on port ${socketPort}`);
});

setInterval(async () => {
    elapsedTime++;
    if (elapsedTime >= songLength) {
        elapsedTime = 0;
        randomSong();
        await new Promise(resolve => setTimeout(resolve, 2000));
        io.emit('currentTrack', currentSong, elapsedTime, songLength);
    }
}, 1000);


app.get('/', (req, res) => {
    if (!req.cookies.username) {
        return res.render('index');
    }
    if (users[req.cookies.username]) {
        var username = req.cookies.username;
        res.clearCookie('username');
        return res.render('index', { username: username });
    }
    return res.render('player', { username: req.cookies.username });
});

randomSong();

app.get('/currentTrack', (req, res) => {
    console.log(songLength);
    res.json({ currentSong, elapsedTime, songLength });
});