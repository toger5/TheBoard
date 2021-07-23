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
        // e.preventDefault();
        console.log("onpointerdown");
        let project_pt = drawing_canvas.getTransformedPointer(e.offsetX, e.offsetY);
        if (e.pointerType == "touch") {
            if (touchesCache.length == 0) {
                activeTool.tooldown(project_pt.x, project_pt.y, e.pressure);
            } else {
                activeTool.toolcancel();
                touchZoomCache = drawing_canvas.getZoom();
            }
            touchesCacheBegin.push(e);
            touchesCache.push(e);
        } else {
            // let project_pt = drawing_canvas.getTransformedPointer(e.offsetX, e.offsetY);
            activeTool.tooldown(project_pt.x, project_pt.y, e.pressure);
        }
    };
    el.onpointermove = function (e) {
        // e.preventDefault()
        // console.log("onpointermove");
        if ((e.buttons == 1 && (e.pointerType == "mouse" || e.pointerType == "pen"))
            || (e.pointerType == 'touch' && touchesCache.length < 2)) {
            let project_pt = drawing_canvas.getTransformedPointer(e.offsetX, e.offsetY);
            activeTool.toolmove(project_pt.x, project_pt.y, e.pressure);
        } else if(e.buttons == 4 && (e.pointerType == "mouse" || e.pointerType == "pen")) {
            let offset = new paper.Point(e.movementX, e.movementY)
            drawing_canvas.offset(offset.divide(drawing_canvas.getZoom()));
        }
        else if (touchesCache.length == 2 && e.pointerType == "touch") {
            let index = touchesCache.findIndex((el) => { return e.pointerId === el.pointerId });
            touchesCache[index] = e;
            handlePanZoom();
        }
        activeTool.toolpreviewmove(drawing_canvas.getTransformedPointer(e.offsetX, e.offsetY))
    };
    el.onpointerup = function (e) {
        console.log("onpointerup");
        let project_pt = drawing_canvas.getTransformedPointer(e.offsetX, e.offsetY);
        if (e.pointerType == "touch") {
            touchesCache = touchesCache.filter((cache_event) => { cache_event.pointerId == e.pointerId });
            touchesCacheBegin = touchesCacheBegin.filter((cache_event) => { cache_event.pointerId == e.pointerId });
            touchPanCache = new DOMPoint(0, 0);
            handleTouchType = "";
            touchZoomCache = 0;
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
            //ctrl is used as the indicator for pinch gestures... (Not a fan...)
            zoom(e.offsetX, e.offsetY, 1 + e.wheelDeltaY);
        } else {
            let scroll_speed = 0.5;
            let offset = new paper.Point(e.wheelDeltaX * scroll_speed, e.wheelDeltaY * scroll_speed);
            drawing_canvas.offset(offset.divide(drawing_canvas.getZoom()));
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
    // el.ontouchend = (e) => {
    //     // e.preventDefault();
    // };
    el.ontouchstart = (e) => {
        e.preventDefault();
    };
    // el.ontouchmove = (e) => {
    //     // e.preventDefault();
    // };
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
var handleTouchType = ""
function handlePanZoom() {
    let cx = drawing_canvas.canvas.getBoundingClientRect().x;
    let cy = drawing_canvas.canvas.getBoundingClientRect().y;
    let canvasZoom = drawing_canvas.getZoom();
    let start1 = drawing_canvas.getTransformedPointer(touchesCacheBegin[0].clientX - cx, touchesCacheBegin[0].clientY - cy);
    let start2 = drawing_canvas.getTransformedPointer(touchesCacheBegin[1].clientX - cx, touchesCacheBegin[1].clientY - cy);
    let current1 = drawing_canvas.getTransformedPointer(touchesCache[0].clientX - cx, touchesCache[0].clientY - cy);
    let current2 = drawing_canvas.getTransformedPointer(touchesCache[1].clientX - cx, touchesCache[1].clientY - cy);
    var PINCH_THRESHOLD = 70 //drawing_canvas.canvas.clientWidth / 40;
    var PAN_THRESHOLD = 40
    var distStart = dist(start1, start2);
    var distCurrent = dist(current1, current2);
    var currentCenter = current1.add(current2).multiply(0.5); //new paper.Point((current1.x + current2.x) / 2, (current1.y + current2.y) / 2)
    var startCenter = start1.add(start2).multiply(0.5); //[(start1.x + start2.x) / 2, (start1.y + start2.y) / 2]
    var panDistDelta = dist(currentCenter, startCenter) * canvasZoom;
    var pinchDistDelta = Math.abs(distStart - distCurrent) * canvasZoom;
    // console.log("pinch Dist: ", panDistDelta)
    // console.log("pan Dist: ", pinchDistDelta)
    if (pinchDistDelta < PINCH_THRESHOLD && panDistDelta < PAN_THRESHOLD) {
        return
    }
    if (handleTouchType == "") {
        handleTouchType = pinchDistDelta > panDistDelta ? "pinch" : "pan"
    }
    if (handleTouchType == "pinch") {
        // Zoom
        var currentZoomFactor = distCurrent / distStart;
        // console.log("zoomFactor: ", currentZoomFactor);
        //TODO some log or exp to make absolute zoom... Maybe not. feels just fine as it is...
        drawing_canvas.setZoom(touchZoomCache * currentZoomFactor, startCenter);
        // touchZoomCache = distCurrent / distStart;
    }
    if (handleTouchType == "pan") {
        // Pan
        var offset = startCenter.subtract(currentCenter) //new DOMPoint(startCenter[0] - currentCenter[0], startCenter[1] - currentCenter[1]);
        // console.log("offset: ", offset);
        var offsetDiff = new paper.Point(touchPanCache.x - offset.x, touchPanCache.y - offset.y);
        touchPanCache = offset;
        // console.log("offsetDiff: ", offsetDiff, drawing_canvas.getZoom());
        // multipy with zoom
        drawing_canvas.offset(offsetDiff);
    }
}
