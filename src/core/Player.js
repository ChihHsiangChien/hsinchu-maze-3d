import * as THREE from 'three';

export class Player {
    constructor(scene, camera, domElement, physics, hud) {
        this.scene = scene;
        this.camera = camera;
        this.physics = physics;
        this.hud = hud;
        
        // 核心狀態
        this.joystickVector = new THREE.Vector2(0, 0);
        this.keyboardVector = new THREE.Vector2(0, 0); 
        this.lastX = 0; 
        this.walkSpeed = 55.0; 

        // 相機參數
        this.camDistance = 18.0; 
        this.fixedPitch = 0.6;  
        
        this.compassPivot = document.getElementById('compass-pivot');
        
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
        const visor = new THREE.Mesh(
            new THREE.BoxGeometry(1.0, 0.3, 0.4),
            new THREE.MeshBasicMaterial({ color: 0xffff00 })
        );
        visor.position.set(0, 1.45, -0.4); 
        this.mesh.add(visor);
        this.scene.add(this.mesh);
    }

    setupKeyboardControls() {
        const keys = { 
            KeyW: 0, ArrowUp: 0, 
            KeyS: 0, ArrowDown: 0, 
            KeyA: 0, ArrowLeft: 0, 
            KeyD: 0, ArrowRight: 0 
        };

        const updateVector = () => {
            this.keyboardVector.y = (keys.KeyS || keys.ArrowDown) - (keys.KeyW || keys.ArrowUp);
            this.keyboardVector.x = (keys.KeyA || keys.ArrowLeft) - (keys.KeyD || keys.ArrowRight);
        };

        window.addEventListener('keydown', (e) => {
            if (keys.hasOwnProperty(e.code)) { keys[e.code] = 1; updateVector(); }
        });
        window.addEventListener('keyup', (e) => {
            if (keys.hasOwnProperty(e.code)) { keys[e.code] = 0; updateVector(); }
        });

        window.addEventListener('wheel', (e) => {
            this.camDistance += e.deltaY * 0.05;
            this.camDistance = THREE.MathUtils.clamp(this.camDistance, 10, 100);
        });
    }

    setupPointerControls() {
        const mobileUI = document.getElementById('mobile-controls');
        const joystickZone = document.getElementById('joystick-zone');
        const knob = document.getElementById('joystick-knob');

        let movePointerId = null;
        let rotatePointerId = null;

        // --- 全局指針處理 ---
        window.addEventListener('pointerdown', (e) => {
            // 偵測是否為觸控模式
            const isTouch = e.pointerType === 'touch';
            if (isTouch) mobileUI.style.display = 'block';

            // 1. 如果是觸控且在右半邊，或者是點擊了搖桿區 -> 啟動位移 (只限觸控)
            if (isTouch && e.clientX > window.innerWidth * 0.5 && movePointerId === null) {
                movePointerId = e.pointerId;
                joystickZone.setPointerCapture(e.pointerId);
            } 
            // 2. 如果是滑鼠 (任何地方)，或者是觸控左半邊 -> 啟動旋轉
            else if (rotatePointerId === null) {
                // 如果是觸控，確保不在搖桿區
                if (isTouch && e.clientX > window.innerWidth * 0.5) return;
                
                rotatePointerId = e.pointerId;
                this.lastX = e.clientX;
            }
        });

        window.addEventListener('pointermove', (e) => {
            // 處理位移 (僅限觸控)
            if (e.pointerId === movePointerId) {
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
            }
            // 處理旋轉 (滑鼠在全螢幕皆可，觸控在左半)
            else if (e.pointerId === rotatePointerId) {
                const dx = e.clientX - this.lastX;
                this.mesh.rotation.y -= dx * 0.01; 
                this.lastX = e.clientX;
            }
        });

        const onPointerUp = (e) => {
            if (e.pointerId === movePointerId) {
                movePointerId = null;
                knob.style.transform = 'translate(0, 0)';
                this.joystickVector.set(0, 0);
            } else if (e.pointerId === rotatePointerId) {
                rotatePointerId = null;
            }
        };

        window.addEventListener('pointerup', onPointerUp);
        window.addEventListener('pointercancel', onPointerUp);
    }

    update(delta) {
        if (delta > 0.1) delta = 0.1;

        if (this.compassPivot) {
            this.compassPivot.style.transform = `rotate(${THREE.MathUtils.radToDeg(this.mesh.rotation.y)}deg)`;
        }

        const currentRoad = this.physics.getCurrentRoad(this.mesh.position.x, this.mesh.position.z);
        this.hud.updateRoadName(currentRoad ? currentRoad.name : null);

        // 合併鍵盤位移與觸控搖桿
        const combinedInput = new THREE.Vector2().addVectors(this.joystickVector, this.keyboardVector);
        
        if (combinedInput.length() > 0.05) {
            const oldPos = this.mesh.position.clone();
            const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.mesh.quaternion);
            const side = new THREE.Vector3(1, 0, 0).applyQuaternion(this.mesh.quaternion);
            
            const moveVec = new THREE.Vector3();
            moveVec.addScaledVector(forward, -combinedInput.y * this.walkSpeed * delta);
            moveVec.addScaledVector(side, -combinedInput.x * this.walkSpeed * delta);

            const nextX = oldPos.x + moveVec.x;
            if (this.physics.getCurrentRoad(nextX, oldPos.z)) this.mesh.position.x = nextX;
            const nextZ = oldPos.z + moveVec.z;
            if (this.physics.getCurrentRoad(this.mesh.position.x, nextZ)) this.mesh.position.z = nextZ;
        }

        const h = Math.sin(this.fixedPitch) * this.camDistance;
        const d = Math.cos(this.fixedPitch) * this.camDistance;
        const offset = new THREE.Vector3(0, h + 2, d).applyQuaternion(this.mesh.quaternion);
        this.camera.position.copy(this.mesh.position).add(offset);
        this.camera.lookAt(this.mesh.position.x, 1.2, this.mesh.position.z);
        this.camera.up.set(0, 1, 0);
    }
}
