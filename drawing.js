
// var cache_canvas = document.createElement('canvas');
// cache_canvas.width = 3000;
// cache_canvas.height = 8000;
// var cache_ctx = cache_canvas.getContext("2d");
// var cache_canvas = new UnlimitedCanvas();
var drawing_canvas = new PaperCanvas();
var setting_grid = "";
var display_canvas;
var display_ctx;

function drawEvent(event, animated, updateDisplay = true) {
    if (event.content.objtype == "p.path") {
        
        if (event.content.version == 1 || !("version" in event.content)){
            let points = parsePath(event.content.path, event.content.objpos);
            let pos = parsePoint(event.content.objpos);
            let size = parsePoint(event.content.objsize);
            // let strokeWidth = parseFloat(event.content.pathStroke);
            if (animated) {
                drawing_canvas.asyncAddPathV1(pos, points, event.content.objcolor);
            } else {
                drawing_canvas.drawBoundingBox([pos, size]);
                drawing_canvas.addPathV1(points, event.content.objcolor, [pos, size]);
                if (updateDisplay) { drawing_canvas.updateDisplay(true); }
            }
        }
        
        else if (event.content.version == 2){
            let segments = parseBezierPath(event.content.path, event.content.objpos);
            let pos = parsePoint(event.content.objpos);
            let size = parsePoint(event.content.objsize);
            let strokeWidth = parseFloat(event.content.pathStroke);
            if (animated) {
                drawing_canvas.asyncAddPathV2(pos, segments, event.content.objcolor);
            } else {
                // drawing_canvas.drawBoundingBox([pos, size]);
                drawing_canvas.addPathV2(segments, event.content.objcolor, strokeWidth, [pos, size]);
                if (updateDisplay) { drawing_canvas.updateDisplay(true); }
            }
        }
    }
}

const sleep = ms => {
    return new Promise(resolve => setTimeout(resolve, ms))
}

function drawGrid(ctx, grid, size, gridsize, color) {
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    if (grid === "dots") {
        let radius = 3;
        let xcount = size[0] / gridsize;
        let ycount = size[1] / gridsize;
        ctx.beginPath();
        for (i = 0; i < xcount; i++) {
            for (j = 0; j < ycount; j++) {
                ctx.moveTo(i * gridsize, j * gridsize);
                ctx.ellipse(i * gridsize, j * gridsize, radius, radius, 0, 0, Math.PI * 2);
            }
        }
        ctx.fill();
    }
    if (grid === "squares") {
        let xcount = size[0] / gridsize;
        let ycount = size[1] / gridsize;
        ctx.beginPath();
        for (i = 0; i < xcount; i++) {
            ctx.moveTo(i * gridsize, 0);
            ctx.lineTo(i * gridsize, size[1]);
        }
        for (j = 0; j < ycount; j++) {
            ctx.moveTo(0, j * gridsize);
            ctx.lineTo(size[0], j * gridsize);
        }
        ctx.stroke();
    }
}

function reloadCacheCanvas(animated = false) {
    drawing_canvas.reload();
}
// function reloadCacheCanvas(animated = false) {
//     cache_ctx.fillStyle = "#eee";
//     cache_ctx.fillRect(0, 0, cache_canvas.width, cache_canvas.height);
//     cache_ctx.clearRect(3, 3, cache_canvas.width - 6, cache_canvas.height - 6);
//     drawGrid(cache_ctx, setting_grid, [cache_canvas.width, cache_canvas.height], 50, cache_ctx.fillStyle)
//     console.log("!! Cache Canvas redraw START");
//     let starttime = Date.now()
//     objectStore.allSorted().forEach(obj => {
//         if (obj.type == "p.whiteboard.object") {
//             drawEvent(obj, animated, animated, DRAW_BOUNDING_BOX);
//         }
//     });
//     console.log("!! Cache Canvas redraw DONE in", Date.now() - starttime);
// }




// function updateDisplayCanvas(clear = true) {
//     const canvas = document.getElementById("canvas");
//     const ctx = canvas.getContext("2d");
//     if (clear) {
//         ctx.save();
//         ctx.setTransform(1, 0, 0, 1, 0, 0);
//         ctx.clearRect(0, 0, canvas.width, canvas.height);
//         ctx.restore();
//     }
//     ctx.drawImage(cache_canvas, 0, 0);
// }

// OLD!!
// function reloadCanvas(animated = false) {
//     const canvas = document.getElementById("canvas");
//     const ctx = canvas.getContext("2d");
//     ctx.clearRect(0, 0, canvas.width, canvas.height);
//     objectStore.all().forEach(obj => {
//         if (obj.type == "p.whiteboard.object") {
//             console.log(obj.type);
//             drawEvent(obj, canvasOffset, animated);
//         }
//     });
// }

// only for button...
// function clearDisplayCanvas() {
//     const canvas = document.getElementById("canvas");
//     const ctx = canvas.getContext("2d");
//     ctx.clearRect(0, 0, canvas.width, canvas.height);
// }
