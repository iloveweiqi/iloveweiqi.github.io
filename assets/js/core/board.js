export class GoBoard {
    constructor(canvas, engine) {
        this.ctx = canvas.getContext('2d');
        this.engine = engine;
        this.width = canvas.width;
        this.gridSize = this.width / 20; // 留边距
        // 绑定点击事件
        canvas.addEventListener('click', (e) => this.handleClick(e));
    }

    draw() {
        // 画背景、画线、画星位
        // 遍历 engine.board 画黑白子
        // 刚刚落下的子画一个红色标记
    }

    handleClick(e) {
        // 计算点击坐标 -> 转换为 0-18 的 x,y
        // 调用 engine.play(x, y, current_color)
        // 根据 engine 返回结果：
        //   - 成功: 播放 move.wav
        //   - 提子 > 0: 播放 deadstoneless.wav
        //   - 失败: 震动或无反应
    }
}
