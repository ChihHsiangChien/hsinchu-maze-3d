
export class HUD {
    constructor() {
        this.element = document.getElementById('hud');
    }

    /**
     * 更新路名：若無路名則徹底隱藏 HUD 容器
     * @param {string} roadName 
     */
    updateRoadName(roadName) {
        if (!roadName) {
            // 無路名時隱藏背景框與文字
            this.element.style.display = 'none';
            return;
        }
        
        // 有路名時顯示並更新文字
        this.element.style.display = 'block';
        this.element.innerHTML = roadName;
    }
}
