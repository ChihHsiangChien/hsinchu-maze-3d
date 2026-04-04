import * as THREE from 'three';
import { MapLoader } from './core/MapLoader.js';
import { Environment } from './core/Environment.js';
import { Player } from './core/Player.js';
import { Physics } from './utils/Physics.js';
import { HUD } from './ui/HUD.js';

async function init() {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);
    scene.fog = new THREE.Fog(0x87ceeb, 50, 2000);

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 3000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    document.body.appendChild(renderer.domElement);

    const hud = new HUD();
    const loader = new MapLoader();
    const env = new Environment(scene);
    const physics = new Physics();

    console.log("🚀 Loading World...");
    
    const [roadsData, buildingsData, landmarksData] = await Promise.all([
        loader.loadRoads('data/roads.json'),
        loader.loadBuildings('data/buildings.json'),
        loader.loadLandmarks('data/landmarks.json')
    ]);

    physics.processRoads(roadsData);
    env.createRoads(roadsData);
    env.createBuildings(buildingsData);
    
    // 定位光華起點
    const targetLonLat = [120.974073, 24.817853];
    const ORIGIN = [120.971, 24.801];
    const latRad = ORIGIN[1] * Math.PI / 180;
    const spawnX = (targetLonLat[0] - ORIGIN[0]) * 111111 * Math.cos(latRad);
    const spawnZ = -(targetLonLat[1] - ORIGIN[1]) * 111111; 

    // 生成密集植被
    env.generateRandomTrees(physics, 1500, spawnX, spawnZ);

    // --- 關鍵修正：恢復地標標牌渲染 ---
    landmarksData.forEach(data => {
        const x = (data.lonlat[0] - ORIGIN[0]) * 111111 * Math.cos(latRad);
        const z = -(data.lonlat[1] - ORIGIN[1]) * 111111;
        createFixedLandmark(scene, data.name, x, z, data.height || 5, data.rotation || 0, data.color || "#ffc800");
    });

    const player = new Player(scene, camera, renderer.domElement, physics, hud);
    player.mesh.position.set(spawnX, 0, spawnZ);

    const clock = new THREE.Clock();
    function animate() {
        requestAnimationFrame(animate);
        player.update(clock.getDelta());
        renderer.render(scene, camera);
    }

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    animate();
}

/**
 * 建立固定朝向的 3D 路牌
 */
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
