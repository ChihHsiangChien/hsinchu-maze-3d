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

        this.camDistance = 25.0; 
        this.fixedPitch = 0.55;  
        this.lastX = 0;

        this.createPlayerMesh();
        this.setupKeyboardControls();
        this.setupPointerControls();
    }

    createPlayerMesh() {
        this.mesh = new THREE.Group();
        this.bodyMaterial = new THREE.MeshPhongMaterial({ color: 0xfff000, emissive: 0x222200 });
        
        // 1. 頭部
        const head = new THREE.Mesh(
            new THREE.SphereGeometry(0.7, 16, 12),
            this.bodyMaterial
        );
        head.position.y = 0.7;
        this.mesh.add(head);

        // 2. ✨ 修復版大眼睛 (眼白 + 突出黑珠)
        const whiteEyeGeo = new THREE.SphereGeometry(0.18, 8, 8);
        const whiteEyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const blackEyeGeo = new THREE.SphereGeometry(0.1, 8, 8); // 黑珠稍微大一點
        const blackEyeMat = new THREE.MeshBasicMaterial({ color: 0x000000 });

        // 左眼組
        const leftEyeGroup = new THREE.Group();
        const leftWhite = new THREE.Mesh(whiteEyeGeo, whiteEyeMat);
        const leftBlack = new THREE.Mesh(blackEyeGeo, blackEyeMat);
        leftBlack.position.z = -0.12; // ✨ 確保黑珠在眼白前面 (負 Z 是前方)
        leftEyeGroup.add(leftWhite);
        leftEyeGroup.add(leftBlack);
        leftEyeGroup.position.set(-0.38, 0.8, -0.5); // ✨ 眼距更開，且更深入頭部
        leftEyeGroup.rotation.y = -0.4; 
        this.mesh.add(leftEyeGroup);

        // 右眼組
        const rightEyeGroup = new THREE.Group();
        const rightWhite = new THREE.Mesh(whiteEyeGeo, whiteEyeMat);
        const rightBlack = new THREE.Mesh(blackEyeGeo, blackEyeMat);
        rightBlack.position.z = -0.12; // ✨ 確保黑珠在眼白前面
        rightEyeGroup.add(rightWhite);
        rightEyeGroup.add(rightBlack);
        rightEyeGroup.position.set(0.38, 0.8, -0.5); // ✨ 眼距更開
        rightEyeGroup.rotation.y = 0.4;
        this.mesh.add(rightEyeGroup);

        // 3. 耳朵
        const earGeo = new THREE.ConeGeometry(0.3, 0.7, 6);
        const leftEar = new THREE.Mesh(earGeo, this.bodyMaterial);
        leftEar.position.set(-0.4, 1.2, 0);
        leftEar.rotation.z = 0.4;
        this.mesh.add(leftEar);
        const rightEar = new THREE.Mesh(earGeo, this.bodyMaterial);
        rightEar.position.set(0.4, 1.2, 0);
        rightEar.rotation.z = -0.4;
        this.mesh.add(rightEar);

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

        const input = new THREE.Vector2(0, 0);
        if (this.keys.forward) input.y -= 1;
        if (this.keys.backward) input.y += 1;
        if (this.keys.left) input.x -= 1;
        if (this.keys.right) input.x += 1;
        
        input.add(this.joystickVector);
        if (input.length() > 1) input.normalize();

        if (input.length() > 0.05) {
            const oldPos = this.mesh.position.clone();
            const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.mesh.quaternion);
            const side = new THREE.Vector3(1, 0, 0).applyQuaternion(this.mesh.quaternion);
            
            const moveVec = new THREE.Vector3();
            moveVec.addScaledVector(forward, -input.y * this.walkSpeed * delta);
            moveVec.addScaledVector(side, input.x * this.walkSpeed * delta);

            const currentRoad = this.physics.getCurrentRoad(oldPos.x, oldPos.z);
            
            if (!currentRoad) {
                this.mesh.position.add(moveVec);
                this.hud.updateRoadName(null);
            } else {
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

        const compass = document.getElementById('compass-pivot');
        if (compass) {
            compass.style.transform = `rotate(${THREE.MathUtils.radToDeg(this.mesh.rotation.y)}deg)`;
        }

        const aspect = window.innerWidth / window.innerHeight;
        if (aspect < 1) {
            this.camera.fov = 75 + (1 - aspect) * 20; 
        } else {
            this.camera.fov = 70; 
        }
        this.camera.updateProjectionMatrix();

        const h = Math.sin(this.fixedPitch) * this.camDistance;
        const d = Math.cos(this.fixedPitch) * this.camDistance;
        const offset = new THREE.Vector3(0, h + 2, d).applyQuaternion(this.mesh.quaternion);
        this.camera.position.copy(this.mesh.position).add(offset);
        
        const targetLookAtHeight = aspect < 1 ? 8.5 + (1 - aspect) * 5 : 7.0;
        this.camera.lookAt(this.mesh.position.x, targetLookAtHeight, this.mesh.position.z);
        this.camera.up.set(0, 1, 0);
    }
}
