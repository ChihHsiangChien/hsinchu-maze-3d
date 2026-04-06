import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { MapLoader } from './core/MapLoader.js';
import { Environment } from './core/Environment.js';
import { Player } from './core/Player.js';
import { Physics } from './utils/Physics.js';
import { HUD } from './ui/HUD.js';
import { MultiplayerManager } from './core/MultiplayerManager.js';

async function init() {
    const urlParams = new URLSearchParams(window.location.search);
    const isAdmin = urlParams.get('admin') === 'true';
    const loginScreen = document.getElementById('login-screen');
    const nicknameInput = document.getElementById('nickname-input');
    const joinBtn = document.getElementById('join-btn');

    if (isAdmin) {
        if (loginScreen) loginScreen.style.display = 'none';
        startGame("系統管理員", true);
    } else {
        nicknameInput.value = `小探險家${Math.floor(Math.random()*900)+100}`;
        joinBtn.onclick = () => {
            const nickname = nicknameInput.value.trim() || "無名氏";
            loginScreen.style.display = 'none';
            startGame(nickname, false);
        };
    }
}

async function startGame(nickname, isAdmin) {
    // 1. ✨ 優先載入中央設定檔 (增加錯誤處理防止中斷)
    let settingsData = { origin: [24.801, 120.971], spawn: [24.817853, 120.974073], serverPort: 8888 };
    try {
        settingsData = await fetch('data/settings.json').then(res => res.json());
    } catch (e) { console.warn("Could not load settings.json, using defaults."); }

    const ORIGIN = [settingsData.origin[1], settingsData.origin[0]]; 
    const SPAWN = [settingsData.spawn[1], settingsData.spawn[0]];

    // ✨ 優先順序：URL 參數 > settings.json > 預設值 (window.location.hostname)
    const urlParams = new URLSearchParams(window.location.search);
    const PORT = urlParams.get('port') || settingsData.serverPort || 8888;
    const HOST = urlParams.get('server') || settingsData.serverHost || window.location.hostname;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);
    // ✨ 管理員模式下移除迷霧 (設為極大值)，普通玩家維持設定檔距離
    const fogDist = isAdmin ? 1000000 : (settingsData.fogDistance || 5000);
    scene.fog = new THREE.Fog(0x87ceeb, 50, fogDist); 

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1.0, 100000); // 提升遠裁切面以配合無迷霧視距
    const renderer = new THREE.WebGLRenderer({ antialias: true, logarithmicDepthBuffer: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    document.body.appendChild(renderer.domElement);

    const hud = new HUD();
    const loader = new MapLoader();
    const env = new Environment(scene);
    const physics = new Physics();

    if (isAdmin) hud.updateRoadName("管理員模式");

    const [roadsData, buildingsData, landmarksData] = await Promise.all([
        loader.loadRoads('data/roads.json'),
        loader.loadBuildings('data/buildings.json'),
        loader.loadLandmarks('data/landmarks.json')
    ]);

    physics.processRoads(roadsData);
    env.createRoads(roadsData);
    env.createBuildings(buildingsData);
    
    const latRad = ORIGIN[1] * Math.PI / 180;
    const spawnX = (SPAWN[0] - ORIGIN[0]) * 111111 * Math.cos(latRad);
    const spawnZ = -(SPAWN[1] - ORIGIN[1]) * 111111; 

    // ✨ 使用設定檔的樹木數量
    env.generateRandomTrees(physics, settingsData.treeCount || 1500, spawnX, spawnZ);

    landmarksData.forEach(data => {
        const x = (data.latlon[1] - ORIGIN[0]) * 111111 * Math.cos(latRad);
        const z = -(data.latlon[0] - ORIGIN[1]) * 111111;
        
        // ✨ 新增：角度量(度)轉弧度，且基準改為北方 0 度順時針
        // 方位角(Azimuth) 轉 Three.js 旋轉：(180 - degree) * PI / 180
        const degree = data.rotation || 0;
        const radian = (180 - degree) * (Math.PI / 180);
        
        createFixedLandmark(scene, data.name, x, z, data.height || 5, radian, data.color || "#ffc800");
    });

    const player = new Player(scene, camera, renderer.domElement, physics, hud);
    player.mesh.position.set(spawnX, 0, spawnZ);
    player.spawnX = spawnX; player.spawnZ = spawnZ;

    if (isAdmin) {
        player.mesh.visible = false;
        player.walkSpeed = 0;
        const adminPanel = document.getElementById('admin-panel');
        if (adminPanel) {
            adminPanel.style.display = 'flex';
            const stopProp = (e) => e.stopPropagation();
            adminPanel.addEventListener('wheel', stopProp);
            adminPanel.addEventListener('pointerdown', stopProp);
            adminPanel.addEventListener('touchstart', stopProp);
            adminPanel.addEventListener('touchmove', stopProp);
        }
        const toggleBtn = document.getElementById('admin-toggle-btn');
        const content = document.getElementById('admin-content');
        if (toggleBtn && content) {
            toggleBtn.onclick = () => {
                const isHidden = content.style.display === 'none';
                content.style.display = isHidden ? 'block' : 'none';
                toggleBtn.innerText = isHidden ? '收合' : '展開';
            };
        }
        camera.position.set(spawnX, 1000, spawnZ + 600);
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.screenSpacePanning = false;
        controls.minDistance = 20;
        controls.maxDistance = 5000;
        controls.minPolarAngle = 0.1;
        controls.maxPolarAngle = Math.PI / 2.1; 
        controls.target.set(spawnX, 0, spawnZ);
        controls.addEventListener('change', () => {
            if (controls.target.y !== 0) controls.target.y = 0;
            if (camera.position.y < 2) camera.position.y = 2;
        });
        window.adminControls = controls;
        window.addEventListener('keydown', (e) => {
            if (e.key.toLowerCase() === 'n') {
                const relativePos = new THREE.Vector3().subVectors(camera.position, controls.target);
                const height = relativePos.y;
                const horizontalDist = Math.sqrt(relativePos.x ** 2 + relativePos.z ** 2);
                camera.position.set(controls.target.x, controls.target.y + height, controls.target.z + horizontalDist);
                controls.update();
            }
        });
    }

    // ✨ 只有在本地開發或明確指定伺服器時才啟動多人連線
    let multiplayer = null;
    const isGitHub = window.location.hostname.includes('github.io');
    const hasServerParam = urlParams.has('server');
    
    if (!isGitHub || hasServerParam) {
        console.log("🌐 Initializing Multiplayer Mode...");
        multiplayer = new MultiplayerManager(scene, player, nickname, isAdmin, { x: spawnX, y: 0, z: spawnZ }, PORT, HOST);
    } else {
        console.log("🚶 Single Player Mode (No server connection)");
    }

    let lastTime = performance.now();
    let lastCullingTime = 0;
    const CULL_DIST_SQ = 5000 * 5000; // ✨ 提升至 5公里，與迷霧同步

    function animate() {
        requestAnimationFrame(animate);
        const now = performance.now();
        const delta = (now - lastTime) / 1000;
        lastTime = now;

        // ✨ 效能優化：每 2 秒執行一次距離剔除 (Distance Culling)
        if (now - lastCullingTime > 2000) {
            if (isAdmin) {
                // 管理員模式下：顯示所有區塊 (或設定極大可視範圍)
                scene.traverse(obj => {
                    if (obj.name && (obj.name.startsWith('road_chunk_') || obj.name.startsWith('building_chunk_'))) {
                        obj.visible = true;
                    }
                });
            } else {
                const playerPos = player.mesh.position;
                scene.traverse(obj => {
                    if (obj.name && (obj.name.startsWith('road_chunk_') || obj.name.startsWith('building_chunk_'))) {
                        const distSq = obj.position.distanceToSquared(playerPos);
                        obj.visible = distSq < CULL_DIST_SQ;
                    }
                });
            }
            lastCullingTime = now;
        }

        if (isAdmin) {
            window.adminControls.update(); 
            const compass = document.getElementById('compass-pivot');
            if (compass) {
                const dir = new THREE.Vector3();
                camera.getWorldDirection(dir);
                const angle = Math.atan2(dir.x, dir.z) + Math.PI;
                compass.style.transform = `rotate(${THREE.MathUtils.radToDeg(angle)}deg)`;
            }
        } else {
            player.update(delta);
        }
        if (multiplayer) multiplayer.update();
        renderer.render(scene, camera);
    }
    window.addEventListener('resize', () => {
        setTimeout(() => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        }, 100);
    });
    animate();
}

function createFixedLandmark(scene, text, x, z, h, rotation, bgColor) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 512; canvas.height = 128;
    ctx.fillStyle = bgColor; ctx.roundRect(0, 0, 512, 128, 20); ctx.fill();
    ctx.strokeStyle = 'black'; ctx.lineWidth = 8; ctx.stroke();
    ctx.fillStyle = 'black'; ctx.font = 'bold 64px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, 256, 64);
    const texture = new THREE.CanvasTexture(canvas);
    const geometry = new THREE.PlaneGeometry(12, 3);
    const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, side: THREE.DoubleSide });
    const sign = new THREE.Mesh(geometry, material);
    sign.position.set(x, h, z);
    sign.rotation.y = rotation;
    scene.add(sign);
}

init();
