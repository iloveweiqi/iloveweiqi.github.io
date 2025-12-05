/** 1. 规则引擎 (含打劫判断) */
class GoEngine {
    constructor() {
        this.reset();
    }

    reset() {
        this.board = Array(19).fill(0).map(() => Array(19).fill(0));
        this.ko = null; // 记录打劫禁着点 {x, y}
    }
    
    // 泛洪算法找气
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
        // 1. 基本校验
        if (this.board[y][x] !== 0) return { success: false, error: "not_empty" };
        
        // 2. 打劫校验 (Ko Rule)
        if (this.ko && this.ko.x === x && this.ko.y === y) {
            return { success: false, error: "ko" };
        }

        // 3. 模拟落子
        this.board[y][x] = color;
        const opp = color === 1 ? 2 : 1;
        let caps = [];

        // 4. 检查提子
        [[0,1],[0,-1],[1,0],[-1,0]].forEach(([dx, dy]) => {
            const nx = x+dx, ny = y+dy;
            if (nx>=0 && nx<19 && ny>=0 && ny<19 && this.board[ny][nx]===opp) {
                const g = this.getGroup(nx, ny);
                if (g.liberties === 0) caps.push(...g.stones);
            }
        });

        // 5. 执行提子
        if (caps.length > 0) {
            caps.forEach(s => this.board[s.y][s.x] = 0);
            
            // 更新打劫点：如果提掉1子，且己方只有1子且只有1气，则是打劫
            const selfGroup = this.getGroup(x, y);
            if (caps.length === 1 && selfGroup.stones.length === 1 && selfGroup.liberties === 1) {
                this.ko = { x: caps[0].x, y: caps[0].y };
            } else {
                this.ko = null;
            }
            
            return { success: true, capturedCount: caps.length };
        } else {
            // 6. 禁入点判断 (无气自杀)
            const self = this.getGroup(x, y);
            if (self.liberties === 0) {
                this.board[y][x] = 0; // 撤销
                return { success: false, error: "suicide" };
            }
            this.ko = null; // 正常落子解除打劫限制
        }
        return { success: true, capturedCount: 0 };
    }
}

/** 2. Canvas 渲染器 (功能增强版) */
class GoBoard {
    constructor(id) {
        this.canvas = document.getElementById(id);
        if(!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');
        this.size = 19;
        
        // 配置开关
        this.config = {
            showCoords: true,     // 显示坐标
            showNumbers: false    // 显示手数
        };

        // 交互状态
        this.hoverPos = null;     // 鼠标悬停位置 {x,y}
        this.nextColor = 0;       // 下一手颜色 (用于画幽灵子)

        this.resizeObserver = new ResizeObserver(() => this.resize());
        this.resizeObserver.observe(this.canvas.parentElement);
        
        // 事件监听
        this.canvas.addEventListener('click', e => this.onClick(e));
        this.canvas.addEventListener('mousemove', e => this.onMove(e));
        this.canvas.addEventListener('mouseleave', () => {
            this.hoverPos = null;
            this.redraw(); // 鼠标移出重绘以消除幽灵子
        });

        setTimeout(()=>this.resize(), 100);
    }

    resize() {
        if(!this.canvas.parentElement) return;
        const p = this.canvas.parentElement.getBoundingClientRect();
        if(p.width===0) return;
        
        const d = window.devicePixelRatio || 1;
        this.canvas.width = p.width * d; 
        this.canvas.height = p.height * d;
        this.ctx.scale(d, d);
        this.width = p.width; 
        
        // 留出边距：如果显示坐标，下边和左边留多点
        // 简单处理：四周都留宽一点，坐标画在左边和下边
        this.padding = this.width / (this.config.showCoords ? 18 : 22);
        
        // 修正格子大小计算
        this.cell = (this.width - 2*this.padding)/(this.size-1);
        
        this.redraw();
    }

    // 统一重绘入口
    redraw() {
        if(this.lastState) {
            this.draw(this.lastState.board, this.lastState.lastMove, this.lastState.moveMap);
        } else {
            this.drawGrid();
        }
    }

    drawGrid() {
        const {ctx, width: w, padding: p, cell: c, size} = this;
        ctx.clearRect(0,0,w,w);
        
        // 1. 画线
        ctx.lineWidth=1; ctx.strokeStyle="#000"; ctx.beginPath();
        for(let i=0;i<size;i++){
            // 竖线 (x不变)
            ctx.moveTo(p+i*c, p); ctx.lineTo(p+i*c, w-p);
            // 横线 (y不变)
            ctx.moveTo(p, p+i*c); ctx.lineTo(w-p, p+i*c);
        }
        ctx.stroke();

        // 2. 画星位
        [3,9,15].forEach(x=>[3,9,15].forEach(y=>{
            ctx.beginPath(); ctx.arc(p+x*c, p+y*c, 2.5, 0, Math.PI*2); ctx.fillStyle="#000"; ctx.fill();
        }));

        // 3. 画坐标 (只画左边数字，下边字母)
        if (this.config.showCoords) {
            ctx.fillStyle = "#333";
            ctx.font = "bold 10px sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";

            const letters = "ABCDEFGHJKLMNOPQRST"; // 跳过I
            for(let i=0; i<size; i++) {
                // 下边字母
                ctx.fillText(letters[i], p + i*c, w - p/2 + 2);
                // 左边数字 (19在最上)
                ctx.fillText((19-i).toString(), p/2 - 2, p + i*c);
            }
        }
    }

    /**
     * @param {Array} board 棋盘数组
     * @param {Object} lastMove 最后一手 {x,y}
     * @param {Object} moveMap 手数映射 {'x,y': stepNum} (用于显示手数)
     */
    draw(board, lastMove, moveMap) {
        this.lastState = {board, lastMove, moveMap};
        this.drawGrid();
        
        const {ctx, padding: p, cell: c, size} = this;

        // 4. 画棋子
        for(let y=0;y<size;y++) for(let x=0;x<size;x++) {
            if(board[y][x]) {
                this.drawStone(x, y, board[y][x]);
                
                // 显示手数
                if (this.config.showNumbers && moveMap) {
                    const key = `${x},${y}`;
                    if (moveMap[key]) {
                        this.drawNumber(x, y, moveMap[key], board[y][x]);
                    }
                }
            }
        }

        // 5. 最后一手红方块 (大一点)
        if(lastMove) {
            const lx = p + lastMove.x * c;
            const ly = p + lastMove.y * c;
            const markSize = c * 0.4; // 格子大小的40%
            ctx.fillStyle = "red";
            ctx.fillRect(lx - markSize/2, ly - markSize/2, markSize, markSize);
        }

        // 6. 幽灵子 (试下/猜局模式悬停)
        if (this.hoverPos && this.nextColor && board[this.hoverPos.y][this.hoverPos.x] === 0) {
            this.drawGhost(this.hoverPos.x, this.hoverPos.y, this.nextColor);
        }
    }

    drawStone(x,y,color, alpha=1) {
        const {ctx, padding: p, cell: c} = this;
        const cx=p+x*c, cy=p+y*c, r=c*0.48;
        
        ctx.save();
        ctx.globalAlpha = alpha;
        
        ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2);
        
        // 简单的立体感
        const g=ctx.createRadialGradient(cx-r/3,cy-r/3,r/5,cx,cy,r);
        if(color===1){ g.addColorStop(0,"#555"); g.addColorStop(1,"#000"); }
        else{ g.addColorStop(0,"#fff"); g.addColorStop(1,"#ddd"); }
        
        ctx.fillStyle=g; ctx.fill();
        // 白子边框
        if(color===2){ ctx.strokeStyle="#999"; ctx.lineWidth=0.5; ctx.stroke(); }
        
        ctx.restore();
    }

