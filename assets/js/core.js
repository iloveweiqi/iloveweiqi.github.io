/** 1. 规则引擎 (保持不变) */
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
            } else {
                this.ko = null;
            }
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

/** 2. Canvas 渲染器 (修复花屏问题) */
class GoBoard {
    constructor(id) {
        this.canvas = document.getElementById(id);
        if(!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');
        this.size = 19;
        
        // 配置
        this.config = { showCoords: true, showNumbers: false };

        // 交互状态
        this.hoverPos = null;
        this.nextColor = 0;

        // 初始化尺寸监听
        this.resizeObserver = new ResizeObserver(() => this.resize());
        this.resizeObserver.observe(this.canvas.parentElement);
        
        this.canvas.addEventListener('click', e => this.onClick(e));
        this.canvas.addEventListener('mousemove', e => this.onMove(e));
        this.canvas.addEventListener('mouseleave', () => {
            this.hoverPos = null;
            this.redraw();
        });

        // 尝试立即初始化一次
        setTimeout(()=>this.resize(), 0);
    }

    resize() {
        if(!this.canvas.parentElement) return;
        const p = this.canvas.parentElement.getBoundingClientRect();
        
        // 【修复关键】：如果父容器还没渲染出来，宽为0，直接返回，避免计算出 Infinity
        if(p.width === 0 || p.height === 0) return;

        const d = window.devicePixelRatio || 1;
        this.canvas.width = p.width * d; 
        this.canvas.height = p.height * d;
        this.ctx.scale(d, d);
        
        this.width = p.width; 
        
        // 重新计算格子
        this.padding = this.width / (this.config.showCoords ? 18 : 22);
        this.cell = (this.width - 2*this.padding)/(this.size-1);
        
        this.redraw();
    }

    redraw() {
        if(this.lastState) {
            this.draw(this.lastState.board, this.lastState.lastMove, this.lastState.moveMap);
        } else {
            this.drawGrid();
        }
    }

    drawGrid() {
        // 【修复关键】：安全检查，如果格子大小无效，不绘图
        if (!this.cell || this.cell <= 0 || !isFinite(this.cell)) return;

        const {ctx, width: w, padding: p, cell: c, size} = this;
        
        // 【修复关键】：绝对清屏，防止缩放残留导致的重影
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        ctx.restore();

        // 画线
        ctx.lineWidth = 1; 
        ctx.strokeStyle = "#000"; 
        ctx.beginPath();
        for(let i=0; i<size; i++){
            // 确保坐标是整数，让线条更清晰
            const pos = Math.floor(p + i*c) + 0.5;
            const end = Math.floor(w - p) + 0.5;
            const start = Math.floor(p) + 0.5;

            ctx.moveTo(pos, start); ctx.lineTo(pos, end); // 竖线
            ctx.moveTo(start, pos); ctx.lineTo(end, pos); // 横线
        }
        ctx.stroke();

        // 星位
        [3,9,15].forEach(x=>[3,9,15].forEach(y=>{
            ctx.beginPath(); 
            ctx.arc(p+x*c, p+y*c, 2.5, 0, Math.PI*2); 
            ctx.fillStyle="#000"; 
            ctx.fill();
        }));

        // 坐标
        if (this.config.showCoords) {
            ctx.fillStyle = "#333";
            ctx.font = "bold 10px sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";

            const letters = "ABCDEFGHJKLMNOPQRST";
            for(let i=0; i<size; i++) {
                ctx.fillText(letters[i], p + i*c, w - p/2 + 2);
                ctx.fillText((19-i).toString(), p/2 - 2, p + i*c);
            }
        }
    }

    draw(board, lastMove, moveMap) {
        this.lastState = {board, lastMove, moveMap};
        this.drawGrid();
        
        // 安全检查
        if (!this.cell || this.cell <= 0) return;

        const {ctx, padding: p, cell: c, size} = this;

        // 画子
        for(let y=0;y<size;y++) for(let x=0;x<size;x++) {
            if(board[y][x]) {
                this.drawStone(x, y, board[y][x]);
                if (this.config.showNumbers && moveMap) {
                    const key = `${x},${y}`;
                    if (moveMap[key]) {
                        this.drawNumber(x, y, moveMap[key], board[y][x]);
                    }
                }
            }
        }

        // 最后一手红点
        if(lastMove) {
            const lx = p + lastMove.x * c;
            const ly = p + lastMove.y * c;
            const markSize = c * 0.4;
            ctx.fillStyle = "red";
            ctx.fillRect(lx - markSize/2, ly - markSize/2, markSize, markSize);
        }

        // 幽灵子
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
        
        const g=ctx.createRadialGradient(cx-r/3,cy-r/3,r/5,cx,cy,r);
        if(color===1){ g.addColorStop(0,"#555"); g.addColorStop(1,"#000"); }
        else{ g.addColorStop(0,"#fff"); g.addColorStop(1,"#ddd"); }
        
        ctx.fillStyle=g; ctx.fill();
        if(color===2){ ctx.strokeStyle="#999"; ctx.lineWidth=0.5; ctx.stroke(); }
        
        ctx.restore();
    }

    drawGhost(x, y, color) {
        this.drawStone(x, y, color, 0.5); 
    }

    drawNumber(x, y, num, color) {
        const {ctx, padding: p, cell: c} = this;
        ctx.fillStyle = color === 1 ? "#fff" : "#000";
        const fontSize = num > 99 ? c*0.4 : c*0.5;
        ctx.font = `bold ${fontSize}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(num, p+x*c, p+y*c);
    }

    getCoord(e) {
        // 安全检查
        if (!this.cell || this.cell <= 0) return null;
        
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
