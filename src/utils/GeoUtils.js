
export const ORIGIN = [120.971, 24.801]; // 新竹火車站

/**
 * 將經緯度轉換為相對於新竹火車站的本地公制座標 (x, z)
 * @param {number} lon 經度
 * @param {number} lat 緯度
 * @returns {[number, number]} [x, z] 單位：公尺
 */
export function geoToLocal(lon, lat) {
    const lon0 = ORIGIN[0];
    const lat0 = ORIGIN[1];
    
    // 1度緯度約為 111,111 公尺
    // 1度經度約為 111,111 * cos(緯度) 公尺
    const latRad = lat0 * Math.PI / 180;
    const x = (lon - lon0) * 111111 * Math.cos(latRad);
    const z = -(lat - lat0) * 111111; // 緯度增加在 3D 空間中通常是往 -z 方向
    
    return [x, z];
}

/**
 * 將本地座標轉回經緯度 (lon, lat)
 * @param {number} x 本地 x
 * @param {number} z 本地 z
 * @returns {[number, number]} [lon, lat]
 */
export function localToGeo(x, z) {
    const lon0 = ORIGIN[0];
    const lat0 = ORIGIN[1];
    const latRad = lat0 * Math.PI / 180;
    
    const lat = lat0 - (z / 111111);
    const lon = lon0 + (x / (111111 * Math.cos(latRad)));
    
    return [lon, lat];
}
