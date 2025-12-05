/**
 * 1. 围棋规则引擎 (逻辑层)
 */
class GoEngine {
    constructor() {
        this.size = 19;
        this.board = [];
        this.reset();
    }

    reset() {
        this.board = Array(19).fill(0).map(() => Array(19).fill(0)); // 0:空, 1:黑, 2:白
    }

    // 泛洪算法找棋块和气
    getGroup(x, y, board = this.board) {
        const color = board[y][x];
        if (color === 0) return null;
        let stones = [], liberties = new Set();
        let visited = new Set();
        let queue = [{x, y}];
        visited.add(`${x},${y}`);

        while (queue.length) {
            const curr = queue.pop();
            stones.push(curr);
            [[0,1],[0,-1],[1,0],[-1,0]].forEach(([dx, dy]) => {
                const nx = curr.x + dx, ny = curr.y + dy;
                if (nx < 0 || nx >= 19 || ny < 0 || ny >= 19) return;
                const neighborColor = board[ny][nx];
                if (neighborColor === 0) {
                    liberties.add(`${nx},${ny}`);
                } else if (neighborColor === color && !visited.has(`${nx},${ny}`)) {
                    visited.add(`${nx},${ny}`);
                    queue.push({x: nx, y: ny});
                }
            });
        }
        return { stones, liberties: liberties.size };
    }

    // 落子逻辑：返回 { success, capturedCount }
    play(x, y, color) {
        if (this.board[y][x] !== 0) return { success: false };

        // 1. 下子
        this.board[y][x] = color;
        const opponent = color === 1 ? 2 : 1;
        let capturedStones = [];

        // 2. 检查提子
        [[0,1],[0,-1],[1,0],[-1,0]].forEach(([dx, dy]) => {
            const nx = x + dx, ny = y + dy;
            if (nx >= 0 && nx < 19 && ny >= 0 && ny < 19 && this.board[ny][nx] === opponent) {
                const group = this.getGroup(nx, ny);
                if (group.liberties === 0) {
                    capturedStones.push(...group.stones);
                }
            }
        });

        // 3. 执行提子或判断自杀
        if (capturedStones.length > 0) {
            capturedStones.forEach(s => this.board[s.y][s.x] = 0);
            return { success: true, capturedCount: capturedStones.length };
        } else {
            const selfGroup = this.getGroup(x, y);
            if (selfGroup.liberties === 0) {
                this.board[y][x] = 0; // 撤销自杀
                return { success: false, error: "suicide" };
            }
        }
        return { success: true, capturedCount: 0 };
    }
}

/**
 * 2. Canvas 渲染器 (视图层)
 */
class GoBoard {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');
        this.size = 19;
        this.clickHandler = null;

        // 响应式重绘
        this.resizeObserver = new ResizeObserver(() => this.resize());
        this.resizeObserver.observe(this.canvas.parentElement);
        this.canvas.addEventListener('click', (e) => this.onClick(e));
        
        // 初始化尺寸
        setTimeout(() => this.resize(), 100);
    }

    resize() {
        const parent = this.canvas.parentElement;
        const rect = parent.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        this.ctx.scale(dpr, dpr);
        
        this.width = rect.width;
        this.padding = this.width / 22;
        this.cell = (this.width - 2 * this.padding) / (this.size - 1);
        
        if (this.lastState) this.draw(this.lastState.board, this.lastState.lastMove);
    }

    draw(board, lastMove) {
        this.lastState = { board, lastMove }; // 缓存用于重绘
        const { ctx, width, padding, cell, size } = this;
        
        ctx.clearRect(0, 0, width, width);
        
        // 画线
        ctx.lineWidth = 1;
        ctx.strokeStyle = "#000";
        ctx.beginPath();
        for (let i = 0; i < size; i++) {
            ctx.moveTo(padding + i * cell, padding); ctx.lineTo(padding + i * cell, width - padding);
            ctx.moveTo(padding, padding + i * cell); ctx.lineTo(width - padding, padding + i * cell);
        }
        ctx.stroke();

        // 星位
        [3, 9, 15].forEach(x => [3, 9, 15].forEach(y => {
            ctx.beginPath();
            ctx.arc(padding + x * cell, padding + y * cell, 2.5, 0, Math.PI * 2);
            ctx.fillStyle = "#000"; ctx.fill();
        }));

        // 棋子
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                if (board[y][x] !== 0) this.drawStone(x, y, board[y][x]);
            }
        }

        // 最后一手标记 (红点)
        if (lastMove) {
            ctx.fillStyle = "red";
            ctx.fillRect(padding + lastMove.x * cell - 3, padding + lastMove.y * cell - 3, 6, 6);
        }
    }

    drawStone(x, y, color) {
        const { ctx, padding, cell } = this;
        const cx = padding + x * cell;
        const cy = padding + y * cell;
        const r = cell * 0.48;

        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        
        const grad = ctx.createRadialGradient(cx - r/3, cy - r/3, r/5, cx, cy, r);
        if (color === 1) { // 黑
            grad.addColorStop(0, "#555"); grad.addColorStop(1, "#000");
        } else { // 白
            grad.addColorStop(0, "#fff"); grad.addColorStop(1, "#ddd");
        }
        ctx.fillStyle = grad;
        ctx.fill();
        if (color === 2) { ctx.strokeStyle = "#ccc"; ctx.stroke(); }
    }

    onClick(e) {
        if (!this.clickHandler) return;
        const rect = this.canvas.getBoundingClientRect();
        const x = Math.round(((e.clientX - rect.left) - this.padding) / this.cell);
        const y = Math.round(((e.clientY - rect.top) - this.padding) / this.cell);
        if (x >= 0 && x < 19 && y >= 0 && y < 19) this.clickHandler(x, y);
    }
}

// 简单的 SGF 解析工具
function parseSGF(sgf) {
    const moves = [];
    const meta = {};
    
    // 提取头部信息 (简化版正则)
    sgf.replace(/([A-Z]{2})\[(.*?)\]/g, (match, key, val) => {
        // 只保留头部的元数据，忽略招法中的属性
        if (moves.length === 0 && val.length > 0) meta[key] = val;
    });

    // 提取招法
    const regex = /;([BW])\[([a-s]{2})\]/g;
    let match;
    const map = "abcdefghijklmnopqrs";
    while ((match = regex.exec(sgf)) !== null) {
        const c = match[1] === 'B' ? 1 : 2;
        const x = map.indexOf(match[2][0]);
        const y = map.indexOf(match[2][1]);
        if (x >= 0 && y >= 0) moves.push({x, y, c});
    }
    return { meta, moves };
}
