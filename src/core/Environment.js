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
    }

    createBuildings(buildingsData) {
        const geometries = [];
        buildingsData.forEach(b => {
            if (!b.coords || b.coords.length < 3) return;
            const shape = new THREE.Shape();
            shape.moveTo(b.coords[0][0], b.coords[0][1]);
            for (let i = 1; i < b.coords.length; i++) shape.lineTo(b.coords[i][0], b.coords[i][1]);
            const geometry = new THREE.ExtrudeGeometry(shape, { depth: 8.0, bevelEnabled: false });
            geometry.rotateX(-Math.PI / 2); 
            const g = 0.5 + Math.random() * 0.3;
            const color = new THREE.Color(g, g, g);
            const colors = [];
            const posAttr = geometry.getAttribute('position');
            for (let i = 0; i < posAttr.count; i++) colors.push(color.r, color.g, color.b);
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

    /**
     * 關鍵升級：高效隨機植被系統 (集中在起點周邊)
     */
    generateRandomTrees(physics, count = 1000, centerX = 0, centerZ = 0) {
        const leafGeo = new THREE.ConeGeometry(1, 3, 6);
        const leafMat = new THREE.MeshStandardMaterial({ color: 0x1a5a1a, roughness: 0.8 });
        
        const instancedTrees = new THREE.InstancedMesh(leafGeo, leafMat, count);
        const dummy = new THREE.Object3D();
        let placedCount = 0;

        for (let i = 0; i < count; i++) {
            // 在指定中心點 (光華起點) 周邊 600 米加密分佈
            const x = centerX + (Math.random() - 0.5) * 1200;
            const z = centerZ + (Math.random() - 0.5) * 1200;

            if (!physics.getCurrentRoad(x, z)) {
                dummy.position.set(x, 1.5, z);
                dummy.scale.setScalar(0.5 + Math.random() * 1.5);
                dummy.rotation.y = Math.random() * Math.PI;
                dummy.updateMatrix();
                instancedTrees.setMatrixAt(placedCount++, dummy.matrix);
            }
        }

        instancedTrees.instanceMatrix.needsUpdate = true;
        instancedTrees.count = placedCount; 
        this.scene.add(instancedTrees);
    }
}
