const http = require('http'); 
const { Server } = require('socket.io'); 
const fs = require('fs');
const path = require('path');

// ✨ 讀取中央設定檔
const settings = JSON.parse(fs.readFileSync(path.join(__dirname, 'public/data/settings.json'), 'utf8'));
const PORT = settings.serverPort || 8888; 
const ORIGIN = settings.origin; 
const SPAWN = settings.spawn;   

// ✨ 經緯度轉 3D 座標公式 (同步前端邏輯)
const latRad = ORIGIN[0] * Math.PI / 180;
const spawnX = (SPAWN[1] - ORIGIN[1]) * 111111 * Math.cos(latRad);
const spawnZ = -(SPAWN[0] - ORIGIN[0]) * 111111;
const DEFAULT_POS = { x: spawnX, y: 0, z: spawnZ };

const COLOR_POOL = [
    0x00ffcc, 0xff00ff, 0x00ff00, 0xffff00, 
    0xff8800, 0xff0000, 0x4488ff, 0xffffff,
    0x88ff00, 0x00ffff
];

const server = http.createServer((req, res) => { 
    res.writeHead(200); res.end('Server is Running!'); 
}); 

const io = new Server(server, { 
    cors: { origin: "*", methods: ["GET", "POST"], credentials: true } 
}); 

const players = {}; 

io.on('connection', (socket) => { 
    console.log('Player connected: ' + socket.id); 
    const randomColor = COLOR_POOL[Math.floor(Math.random() * COLOR_POOL.length)];

    players[socket.id] = { 
        pos: { ...DEFAULT_POS }, 
        rot: 0, 
        name: 'User-' + socket.id.substring(0, 4), 
        color: randomColor,
        isWaiting: true,
        isAdmin: false
    }; 

    socket.emit('init_data', { id: socket.id, players }); 
    io.emit('updatePlayerList', players); 

    socket.on('set_as_admin', () => {
        if (players[socket.id]) {
            players[socket.id].isAdmin = true;
            players[socket.id].isWaiting = false;
            io.emit('updatePlayerList', players);
        }
    });

    socket.on('setNickname', (name) => { 
        if (players[socket.id]) { 
            players[socket.id].name = name; 
            io.emit('updatePlayerList', players); 
        } 
    }); 

    socket.on('admin_allowPlayer', (targetId) => { 
        if (players[targetId]) { 
            players[targetId].isWaiting = false; 
            io.to(targetId).emit('joinedGame'); 
            io.emit('updatePlayerList', players); 
        } 
    }); 

    socket.on('admin_teleportPlayer', (data) => {
        const { targetId, pos } = data;
        if (players[targetId]) {
            players[targetId].pos = pos;
            io.to(targetId).emit('teleport', pos);
            io.emit('updatePlayerList', players);
        }
    }); 

    socket.on('playerMovement', (movementData) => { 
        if (players[socket.id] && !players[socket.id].isWaiting) { 
            players[socket.id].pos = movementData.pos; 
            players[socket.id].rot = movementData.rot; 
            socket.broadcast.emit('playerMoved', { id: socket.id, data: players[socket.id] }); 
        } 
    }); 

    socket.on('disconnect', () => { 
        delete players[socket.id]; 
        io.emit('playerDisconnected', socket.id); 
    }); 
}); 

server.listen(PORT, '0.0.0.0', () => { 
    console.log('🚀 Socket.io Server running on port ' + PORT); 
});
