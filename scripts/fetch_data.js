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

async function fetchHsinchuCyberData() {
    console.log("🚀 Fetching Cyber-Forest Data...");
    const bbox = "24.790,120.955,24.815,120.985";
    
    const query = `
        [out:json][timeout:90];
        (
          way["highway"](${bbox});
          way["building"](${bbox});
          node["natural"="tree"](${bbox});
        );
        out body;
        >;
        out skel qt;
    `;

    try {
        const response = await axios.post('https://overpass-api.de/api/interpreter', query);
        const elements = response.data.elements;
        const nodes = {};
        elements.filter(el => el.type === 'node').forEach(n => nodes[n.id] = [n.lon, n.lat]);

        const roads = [];
        const buildings = [];
        const trees = [];

        elements.forEach(el => {
            if (el.type === 'node' && el.tags && el.tags.natural === 'tree') {
                trees.push({ pos: geoToLocal(el.lon, el.lat) });
            } else if (el.type === 'way') {
                if (!el.nodes || el.nodes.length < 2) return;
                const pts = el.nodes.filter(id => nodes[id]).map(id => nodes[id]);
                if (pts.length < 2) return;

                if (el.tags && el.tags.highway) {
                    if (['motorway', 'trunk'].includes(el.tags.highway)) return;
                    const line = turf.lineString(pts);
                    const buffer = turf.buffer(line, 10, { units: 'meters' });
                    const poly = buffer.geometry.coordinates[0].map(p => geoToLocal(p[0], p[1]));
                    roads.push({
                        name: el.tags.name || null,
                        poly: poly,
                        center: geoToLocal(pts[0][0], pts[0][1])
                    });
                } else if (el.tags && el.tags.building) {
                    buildings.push({
                        height: parseFloat(el.tags.height || 10),
                        coords: pts.map(p => geoToLocal(p[0], p[1]))
                    });
                }
            }
        });

        fs.writeFileSync('public/data/roads.json', JSON.stringify(roads));
        fs.writeFileSync('public/data/buildings.json', JSON.stringify(buildings));
        fs.writeFileSync('public/data/trees.json', JSON.stringify(trees));
        console.log(`✅ Cyber Data Ready! Trees: ${trees.length}`);
    } catch (e) { console.error(e); }
}

fetchHsinchuCyberData();
