import ToolPen from './tools/tool-pen.js'
import ToolEraser from './tools/tool-eraser.js'
import ToolLine from './tools/tool-line.js'
import ToolRect from './tools/tool-rect.js'
import ToolText from './tools/tool-text.js'
import { paper } from './paper-canvas'

// import { drawingCanvas } from './main.js'
import { dist } from './helper.js'
import ToolImage from './tools/tool-image.js'

export let tools = {
    "tool-type-pen": new ToolPen(),
    "tool-type-eraser": new ToolEraser(),
    "tool-type-marker": new ToolPen(true),
    "tool-type-line": new ToolLine(),
    "tool-type-rect": new ToolRect(),
    "tool-type-ellipse": null,
    "tool-type-text": new ToolText(),
    "tool-type-image": new ToolImage(),
    "tool-type-line-width": null
}

export let activeTool = tools["tool-type-pen"];

let ZOOM_SPEED = 0.004;
let PINCH_THRESHOLD = 50;

let touchesCache = [];
let touchesCacheBegin = [];
let viewMatrixTouchStart = new paper.Matrix();
let handleTouchType = ""

export function setActiveTool(id) {
    activeTool = tools[id];
    window.appData.rightPanel.setToolPanel(activeTool.getSettingsPanel())
}

export default function init_input(element) {
    let el = element;
    // POINTER
    el.onpointerdown = function (e) {
        // e.preventDefault();
        console.log("onpointerdown");
        let project_pt = appData.drawingCanvas.getTransformedPointer(e.offsetX, e.offsetY);
        if (e.pointerType == "touch") {
            if (touchesCache.length == 0) {
                activeTool.tooldown(project_pt.x, project_pt.y, e.pressure);
            } else {
                activeTool.toolcancel();
                viewMatrixTouchStart = new paper.Matrix(paper.view.matrix)
                // touchZoomCache = appData.drawingCanvas.getZoom();
            }
            touchesCacheBegin.push(e);
            touchesCache.push(e);
        } else {
            // let project_pt = appData.drawingCanvas.getTransformedPointer(e.offsetX, e.offsetY);
            activeTool.tooldown(project_pt.x, project_pt.y, e.pressure);
        }
    };
    function mouseOrPen(e) { return (e.pointerType == "mouse" || e.pointerType == "pen") }
    el.onpointermove = function (e) {
        // e.preventDefault()
        // console.log("onpointermove");
        if ((e.buttons == 1 && mouseOrPen(e)) || (e.pointerType == 'touch' && touchesCache.length < 2)) {
            if (!activeTool.tool_canceled) {
                let project_pt = appData.drawingCanvas.getTransformedPointer(e.offsetX, e.offsetY);
                activeTool.toolmove(project_pt.x, project_pt.y, e.pressure);
            }
        } else if (e.buttons == 4 && mouseOrPen(e)) {
            let offset = new Point(e.movementX, e.movementY)
            appData.drawingCanvas.offset(offset.divide(appData.drawingCanvas.getZoom()));
        }
        else if (touchesCache.length == 2 && e.pointerType == "touch") {
            let index = touchesCache.findIndex((el) => { return e.pointerId === el.pointerId });
            touchesCache[index] = e;
            handlePanZoom();
        }
        activeTool.toolpreviewmove(appData.drawingCanvas.getTransformedPointer(e.offsetX, e.offsetY))
    };
    el.onpointerup = function (e) {
        console.log("onpointerup");
        let project_pt = appData.drawingCanvas.getTransformedPointer(e.offsetX, e.offsetY);
        if (e.pointerType == "touch") {
            touchesCache = touchesCache.filter((cache_event) => (cache_event.pointerId !== e.pointerId));
            touchesCacheBegin = touchesCacheBegin.filter((cache_event) => (cache_event.pointerId !== e.pointerId));
            handleTouchType = "";
            if (!activeTool.tool_canceled) {
                activeTool.toolup(project_pt.x, project_pt.y, e.pressure);
            }
        } else {
            activeTool.toolup(project_pt.x, project_pt.y, e.pressure);
        }
    };

    // WHEEL
    el.onwheel = function (e) {
        e.preventDefault();
        if (e.ctrlKey) {
            // ctrl is used as the indicator for pinch gestures... (Not a fan...)
            appData.drawingCanvas.zoom(1 + e.wheelDeltaY*ZOOM_SPEED, new Point(e.offsetX, e.offsetY))
            // zoom(, 1 + e.wheelDeltaY);
        } else {
            let scroll_speed = 0.5;
            let offset = new Point(e.wheelDeltaX * scroll_speed, e.wheelDeltaY * scroll_speed);
            appData.drawingCanvas.offset(offset.divide(appData.drawingCanvas.getZoom()));
        }
    };
    
    el.addEventListener("touchstart", (e) => {
        e.preventDefault();
    }, { passive: false });
    el.addEventListener("gesturestart", (e) => {
        e.preventDefault();
    }, { passive: false });
    // el.ontouchstart = (e) => {
    //     e.preventDefault();
    // };
    // el.ontouchmove = (e) => {
    //     // e.preventDefault();
    // };
}

