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

/** 2. Canvas 渲染 (保持不变) */
class GoBoard {
    constructor(id) {
        this.canvas = document.getElementById(id);
        if(!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');
        this.size = 19;
        this.config = { showCoords: true, showNumbers: false };
        this.hoverPos = null;
        this.resizeObserver = new ResizeObserver(() => this.resize());
        this.resizeObserver.observe(this.canvas.parentElement);
        this.canvas.addEventListener('click', e => this.onClick(e));
        this.canvas.addEventListener('mousemove', e => this.onMove(e));
        this.canvas.addEventListener('mouseleave', () => { this.hoverPos = null; this.redraw(); });
    }

    resize() {
        if(!this.canvas.parentElement) return;
        const p = this.canvas.parentElement.getBoundingClientRect();
        if(p.width===0) return;
        const d = window.devicePixelRatio || 1;
        this.canvas.width = p.width * d; this.canvas.height = p.height * d;
        this.ctx.scale(d, d);
        this.width = p.width; 
        this.padding = this.width / (this.config.showCoords ? 18 : 22);
        this.cell = (this.width - 2*this.padding)/(this.size-1);
        this.redraw();
    }

    redraw() {
        if(this.lastState) this.draw(this.lastState.board, this.lastState.lastMove, this.lastState.moveMap);
        else this.drawGrid();
    }

    drawGrid() {
        const {ctx, width: w, padding: p, cell: c, size} = this;
        ctx.clearRect(0,0,w,w);
        ctx.lineWidth=1; ctx.strokeStyle="#000"; ctx.beginPath();
        for(let i=0;i<size;i++){
            ctx.moveTo(p+i*c, p); ctx.lineTo(p+i*c, w-p);
            ctx.moveTo(p, p+i*c); ctx.lineTo(w-p, p+i*c);
        }
        ctx.stroke();
        [3,9,15].forEach(x=>[3,9,15].forEach(y=>{
            ctx.beginPath(); ctx.arc(p+x*c, p+y*c, 2.5, 0, Math.PI*2); ctx.fillStyle="#000"; ctx.fill();
        }));

        if (this.config.showCoords) {
            ctx.fillStyle = "#333"; ctx.font = "bold 10px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
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
        const {ctx, padding: p, cell: c, size} = this;
        for(let y=0;y<size;y++) for(let x=0;x<size;x++) {
            if(board[y][x]) {
                this.drawStone(x, y, board[y][x]);
                if (this.config.showNumbers && moveMap) {
                    const k = `${x},${y}`;
                    if (moveMap[k]) this.drawNumber(x, y, moveMap[k], board[y][x]);
                }
            }
        }
        if(lastMove) {
            const lx = p + lastMove.x * c, ly = p + lastMove.y * c, ms = c * 0.4;
            ctx.fillStyle = "red"; ctx.fillRect(lx - ms/2, ly - ms/2, ms, ms);
        }
        if (this.hoverPos && this.nextColor && board[this.hoverPos.y][this.hoverPos.x] === 0) {
            this.drawStone(this.hoverPos.x, this.hoverPos.y, this.nextColor, 0.5);
        }
    }

    drawStone(x,y,color, alpha=1) {
        const {ctx, padding: p, cell: c} = this;
        const cx=p+x*c, cy=p+y*c, r=c*0.48;
        ctx.save(); ctx.globalAlpha = alpha;
        ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2);
        const g=ctx.createRadialGradient(cx-r/3,cy-r/3,r/5,cx,cy,r);
        if(color===1){ g.addColorStop(0,"#555"); g.addColorStop(1,"#000"); }
        else{ g.addColorStop(0,"#fff"); g.addColorStop(1,"#ddd"); }
        ctx.fillStyle=g; ctx.fill();
        if(color===2){ ctx.strokeStyle="#999"; ctx.lineWidth=0.5; ctx.stroke(); }
        ctx.restore();
    }

    drawNumber(x, y, num, color) {
        const {ctx, padding: p, cell: c} = this;
        ctx.fillStyle = color === 1 ? "#fff" : "#000";
        ctx.font = `bold ${num>99?c*0.4:c*0.5}px sans-serif`;
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(num, p+x*c, p+y*c);
    }

    onMove(e) {
        const r = this.canvas.getBoundingClientRect();
        const x = Math.round(((e.clientX-r.left)-this.padding)/this.cell);
        const y = Math.round(((e.clientY-r.top)-this.padding)/this.cell);
        if(x>=0 && x<19 && y>=0 && y<19) {
            if (!this.hoverPos || x !== this.hoverPos.x || y !== this.hoverPos.y) {
                this.hoverPos = {x, y}; this.redraw();
            }
        } else if (this.hoverPos) {
            this.hoverPos = null; this.redraw();
        }
    }
    onClick(e) {
        if(this.hoverPos && this.clickHandler) this.clickHandler(this.hoverPos.x, this.hoverPos.y);
    }
}

/** 3. SGF 解析器 (增强解说提取能力) */
function parseSGF(sgf) {
    let moves = [], meta = {}; const map = "abcdefghijklmnopqrs";
    sgf.replace(/([A-Z]{2})\[(.*?)\]/g, (m, k, v) => { if (!moves.length) meta[k] = v; });
    
    // 更稳健的节点分割
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
        
        // 关键修复：支持多行解说，支持转义字符
        const cm = node.match(/C\[([\s\S]*?)\]/); 
        let comment = cm ? cm[1].replace(/\\\]/g, ']') : "";

        if (color !== 0 && x >= 0 && y >= 0) {
            moves.push({ x, y, c: color, comment: comment });
        } else if (comment && moves.length > 0) {
            // 如果只有解说没有落子，追加到上一步
            moves[moves.length - 1].comment += "\n" + comment;
        }
    });
    return { meta, moves };
}
