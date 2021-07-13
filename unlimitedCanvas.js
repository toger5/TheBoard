const CHUNKSIZE = 1000;
var SHOW_CHUNK_BORDER = true;
var DRAW_BOUNDING_BOX = false;
class UnlimitedCanvas {
    constructor() {
        this.canvasChunks = {};
        this.addCacheCanvas([0, 0]);
        this.addCacheCanvas([1000, 0]);
        this.addCacheCanvas([1000, 1000]);
    }
    canvasList() {
        return Object.keys(this.canvasChunks).map(key => this.canvasChunks[key]);
    }
    getKeys() {
        return Object.keys(this.canvasChunks).map((k) => { return k.split(",").map(val => parseInt(val)) });
    }
    addCacheCanvas(pos) {
        let canvas = document.createElement('canvas');
        canvas.width = CHUNKSIZE;
        canvas.height = CHUNKSIZE;
        // let cache_ctx = canvas.getContext("2d");
        this.canvasChunks[pos] = canvas;
    }
    reload(animated = false) {
        this.reloadChunks(this.getKeys(), animated);
    }
    reloadChunks(chunks, animated = false) {
        //ONLY WORKS FOR RELOAD ALL ATM
        let starttime = Date.now()
        console.log("!! Reloaded", chunks.length, " chunks");
        // let chunks = this.getChunksForArea(boundingbox[0], boundingbox[1]);
        for (let chunk of this.getKeys()) {
            let starttimeClear = Date.now()
            let can = this.canvasChunks[chunk];
            let ctx = can.getContext("2d");
            if (SHOW_CHUNK_BORDER) {
                ctx.fillStyle = "#9f9";
                ctx.fillRect(0, 0, can.width, can.height);
                ctx.clearRect(2, 2, can.width - 4, can.height - 4);
            } else {
                ctx.clearRect(0, 0, can.width, can.height);
            }
            drawGrid(ctx, setting_grid, [canvas.width, canvas.height], 50, ctx.fillStyle)
            console.log("!! Cache Canvas cleared in ", Date.now() - starttimeClear);
        }
        console.log("!! Cache Canvas redraw START");
        objectStore.allSorted().forEach(obj => {
            if (obj.type == "p.whiteboard.object") {
                drawEvent(obj, animated, animated);
            }
        });
        console.log("!! Cache Canvas redraw DONE in", Date.now() - starttime);
        // for (let chunk of chunks) {
        //     let canvas = this.canvasChunks[chunk];
        //     let cache_ctx = canvas.getContext("2d");
        //     cache_ctx.fillStyle = "#eee";
        //     cache_ctx.fillRect(0, 0, canvas.width, canvas.height);
        //     cache_ctx.clearRect(3, 3, canvas.width - 6, canvas.height - 6);
        //     drawGrid(cache_ctx, setting_grid, [canvas.width, canvas.height], 50, cache_ctx.fillStyle)
        //     console.log("!! Cache Canvas redraw START");
        //     objectStore.allSorted().forEach(obj => {
        //         if (obj.type == "p.whiteboard.object") {
        //             drawEvent(obj, animated, animated, DRAW_BOUNDING_BOX);
        //         }
        //     });
        //     console.log("!! Cache Canvas redraw DONE in", Date.now() - starttime);
        // }
    }
    drawSegment(segment_points, color) {
        let p1 = segment_points[0];
        let p2 = segment_points[1];
        let pos = [Math.min(p1[1], p2[1]), Math.min(p1[2], p2[2])];
        let size = [Math.max(p1[1], p2[1]) - pos[0], Math.max(p1[2], p2[2]) - pos[1]];
        let chunks = this.getChunksForArea(pos, size);
        this.createCanvasForChunks(chunks);
        for (let c of chunks) {
            let pts = pathChunkPosCorrection(c, segment_points);
            let can = this.canvasChunks[c];
            let ctx = can.getContext("2d");
            ctx.beginPath();
            ctx.moveTo(pts[0][1], pts[0][2]);
            ctx.strokeStyle = color;
            ctx.lineWidth = pts[1][3];
            ctx.lineTo(pts[1][1], pts[1][2]);
            ctx.stroke();
        }
    }
    drawPath(points, color, boundingbox) {
        let chunks = this.getChunksForArea(boundingbox[0], boundingbox[1]);
        // this maybe should be part of getChunksForArea?
        this.createCanvasForChunks(chunks);
        for (let chunk of chunks) {
            let can = this.canvasChunks[chunk];
            let ctx = can.getContext("2d");
            ctx.lineCap = "square";
            ctx.beginPath();
            let pts = pathChunkPosCorrection(chunk, points);
            for (let p = 1; p < pts.length; p++) {
                ctx.moveTo(pts[p - 1][1], pts[p - 1][2]);
                ctx.strokeStyle = color;
                ctx.lineWidth = pts[p][3];
                ctx.lineTo(pts[p][1], pts[p][2]);
            }
            ctx.stroke();
        }
    }
    createCanvasForChunks(chunks) {
        for (let chunk of chunks) {
            if (!(chunk in this.canvasChunks)) {
                this.addCacheCanvas(chunk);
                if (SHOW_CHUNK_BORDER) {
                    this.reload();
                }
            }
        }
    }
    drawBoundingBox(boundingbox) {
        if (!DRAW_BOUNDING_BOX) {
            return;
        }
        let pos = boundingbox[0];
        let size = boundingbox[1];
        let chunks = this.getChunksForArea(pos, size);
        this.createCanvasForChunks(chunks);
        for (let chunk of chunks) {
            let can = this.canvasChunks[chunk];
            let ctx = can.getContext("2d");
            ctx.beginPath();
            ctx.strokeStyle = "#EE111180";
            ctx.lineWidth = 1;
            ctx.rect(parseInt(pos[0]) - chunk[0], parseInt(pos[1]) - chunk[1], parseInt(size[0]), parseInt(size[1]));
            ctx.stroke();
        }

    }
    getChunksForArea(pos, size) {
        let startx = Math.floor(pos[0] / CHUNKSIZE);
        let starty = Math.floor(pos[1] / CHUNKSIZE);
        let endx = Math.floor((pos[0] + size[0]) / CHUNKSIZE);
        let endy = Math.floor((pos[1] + size[1]) / CHUNKSIZE);
        let chunks = [];
        for (let x = startx; x <= endx; x++) {
            for (let y = starty; y <= endy; y++) {
                chunks.push([x * CHUNKSIZE, y * CHUNKSIZE]);
            }
        }
        return chunks;

    }
}