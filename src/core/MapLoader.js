
/**
 * MapLoader 負責載入道路與建築數據
 */
export class MapLoader {
    async loadRoads(url) {
        try {
            const response = await fetch(url);
            return await response.json();
        } catch (e) {
            console.error("Failed to load roads:", e);
            return [];
        }
    }

    async loadBuildings(url) {
        try {
            const response = await fetch(url);
            return await response.json();
        } catch (e) {
            console.error("Failed to load buildings:", e);
            return [];
        }
    }
}
