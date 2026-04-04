# 🏙️ 新竹 3D 城市迷宮 (Hsinchu 3D City Maze)

這是一個基於 **Three.js** 與 **OpenStreetMap (OSM)** 數據驅動的 3D 城市探索迷宮遊戲。玩家將在新竹市中心真實的地圖數據中，體驗 2.5D 第三人稱視角的「走路迷宮」。

## 🚀 核心特色

- **真實數據驅動**：使用 Overpass API 抓取新竹市中心約 8km x 8km 的真實道路與建築數據。
- **2.5D 動作視角**：仿 Google Maps 的導航體感，地圖繞著玩家旋轉，視線永遠保持水平穩定。
- **高對比視覺**：明亮的嫩綠色草地配上立體黑色柏油路，專為行動裝置強光環境優化。
- **滑動碰撞系統**：實作 Sliding Collision，碰撞路緣時可順著邊緣滑行，操作不卡頓。
- **行動端優化**：避開手機邊緣手勢的操作區設計，右側移動、左側轉向，支援多指操作。
- **導航輔助**：具備實時連動的指北針、路名 HUD 以及開發者 Debug 面板。

## 🎮 操作說明

### 行動裝置 (手機/平板)
- **右側搖桿區**：控制角色位移（向上推 = 向正面走）。
- **左側旋轉區**：水平滑動可旋轉世界方位角（繞著主角垂直軸）。
- **導航**：觀察右上角指北針（紅色針尖永遠指向北方）。

### 電腦端 (PC)
- **鍵盤 WASD**：控制移動。
- **滑鼠點擊**：進入第一人稱/第三人稱控制。

## 🛠️ 技術棧

- **引擎**：Three.js (WebGL)
- **地理計算**：Turf.js (GeoJSON 處理)
- **數據源**：OpenStreetMap (OSM)
- **構建工具**：Vite
- **部署**：GitHub Pages

## 📂 目錄結構

```text
/hsinchu-maze
├── index.html          # UI 結構與觸控介面
├── src/
│   ├── main.js         # 遊戲初始化與渲染循環
│   ├── core/
│   │   ├── Environment.js # 3D 建築與道路生成
│   │   ├── Player.js      # 2.5D 控制器與相機邏輯
│   │   └── MapLoader.js   # JSON 數據載入
│   ├── utils/
│   │   ├── Physics.js     # 基於 Turf.js 的道路邊界檢測
│   │   └── GeoUtils.js    # 座標投影工具
│   └── ui/
│       └── HUD.js         # 路名顯示介面
└── scripts/
    └── fetch_data.js   # OSM 數據抓取腳本 (Node.js)
```

## 🏗️ 開發與部署

### 安裝依賴
```bash
npm install
```

### 更新地圖數據 (OSM)
```bash
node scripts/fetch_data.js
```

### 本地開發
```bash
npm run dev -- --host
```

### 部署至 GitHub Pages
```bash
npm run build
# 將 dist 目錄內容推送到 gh-pages 分支
```

## 📜 授權
MIT License. Map Data © OpenStreetMap contributors.
