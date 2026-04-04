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
    
    // 初始化位置：3D (x, z) 必須對應數據產出的 (x, z)
    if (roadsData.length > 0) {
        const start = roadsData[0].center;
        // 在數據中 z 已經是 -(lat-lat0)，直接使用即可
        player.mesh.position.set(start[0], 0, start[1]); 
        console.log(`Spawned at: ${roadsData[0].name} @ ${start[0]}, ${start[1]}`);
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
