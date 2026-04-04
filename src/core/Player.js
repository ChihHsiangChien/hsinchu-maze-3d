import * as THREE from 'three';

export class Player {
    constructor(scene, camera, domElement, physics, hud) {
        this.scene = scene;
        this.camera = camera;
        this.physics = physics;
        this.hud = hud;
        
        this.joystickVector = new THREE.Vector2(0, 0);
        this.lastX = 0; 
        this.isMobile = false;
        this.walkSpeed = 55.0; 

        // --- 修正：調整相機參數，使主角位於畫面下 1/3 ---
        this.camDistance = 18.0; 
        this.fixedPitch = 0.8; // 增加俯角，讓主角在視覺上下沉
        
        this.compassPivot = document.getElementById('compass-pivot');
        
        this.createPlayerMesh();
        this.setupZonedControls();
    }

    createPlayerMesh() {
        this.mesh = new THREE.Group();
        const body = new THREE.Mesh(
            new THREE.CapsuleGeometry(0.4, 0.8, 4, 8),
            new THREE.MeshPhongMaterial({ color: 0x00ffff, emissive: 0x003333 })
        );
        body.position.y = 0.85; 
        this.mesh.add(body);
        const visor = new THREE.Mesh(
            new THREE.BoxGeometry(1.0, 0.3, 0.4),
            new THREE.MeshBasicMaterial({ color: 0xffff00 })
        );
        visor.position.set(0, 1.45, -0.4); 
        this.mesh.add(visor);
        this.scene.add(this.mesh);
    }

    setupZonedControls() {
        const mobileUI = document.getElementById('mobile-controls');
        const rotationZone = document.getElementById('rotation-zone');
        const joystickZone = document.getElementById('joystick-zone');
        const knob = document.getElementById('joystick-knob');

        window.addEventListener('pointerdown', () => { this.isMobile = true; mobileUI.style.display = 'block'; }, { once: true });

        let movePointerId = null;
        joystickZone.addEventListener('pointerdown', (e) => { e.stopPropagation(); movePointerId = e.pointerId; joystickZone.setPointerCapture(e.pointerId); });
        joystickZone.addEventListener('pointermove', (e) => {
            if (e.pointerId !== movePointerId) return;
            const rect = joystickZone.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            let dx = e.clientX - centerX;
            let dy = e.clientY - centerY;
            const dist = Math.sqrt(dx*dx + dy*dy);
            const maxDist = 50;
            if (dist > maxDist) { dx *= maxDist / dist; dy *= maxDist / dist; }
            knob.style.transform = `translate(${dx}px, ${dy}px)`;
            this.joystickVector.set(dx / maxDist, dy / maxDist);
        });
        const endMove = (e) => { if (e.pointerId === movePointerId) { movePointerId = null; knob.style.transform = 'translate(0, 0)'; this.joystickVector.set(0, 0); } };
        joystickZone.addEventListener('pointerup', endMove);
        joystickZone.addEventListener('pointercancel', endMove);

        let rotatePointerId = null;
        rotationZone.addEventListener('pointerdown', (e) => { e.stopPropagation(); rotatePointerId = e.pointerId; this.lastX = e.clientX; rotationZone.setPointerCapture(e.pointerId); });
        rotationZone.addEventListener('pointermove', (e) => {
            if (e.pointerId !== rotatePointerId) return;
            const dx = e.clientX - this.lastX;
            this.mesh.rotation.y -= dx * 0.01; 
            this.lastX = e.clientX;
        });
        const endRotate = (e) => { if (e.pointerId === rotatePointerId) rotatePointerId = null; };
        rotationZone.addEventListener('pointerup', endRotate);
        rotationZone.addEventListener('pointercancel', endRotate);
    }

    update(delta) {
        if (delta > 0.1) delta = 0.1;

        if (this.compassPivot) {
            const angle = THREE.MathUtils.radToDeg(this.mesh.rotation.y);
            this.compassPivot.style.transform = `rotate(${angle}deg)`;
        }

        const currentRoad = this.physics.getCurrentRoad(this.mesh.position.x, this.mesh.position.z);
        if (currentRoad) {
            this.hud.updateRoadName(currentRoad.name);
        } else {
            this.hud.updateRoadName(null);
        }

        if (this.joystickVector.length() > 0.05) {
            const oldPos = this.mesh.position.clone();
            const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.mesh.quaternion);
            const side = new THREE.Vector3(1, 0, 0).applyQuaternion(this.mesh.quaternion);
            
            const moveVec = new THREE.Vector3();
            moveVec.addScaledVector(forward, -this.joystickVector.y * this.walkSpeed * delta);
            moveVec.addScaledVector(side, this.joystickVector.x * this.walkSpeed * delta);

            const nextX = oldPos.x + moveVec.x;
            if (this.physics.getCurrentRoad(nextX, oldPos.z)) this.mesh.position.x = nextX;
            const nextZ = oldPos.z + moveVec.z;
            if (this.physics.getCurrentRoad(this.mesh.position.x, nextZ)) this.mesh.position.z = nextZ;
        }

        // --- 視覺優化：主角位置下沉到畫面 1/3 ---
        const h = Math.sin(this.fixedPitch) * this.camDistance;
        const d = Math.cos(this.fixedPitch) * this.camDistance;
        const offset = new THREE.Vector3(0, h + 2, d).applyQuaternion(this.mesh.quaternion);
        this.camera.position.copy(this.mesh.position).add(offset);
        
        // 關鍵：將相機焦點稍微往主角前方移一點，這會讓主角在畫面上看起來更靠下
        const lookOffset = new THREE.Vector3(0, 0, -5).applyQuaternion(this.mesh.quaternion);
        const lookTarget = this.mesh.position.clone().add(new THREE.Vector3(0, 1.2, 0)).add(lookOffset);
        this.camera.lookAt(lookTarget);
        
        this.camera.up.set(0, 1, 0);
    }
}
