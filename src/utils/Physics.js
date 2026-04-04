import * as turf from '@turf/turf';

export class Physics {
    constructor() {
        this.roadData = [];
        this.grid = new Map();
        this.cellSize = 100;
        this.lastRoad = null;
    }

    processRoads(roadsData) {
        this.grid.clear();
        this.roadData = roadsData.map(road => {
            const poly = turf.polygon([road.poly]);
            
            const coords = road.poly;
            let minX = Infinity, minZ = Infinity, maxX = -Infinity, maxZ = -Infinity;
            for (let i = 0; i < coords.length; i++) {
                const [x, z] = coords[i];
                if (x < minX) minX = x; if (x > maxX) maxX = x;
                if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
            }
            
            // 注意：這裡的 bbox 是基於數據座標系的 (x, y_data)
            const bbox = { minX, minZ, maxX, maxZ };
            const roadObj = { poly, bbox, name: road.name };

            const startGridX = Math.floor(minX / this.cellSize);
            const endGridX = Math.floor(maxX / this.cellSize);
            const startGridZ = Math.floor(minZ / this.cellSize);
            const endGridZ = Math.floor(maxZ / this.cellSize);

            for (let gx = startGridX; gx <= endGridX; gx++) {
                for (let gz = startGridZ; gz <= endGridZ; gz++) {
                    const key = `${gx}_${gz}`;
                    if (!this.grid.has(key)) this.grid.set(key, []);
                    this.grid.get(key).push(roadObj);
                }
            }
            return roadObj;
        });
        console.log(`⚡ Physics Engine Ready: Spatial Grid Hashing for ${roadsData.length} roads.`);
    }

    getCurrentRoad(worldX, worldZ) {
        // --- 關鍵修正：渲染使用的是 rotateX(-90deg)，所以數據 Y = -世界 Z ---
        const dataX = worldX;
        const dataY = -worldZ;

        // 1. 優先檢查緩存
        if (this.lastRoad && this.isPointInBBox(dataX, dataY, this.lastRoad.bbox)) {
            if (turf.booleanPointInPolygon(turf.point([dataX, dataY]), this.lastRoad.poly)) return { name: this.lastRoad.name };
        }

        // 2. 局部網格查詢
        const gx = Math.floor(dataX / this.cellSize);
        const gz = Math.floor(dataY / this.cellSize);
        const key = `${gx}_${gz}`;
        const nearbyRoads = this.grid.get(key);

        if (nearbyRoads) {
            for (let i = 0; i < nearbyRoads.length; i++) {
                const road = nearbyRoads[i];
                if (this.isPointInBBox(dataX, dataY, road.bbox)) {
                    if (turf.booleanPointInPolygon(turf.point([dataX, dataY]), road.poly)) {
                        this.lastRoad = road;
                        return { name: road.name };
                    }
                }
            }
        }

        this.lastRoad = null;
        return null;
    }

    isPointInBBox(x, y, b) {
        return x >= b.minX && x <= b.maxX && y >= b.minZ && y <= b.maxZ;
    }
}
