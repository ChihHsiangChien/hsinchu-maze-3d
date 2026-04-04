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
    renderer.setPixelRatio(window.devicePixelRatio);
    document.body.appendChild(renderer.domElement);

    const hud = new HUD();
    const loader = new MapLoader();
    const env = new Environment(scene);
    const physics = new Physics();

    console.log("Loading Map Data...");
    const roadsData = await loader.loadRoads('data/roads.json');
    const buildingsData = await loader.loadBuildings('data/buildings.json');

    physics.processRoads(roadsData);
    env.createRoads(roadsData);
    env.createBuildings(buildingsData);

    const player = new Player(scene, camera, renderer.domElement, physics, hud);
    
    // --- 關鍵修正：精確定位在新竹站前廣場 ---
    // 以火車站 [120.971, 24.801] 為原點，站前廣場座標約為 [120.9717, 24.8023]
    const stationSquareLonLat = [120.9717, 24.8023];
    const ORIGIN = [120.971, 24.801];
    
    const latRad = ORIGIN[1] * Math.PI / 180;
    const spawnX = (stationSquareLonLat[0] - ORIGIN[0]) * 111111 * Math.cos(latRad);
    const spawnZ = -(stationSquareLonLat[1] - ORIGIN[1]) * 111111; // 緯度增加 = -Z (北方)
    
    player.mesh.position.set(spawnX, 0, spawnZ);
    console.log(`🚀 Spawned at: 新竹站前廣場 (${Math.round(spawnX)}, ${Math.round(spawnZ)})`);

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

init();