function handlePanZoom() {
    // Get all relevant points in the coordinate system at the start of the 2 finger interaction
    let [start1, start2, current1, current2] = getTransformedPoints(viewMatrixTouchStart)
    
    // calculate center points of touch start and current (All in the coord at the time of touch start)
    let currentCenter = current1.add(current2).multiply(0.5);
    let startCenter = start1.add(start2).multiply(0.5);

    // calculate distances for threshold test and zoom factor
    let distStart = dist(start1, start2);
    let distCurrent = dist(current1, current2);
    
    // activate both (pan&zoom) if pinch threshold is exceeded (pan is always handled)
    let pinchDistDelta = Math.abs(distStart - distCurrent) * viewMatrixTouchStart.scaling.x;
    if (handleTouchType === "" && pinchDistDelta > PINCH_THRESHOLD) {
        handleTouchType = "both"
    }
    
    // calculate offset vector (in touch start coord system)
    let offset = currentCenter.subtract(startCenter)
    let newM = new paper.Matrix(viewMatrixTouchStart)
    newM.translate(offset)
    
    // pinch zoom
    if (handleTouchType === "both") {
        // get the current center point for the scale operation in the translated newM system
        let centerInIdentitySpace = viewMatrixTouchStart.transform(currentCenter)
        let centerInNewM = newM.inverseTransform(centerInIdentitySpace)
        // calculate total zoom factor based on the distance realation between start and current
        let zoom = distCurrent / distStart;
        // apply the zoom with the correct center
        newM.scale(zoom, centerInNewM)
    }

    // apply the new matrix
    appData.drawingCanvas.setMatrix(newM)
}

function getTransformedPoints(matrix) {
    let drawC = appData.drawingCanvas
    let cx = drawC.canvas.getBoundingClientRect().x;
    let cy = drawC.canvas.getBoundingClientRect().y;
    let start1 = matrix.inverseTransform(touchesCacheBegin[0].clientX - cx, touchesCacheBegin[0].clientY - cy);
    let start2 = matrix.inverseTransform(touchesCacheBegin[1].clientX - cx, touchesCacheBegin[1].clientY - cy);
    let current1 = matrix.inverseTransform(touchesCache[0].clientX - cx, touchesCache[0].clientY - cy);
    let current2 = matrix.inverseTransform(touchesCache[1].clientX - cx, touchesCache[1].clientY - cy);
    return [start1, start2, current1, current2]
}


// following functions are DEPRECATED


