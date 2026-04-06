# 🏙️ Hsinchu 3D City Maze - Context & Guidelines

This document provides essential context for the "Hsinchu 3D City Maze" project, a 3D city exploration game built with Three.js and Vite, driven by real OpenStreetMap (OSM) data.

## 🚀 Project Overview

*   **Goal:** A high-performance, cross-platform 3D city maze exploration game set in Hsinchu City.
*   **Key Technologies:**
    *   **Engine:** [Three.js](https://threejs.org/) (v0.183+)
    *   **Build Tool:** [Vite](https://vitejs.dev/)
    *   **Geospatial:** [@turf/turf](https://turfjs.org/) for spatial analysis.
    *   **Data Source:** OpenStreetMap (via Overpass API).
*   **Architecture:**
    *   `src/main.js`: Initialization of Three.js scene, camera, and game loop.
    *   `src/core/`: Core game logic (Player, MapLoader, Environment).
    *   `src/ui/`: HUD and UI components (Road names, Compass).
    *   `src/utils/`: Physics (Spatial Grid Hashing), GeoUtils (Coordinate conversion).
    *   `scripts/`: Data fetching and processing scripts.
    *   `public/data/`: Processed JSON data for roads, buildings, and landmarks.

## 🛠️ Building and Running

| Command | Description |
| :--- | :--- |
| `npm install` | Install dependencies. |
| `npm run dev` | Start the development server (available at `localhost:5173`). |
| `npm run build` | Build the project for production (output to `dist/`). |
| `npm run preview` | Preview the production build locally. |
| `npm run deploy` | Deploy the project to GitHub Pages. |
| `node scripts/fetch_data.js` | (Assumed) Fetch fresh OSM data. |
| `node scripts/process_osm.js` | (Assumed) Process raw OSM data into game-ready JSON. |

## 📐 Technical Standards

### Coordinate System
*   **Orientation:** North = `-Z`, East = `+X`, Up = `+Y`.
*   **Origin (Lon/Lat):** `[120.971, 24.801]`.
*   **Conversion:** Uses a simple spherical approximation (111,111m per degree) centered at the origin.

### Performance Optimizations
*   **Spatial Grid Hashing:** Roads are indexed into a spatial grid to optimize collision detection (Physics.js).
*   **Logarithmic Depth Buffer:** Enabled in `WebGLRenderer` to prevent Z-fighting at large scales (up to 8km).
*   **Instanced Rendering:** Used for high-volume objects like trees (Environment.js).

### Development Conventions
*   **Vanilla JS:** The project avoids heavy frameworks (like React/Vue) in favor of direct DOM and Three.js manipulation.
*   **Class-Based Core:** Main entities (Player, MapLoader) are implemented as ES6 classes.
*   **Responsive Design:** HUD and controls support both PC (Keyboard) and Mobile (Touch/Joystick).

## 📂 Key Files
*   `src/main.js`: Entry point.
*   `src/core/Player.js`: Player movement, camera following, and input handling.
*   `src/utils/Physics.js`: Crucial for understanding the "Maze" logic (how roads constrain movement).
*   `public/data/roads.json`: The "Skeleton" of the maze.

---
*Last updated: 2026-04-05*
