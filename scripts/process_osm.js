const fs = require('fs');
const path = require('path');
const turf = require('@turf/turf');

// 設定原點：新竹火車站
const ORIGIN = [120.971, 24.801];

function geoToLocal(lon, lat) {
    const lon0 = ORIGIN[0];
    const lat0 = ORIGIN[1];
    const latRad = lat0 * Math.PI / 180;
    const x = (lon - lon0) * 111111 * Math.cos(latRad);
    const z = -(lat - lat0) * 111111;
    return [x, z];
}

// 模擬處理從 Overpass 下載的 JSON (或是直接用 Overpass 數據)
function processOsmData(osmData) {
    const nodes = {};
    osmData.elements.filter(el => el.type === 'node').forEach(node => {
        nodes[node.id] = [node.lon, node.lat];
    });

    const roads = [];
    const buildings = [];

    osmData.elements.filter(el => el.type === 'way').forEach(way => {
        let coords = way.nodes.map(nodeId => {
            const [lon, lat] = nodes[nodeId];
            return geoToLocal(lon, lat);
        });

        if (way.tags.highway) {
            // ✨ 道路節點簡化 (RDP 演算法)
            // 將座標陣列轉為 Turf 線條，進行簡化後再轉回
            if (coords.length > 2) {
                const line = turf.lineString(coords);
                const simplified = turf.simplify(line, { tolerance: 0.1, highQuality: false });
                coords = simplified.geometry.coordinates;
            }

            roads.push({
                id: way.id,
                name: way.tags.name || "無名小巷",
                type: way.tags.highway,
                coords: coords
            });
        } else if (way.tags.building) {
            const height = way.tags.height || (way.tags['building:levels'] * 3.5) || 10;
            buildings.push({
                id: way.id,
                name: way.tags.name || "建築",
                height: parseFloat(height),
                coords: coords
            });
        }
    });

    return { roads, buildings };
}

// 這裡我們暫時先產生一組「偽數據」以供開發測試，
// 或是你可以將 Overpass 抓下的內容存在 osm_raw.json 並執行此腳本。
const sampleOsm = {
    elements: [
        // 中華路 (Zhonghua Rd)
        { type: 'node', id: 1, lon: 120.970, lat: 24.802 },
        { type: 'node', id: 2, lon: 120.971, lat: 24.801 },
        { type: 'node', id: 3, lon: 120.972, lat: 24.800 },
        { type: 'way', id: 10, nodes: [1, 2, 3], tags: { highway: 'primary', name: '中華路二段' } },
        
        // 林森路 (Linsen Rd)
        { type: 'node', id: 4, lon: 120.971, lat: 24.801 },
        { type: 'node', id: 5, lon: 120.971, lat: 24.800 },
        { type: 'way', id: 11, nodes: [4, 5], tags: { highway: 'secondary', name: '林森路' } },
        
        // 新竹火車站建築
        { type: 'node', id: 6, lon: 120.9712, lat: 24.8012 },
        { type: 'node', id: 7, lon: 120.9714, lat: 24.8012 },
        { type: 'node', id: 8, lon: 120.9714, lat: 24.8010 },
        { type: 'node', id: 9, lon: 120.9712, lat: 24.8010 },
        { type: 'way', id: 12, nodes: [6, 7, 8, 9, 6], tags: { building: 'yes', name: '新竹火車站', 'building:levels': '2' } }
    ]
};

const result = processOsmData(sampleOsm);

fs.writeFileSync('public/data/roads.json', JSON.stringify(result.roads, null, 2));
fs.writeFileSync('public/data/buildings.json', JSON.stringify(result.buildings, null, 2));

console.log('Sample data generated in public/data/');
