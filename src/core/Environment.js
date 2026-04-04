import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export class Environment {
    constructor(scene) {
        this.scene = scene;
        this.buildingMaterial = new THREE.MeshPhongMaterial({ 
            vertexColors: true, flatShading: true, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1
        });
        this.roadMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x111111, roughness: 0.8, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2
        });
        this.groundMaterial = new THREE.MeshStandardMaterial({ color: 0x44aa44, roughness: 1.0 });
        this.addGround();
        this.addLighting();
    }

    addLighting() {
        this.scene.add(new THREE.AmbientLight(0xffffff, 1.2));
        const sun = new THREE.DirectionalLight(0xffffff, 1.0);
        sun.position.set(100, 500, 100);
        this.scene.add(sun);
    }

    addGround() {
        const ground = new THREE.Mesh(new THREE.PlaneGeometry(10000, 10000), this.groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = 0.02; 
        this.scene.add(ground);
        const grid = new THREE.GridHelper(5000, 100, 0xffffff, 0x338833);
        grid.position.y = 0.03;
        grid.material.opacity = 0.2;
        grid.material.transparent = true;
        this.scene.add(grid);
    }

    createRoads(roadsData) {
        const geometries = [];
        roadsData.forEach(road => {
            const shape = new THREE.Shape();
            const pts = road.poly;
            shape.moveTo(pts[0][0], pts[0][1]);
            for (let i = 1; i < pts.length; i++) shape.lineTo(pts[i][0], pts[i][1]);
            const geometry = new THREE.ExtrudeGeometry(shape, { depth: 0.2, bevelEnabled: false });
            geometry.rotateX(-Math.PI / 2); 
            geometries.push(geometry);
        });

        if (geometries.length > 0) {
            const merged = BufferGeometryUtils.mergeGeometries(geometries);
            const mesh = new THREE.Mesh(merged, this.roadMaterial);
            mesh.position.y = 0.05;
            this.scene.add(mesh);
        }
        // 已移除 createRoadSigns，以優化效能
    }

    createBuildings(buildingsData) {
        const geometries = [];
        buildingsData.forEach(b => {
            if (!b.coords || b.coords.length < 3) return;
            const shape = new THREE.Shape();
            shape.moveTo(b.coords[0][0], b.coords[0][1]);
            for (let i = 1; i < b.coords.length; i++) shape.lineTo(b.coords[i][0], b.coords[i][1]);
            const geometry = new THREE.ExtrudeGeometry(shape, { depth: 0.5, bevelEnabled: false });
            geometry.rotateX(-Math.PI / 2); 
            const g = 0.6 + Math.random() * 0.3;
            const color = new THREE.Color(g, g, g);
            const colors = [];
            for (let i = 0; i < geometry.getAttribute('position').count; i++) colors.push(color.r, color.g, color.b);
            geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
            geometries.push(geometry);
        });

        if (geometries.length > 0) {
            const merged = BufferGeometryUtils.mergeGeometries(geometries);
            const mesh = new THREE.Mesh(merged, this.buildingMaterial);
            mesh.position.y = 0.02;
            this.scene.add(mesh);
        }
    }
}
