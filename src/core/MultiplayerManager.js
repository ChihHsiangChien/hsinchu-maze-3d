import * as THREE from 'three';
import { io } from 'socket.io-client';

export class MultiplayerManager {
    constructor(scene, player, nickname, isAdmin = false, initialPos = null, serverPort = 8888, serverHost = null) {
        this.scene = scene;
        this.player = player;
        this.nickname = nickname;
        this.isAdmin = isAdmin;
        this.initialPos = initialPos;
        this.others = {}; 
        this.socket = null;
        this.trackingId = null; 
        this.allPlayersData = {}; 
        
        this.lastUpdateMsgTime = 0;
        this.updateInterval = 66; 
        this.lastUIRenderTime = 0;
        this.maxVisibleDist = isAdmin ? 4000 : 600; 
        
        // ✨ 自動判斷通訊協定
        // 如果網頁是 HTTPS，連線也必須是 HTTPS (wss) 才能通過瀏覽器檢查
        const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
        const host = serverHost || window.location.hostname;
        const serverUrl = `${protocol}//${host}:${serverPort}`;
        
        console.log(`🔌 Attempting connection to: ${serverUrl}`);
        this.init(serverUrl);

        if (this.isAdmin && this.player && this.player.mesh) {
            this.scene.remove(this.player.mesh);
        }
    }

    debugLog(msg) { }

    init(serverUrl) {
        this.socket = io(serverUrl, { transports: ['polling', 'websocket'] }); 

        this.socket.on('connect', () => {
            if (this.isAdmin) {
                this.socket.emit('set_as_admin');
            } else {
                this.socket.emit('setNickname', this.nickname);
                if (this.initialPos) {
                    this.socket.emit('playerMovement', { pos: this.initialPos, rot: 0 });
                }
            }
        });

        this.socket.on('init_data', (data) => {
            this.allPlayersData = data.players;
            const myData = data.players[data.id];
            if (!this.isAdmin && this.player && myData && myData.color) {
                this.player.bodyMaterial.color.setHex(myData.color);
            }
            Object.keys(data.players).forEach(id => {
                if (id !== data.id && !data.players[id].isAdmin) {
                    this.addOtherPlayer(id, data.players[id]);
                }
            });
        });

        this.socket.on('joinedGame', () => {
            const lobby = document.getElementById('lobby-overlay');
            if (lobby) lobby.style.display = 'none';
        });

        this.socket.on('updatePlayerList', (players) => {
            this.allPlayersData = players;
            Object.keys(players).forEach(id => {
                if (id !== this.socket.id && !players[id].isAdmin) {
                    this.addOtherPlayer(id, players[id]);
                    this.updatePlayerLabel(id, players[id].name);
                }
            });
            const now = Date.now();
            if (this.isAdmin && now - this.lastUIRenderTime > 500) {
                this.renderAdminPanel(players);
                this.lastUIRenderTime = now;
            }
        });

        this.socket.on('playerMoved', (data) => {
            if (data.data.isAdmin) return;
            if (this.others[data.id]) {
                const other = this.others[data.id];
                other.position.set(data.data.pos.x, data.data.pos.y, data.data.pos.z);
                other.rotation.y = data.data.rot;
            }
        });

        this.socket.on('teleport', (pos) => {
            if (this.player && this.player.mesh && !this.isAdmin) {
                this.player.mesh.position.set(pos.x, pos.y, pos.z);
            }
        });

        this.socket.on('playerDisconnected', (id) => {
            if (this.others[id]) {
                const group = this.others[id];
                group.traverse(child => {
                    if (child.material) child.material.dispose();
                    if (child.geometry) child.geometry.dispose();
                });
                this.scene.remove(group);
                delete this.others[id];
                if (this.trackingId === id) this.trackingId = null;
            }
        });
    }

