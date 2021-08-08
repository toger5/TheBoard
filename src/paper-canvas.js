import { Point } from 'paper/dist/paper-core';
import { isBoardObjectEvent } from './backend/filter';
import { parsePath, parseBezierPath, parsePoint } from './helper';
export const paper = require('paper');
export default class PaperCanvas {
    constructor() {
        this.css_id = "paper-canvas";
        this.displayPaths = [];
        this.toolLayer = null
        this.drawLayer = null;
        this.canvas = null;
    }
    drawEvent(event, animated) {
        let drawC = appData.drawingCanvas;
        function pathV1() {
            if (event.content.objtype != "p.path") { return }
            let updateDisplay = true
            let points = parsePath(event.content.path, event.content.objpos);
            let pos = parsePoint(event.content.objpos);
            let size = parsePoint(event.content.objsize);
            let color = "objcolor" in event.content ? event.content.objcolor : "#000"
            if (animated) {
                drawC.asyncAddPathV1([pos.x, pos.y], points, color);
            } else {
                drawC.drawBoundingBox([[pos.x, pos.y], size]);
                drawC.addPathV1(points, color, [[pos.x, pos.y], size], event.event_id);
                if (updateDisplay) { drawC.updateDisplay_DEPRECATED(true); }
            }
        }
        function pathV2() {
            if (event.content.objtype != "p.path") { return }
            let segments = parseBezierPath(event.content.path, event.content.objpos);
            let strokeWidth = parseFloat(event.content.strokeWidth);
            let closed = ("closed" in event.content && event.content.closed)
            let color = "objcolor" in event.content ? event.content.objcolor : "#000"
            let fillColor = "objFillColor" in event.content ? event.content.objFillColor : "#00000000"

            if (animated) {
                drawC.asyncAddPathV2(segments, color, fillColor, strokeWidth, closed, event.event_id);
            } else {
                drawC.addPathV2(segments, color, fillColor, strokeWidth, closed, event.event_id);
            }

        }
        function pathV3() {
            for (let pathData of event.content.paths) {
                let addPathFunc = animated ? drawC.asyncAddPathV3 : drawC.addPathV3
                addPathFunc(pathData, event.event_id)
            }
        }

        function evPath() {
            if (!("version" in event.content)) {
                pathV1(); return
            }
            switch (event.content.version) {
                case 1: pathV1(); break;
                case 2: pathV2(); break;
                case 3: pathV3(); break;
            }
        }
        function evText() {
            drawC.addText(event.content, event.event_id)
        }
        function evImage() {
            drawC.addImage(event.content, event.event_id)
        }

        switch (event.content.objtype) {
            case "path":
            case "p.path":
                evPath()
                break;
            case "text": evText(); break;
            case "image": evImage(); break;
        }
    }

    activateToolLayer() {
        this.toolLayer.activate()
    }
    activateDrawLayer() {
        this.drawLayer.activate();
    }
    init() {
        // Get a reference to the canvas object
        this.canvas = document.getElementById('paper-canvas');
        // Create an empty project and a view for the canvas:
        paper.setup(this.canvas);
        paper.install(window)
        this.drawLayer = paper.project.activeLayer;
        this.toolLayer = new paper.Layer()
    }
    offset(offset_delta) {
        paper.view.center = paper.view.center.subtract(offset_delta);
    }
    resetOffset() {
        this.setOffset(new paper.Point(0, 0));
    }
    setOffset(offset) {
        paper.view.center = offset;
    }
    getZoom() {
        return paper.view.zoom;
    }
    zoom(factor, zoomOrigin) {
        if (zoomOrigin === null) {
            paper.view.scale(factor)
        } else {
            let zoomOriProj = paper.view.viewToProject(zoomOrigin);
            paper.view.scale(factor, zoomOriProj);
        }
    }
    setZoom(zoom, zoomOrigin = paper.view.center) {
        let currentViewCenter = paper.view.center;
        let zoomOriProj = paper.view.viewToProject(zoomOrigin);
        paper.view.center = zoomOriProj;
        let scale = paper.view.zoom;
        paper.view.zoom = zoom;
        paper.view.center = currentViewCenter;
    }
    resetZoom() {
        this.setZoom(1);
    }
    asyncAddPathV1() {
        console.log("WAIT WHAT???")
    }
    asyncAddPathV2(segments, color, fillColor, strokeWidth, closed = false, id = "") {
        // TODO make async animation using dash
        let p = appData.drawingCanvas.addPathV2(segments, color, fillColor, strokeWidth, closed, id);
        let length = 0;
        length = p.length;
        p.dashArray = [length, length];
        // TODO dont hardcode the speed. instead get it from the event
        // "drawSpeed": "20 50 50 20 12"
        // 20ms for the first 50 px length, 50 ms for the second px length...
        p.tween({ dashOffset: length }, { dashOffset: 0 }, 2 * length).then(() => {
            p.dashArray = []
        })
        // p.tween({ dashArray: [10, 10] }, { dashArray: [1000, 10] }, 3000);
    }
    asyncAddPathV3(pathContent, id) {
        let p = appData.drawingCanvas.addPathV3(pathContent, id);
        let l = p.length;
        p.dashArray = [l, l];
        p.tween({ dashOffset: l }, { dashOffset: 0 }, 2 * l).then(() => {
            p.dashArray = []
        })
        return p;
    }
    addPathV3(pathContent, id) {
        let segments = pathContent.segments.map((seg) => {
            let s;
            if (seg.split) { s = seg.split(" ") }
            else { s = seg }
            return new Segment(new Point(parseFloat(s[0]), parseFloat(s[1])),
                new Point(parseFloat(s[2]), parseFloat(s[3])),
                new Point(parseFloat(s[4]), parseFloat(s[5])))
        }
        );
        let p = new paper.Path(segments);
        p.strokeColor = pathContent.strokeColor;
        p.fillColor = pathContent.fillColor;
        p.strokeWidth = pathContent.strokeWidth;
        p.closed = pathContent.closed;
        p.position = p.position.add(new Point(parseFloat(pathContent.position.x), parseFloat(pathContent.position.y)))
        p.strokeCap = "round";
        if (id != "") {
            p.data.id = id
        }
        return p;
    }

