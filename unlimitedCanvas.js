const CHUNKSIZE = 1000;
var SHOW_CHUNK_BORDER = true;
var DRAW_BOUNDING_BOX = false;
class UnlimitedCanvas {
    constructor() {
        this.css_id = "canvas";
        this.canvasChunks = {};
        this.addCacheCanvas([0, 0]);
        this.addCacheCanvas([1000, 0]);
        this.addCacheCanvas([1000, 1000]);
    }
    init() {
        display_canvas = document.getElementById('canvas');
        display_ctx = display_canvas.getContext("2d");
        display_ctx.imageSmoothingEnabled = true;
        const resizeObserver = new ResizeObserver(this.onResize);
        try {
            resizeObserver.observe(canvas, { box: 'device-pixel-content-box' });
        } catch (ex) {
            resizeObserver.observe(canvas, { box: 'content-box' });
        }
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
    drawSegmentDisplay(segment_points, color) {
        let canvas = document.getElementById("canvas");
        let ctx = canvas.getContext("2d");
        ctx.beginPath();
        ctx.moveTo(segment_points[0][1], segment_points[0][2]);
        ctx.strokeStyle = color;
        ctx.lineWidth = segment_points[1][3];
        ctx.lineTo(segment_points[1][1], segment_points[1][2]);
        ctx.stroke();
    }
    addPathV1(points, color, boundingbox) {
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
    async asyncAddPathV1(pos, points, color) {
        for (let p = 1; p < points.length; p++) {
            drawSegmentDisplay([points[p - 1], points[p]], color);
            this.drawSegment([points[p - 1], points[p]], color);
            await sleep(points[p][0]);
        }
        this.updateDisplay(true);
        // cache_canvas.drawPath(points,color);
        // cache_canvas.drawSegment([points[p - 1], points[p]], color);
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


    setZoom(zoom_factor, origin) {
        let ctx = display_ctx;
        let pt = this.getTransformedPointer(origin.x, origin.y);
    
        ctx.translate(pt.x, pt.y);
        let t = ctx.getTransform();
        t.a = Math.min(zoom_factor, 1.2);
        t.d = Math.min(zoom_factor, 1.2);
        t.a = Math.max(zoom_factor, 0.2);
        t.d = Math.max(zoom_factor, 0.2);
        ctx.setTransform(t.a, t.b, t.c, t.d, t.e, t.f);
    
        ctx.translate(-pt.x, -pt.y);
        this.updateDisplay()
    }
    zoom(factor, origin) {
    let ctx = display_ctx;
    let pt = drawing_canvas.getTransformedPointer(origin.x, origin.y);
    ctx.translate(pt.x, pt.y);
    ctx.scale(factor, factor);
    let t = ctx.getTransform();
    t.a = Math.min(t.a, 1.2);
    t.d = Math.min(t.a, 1.2);
    t.a = Math.max(t.a, 0.2);
    t.d = Math.max(t.a, 0.2);
    ctx.setTransform(t.a, t.b, t.c, t.d, t.e, t.f);

    ctx.translate(-pt.x, -pt.y);
    this.updateDisplay()
}
    getZoom() {
        let t = display_ctx.getTransform();
        return t.a;
    }
    offset(delta) {
        let canvas = document.getElementById("canvas");
        let ctx = canvas.getContext("2d");
        ctx.translate(delta.x, delta.y);
        this.updateDisplay()
    }
    resetOffset() {
        // canvasOffset = [0,0];
        let canvas = document.getElementById("canvas");
        let ctx = canvas.getContext("2d");
        ctx.resetTransform();
        this.updateDisplay();
    }
    resetZoom() {
        let ctx = display_ctx;
        let pt = this.getTransformedPointer(canvas.width / 2, canvas.height / 2);
        ctx.translate(pt.x, pt.y);
        let t = ctx.getTransform();
        t.a = 1;
        t.d = 1;
        ctx.setTransform(t.a, t.b, t.c, t.d, t.e, t.f);
        ctx.translate(-pt.x, -pt.y);
        this.updateDisplay()
    }

    getTransformedPointer(x, y) {
        let dpr = window.devicePixelRatio;
        pt = new DOMPoint(x * dpr, y * dpr);
        let tr = pt.matrixTransform(display_ctx.getTransform().inverse());
        return new DOMPoint(Math.round(tr.x), Math.round(tr.y));
    }

    onResize(entries) {
        let target;
        let w;
        let h;
        for (const entry of entries) {
            let width;
            let height;
            let dpr = window.devicePixelRatio;
            if (entry.devicePixelContentBoxSize) {
                // NOTE: Only this path gives the correct answer
                // The other paths are imperfect fallbacks
                // for browsers that don't provide anyway to do this
                width = entry.devicePixelContentBoxSize[0].inlineSize;
                height = entry.devicePixelContentBoxSize[0].blockSize;
                dpr = 1; // it's already in width and height
            } else if (entry.contentBoxSize) {
                if (entry.contentBoxSize[0]) {
                    width = entry.contentBoxSize[0].inlineSize;
                    height = entry.contentBoxSize[0].blockSize;
                } else {
                    width = entry.contentBoxSize.inlineSize;
                    height = entry.contentBoxSize.blockSize;
                }
            } else {
                width = entry.contentRect.width;
                height = entry.contentRect.height;
            }
            w = Math.round(width * dpr);
            h = Math.round(height * dpr);
            target = entry.target;
        }
        if (target == display_canvas) {
            let t = display_ctx.getTransform();
            display_canvas.width = w;
            display_canvas.height = h;
            display_ctx.setTransform(t);
            this.updateDisplay();
        }
    }
    updateDisplay(clear = true) {
        let canvas = document.getElementById("canvas");
        let ctx = canvas.getContext("2d");
        if (!(drawing_canvas instanceof UnlimitedCanvas)){
            return
        }
        if (clear) {
            ctx.save();
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.restore();
        }
        for (c of drawing_canvas.getKeys()) {
            ctx.drawImage(drawing_canvas.canvasChunks[c], c[0], c[1]);
        }
    }
    
}