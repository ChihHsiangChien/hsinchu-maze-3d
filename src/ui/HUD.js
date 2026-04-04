
export class HUD {
    constructor() {
        this.element = document.getElementById('hud');
    }

    /**
     * 更新路名
     * @param {string} roadName 
     */
    updateRoadName(roadName) {
        if (!roadName) {
            this.element.innerHTML = "<span style='color: #ff5555;'>迷失於建築物中 (Off-Road)</span>";
            return;
        }
        
        this.element.innerHTML = `目前路段：${roadName}`;
    }
}
