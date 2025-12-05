/** 1. 规则引擎 (GoEngine) */
class GoEngine {
    constructor() { this.reset(); }
    reset() { 
        this.board = Array(19).fill(0).map(() => Array(19).fill(0)); 
        this.ko = null;
    }
    getGroup(x, y, board = this.board) {
        const color = board[y][x];
        if (color === 0) return null;
        let stones = [], liberties = new Set(), visited = new Set();
        let queue = [{x, y}]; visited.add(`${x},${y}`);
        while (queue.length) {
            const curr = queue.pop(); stones.push(curr);
            [[0,1],[0,-1],[1,0],[-1,0]].forEach(([dx, dy]) => {
                const nx = curr.x + dx, ny = curr.y + dy;
                if (nx < 0 || nx >= 19 || ny < 0 || ny >= 19) return;
                const nc = board[ny][nx];
                if (nc === 0) liberties.add(`${nx},${ny}`);
                else if (nc === color && !visited.has(`${nx},${ny}`)) {
                    visited.add(`${nx},${ny}`); queue.push({x: nx, y: ny});
                }
            });
        }
        return { stones, liberties: liberties.size };
    }
    play(x, y, color) {
        if (this.board[y][x] !== 0) return { success: false, error: "not_empty" };
        if (this.ko && this.ko.x === x && this.ko.y === y) return { success: false, error: "ko" };
        this.board[y][x] = color;
        const opp = color === 1 ? 2 : 1;
        let caps = [];
        [[0,1],[0,-1],[1,0],[-1,0]].forEach(([dx, dy]) => {
            const nx = x+dx, ny = y+dy;
            if (nx>=0 && nx<19 && ny>=0 && ny<19 && this.board[ny][nx]===opp) {
                const g = this.getGroup(nx, ny);
                if (g.liberties === 0) caps.push(...g.stones);
            }
        });
        if (caps.length > 0) {
            caps.forEach(s => this.board[s.y][s.x] = 0);
            const selfGroup = this.getGroup(x, y);
            if (caps.length === 1 && selfGroup.stones.length === 1 && selfGroup.liberties === 1) {
                this.ko = { x: caps[0].x, y: caps[0].y };
            } else { this.ko = null; }
            return { success: true, capturedCount: caps.length };
        } else {
            const self = this.getGroup(x, y);
            if (self.liberties === 0) {
                this.board[y][x] = 0;
                return { success: false, error: "suicide" };
            }
            this.ko = null;
        }
        return { success: true, capturedCount: 0 };
    }
}

/** 2. Canvas 渲染器 (重构修复版) */
class GoBoard {
    constructor(id) {
        this.canvas = document.getElementById(id);
        if(!this.canvas) return;
        this.ctx = this.canvas.getContext('2d', { alpha: false }); // 优化性能，不使用透明通道
        this.size = 19;
        
        // 配置
        this.config = { showCoords: true, showNumbers: false };
        this.hoverPos = null;
        this.nextColor = 0;
        this.lastState = null; // 缓存上一次的绘制数据

        // 绑定事件
        this.canvas.addEventListener('click', e => this.onClick(e));
        this.canvas.addEventListener('mousemove', e => this.onMove(e));
        this.canvas.addEventListener('mouseleave', () => {
            this.hoverPos = null;
            this.requestDraw();
        });

        // 监听大小变化 (带防抖)
        this.resizeObserver = new ResizeObserver(() => {
            window.requestAnimationFrame(() => this.resize());
        });
        this.resizeObserver.observe(this.canvas.parentElement);
        
        // 初始触发
        this.resize();
    }

    resize() {
        const parent = this.canvas.parentElement;
        if (!parent) return;
        const rect = parent.getBoundingClientRect();
        
        // 1. 安全检查：如果容器还没撑开，不处理
        if (rect.width <= 0 || rect.height <= 0) return;

        // 2. 设置物理像素大小 (解决模糊)
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = Math.floor(rect.width * dpr);
        this.canvas.height = Math.floor(rect.height * dpr);

        // 3. 计算逻辑参数
        this.width = rect.width; 
        this.padding = this.width / (this.config.showCoords ? 18 : 22);
        this.cell = (this.width - 2 * this.padding) / (this.size - 1);

        // 4. 重置坐标系并缩放
        this.ctx.setTransform(1, 0, 0, 1, 0, 0); // 关键：绝对重置
        this.ctx.scale(dpr, dpr);

        // 5. 触发重绘
        this.requestDraw();
    }

    // 外部调用的绘图入口
    draw(board, lastMove, moveMap) {
        this.lastState = { board, lastMove, moveMap };
        this.requestDraw();
    }

    // 内部使用的绘制请求 (使用 rAF 避免闪烁)
    requestDraw() {
        if (this.isDrawing) return;
        this.isDrawing = true;
        window.requestAnimationFrame(() => {
            this.drawImmediate();
            this.isDrawing = false;
        });
    }

