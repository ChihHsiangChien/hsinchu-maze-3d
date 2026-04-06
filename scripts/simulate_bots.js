const { io } = require('socket.io-client');
const turf = require('@turf/turf');
const fs = require('fs');
const path = require('path');

// ✨ 讀取中央設定檔
const settings = JSON.parse(fs.readFileSync(path.join(__dirname, '../public/data/settings.json'), 'utf8'));
const ORIGIN = settings.origin;
const SPAWN = settings.spawn;
const SERVER_URL = `http://127.0.0.1:${settings.serverPort}`;
const BOT_COUNT = settings.botCount;

const bots = [];
const latRad = ORIGIN[0] * Math.PI / 180;
const SPAWN_X = (SPAWN[1] - ORIGIN[1]) * 111111 * Math.cos(latRad);
const SPAWN_Z = -(SPAWN[0] - ORIGIN[0]) * 111111;

const roadsData = JSON.parse(fs.readFileSync(path.join(__dirname, '../public/data/roads.json'), 'utf8'));
const roadPolygons = roadsData.map(r => turf.polygon([r.poly], { name: r.name }));

function isOnRoad(x, z) {
    const pt = turf.point([x, -z]);
    for (const poly of roadPolygons) {
        if (turf.booleanPointInPolygon(pt, poly)) return true;
    }
    return false;
}

function createBot(index) {
    const socket = io(SERVER_URL);
    const botNum = (index + 1).toString().padStart(2, '0');
    const name = `機器人-${botNum}`;
    
    let pos = { x: SPAWN_X, y: 0, z: SPAWN_Z };
    let rot = Math.random() * Math.PI * 2;
    let isWalking = false;

    socket.on('connect', () => {
        console.log(`[SYS] ${name} 已連線`);
        socket.emit('setNickname', name);
    });

    socket.on('joinedGame', () => { isWalking = true; });
    socket.on('teleport', (newPos) => { pos.x = newPos.x; pos.z = newPos.z; });

    setInterval(() => {
        if (!isWalking || !socket.connected) return;
        
        const speed = 1.5; // ✨ 稍稍加快速度
        // ✨ 修正位移邏輯：在 Three.js 中，負 Z 方向才是前方
        // 因此我們需要減去向量，讓機器人朝向它的 rot 前進
        const nextX = pos.x - Math.sin(rot) * speed;
        const nextZ = pos.z - Math.cos(rot) * speed;
        
        if (isOnRoad(nextX, nextZ)) {
            pos.x = nextX; 
            pos.z = nextZ;
            // ✨ 平滑隨機轉向
            rot += (Math.random() - 0.5) * 0.15;
        } else {
            // ✨ 撞牆時大轉向
            rot += Math.PI * 0.4 + Math.random() * 0.5;
        }
        
        // ✨ 傳送位置與旋轉
        socket.emit('playerMovement', { 
            pos: { x: pos.x, y: 0, z: pos.z }, 
            rot: rot 
        });
    }, 100);
    return socket;
}

console.log(`[START] 啟動 ${BOT_COUNT} 個機器人於連線: ${SERVER_URL}`);
for (let i = 0; i < BOT_COUNT; i++) {
    bots.push(createBot(i));
}
