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
     * 直接使用 3D (x, z) 進行判定，不再轉換
     */
    getCurrentRoad(x, z) {
        const point = turf.point([x, z]);
        for (const polygon of this.roadPolygons) {
            if (turf.booleanPointInPolygon(point, polygon)) {
                return polygon.properties;
            }
        }
        return null;
    }
}