    addPathV2(segments, color, fillColor, strokeWidth, closed = false, id = "") {
        let p = new paper.Path(segments);
        p.strokeColor = color;
        p.fillColor = fillColor;

        p.strokeWidth = strokeWidth;
        p.strokeCap = "round";
        p.closed = closed;
        if (id != "") {
            p.data.id = id
        }
        return p;
        // p.moveTo(new paper.Point(points[0][1], points[0][2]));
        // for (let i = 1; i < points.length; i++) {
        //     p.lineTo(new paper.Point(points[i][1], points[i][2]));
        // }
    }
    addPathV1(points, color, [pos, size], id = "") {
        let p = new paper.Path();
        p.strokeColor = color;
        p.strokeWidth = 2;
        p.strokeCap = "round";
        if (id != "") {
            p.data.id = id
        }
        p.moveTo(new paper.Point(points[0][1], points[0][2]));
        for (let i = 1; i < points.length; i++) {
            p.lineTo(new paper.Point(points[i][1], points[i][2]));
        }
    }

    addText(textContent, id) {
        let text = new PointText({
            point: [parseFloat(textContent.position.x), parseFloat(textContent.position.y)],
            content: textContent.text,
            fillColor: textContent.color,
            fontFamily: textContent.fontFamily,
            fontWeight: 'normal',
            fontSize: parseFloat(textContent.fontSize)
        });
        if (id != "") {
            text.data.id = id
        }
    }
    addImage(imageContent, id) {
        let url = imageContent.url;
        let position = new Point(parseFloat(imageContent.position.x), parseFloat(imageContent.position.y))
        let size = new Size(parseFloat(imageContent.size.width), parseFloat(imageContent.size.height))
        if (url.split(":")[0] === "mxc") {
            url = appData.matrixClient.client.mxcUrlToHttp(url)
        }
        console.log("image URL to download: ", url)
        let image = new Raster({ source: url, position: position, size: size })
        if (id != "") {
            image.data.id = id
        }
        return image
    }
    updateDisplay_DEPRECATED() {
        if (this.dispPath !== null) {
            // this.dispPath.remove();
            this.displayPaths.push(this.dispPath);
            this.dispPath = null;
        }
        // for(p of this.displayPaths){
        //     p.remove();
        // }
    }
    // TODO call this function in a moment where ne drawing animaiotn is running
    clearDisplayPaths() {
        this.displayPaths.forEach((p) => { p.remove() });
    }
    clear() {
        let length = 0;// = paper.project.activeLayer.removeChildren();
        for (let l of paper.project.layers) {
            if (l === this.toolLayer) {
                continue
            }
            length += l.removeChildren().length;
        }
        console.log("removed ", length, " items")
    }
    drawBoundingBox(box) {
        // console.log("drawBoundingBox not implemented for paper-canvas")
    }
    reload(animated = false) {
        this.clear();
        let starttime = Date.now();
        console.log("!! Paper Canvas redraw START");
        appData.objectStore.allSorted().forEach(obj => {
            if (isBoardObjectEvent(obj.type)) {
                this.drawEvent(obj, animated);
            }
        });
        console.log("!! Paper Canvas redraw DONE in", Date.now() - starttime);
    }
    getTransformedPointer(x, y) {
        return paper.view.viewToProject(new paper.Point(x, y))
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