    findNearestRoadPos(x, z) {
        const physics = this.player.physics;
        if (!physics) return { x, y: 0, z };
        if (physics.getCurrentRoad(x, z)) return { x, y: 0, z };
        const step = 5; const maxDist = 300; 
        for (let d = step; d <= maxDist; d += step) {
            for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 6) {
                const tx = x + Math.cos(angle) * d;
                const tz = z + Math.sin(angle) * d;
                if (physics.getCurrentRoad(tx, tz)) return { x: tx, y: 0, z: tz };
            }
        }
        return { x, y: 0, z }; 
    }

    updatePlayerLabel(id, newName) {
        if (!this.others[id] || !newName) return;
        const group = this.others[id];
        const oldLabel = group.getObjectByName("name_label");
        if (oldLabel && oldLabel.userData.currentName !== newName) {
            group.remove(oldLabel);
            if (oldLabel.material) oldLabel.material.dispose();
            if (oldLabel.material.map) oldLabel.material.map.dispose();
            const newLabel = this.createNameLabel(newName);
            newLabel.name = "name_label";
            group.add(newLabel);
        }
    }

    addOtherPlayer(id, data) {
        if (this.others[id]) return;
        const group = new THREE.Group();
        const playerColor = data.color || 0x00ffcc;
        const headMat = new THREE.MeshPhongMaterial({ color: playerColor });
        
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.7, 16, 12), headMat);
        head.position.y = 0.7;
        group.add(head);

        // ✨ 呆萌感大眼睛 (修復黑珠位置)
        const whiteEyeGeo = new THREE.SphereGeometry(0.18, 8, 8);
        const whiteEyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const blackEyeGeo = new THREE.SphereGeometry(0.1, 8, 8);
        const blackEyeMat = new THREE.MeshBasicMaterial({ color: 0x000000 });

        const leftEyeGroup = new THREE.Group();
        const leftWhite = new THREE.Mesh(whiteEyeGeo, whiteEyeMat);
        const leftBlack = new THREE.Mesh(blackEyeGeo, blackEyeMat);
        leftBlack.position.z = -0.12; // ✨ 拉回前方
        leftEyeGroup.add(leftWhite); leftEyeGroup.add(leftBlack);
        leftEyeGroup.position.set(-0.38, 0.8, -0.5);
        leftEyeGroup.rotation.y = -0.4;
        group.add(leftEyeGroup);

        const rightEyeGroup = new THREE.Group();
        const rightWhite = new THREE.Mesh(whiteEyeGeo, whiteEyeMat);
        const rightBlack = new THREE.Mesh(blackEyeGeo, blackEyeMat);
        rightBlack.position.z = -0.12; // ✨ 拉回前方
        rightEyeGroup.add(rightWhite); rightEyeGroup.add(rightBlack);
        rightEyeGroup.position.set(0.38, 0.8, -0.5);
        rightEyeGroup.rotation.y = 0.4;
        group.add(rightEyeGroup);

        const earGeo = new THREE.ConeGeometry(0.3, 0.7, 6);
        const leftEar = new THREE.Mesh(earGeo, headMat);
        leftEar.position.set(-0.5, 1.3, 0);
        leftEar.rotation.z = 0.5;
        group.add(leftEar);
        const rightEar = new THREE.Mesh(earGeo, headMat);
        rightEar.position.set(0.5, 1.3, 0);
        rightEar.rotation.z = -0.5;
        group.add(rightEar);

        const label = this.createNameLabel(data.name || "探索者");
        label.name = "name_label"; group.add(label);

        if (this.isAdmin) {
            const auraMat = new THREE.MeshBasicMaterial({ color: 0xffff00, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthTest: false });
            const auraGeo = new THREE.RingGeometry(3.0, 4.0, 32);
            const aura = new THREE.Mesh(auraGeo, auraMat);
            aura.rotation.x = -Math.PI / 2; aura.position.y = 0.5; aura.name = "aura"; aura.renderOrder = 1000;
            group.add(aura);
            const coreGeo = new THREE.CircleGeometry(3.0, 32);
            const coreMat = new THREE.MeshBasicMaterial({ color: 0xffff00, transparent: true, opacity: 0.3, depthTest: false });
            const core = new THREE.Mesh(coreGeo, coreMat);
            core.rotation.x = -Math.PI / 2; core.position.y = 0.48; core.name = "aura_core"; core.renderOrder = 999;
            group.add(core);
            const markerGeo = new THREE.CylinderGeometry(0.5, 0, 10, 4);
            const markerMat = new THREE.MeshBasicMaterial({ color: 0xffff00, transparent: true, opacity: 0.5, depthTest: false });
            const marker = new THREE.Mesh(markerGeo, markerMat);
            marker.name = "height_marker"; marker.renderOrder = 1001;
            group.add(marker);
        }

        group.position.set(data.pos.x, data.pos.y, data.pos.z);
        this.scene.add(group);
        this.others[id] = group;
    }

    createNameLabel(text) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 256; canvas.height = 64;
        ctx.fillStyle = 'rgba(255, 255, 0, 0.9)'; ctx.roundRect(0, 0, 256, 64, 10); ctx.fill();
        ctx.fillStyle = 'black'; ctx.font = 'bold 36px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(text, 128, 32);
        const texture = new THREE.CanvasTexture(canvas);
        const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false }));
        sprite.renderOrder = 2000;
        sprite.userData.currentName = text;
        return sprite;
    }

    renderAdminPanel(players) {
        const listEl = document.getElementById('player-list');
        if (!listEl) return;
        const targetPlayers = (players && Object.keys(players).length > 0) ? players : this.allPlayersData;
        if (!targetPlayers || Object.keys(targetPlayers).length === 0) return;
        listEl.innerHTML = '';
        
        const waitingPlayers = Object.keys(targetPlayers).filter(id => targetPlayers[id].isWaiting && !targetPlayers[id].isAdmin);
        const batchBtn = document.createElement('button');
        batchBtn.className = 'admin-btn btn-allow-all';
        batchBtn.innerText = '放行所有人';
        batchBtn.style.width = '100%'; batchBtn.style.marginBottom = '10px'; batchBtn.style.padding = '12px';
        if (waitingPlayers.length > 0) {
            batchBtn.style.backgroundColor = '#00ffcc'; batchBtn.style.boxShadow = '0 0 15px #ffff00';
            batchBtn.onclick = () => waitingPlayers.forEach(id => this.socket.emit('admin_allowPlayer', id));
        } else {
            batchBtn.disabled = true; batchBtn.style.backgroundColor = '#444';
        }
        listEl.appendChild(batchBtn);

        const sortedIds = Object.keys(targetPlayers)
            .filter(id => !targetPlayers[id].isAdmin)
            .sort((a, b) => (targetPlayers[a].name || "").localeCompare(targetPlayers[b].name || "", undefined, { numeric: true }));

        sortedIds.forEach(id => {
            const p = targetPlayers[id];
            const item = document.createElement('div');
            item.className = 'player-item';
            if (this.trackingId === id) item.style.backgroundColor = "rgba(255, 0, 255, 0.4)";
            item.style.flexDirection = 'column'; item.style.alignItems = 'flex-start';
            const isWaiting = p.isWaiting;
            const btnBg = isWaiting ? '#333' : '#700070';
            const btnColor = isWaiting ? '#666' : '#fff';
            const cursor = isWaiting ? 'not-allowed' : 'pointer';
            item.innerHTML = `
                <div style="display:flex; width:100%; justify-content:space-between; align-items:center;">
                    <div class="player-info" style="cursor:pointer; flex-grow:1;">
                        <b style="color: ${this.trackingId === id ? '#ff00ff' : 'white'}">${p.name || "未知"}</b>
                    </div>
                    <div>${isWaiting ? `<button class="admin-btn btn-allow" data-id="${id}" style="background:#00ffcc; color:#000;">放行</button>` : ''}</div>
                </div>
                <div style="margin-top: 8px; display: flex; gap: 5px; width: 100%;">
                    <button class="admin-btn btn-tp-reset" style="flex:1; background:${btnBg}; color:${btnColor}; cursor:${cursor}; padding:6px; font-weight:bold; border-radius:5px; border:none;" ${isWaiting ? 'disabled' : ''} data-id="${id}">歸位</button>
                    <button class="admin-btn btn-tp-here" style="flex:1; background:${btnBg}; color:${btnColor}; cursor:${cursor}; padding:6px; font-weight:bold; border-radius:5px; border:none;" ${isWaiting ? 'disabled' : ''} data-id="${id}">召喚</button>
                </div>
            `;
            item.querySelector('.player-info').onclick = () => this.toggleTracking(id, p.name);
            listEl.appendChild(item);
        });

        listEl.querySelectorAll('.btn-allow').forEach(b => b.onclick = (e) => this.socket.emit('admin_allowPlayer', b.dataset.id));
        listEl.querySelectorAll('.btn-tp-reset').forEach(b => b.onclick = () => {
            const targetId = b.getAttribute('data-id');
            this.socket.emit('admin_teleportPlayer', { targetId, pos: { x: 307, y: 0, z: -1872 } });
        });
        listEl.querySelectorAll('.btn-tp-here').forEach(b => b.onclick = () => {
            if (window.adminControls) {
                const targetId = b.getAttribute('data-id');
                const center = window.adminControls.target;
                const roadPos = this.findNearestRoadPos(center.x, center.z);
                this.socket.emit('admin_teleportPlayer', { targetId, pos: roadPos });
            }
        });
    }

    toggleTracking(id, name) {
        this.trackingId = (this.trackingId === id) ? null : id;
        this.renderAdminPanel(this.allPlayersData); 
    }

    update() {
        const now = Date.now();
        if (this.socket && this.socket.connected && !this.isAdmin) {
            if (now - this.lastUpdateMsgTime > this.updateInterval) {
                this.socket.emit('playerMovement', {
                    pos: { x: this.player.mesh.position.x, y: this.player.mesh.position.y, z: this.player.mesh.position.z },
                    rot: this.player.mesh.rotation.y,
                    name: this.nickname
                });
                this.lastUpdateMsgTime = now;
            }
        }

        const camPos = this.player.camera.position;

        if (this.isAdmin && this.trackingId && window.adminControls) {
            const targetPlayer = this.others[this.trackingId];
            if (targetPlayer) {
                const targetPos = targetPlayer.position;
                const currentOffset = new THREE.Vector3().subVectors(camPos, window.adminControls.target);
                window.adminControls.target.copy(targetPos);
                this.player.camera.position.copy(targetPos).add(currentOffset);
            }
        }

        Object.keys(this.others).forEach(id => {
            const group = this.others[id];
            const label = group.getObjectByName("name_label");
            if (!label) return;
            const dist = camPos.distanceTo(group.position);
            group.visible = dist < this.maxVisibleDist;
            if (!group.visible) return;
            const labelScale = this.isAdmin ? Math.max(1, dist / 80) : Math.max(0.6, dist / 150);
            label.scale.set(12 * labelScale, 3 * labelScale, 1);
            label.position.y = 4.5 + (labelScale * 2.0); 

            if (this.isAdmin) {
                const aura = group.getObjectByName("aura");
                const core = group.getObjectByName("aura_core");
                const marker = group.getObjectByName("height_marker");
                const isTarget = (id === this.trackingId);
                const targetColor = isTarget ? 0xff00ff : 0xffff00;
                if (aura && core) {
                    const scaleFactor = Math.pow(dist, 1.1) / 100;
                    aura.scale.set(scaleFactor, scaleFactor, 1);
                    core.scale.set(scaleFactor, scaleFactor, 1);
                    aura.material.color.setHex(targetColor);
                    core.material.color.setHex(targetColor);
                }
                if (marker) {
                    marker.visible = dist > 300;
                    if (marker.visible) {
                        marker.material.color.setHex(targetColor);
                        marker.scale.set(labelScale, labelScale * 2, labelScale);
                        marker.position.y = 10 * labelScale;
                    }
                }
                label.material.color.setHex(isTarget ? 0xffbbff : 0xffffff);
            }
        });
    }
}
