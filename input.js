// const toolType = {
//     draw: 0,
//     erase: 1,
//     line: 2,
//     rect: 3,
// };
// class Tool {
//     constructor() {
//         this.type = toolType.draw;
//     }
//     getString() {
//         return ["draw", "erase", "line", "rect"][tool.type]
//     }
// }
// var tool = new Tool;
var tools = {
    "tool-type-pen": new ToolPen(),
    "tool-type-eraser": new ToolEraser(),
    "tool-type-marker": new ToolPen(true),
    "tool-type-line": new ToolLine(),
    "tool-type-square": new ToolRect(),
    "tool-type-ellipse": null,
    "tool-type-text": null,
    "tool-type-line-width": null
}
var activeTool = tools["tool-type-pen"];
function over_handler(event) { }
function enter_handler(event) { }

var touchesCache = [];
var touchesCacheBegin = [];
var touchZoomCache = 0;
var touchPanCache = new DOMPoint(0, 0);

function init_input(element) {
    // var el = document.getElementById("canvas");
    var el = element;
    // POINTER
    el.onpointerdown = function (e) {
        console.log("onpointerdown");
        if (e.pointerType == "touch") {
            if (touchesCache.length == 0) {
                activeTool.tooldown(e.offsetX, e.offsetY, e.pressure);
            } else {
                activeTool.toolcancel();
                touchZoomCache = get_canvasZoom();
            }
            touchesCacheBegin.push(e);
            touchesCache.push(e);
        } else {
            let project_pt = drawing_canvas.getTransformedPointer(e.offsetX, e.offsetY);
            activeTool.tooldown(project_pt.x, project_pt.y, e.pressure);
        }
    };
    el.onpointermove = function (e) {
        console.log("onpointermove");
        if (e.buttons == 1 && touchesCache.length < 2) {
            let project_pt = drawing_canvas.getTransformedPointer(e.offsetX, e.offsetY);
            activeTool.toolmove(project_pt.x, project_pt.y, e.pressure);
        } else if (touchesCache.length == 2 && e.pointerType == "touch") {
            console.log("e.offsetX", e.offsetX);
            let index = touchesCache.findIndex((el) => { return e.pointerId === el.pointerId });
            touchesCache[index] = e;
            handlePanZoom();
        } else if (e.buttons == 0){
            // the mouse just moves around...
            
        }
        activeTool.toolpreviewmove(drawing_canvas.getTransformedPointer(e.offsetX, e.offsetY))
    };
    el.onpointerup = function (e) {
        console.log("onpointerup");
        if (e.pointerType == "touch") {
            touchesCache = touchesCache.filter((cache_event) => { cache_event.pointerId == e.pointerId });
            touchesCacheBegin = touchesCacheBegin.filter((cache_event) => { cache_event.pointerId == e.pointerId });
            touchPanCache = new DOMPoint(0, 0);
        }
        let project_pt = drawing_canvas.getTransformedPointer(e.offsetX, e.offsetY);
        activeTool.toolup(project_pt.x, project_pt.y, e.pressure);
    };

    // WHEEL
    el.onwheel = function (e) {
        e.preventDefault();
        if (e.ctrlKey) {
            //ctrl is used as the indicator for pinch gestures... (Not a fan...)
            zoom(e.offsetX, e.offsetY, 1 + e.wheelDeltaY);
        } else {
            let scroll_speed = 0.5;
            drawing_canvas.offset(new paper.Point(e.wheelDeltaX * scroll_speed, e.wheelDeltaY * scroll_speed));
        }
    };
    // unused
    el.onpointerover = over_handler;
    el.onpointerenter = enter_handler;
    // el.onpointercancel = cancel_handler;
    // el.onpointerout = out_handler;
    // el.onpointerleave = leave_handler;
    // el.gotpointercapture = gotcapture_handler;
    // el.lostpointercapture = lostcapture_handler;
}


function scroll(deltaX, deltaY) {
    let scroll_speed = 0.5;
    drawing_canvas.offset(new paper.Point(deltaX * scroll_speed, deltaY * scroll_speed));
}
function zoom(offsetX, offsetY, factor) {
    let zoom_speed = 0.004;
    drawing_canvas.zoom(1 + factor * zoom_speed, new paper.Point(offsetX, offsetY));
}
var touchZoomCache = 0;
var touchPanCache = new DOMPoint(0, 0);
function handlePanZoom() {
    let cx = display_canvas.getBoundingClientRect().x;
    let cy = display_canvas.getBoundingClientRect().y;
    console.log("begin offset:", touchesCacheBegin[0].offsetX)
    let start1 = drawing_canvas.getTransformedPointer(touchesCacheBegin[0].clientX - cx, touchesCacheBegin[0].clientY - cy);
    let start2 = drawing_canvas.getTransformedPointer(touchesCacheBegin[1].clientX - cx, touchesCacheBegin[1].clientY - cy);
    let current1 = drawing_canvas.getTransformedPointer(touchesCache[0].clientX - cx, touchesCache[0].clientY - cy);
    let current2 = drawing_canvas.getTransformedPointer(touchesCache[1].clientX - cx, touchesCache[1].clientY - cy);
    // console.log("start1: ",start1);
    // console.log("start2: ",start2);
    // console.log("current1: ",current1);
    // console.log("current2: ",current2);
    var PINCH_THRESHOLD = display_canvas.clientWidth / 40;
    if (dist(start1, current1) >= PINCH_THRESHOLD || dist(start2, current2) >= PINCH_THRESHOLD) {
        var currentCenter = [(current1.x + current2.x) / 2, (current1.y + current2.y) / 2]
        var startCenter = [(start1.x + start2.x) / 2, (start1.y + start2.y) / 2]
        var offset = new DOMPoint(startCenter[0] - currentCenter[0], startCenter[1] - currentCenter[1]);
        // console.log("offset: ", offset);
        var offsetDiff = new DOMPoint(touchPanCache.x - offset.x, touchPanCache.y - offset.y);
        touchPanCache = offset;
        console.log("offsetDiff: ", offsetDiff.x, offsetDiff.y);
        drawing_canvas.offset(new paper.Point(offsetDiff.x, offsetDiff.y));

        var distStart = dist(start1, start2);
        var distCurrent = dist(current1, current2);
        var currentZoomFactor = distCurrent / distStart;
        console.log("zoomFactor: ", currentZoomFactor);
        //TODO some log or exp to make absolute zoom...
        drawing_canvas.setZoom(touchZoomCache * currentZoomFactor, new paper.Point(currentCenter[0], currentCenter[1]));
        // touchZoomCache = distCurrent / distStart;
    }
}