// function handlePanZoomSingle() {
//     let drawC = appData.drawingCanvas
//     let cx = drawC.canvas.getBoundingClientRect().x;
//     let cy = drawC.canvas.getBoundingClientRect().y;
//     let canvasZoom = drawC.getZoom();
//     let start1 = drawC.getTransformedPointer(touchesCacheBegin[0].clientX - cx, touchesCacheBegin[0].clientY - cy);
//     let start2 = drawC.getTransformedPointer(touchesCacheBegin[1].clientX - cx, touchesCacheBegin[1].clientY - cy);
//     let current1 = drawC.getTransformedPointer(touchesCache[0].clientX - cx, touchesCache[0].clientY - cy);
//     let current2 = drawC.getTransformedPointer(touchesCache[1].clientX - cx, touchesCache[1].clientY - cy);
//     let PINCH_THRESHOLD = 100 //drawC.canvas.clientWidth / 40;
//     let PAN_THRESHOLD = 30
//     let distStart = dist(start1, start2);
//     let distCurrent = dist(current1, current2);
//     let currentCenter = current1.add(current2).multiply(0.5); //new Point((current1.x + current2.x) / 2, (current1.y + current2.y) / 2)
//     let startCenter = start1.add(start2).multiply(0.5); //[(start1.x + start2.x) / 2, (start1.y + start2.y) / 2]
//     let panDistDelta = dist(currentCenter, startCenter) * canvasZoom;
//     let pinchDistDelta = Math.abs(distStart - distCurrent) * canvasZoom;
//     // console.log("pinch Dist: ", panDistDelta)
//     // console.log("pan Dist: ", pinchDistDelta)
//     if (pinchDistDelta < PINCH_THRESHOLD && panDistDelta < PAN_THRESHOLD) {
//         return
//     }
//     if (handleTouchType == "") {
//         if (pinchDistDelta > PINCH_THRESHOLD && panDistDelta > PAN_THRESHOLD) {
//             handleTouchType = pinchDistDelta > panDistDelta ? "pinch" : "pan"
//         }
//         else if (pinchDistDelta > PINCH_THRESHOLD) {
//             handleTouchType = "pinch"
//         }
//         else if (panDistDelta > PAN_THRESHOLD) {
//             handleTouchType = "pan"
//         }
//     }
//     if (handleTouchType == "pinch") {
//         // Zoom
//         let currentZoomFactor = distCurrent / distStart;
//         // console.log("zoomFactor: ", currentZoomFactor);
//         //TODO some log or exp to make absolute zoom... Maybe not. feels just fine as it is...
//         drawC.setZoom(touchZoomCache * currentZoomFactor, startCenter);
//         touchZoomCache = distCurrent / distStart;
//     }
//     if (handleTouchType == "pan") {
//         // Pan
//         let offset = startCenter.subtract(currentCenter) //new DOMPoint(startCenter[0] - currentCenter[0], startCenter[1] - currentCenter[1]);
//         // console.log("offset: ", offset);
//         let offsetDiff = new Point(touchPanCache.x - offset.x, touchPanCache.y - offset.y);
//         touchPanCache = offset;
//         // console.log("offsetDiff: ", offsetDiff, drawC.getZoom());
//         // multipy with zoom
//         drawC.offset(offsetDiff);
//     }
// }

// function handlePanZoomSwitch() {
//     let drawC = appData.drawingCanvas
//     let cx = drawC.canvas.getBoundingClientRect().x;
//     let cy = drawC.canvas.getBoundingClientRect().y;
//     let canvasZoom = drawC.getZoom();
//     let start1 = drawC.getTransformedPointer(touchesCacheBegin[0].clientX - cx, touchesCacheBegin[0].clientY - cy);
//     let start2 = drawC.getTransformedPointer(touchesCacheBegin[1].clientX - cx, touchesCacheBegin[1].clientY - cy);
//     let current1 = drawC.getTransformedPointer(touchesCache[0].clientX - cx, touchesCache[0].clientY - cy);
//     let current2 = drawC.getTransformedPointer(touchesCache[1].clientX - cx, touchesCache[1].clientY - cy);
//     let PINCH_THRESHOLD = 10 //drawC.canvas.clientWidth / 40;
//     let PAN_THRESHOLD = 10
//     let distStart = dist(start1, start2);
//     let distCurrent = dist(current1, current2);
//     let currentCenter = current1.add(current2).multiply(0.5); //new Point((current1.x + current2.x) / 2, (current1.y + current2.y) / 2)
//     let startCenter = start1.add(start2).multiply(0.5); //[(start1.x + start2.x) / 2, (start1.y + start2.y) / 2]
//     let panDistDelta = dist(currentCenter, startCenter) * canvasZoom;
//     let pinchDistDelta = Math.abs(distStart - distCurrent) * canvasZoom;
//     // console.log("pinch Dist: ", panDistDelta)
//     // console.log("pan Dist: ", pinchDistDelta)
//     if (pinchDistDelta < PINCH_THRESHOLD && panDistDelta < PAN_THRESHOLD) {
//         return
//     }
//     handleTouchType = pinchDistDelta > panDistDelta ? "pinch" : "pan"
//     if (handleTouchType == "pinch") {
//         // Zoom
//         let currentZoomFactor = distCurrent / distStart;
//         // console.log("zoomFactor: ", currentZoomFactor);
//         //TODO some log or exp to make absolute zoom... Maybe not. feels just fine as it is...
//         drawC.setZoom(touchZoomCache * currentZoomFactor, startCenter);
//         touchZoomCache = distCurrent / distStart;
//     }
//     if (handleTouchType == "pan") {
//         // Pan
//         let offset = startCenter.subtract(currentCenter) //new DOMPoint(startCenter[0] - currentCenter[0], startCenter[1] - currentCenter[1]);
//         // console.log("offset: ", offset);
//         let offsetDiff = new Point(touchPanCache.x - offset.x, touchPanCache.y - offset.y);
//         touchPanCache = offset;
//         // console.log("offsetDiff: ", offsetDiff, drawC.getZoom());
//         // multipy with zoom
//         drawC.offset(offsetDiff);
//     }
// }
