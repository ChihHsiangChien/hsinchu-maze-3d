import * as THREE from 'three';

export class Player {
    constructor(scene, camera, domElement, physics, hud) {
        this.scene = scene;
        this.camera = camera;
        this.physics = physics;
        this.hud = hud;
        
        this.joystickVector = new THREE.Vector2(0, 0);
        this.walkSpeed = 55.0; 
        this.keys = { forward: false, backward: false, left: false, right: false };

        this.camDistance = 18.0; 
        this.fixedPitch = 0.6;  
        this.lastX = 0;

        this.createPlayerMesh();
        this.setupKeyboardControls();
        this.setupPointerControls();
    }

    createPlayerMesh() {
        this.mesh = new THREE.Group();
        const body = new THREE.Mesh(
            new THREE.CapsuleGeometry(0.4, 0.8, 4, 8),
            new THREE.MeshPhongMaterial({ color: 0x00ffff, emissive: 0x003333 })
        );
        body.position.y = 0.85; 
        this.mesh.add(body);
        const visor = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.3, 0.4), new THREE.MeshBasicMaterial({ color: 0xffff00 }));
        visor.position.set(0, 1.45, -0.4); 
        this.mesh.add(visor);
        this.scene.add(this.mesh);
    }

    setupKeyboardControls() {
        window.addEventListener('keydown', (e) => {
            switch (e.code) {
                case 'KeyW': case 'ArrowUp': this.keys.forward = true; break;
                case 'KeyS': case 'ArrowDown': this.keys.backward = true; break;
                case 'KeyA': case 'ArrowLeft': this.keys.left = true; break;
                case 'KeyD': case 'ArrowRight': this.keys.right = true; break;
            }
        });
        window.addEventListener('keyup', (e) => {
            switch (e.code) {
                case 'KeyW': case 'ArrowUp': this.keys.forward = false; break;
                case 'KeyS': case 'ArrowDown': this.keys.backward = false; break;
                case 'KeyA': case 'ArrowLeft': this.keys.left = false; break;
                case 'KeyD': case 'ArrowRight': this.keys.right = false; break;
            }
        });
    }

    setupPointerControls() {
        const mobileUI = document.getElementById('mobile-controls');
        const joystickZone = document.getElementById('joystick-zone');
        const knob = document.getElementById('joystick-knob');
        let movePointerId = null, rotatePointerId = null;

        window.addEventListener('touchstart', () => { mobileUI.style.display = 'block'; }, { once: true });

        joystickZone.addEventListener('pointerdown', (e) => {
            if (e.pointerType !== 'touch') return;
            movePointerId = e.pointerId;
            joystickZone.setPointerCapture(e.pointerId);
        });

        joystickZone.addEventListener('pointermove', (e) => {
            if (e.pointerId !== movePointerId) return;
            const rect = joystickZone.getBoundingClientRect();
            const dx = e.clientX - (rect.left + rect.width / 2);
            const dy = e.clientY - (rect.top + rect.height / 2);
            const dist = Math.sqrt(dx*dx + dy*dy), maxDist = 50;
            const fDx = dist > maxDist ? dx * (maxDist/dist) : dx;
            const fDy = dist > maxDist ? dy * (maxDist/dist) : dy;
            knob.style.transform = `translate(${fDx}px, ${fDy}px)`;
            this.joystickVector.set(fDx / maxDist, fDy / maxDist);
        });

        window.addEventListener('pointerdown', (e) => {
            if (movePointerId === e.pointerId || rotatePointerId !== null) return;
            if (e.pointerType === 'touch' && e.clientX > window.innerWidth * 0.5) return;
            rotatePointerId = e.pointerId;
            this.lastX = e.clientX;
        });

        window.addEventListener('pointermove', (e) => {
            if (e.pointerId === rotatePointerId) {
                this.mesh.rotation.y -= (e.clientX - this.lastX) * 0.01;
                this.lastX = e.clientX;
            }
        });

        const onUp = (e) => {
            if (e.pointerId === movePointerId) { movePointerId = null; knob.style.transform = 'translate(0, 0)'; this.joystickVector.set(0, 0); }
            else if (e.pointerId === rotatePointerId) rotatePointerId = null;
        };
        window.addEventListener('pointerup', onUp);
        window.addEventListener('pointercancel', onUp);
    }

    update(delta) {
        if (delta > 0.05) delta = 0.05;

        // 1. 取得合成輸入向量
        const input = new THREE.Vector2(0, 0);
        if (this.keys.forward) input.y -= 1;
        if (this.keys.backward) input.y += 1;
        if (this.keys.left) input.x -= 1;
        if (this.keys.right) input.x += 1;
        
        // 疊加搖桿
        input.add(this.joystickVector);
        if (input.length() > 1) input.normalize();

        if (input.length() > 0.05) {
            const oldPos = this.mesh.position.clone();
            const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.mesh.quaternion);
            const side = new THREE.Vector3(1, 0, 0).applyQuaternion(this.mesh.quaternion);
            
            const moveVec = new THREE.Vector3();
            moveVec.addScaledVector(forward, -input.y * this.walkSpeed * delta);
            moveVec.addScaledVector(side, input.x * this.walkSpeed * delta);

            // --- 脫困機制：如果目前就不在路上，允許移動 ---
            const currentRoad = this.physics.getCurrentRoad(oldPos.x, oldPos.z);
            
            if (!currentRoad) {
                // 如果目前在草地，則使用「安全位移」 (不執行物理阻擋)
                this.mesh.position.add(moveVec);
                this.hud.updateRoadName(null);
            } else {
                // 如果在路面上，執行嚴格的滑動碰撞
                const nextX = oldPos.x + moveVec.x;
                const roadX = this.physics.getCurrentRoad(nextX, oldPos.z);
                if (roadX) {
                    this.mesh.position.x = nextX;
                    this.hud.updateRoadName(roadX.name);
                }
                
                const nextZ = oldPos.z + moveVec.z;
                const roadZ = this.physics.getCurrentRoad(this.mesh.position.x, nextZ);
                if (roadZ) {
                    this.mesh.position.z = nextZ;
                    this.hud.updateRoadName(roadZ.name);
                }
            }
        }

        // 相機與指北針
        const compass = document.getElementById('compass-pivot');
        if (compass) compass.style.transform = `rotate(${THREE.MathUtils.radToDeg(this.mesh.rotation.y)}deg)`;

        const h = Math.sin(this.fixedPitch) * this.camDistance;
        const d = Math.cos(this.fixedPitch) * this.camDistance;
        const offset = new THREE.Vector3(0, h + 2, d).applyQuaternion(this.mesh.quaternion);
        this.camera.position.copy(this.mesh.position).add(offset);
        this.camera.lookAt(this.mesh.position.x, 1.2, this.mesh.position.z);
        this.camera.up.set(0, 1, 0);
    }
}
