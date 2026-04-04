const axios = require('axios');
const fs = require('fs');
const turf = require('@turf/turf');

const ORIGIN = [120.971, 24.801];

function geoToLocal(lon, lat) {
    const lon0 = ORIGIN[0];
    const lat0 = ORIGIN[1];
    const latRad = lat0 * Math.PI / 180;
    const x = (lon - lon0) * 111111 * Math.cos(latRad);
    const y = (lat - lat0) * 111111; 
    return [x, y];
}

async function fetchHsinchuData() {
    console.log("🚀 Fetching Clean Data (No placeholder names)...");
    const bbox = "24.760,120.920,24.840,121.020";
    const query = `[out:json][timeout:180];(way["highway"](${bbox});way["building"](${bbox}););out body;>;out skel qt;`;

    try {
        const response = await axios.post('https://overpass-api.de/api/interpreter', query);
        const elements = response.data.elements;
        const nodes = {};
        elements.filter(el => el.type === 'node').forEach(n => nodes[n.id] = [n.lon, n.lat]);

        const roads = [];
        const buildings = [];

        elements.filter(el => el.type === 'way').forEach(way => {
            if (!way.nodes || way.nodes.length < 2) return;
            const pts = way.nodes.filter(id => nodes[id]).map(id => nodes[id]);
            if (pts.length < 2) return;

            if (way.tags && way.tags.highway) {
                if (['motorway', 'trunk'].includes(way.tags.highway)) return;
                
                // --- 修正：如果沒有路名就保持 null ---
                const roadName = way.tags.name || null;
                
                const line = turf.lineString(pts);
                const buffer = turf.buffer(line, 10, { units: 'meters' });
                const poly = buffer.geometry.coordinates[0].map(p => geoToLocal(p[0], p[1]));
                roads.push({
                    name: roadName,
                    poly: poly,
                    center: geoToLocal(pts[0][0], pts[0][1])
                });
            } else if (way.tags && way.tags.building) {
                buildings.push({
                    height: 0.5,
                    coords: pts.map(p => geoToLocal(p[0], p[1]))
                });
            }
        });

        fs.writeFileSync('public/data/roads.json', JSON.stringify(roads));
        fs.writeFileSync('public/data/buildings.json', JSON.stringify(buildings));
        console.log("✅ Clean Data Saved.");
    } catch (e) { console.error(e); }
}

fetchHsinchuData();