    drawGhost(x, y, color) {
        // 画半透明棋子
        this.drawStone(x, y, color, 0.5); 
    }

    drawNumber(x, y, num, color) {
        const {ctx, padding: p, cell: c} = this;
        const cx=p+x*c, cy=p+y*c;
        
        ctx.fillStyle = color === 1 ? "#fff" : "#000"; // 黑子白字，白子黑字
        // 根据数字位数调整字体大小
        const fontSize = num > 99 ? c*0.4 : c*0.5;
        ctx.font = `bold ${fontSize}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(num, cx, cy);
    }

    // 坐标转换
    getCoord(e) {
        const r = this.canvas.getBoundingClientRect();
        const x = Math.round(((e.clientX-r.left)-this.padding)/this.cell);
        const y = Math.round(((e.clientY-r.top)-this.padding)/this.cell);
        if(x>=0 && x<19 && y>=0 && y<19) return {x, y};
        return null;
    }

    onClick(e) {
        const pos = this.getCoord(e);
        if(pos && this.clickHandler) this.clickHandler(pos.x, pos.y);
    }

    onMove(e) {
        const pos = this.getCoord(e);
        // 只有位置变了才重绘
        if (!pos) {
            if (this.hoverPos) { this.hoverPos = null; this.redraw(); }
            return;
        }
        if (!this.hoverPos || pos.x !== this.hoverPos.x || pos.y !== this.hoverPos.y) {
            this.hoverPos = pos;
            this.redraw();
        }
    }
}

// SGF 解析器 (保持最新的增强版)
function parseSGF(sgf) {
    let moves = [], meta = {}; const map = "abcdefghijklmnopqrs";
    sgf.replace(/([A-Z]{2})\[(.*?)\]/g, (m, k, v) => { if (moves.length === 0) meta[k] = v; });
    const bodyIndex = sgf.indexOf(';');
    if (bodyIndex === -1) return { meta, moves: [] };
    const nodes = sgf.substring(bodyIndex).split(';');
    nodes.forEach(node => {
        if (!node.trim()) return;
        let color = 0, x = -1, y = -1;
        const moveMatch = node.match(/([BW])\[([a-s]{2})\]/);
        if (moveMatch) {
            color = moveMatch[1] === 'B' ? 1 : 2;
            x = map.indexOf(moveMatch[2][0]); y = map.indexOf(moveMatch[2][1]);
        }
        const commentMatch = node.match(/C\[([\s\S]*?)\]/);
        let comment = commentMatch ? commentMatch[1].replace(/\\\]/g, ']') : "";
        if (color !== 0 && x >= 0 && y >= 0) {
            moves.push({ x, y, c: color, comment: comment });
        } else if (comment && moves.length > 0) {
            moves[moves.length - 1].comment += "\n" + comment;
        }
    });
    return { meta, moves };
}