    drawImmediate() {
        // 安全锁：如果格子计算错误，不绘制
        if (!this.cell || !isFinite(this.cell) || this.cell <= 0) return;

        const { ctx, width: w, padding: p, cell: c, size } = this;
        
        // --- 1. 清屏 (填充背景色，避免 alpha 叠加) ---
        ctx.fillStyle = "#eebb76"; // 与 CSS 背景一致
        ctx.fillRect(0, 0, w, w); // 这里的 w 是逻辑宽度

        // --- 2. 画线 ---
        ctx.lineWidth = 1;
        ctx.strokeStyle = "#000";
        ctx.beginPath();
        for (let i = 0; i < size; i++) {
            // 对齐到 0.5 像素防止模糊
            const pos = Math.floor(p + i * c) + 0.5;
            const start = Math.floor(p) + 0.5;
            const end = Math.floor(w - p) + 0.5;
            
            ctx.moveTo(pos, start); ctx.lineTo(pos, end);
            ctx.moveTo(start, pos); ctx.lineTo(end, pos);
        }
        ctx.stroke();

        // --- 3. 画星位 ---
        [3, 9, 15].forEach(x => [3, 9, 15].forEach(y => {
            ctx.beginPath();
            ctx.arc(p + x * c, p + y * c, 2.5, 0, Math.PI * 2);
            ctx.fillStyle = "#000";
            ctx.fill();
        }));

        // --- 4. 画坐标 ---
        if (this.config.showCoords) {
            ctx.fillStyle = "#333";
            ctx.font = "bold 10px sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            const letters = "ABCDEFGHJKLMNOPQRST";
            for (let i = 0; i < size; i++) {
                ctx.fillText(letters[i], p + i * c, w - p / 3);
                ctx.fillText((19 - i).toString(), p / 3, p + i * c);
            }
        }

        // --- 5. 画棋子 (如果有数据) ---
        if (this.lastState && this.lastState.board) {
            const { board, lastMove, moveMap } = this.lastState;
            
            for (let y = 0; y < size; y++) {
                for (let x = 0; x < size; x++) {
                    if (board[y][x] !== 0) {
                        this.drawStone(x, y, board[y][x]);
                        // 手数
                        if (this.config.showNumbers && moveMap) {
                            const k = `${x},${y}`;
                            if (moveMap[k]) this.drawNumber(x, y, moveMap[k], board[y][x]);
                        }
                    }
                }
            }

            // 最后一手红块
            if (lastMove) {
                const markSize = c * 0.35;
                ctx.fillStyle = "red";
                ctx.fillRect(p + lastMove.x * c - markSize/2, p + lastMove.y * c - markSize/2, markSize, markSize);
            }
        }

        // --- 6. 幽灵子 (鼠标悬停) ---
        if (this.hoverPos && this.nextColor) {
            const { x, y } = this.hoverPos;
            // 确保该位置无子才画
            let isEmpty = true;
            if (this.lastState && this.lastState.board && this.lastState.board[y][x] !== 0) {
                isEmpty = false;
            }
            if (isEmpty) {
                this.drawStone(x, y, this.nextColor, 0.5);
            }
        }
    }

    drawStone(x, y, color, alpha = 1) {
        const { ctx, padding: p, cell: c } = this;
        const cx = p + x * c;
        const cy = p + y * c;
        const r = c * 0.48;

        ctx.save();
        if (alpha < 1) ctx.globalAlpha = alpha;

        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);

        // 渐变色
        const grad = ctx.createRadialGradient(cx - r / 3, cy - r / 3, r / 5, cx, cy, r);
        if (color === 1) { // 黑
            grad.addColorStop(0, "#555");
            grad.addColorStop(1, "#000");
        } else { // 白
            grad.addColorStop(0, "#fff");
            grad.addColorStop(1, "#ddd");
        }
        ctx.fillStyle = grad;
        ctx.fill();

        // 白子边框
        if (color === 2) {
            ctx.strokeStyle = "#999";
            ctx.lineWidth = 0.5;
            ctx.stroke();
        }
        ctx.restore();
    }

    drawNumber(x, y, num, color) {
        const { ctx, padding: p, cell: c } = this;
        ctx.fillStyle = color === 1 ? "#fff" : "#000";
        // 字体自适应
        const fs = num > 99 ? c * 0.4 : c * 0.5;
        ctx.font = `bold ${fs}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(num, p + x * c, p + y * c);
    }

    getCoord(e) {
        if (!this.cell || this.cell <= 0) return null;
        const r = this.canvas.getBoundingClientRect();
        const x = Math.round(((e.clientX - r.left) - this.padding) / this.cell);
        const y = Math.round(((e.clientY - r.top) - this.padding) / this.cell);
        if (x >= 0 && x < 19 && y >= 0 && y < 19) return { x, y };
        return null;
    }

    onMove(e) {
        const pos = this.getCoord(e);
        if (!pos) {
            if (this.hoverPos) { this.hoverPos = null; this.requestDraw(); }
            return;
        }
        // 只有位置变了才重绘
        if (!this.hoverPos || pos.x !== this.hoverPos.x || pos.y !== this.hoverPos.y) {
            this.hoverPos = pos;
            this.requestDraw();
        }
    }

    onClick(e) {
        const pos = this.getCoord(e);
        if (pos && this.clickHandler) this.clickHandler(pos.x, pos.y);
    }
}

/** 3. SGF 解析器 */
function parseSGF(sgf) {
    let moves = [], meta = {}; const map = "abcdefghijklmnopqrs";
    sgf.replace(/([A-Z]{2})\[(.*?)\]/g, (m, k, v) => { if (!moves.length) meta[k] = v; });
    const bodyIdx = sgf.indexOf(';');
    if (bodyIdx === -1) return { meta, moves: [] };
    const nodes = sgf.substring(bodyIdx).split(';');
    nodes.forEach(node => {
        if (!node.trim()) return;
        let color = 0, x = -1, y = -1;
        const mm = node.match(/([BW])\[([a-s]{2})\]/);
        if (mm) {
            color = mm[1] === 'B' ? 1 : 2;
            x = map.indexOf(mm[2][0]); y = map.indexOf(mm[2][1]);
        }
        const cm = node.match(/C\[([\s\S]*?)\]/);
        let comment = cm ? cm[1].replace(/\\\]/g, ']') : "";
        if (color !== 0 && x >= 0 && y >= 0) {
            moves.push({ x, y, c: color, comment: comment });
        } else if (comment && moves.length > 0) {
            moves[moves.length - 1].comment += "\n" + comment;
        }
    });
    return { meta, moves };
}
