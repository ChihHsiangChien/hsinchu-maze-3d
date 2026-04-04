
export class HUD {
    constructor() {
        this.element = document.getElementById('hud');
    }

    /**
     * 更新路名 (已移除 "目前路段：" 前綴)
     * @param {string} roadName 
     */
    updateRoadName(roadName) {
        if (!roadName) {
            this.element.innerHTML = "<span style='color: #ffaaaa;'>迷失於城市中</span>";
            return;
        }
        
        // 僅顯示純路名
        this.element.innerHTML = roadName;
    }
}
