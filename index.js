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
        song = findSong(song);
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
            socket.emit('currentTrack', currentSong, elapsedTime, songLength);
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

setInterval(() => {
    elapsedTime++;
    if (elapsedTime >= songLength) {
        randomSong();
        io.emit('currentTrack', currentSong, elapsedTime, songLength);
    }
}, 1000);

app.get('/', (req, res) => {
    res.render('index');
});

randomSong();

app.get('/currentTrack', (req, res) => {
    console.log(songLength);
    res.json({ currentSong, elapsedTime, songLength });
});