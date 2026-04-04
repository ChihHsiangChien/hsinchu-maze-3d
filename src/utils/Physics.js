import * as turf from '@turf/turf';

export class Physics {
    constructor() {
        this.roadPolygons = []; 
    }

    processRoads(roadsData) {
        this.roadPolygons = roadsData.map(road => {
            const poly = turf.polygon([road.poly]);
            poly.properties = { name: road.name };
            return poly;
        });
    }

    /**
     * 關鍵修正：3D Z 對應 數據 -Y
     */
    getCurrentRoad(x, z) {
        const dataY = -z; 
        const point = turf.point([x, dataY]);
        for (const polygon of this.roadPolygons) {
            if (turf.booleanPointInPolygon(point, polygon)) {
                return polygon.properties;
            }
        }
        return null;
    }
}
