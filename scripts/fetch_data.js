const axios = require('axios');
const fs = require('fs');
const turf = require('@turf/turf');

const ORIGIN = [120.971, 24.801];

function geoToLocal(lon, lat) {
    const lon0 = ORIGIN[0];
    const lat0 = ORIGIN[1];
    const latRad = lat0 * Math.PI / 180;
    
    // 東經增加 = +X (East)
    const x = (lon - lon0) * 111111 * Math.cos(latRad);
    // 北緯增加 = +Y (North)
    const y = (lat - lat0) * 111111; 
    
    return [x, y];
}

async function fetchHsinchuData() {
    console.log("🚀 Fetching Standard Mapping Data (East=+X, North=+Y)...");
    const bbox = "24.790,120.955,24.815,120.985";
    const query = `[out:json][timeout:90];(way["highway"](${bbox});way["building"](${bbox}););out body;>;out skel qt;`;

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
                const line = turf.lineString(pts);
                const buffer = turf.buffer(line, 10, { units: 'meters' });
                const poly = buffer.geometry.coordinates[0].map(p => geoToLocal(p[0], p[1]));
                roads.push({
                    name: way.tags.name || "新竹小巷",
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
        console.log("✅ Data Mapped: East=+X, North=+Y (Will rotate to -Z).");
    } catch (e) { console.error(e); }
}

fetchHsinchuData();
