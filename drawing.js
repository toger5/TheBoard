
var cache_canvas = document.createElement('canvas');
cache_canvas.width = 3000;
cache_canvas.height = 8000;
var cache_ctx = cache_canvas.getContext("2d");
var setting_grid = "";
var display_canvas;
var display_ctx;



// TODO depracate this value
// canvasOffset = [0, 0];


function update_canvasOffset(delta) {
    let canvas = document.getElementById("canvas");
    let ctx = canvas.getContext("2d");
    ctx.translate(delta[0], delta[1]);
    updateDisplayCanvas()
}
function update_canvasZoom(factor, originX, originY) {
    let ctx = display_ctx;
    let pt = getTransformedMouse(originX, originY);
    ctx.translate(pt.x, pt.y);

    ctx.scale(factor, factor);
    let t = ctx.getTransform();
    t.a = Math.min(t.a, 1.2);
    t.d = Math.min(t.a, 1.2);
    t.a = Math.max(t.a, 0.2);
    t.d = Math.max(t.a, 0.2);
    ctx.setTransform(t.a, t.b, t.c, t.d, t.e, t.f);

    ctx.translate(-pt.x, -pt.y);
    updateDisplayCanvas()
}
function resetCanvasOffset() {
    // canvasOffset = [0,0];
    let canvas = document.getElementById("canvas");
    let ctx = canvas.getContext("2d");
    ctx.resetTransform();
    updateDisplayCanvas();
}
function resetCanvasZoom() {
    let ctx = display_ctx;
    let pt = getTransformedMouse(canvas.width / 2, canvas.height / 2);
    ctx.translate(pt.x, pt.y);
    let t = ctx.getTransform();
    t.a = 1;
    t.d = 1;
    ctx.setTransform(t.a, t.b, t.c, t.d, t.e, t.f);
    ctx.translate(-pt.x, -pt.y);
    updateDisplayCanvas()
}
function drawEvent(event, animated, updateDisplay=true) {
    if (event.content.objtype == "p.path") {
        let points = pathStringToArray(event.content.path, event.content.objpos);
        if (animated) {
            asyncDrawPath(points, event.content.objcolor);
        } else {
            drawPath(cache_ctx, points, event.content.objcolor);
            if(updateDisplay){updateDisplayCanvas(true);}
        }
    }
}
// function drawEventLive(event, offset, animated) {
//     if (event.content.objtype == "p.path") {
//         let points = pathStringToArray(event.content.path, event.content.objpos, offset);
//         if (animated) {
//             asyncDrawPath(cache_ctx, points, event.content.objcolor);
//         } else {
//             drawPath(cache_ctx, context, points, event.content.objcolor);

//         }  
//     }
// }
function drawPath(context, points, color) {
    // const canvas = document.getElementById("canvas");
    // const ctx = canvas.getContext("2d");
    let ctx = context;
    ctx.lineCap = "round";
    ctx.beginPath();
    for (let p = 1; p < points.length; p++) {
        ctx.moveTo(points[p - 1][1], points[p - 1][2]);
        ctx.strokeStyle = color;
        ctx.lineWidth = points[p][3];
        ctx.lineTo(points[p][1], points[p][2]);
    }
    ctx.stroke();
}

const sleep = ms => {
    return new Promise(resolve => setTimeout(resolve, ms))
}
async function asyncDrawPath(points, color) {
    for (let p = 1; p < points.length; p++) {
        // let ctx = canvas.getContext("2d");
        // let ctx = context;
        // ctx.lineCap = "round";
        drawSegmentDisplay([points[p - 1], points[p]], color);
        drawSegment(cache_ctx, [points[p - 1], points[p]], color);
        // const canvas = document.getElementById("canvas");
        // console.log("going to wait for " + points[p][0]);
        // ctx.beginPath();
        // ctx.moveTo(points[p-1][1], points[p-1][2]);
        // ctx.strokeStyle = color;
        // ctx.lineWidth = points[p][3];
        // ctx.lineTo(points[p][1], points[p][2]);
        // ctx.stroke();
        let a = await sleep(points[p][0]);
        // console.log("after");
    }
    updateDisplayCanvas(false);
}

function drawSegment(ctx, segment_points, color) {

    ctx.beginPath();
    ctx.moveTo(segment_points[0][1], segment_points[0][2]);
    ctx.strokeStyle = color;
    ctx.lineWidth = segment_points[1][3];
    ctx.lineTo(segment_points[1][1], segment_points[1][2]);
    ctx.stroke();
}
function drawSegmentDisplay(segment_points, color) {
    let canvas = document.getElementById("canvas");
    let ctx = canvas.getContext("2d");
    drawSegment(ctx, segment_points, color);
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
    cache_ctx.fillStyle = "#eee";
    cache_ctx.fillRect(0, 0, cache_canvas.width, cache_canvas.height);
    cache_ctx.clearRect(3, 3, cache_canvas.width - 6, cache_canvas.height - 6);
    drawGrid(cache_ctx, setting_grid, [cache_canvas.width, cache_canvas.height], 50, cache_ctx.fillStyle)
    console.log("!! Cache Canvas redraw START");
    let starttime = Date.now()
    objectStore.allSorted().forEach(obj => {
        if (obj.type == "p.whiteboard.object") {
            drawEvent(obj, animated, animated);
        }
    });
    console.log("!! Cache Canvas redraw DONE in", Date.now()-starttime);
}

function updateDisplayCanvas(clear = true) {
    const canvas = document.getElementById("canvas");
    const ctx = canvas.getContext("2d");
    if (clear) {
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
    }
    ctx.drawImage(cache_canvas, 0, 0);
}

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
function clearDisplayCanvas() {
    const canvas = document.getElementById("canvas");
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}
function onResize() {
    let box = document.getElementById("container");
    // window.getComputedStyle(box, null).getPropertyValue('padding')
    // box.style.padding
    let padding = 4;
    let w = box.getBoundingClientRect().width - 2 * padding;
    let h = box.getBoundingClientRect().height - 2 * padding;
    let t = display_ctx.getTransform();
    display_canvas.width = w;
    display_canvas.height = h;
    // display_canvas.style.width = w + 'px';
    // display_canvas.style.height = h + 'px';
    display_ctx.setTransform(t);
    updateDisplayCanvas();
}
function init_drawing() {
    display_canvas = document.getElementById('canvas');
    display_ctx = display_canvas.getContext("2d");
    display_ctx.imageSmoothingEnabled = true;
    onResize();
}