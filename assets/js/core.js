// assets/js/core.js

/** 1. 规则引擎 */
class GoEngine {
    constructor() { this.reset(); }
    reset() { this.board = Array(19).fill(0).map(() => Array(19).fill(0)); }
    
    getGroup(x, y, board = this.board) {
        const color = board[y][x];
        if (color === 0) return null;
        let stones = [], liberties = new Set(), visited = new Set();
        let queue = [{x, y}]; visited.add(`${x},${y}`);
        while (queue.length) {
            const curr = queue.pop(); stones.push(curr);
            [[0,1],[0,-1],[1,0],[-1,0]].forEach(([dx, dy]) => {
                const nx = curr.x + dx, ny = curr.y + dy;
                if (nx<0 || nx>=19 || ny<0 || ny>=19) return;
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
        if (this.board[y][x] !== 0) return { success: false };
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
            return { success: true, capturedCount: caps.length };
        } else {
            const self = this.getGroup(x, y);
            if (self.liberties === 0) {
                this.board[y][x] = 0;
                return { success: false, error: "suicide" };
            }
        }
        return { success: true, capturedCount: 0 };
    }
}

/** 2. Canvas 渲染 */
class GoBoard {
    constructor(id) {
        this.canvas = document.getElementById(id);
        if(!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');
        this.size = 19;
        this.resizeObserver = new ResizeObserver(() => this.resize());
        this.resizeObserver.observe(this.canvas.parentElement);
        this.canvas.addEventListener('click', e => this.onClick(e));
        setTimeout(()=>this.resize(), 100);
    }
    resize() {
        const p = this.canvas.parentElement.getBoundingClientRect();
        const d = window.devicePixelRatio || 1;
        this.canvas.width = p.width * d; this.canvas.height = p.height * d;
        this.ctx.scale(d, d);
        this.width = p.width; 
        this.padding = this.width / 22;
        this.cell = (this.width - 2*this.padding)/(this.size-1);
        if(this.lastState) this.draw(this.lastState.board, this.lastState.lastMove);
    }
    draw(board, lastMove) {
        this.lastState = {board, lastMove};
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
        for(let y=0;y<size;y++) for(let x=0;x<size;x++) {
            if(board[y][x]) this.drawStone(x,y,board[y][x]);
        }
        if(lastMove) {
            ctx.fillStyle="red"; ctx.fillRect(p+lastMove.x*c-3, p+lastMove.y*c-3, 6, 6);
        }
    }
    drawStone(x,y,color) {
        const {ctx, padding: p, cell: c} = this;
        const cx=p+x*c, cy=p+y*c, r=c*0.48;
        ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2);
        const g=ctx.createRadialGradient(cx-r/3,cy-r/3,r/5,cx,cy,r);
        if(color===1){ g.addColorStop(0,"#555"); g.addColorStop(1,"#000"); }
        else{ g.addColorStop(0,"#fff"); g.addColorStop(1,"#ddd"); }
        ctx.fillStyle=g; ctx.fill();
        if(color===2){ ctx.strokeStyle="#ccc"; ctx.stroke(); }
    }
    onClick(e) {
        if(!this.clickHandler) return;
        const r = this.canvas.getBoundingClientRect();
        const x = Math.round(((e.clientX-r.left)-this.padding)/this.cell);
        const y = Math.round(((e.clientY-r.top)-this.padding)/this.cell);
        if(x>=0 && x<19 && y>=0 && y<19) this.clickHandler(x,y);
    }
}

function parseSGF(sgf) {
    let moves=[], meta={};
    sgf.replace(/([A-Z]{2})\[(.*?)\]/g, (m,k,v)=>{ if(!moves.length) meta[k]=v; });
    const reg = /;([BW])\[([a-s]{2})\]/g; let m; const map="abcdefghijklmnopqrs";
    while(m=reg.exec(sgf)) {
        const x=map.indexOf(m[2][0]), y=map.indexOf(m[2][1]);
        if(x>=0&&y>=0) moves.push({x,y,c:m[1]==='B'?1:2});
    }
    return {meta, moves};
}
