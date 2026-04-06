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
        // ✨ 分組處理：每 50 條路徑合併一個 Mesh，以便未來進行局部隱藏 (Culling)
        const CHUNK_SIZE = 50;
        for (let i = 0; i < roadsData.length; i += CHUNK_SIZE) {
            const chunk = roadsData.slice(i, i + CHUNK_SIZE);
            const geometries = [];
            chunk.forEach(road => {
                if (!road.poly || road.poly.length < 3) return;
                const shape = new THREE.Shape();
                shape.moveTo(road.poly[0][0], road.poly[0][1]);
                for (let j = 1; j < road.poly.length; j++) shape.lineTo(road.poly[j][0], road.poly[j][1]);
                const geometry = new THREE.ExtrudeGeometry(shape, { depth: 0.2, bevelEnabled: false });
                geometry.rotateX(-Math.PI / 2); 
                geometries.push(geometry);
            });

            if (geometries.length > 0) {
                const merged = BufferGeometryUtils.mergeGeometries(geometries);
                // ✨ 計算中心點以便進行 Culling
                merged.computeBoundingBox();
                const center = new THREE.Vector3();
                merged.boundingBox.getCenter(center);
                merged.translate(-center.x, 0, -center.z); // 將頂點相對於中心平移

                const mesh = new THREE.Mesh(merged, this.roadMaterial);
                mesh.position.set(center.x, 0.05, center.z);
                mesh.name = `road_chunk_${i}`;
                this.scene.add(mesh);
            }
        }
    }

    createBuildings(buildingsData) {
        // ✨ 分組處理：每 100 棟建築合併一個 Mesh
        const CHUNK_SIZE = 100;
        for (let i = 0; i < buildingsData.length; i += CHUNK_SIZE) {
            const chunk = buildingsData.slice(i, i + CHUNK_SIZE);
            const geometries = [];
            chunk.forEach(b => {
                if (!b.coords || b.coords.length < 3) return;
                const shape = new THREE.Shape();
                shape.moveTo(b.coords[0][0], b.coords[0][1]);
                for (let j = 1; j < b.coords.length; j++) shape.lineTo(b.coords[j][0], b.coords[j][1]);
                const geometry = new THREE.ExtrudeGeometry(shape, { depth: 8.0, bevelEnabled: false });
                geometry.rotateX(-Math.PI / 2); 
                const g = 0.5 + Math.random() * 0.3;
                const color = new THREE.Color(g, g, g);
                const colors = [];
                const posAttr = geometry.getAttribute('position');
                for (let k = 0; k < posAttr.count; k++) colors.push(color.r, color.g, color.b);
                geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
                geometries.push(geometry);
            });

            if (geometries.length > 0) {
                const merged = BufferGeometryUtils.mergeGeometries(geometries);
                // ✨ 計算中心點以便進行 Culling
                merged.computeBoundingBox();
                const center = new THREE.Vector3();
                merged.boundingBox.getCenter(center);
                merged.translate(-center.x, 0, -center.z); // 將頂點相對於中心平移

                const mesh = new THREE.Mesh(merged, this.buildingMaterial);
                mesh.position.set(center.x, 0.02, center.z);
                mesh.name = `building_chunk_${i}`;
                this.scene.add(mesh);
            }
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
