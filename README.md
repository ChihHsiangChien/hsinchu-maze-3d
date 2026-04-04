# 🏙️ 新竹 3D 城市迷宮 (Hsinchu 3D City Maze)

這是一個基於 **Three.js** 與 **OpenStreetMap (OSM)** 數據驅動的 3D 城市探索迷宮遊戲。

## 🚀 核心技術：地理空間映射 (Data Mapping)

本專案實作了一套高精度的「直連映射系統」，將經緯度座標完美同步至 3D 遊戲世界：

### 1. 座標轉換公式 (Geo to Local)
我們以 **新竹火車站 [120.971, 24.801]** 為 3D 世界原點 (0,0,0)。
- **X 軸 (東)**：`x = (lon - lon0) * 111111 * cos(lat0)`
- **Z 軸 (北)**：`z = -(lat - lat0) * 111111` (緯度增加對應 Three.js 的 -Z 前方)
- **單位**：1 單位 = 1 公尺。

### 2. 視覺與物理對齊
- **數據端**：`fetch_data.js` 預先將 OSM 多邊形轉換為此局部公尺座標。
- **渲染端**：`Environment.js` 使用 `rotateX(-Math.PI / 2)` 將 2D Shape 正向平鋪於地。這消除了常見的東西向鏡像錯誤。
- **物理端**：`Physics.js` 直接使用 3D 世界的 `(x, z)` 座標與數據進行 `booleanPointInPolygon` 判定，達成視覺與碰撞的 1:1 同步。

## 🎮 操作說明

- **右手搖桿**：控制位移（向上推 = 朝主角正面走）。
- **左手滑動**：旋轉方位角（繞著主角垂直 Y 軸）。
- **指北針**：右上角紅色針尖永遠指向真實北方 (-Z)。

## 📂 目錄結構
- `src/core/Player.js`: 處理 2.5D 第三人稱追蹤與滑動碰撞。
- `src/core/Environment.js`: 使用立體擠出技術生成路面與建築。
- `scripts/fetch_data.js`: OSM 數據抓取與精確座標轉換。

## 🏗️ 部署
本專案透過 `gh-pages` 自動部署至 GitHub Pages。起點精確設定於 **新竹站前廣場**。

---
MIT License. Map Data © OpenStreetMap contributors.
