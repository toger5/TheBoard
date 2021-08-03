// var cache_canvas = document.createElement('canvas');
// cache_canvas.width = 3000;
// cache_canvas.height = 8000;
// var cache_ctx = cache_canvas.getContext("2d");
// var cache_canvas = new UnlimitedCanvas();
// import { drawingCanvas } from './main';
import { parsePath, parseBezierPath, parsePoint } from './helper';

// var setting_grid = "";
// var display_canvas;
// var display_ctx;

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
        for (let i = 0; i < xcount; i++) {
            for (let j = 0; j < ycount; j++) {
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
        for (let i = 0; i < xcount; i++) {
            ctx.moveTo(i * gridsize, 0);
            ctx.lineTo(i * gridsize, size[1]);
        }
        for (let j = 0; j < ycount; j++) {
            ctx.moveTo(0, j * gridsize);
            ctx.lineTo(size[0], j * gridsize);
        }
        ctx.stroke();
    }
}