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
    
    // --- 關鍵修正：精確尋找「中華路」作為起點 ---
    if (roadsData.length > 0) {
        // 優先找中華路，如果找不到則找第一條路
        let startRoad = roadsData.find(r => r.name.includes("中華路"));
        
        // 如果有中華路，嘗試找距離火車站 (0,0) 最近的那一段
        const targetRoads = roadsData.filter(r => r.name.includes("中華路"));
        if (targetRoads.length > 0) {
            startRoad = targetRoads.reduce((prev, curr) => {
                const prevDist = Math.sqrt(prev.center[0]**2 + prev.center[1]**2);
                const currDist = Math.sqrt(curr.center[0]**2 + curr.center[1]**2);
                return (currDist < prevDist) ? curr : prev;
            });
        } else {
            startRoad = roadsData[0];
        }

        const start = startRoad.center;
        player.mesh.position.set(start[0], 0, start[1]); 
        console.log(`🚀 Spawned at: ${startRoad.name} (車站前) @ ${start[0]}, ${start[1]}`);
    }

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
