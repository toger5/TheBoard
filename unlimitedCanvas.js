const CHUNKSIZE = 1000;
class UnlimitedCanvas {
    constructor() {
        this.canvasChunks = {};
        this.addCacheCanvas([0, 0]);
    }
    chunkList(){
        return Object.keys(this.canvasChunks).map(key => this.canvasChunks[key]);
    }
    getKeys(){
       return Object.keys(this.canvasChunks).map((k)=>{return k.split(",")});
    }
    addCacheCanvas(pos) {
        let cache_canvas = document.createElement('canvas');
        cache_canvas.width = CHUNKSIZE;
        cache_canvas.height = CHUNKSIZE;
        // let cache_ctx = cache_canvas.getContext("2d");
        this.canvasChunks[pos] = cache_canvas;
    }
    reload(animated = false) {
        this.reloadChunks(this.chunkList(), animated);
    }
    reloadChunks(chunks, animated = false) {
        let starttime = Date.now()
        console.log("!! Reloaded", chunks.length, " chunks");
        for (chunk of chunks) {
            cache_canvas = this.canvasChunks[chunk];
            cache_ctx = cache_canvas.getContext("2d");
            cache_ctx.fillStyle = "#eee";
            cache_ctx.fillRect(0, 0, cache_canvas.width, cache_canvas.height);
            cache_ctx.clearRect(3, 3, cache_canvas.width - 6, cache_canvas.height - 6);
            drawGrid(cache_ctx, setting_grid, [cache_canvas.width, cache_canvas.height], 50, cache_ctx.fillStyle)
            console.log("!! Cache Canvas redraw START");
            objectStore.allSorted().forEach(obj => {
                if (obj.type == "p.whiteboard.object") {
                    drawEvent(obj, animated, animated, DRAW_BOUNDING_BOX);
                }
            });
            console.log("!! Cache Canvas redraw DONE in", Date.now() - starttime);
        }
    }
    getChunksForArea(pos, size) {
        let startx = Math.floor(pos[0] / CHUNKSIZE);
        let starty = Math.floor(pos[1] / CHUNKSIZE);
        let endx = Math.floor(pos[0] + size[0] / CHUNKSIZE);
        let endy = Math.floor(pos[1] + size[1] / CHUNKSIZE);
        let chunks = [];
        for (let x = startx; y < endx; x++) {
            for (let y = starty; y < endy; y++) {
                chunks.push([x * CHUNKSIZE, y * CHUNKSIZE]);
            }
        }

    }
}