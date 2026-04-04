const axios = require('axios');
const fs = require('fs');
const turf = require('@turf/turf');

const ORIGIN = [120.971, 24.801]; // 新竹火車站原點

function geoToLocal(lon, lat) {
    const lon0 = ORIGIN[0];
    const lat0 = ORIGIN[1];
    const latRad = lat0 * Math.PI / 180;
    const x = (lon - lon0) * 111111 * Math.cos(latRad);
    const y = (lat - lat0) * 111111; 
    return [x, y];
}

async function fetchHsinchuLargeData() {
    console.log("🚀 Fetching MEGA-SCALE Hsinchu Data (Urban Area)...");
    
    // 大範圍 BBox：涵蓋大部分新竹市區
    // [minLat, minLon, maxLat, maxLon]
    const bbox = "24.760,120.920,24.840,121.020";
    
    const query = `
        [out:json][timeout:180];
        (
          way["highway"](${bbox});
          way["building"~"^(yes|apartments|commercial|retail|office|university)$"](${bbox});
        );
        out body;
        >;
        out skel qt;
    `;

    try {
        const response = await axios.post('https://overpass-api.de/api/interpreter', query, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        
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
                if (['motorway', 'trunk', 'steps'].includes(way.tags.highway)) return;

                let width = 10;
                if (['primary', 'secondary'].includes(way.tags.highway)) width = 18;
                
                const line = turf.lineString(pts);
                const buffer = turf.buffer(line, (width / 2) + 1, { units: 'meters' });
                
                const poly = buffer.geometry.coordinates[0].map(p => geoToLocal(p[0], p[1]));
                roads.push({
                    name: way.tags.name || "新竹街道",
                    poly: poly,
                    center: geoToLocal(pts[0][0], pts[0][1])
                });
            } else if (way.tags && way.tags.building) {
                // 限制建築點數，避免過於複雜的幾何體導致渲染緩慢
                if (pts.length > 20) return; 
                buildings.push({
                    height: parseFloat(way.tags.height || (way.tags['building:levels'] ? way.tags['building:levels']*3.5 : 12)),
                    coords: pts.map(p => geoToLocal(p[0], p[1]))
                });
            }
        });

        console.log(`✅ Fetch Complete! Roads: ${roads.length}, Buildings: ${buildings.length}`);
        
        fs.writeFileSync('public/data/roads.json', JSON.stringify(roads));
        fs.writeFileSync('public/data/buildings.json', JSON.stringify(buildings));
        console.log("💾 Data saved to public/data/");
        
    } catch (e) {
        console.error("❌ MEGA-Fetch Failed:", e.message);
        if (e.response) console.error("Details:", e.response.data);
    }
}

fetchHsinchuLargeData();
