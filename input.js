
// Handle input:
let mouse_path = "";
let mouse_path_last_time = Date.now();
let last_pos = []
const toolType = {
    draw: 0,
    erase: 1,
    line: 2,
    rect: 3,
};
class Tool {
    constructor() {
        this.type = toolType.draw;
    }
    getString() {
        return ["draw", "erase", "line", "rect"][tool.type]
    }
}
var tool = new Tool;

function getTransformedPointer(x, y) {
    pt = new DOMPoint(x, y);
    return pt.matrixTransform(display_ctx.getTransform().inverse());
}
function over_handler(event) { }
function enter_handler(event) { }

function tooldown(offsetX, offsetY, pressure) {
    switch (tool.type) {
        case toolType.draw:
            let pt = getTransformedPointer(offsetX, offsetY);
            mouse_path_start_time = Date.now();
            mouse_path = "";
            last_pos = [0, pt.x, pt.y, pressure];
            mouse_path += 0 + " " + pt.x + " " + pt.y + " " + pressure * 4 + " ";
            break;
        case toolType.erase:
            // let pt = getTransformedPointer(event.offsetX, event.offsetY);
            break;
    }

    console.log("tooldown");
}
function toolmove(offsetX, offsetY, pressure) {
    switch (tool.type) {
        case toolType.draw:
            if (mouse_path == "") {
                break;
            }
            let x = offsetX;
            let y = offsetY;
            let current_pos = [0, x, y, pressure];
            drawSegmentDisplay([last_pos, current_pos], pickr.getColor().toHEXA().toString());
            let dist = (current_pos[0] - last_pos[0]) ** 2 + (current_pos[1] - last_pos[1]) ** 2
            last_pos = current_pos;

            time_delta = Math.min(80, Date.now() - mouse_path_last_time);
            // let velocity = dist / Math.max(1, time_delta);
            // let thickness_factor = 1.5 - velocity / 8.0;
            let thickness_factor = 1
            mouse_path_last_time = Date.now();
            mouse_path += time_delta + " " + x + " " + y + " " + (pressure * 4 + Math.min(3, Math.max(0.0, thickness_factor))) + " ";
            break;
        case toolType.erase: break;
    }
}
function toolcancel() {
    switch (tool.type) {
        case toolType.draw:
            mouse_path = "";
            mouse_path_last_time = Date.now();
            last_pos = []
            break;
        case toolType.erase: break;
    }
}

function toolup(offsetX, offsetY) {
    switch (tool.type) {
        case toolType.draw:
            if (objectStore.hasRoom(currentRoomId)) {
                sendPath(matrixClient, currentRoomId, mouse_path, pickr.getColor().toHEXA().toString(), [0, 0]);
            } else {
                console.log("NO ROOM SELECTED TO DRAW IN!")
                updateDisplayCanvas();
            }
            console.log("stop pressing");
            break;
        case toolType.erase:
            console.log("try to erase");
            let pt = getTransformedPointer(offsetX, offsetY);
            let sortedEvents = objectStore.allSorted();
            var id = ""
            let eraser_size = 70;
            let userId = matrixClient.getUserId();
            for (let i = sortedEvents.length - 1; i >= 0; i--) {
                let event = sortedEvents[i];
                if (event.type == "p.whiteboard.object" && event.sender == userId) {
                    let points = pathStringToArray(event.content.path, event.content.objpos);
                    for (j in points) {
                        let p = points[j];
                        if ((pt.x - p[1]) ** 2 + (pt.y - p[2]) ** 2 < eraser_size) {
                            id = event.event_id;
                            break;
                        }
                    }
                }
            }
            matrixClient.redactEvent(currentRoomId, id).then(t => {
                console.log("redacted (eraser): ", t);
            });
            break;
    }
    toolcancel();
}
function scroll(deltaX, deltaY) {
    let scroll_speed = 0.5;
    // update_canvasOffset([event.wheelDeltaX * scroll_speed, event.wheelDeltaY * scroll_speed]);
    update_canvasOffset([deltaX * scroll_speed, deltaY * scroll_speed]);
}
function zoom(offsetX, offsetY, factor) {
    let zoom_speed = 0.002;
    // update_canvasZoom(1 + event.wheelDeltaY * zoom_speed, event.offsetX, event.offsetY);
    update_canvasZoom(1 + factor * zoom_speed, offsetX, offsetY);
}
var touchesCache = [];
var touchesCacheBegin = [];
var touchZoomCache = 0;
var touchPanCache = new DOMPoint(0, 0);
function init_input() {
    var el = document.getElementById("canvas");

    // POINTER
    el.onpointerdown = function (e) {
        console.log("onpointerdown");
        if (e.pointerType == "touch") {
            touchesCacheBegin.push(e);
            touchesCache.push(e);
            if (touchesCache.length > 1) {
                toolcancel();
            } else {
                tooldown();
            }
        } else {
            tooldown(e.offsetX, e.offsetY, e.pressure);
        }
    };
    el.onpointermove = function (e) {
        console.log("onpointermove");
        if (e.buttons == 0 || touchesCache.length < 2) {
            let pt = getTransformedPointer(e.offsetX, e.offsetY);
            toolmove(pt.x, pt.y, e.pressure);
        } else if (touchesCache.length == 2 && e.pointerType == "touch") {
            let index = touchesCache.findIndex((el) => { e.pointerId === el.pointerId });
            touchesCache[index] = e;
            handlePanZoom();
        }
    };
    el.onpointerup = function (e) {
        console.log("onpointerup");
        if (e.pointerType == "touch") {
            touchesCache = touchesCache.filter((cache_event) => { cache_event.pointerId == e.pointerId });
        }
        toolup(e.offsetX, e.offsetY, e.pressure);
    };

    // WHEEL
    el.onwheel = function (e) {
        e.preventDefault();
        if (e.ctrlKey) {
            //ctrl is used as the indicator for pinch gestures... (Not a fan...)
            zoom(e.offsetX,e.offsetY,1+e.wheelDeltaY);
        } else {
            let scroll_speed = 0.5;
            update_canvasOffset([e.wheelDeltaX * scroll_speed, e.wheelDeltaY * scroll_speed]);
        }
    };
    // TOUCH
    // el.ontouchstart = function (e) {
    //     e.preventDefault();
    //     console.log("touchstart")
    //     if (e.touches.length == 1) {
    //         tooldown();
    //     }
    //     if (e.touches.length == 2) {
    //         if (ev.targetTouches.length == 2) {
    //             for (var i = 0; i < ev.targetTouches.length; i++) {
    //                 touchPointCache.push(ev.targetTouches[i]);
    //             }
    //         }
    //         // handlePinchZoom(e);
    //     }
    //     tooldown();
    // };
    // el.ontouchend = function (e) {
    //     console.log("ontouchend");
    //     e.preventDefault();
    //     // if (e.touches.length == 1) {
    //     //     toolup();
    //     // }
    //     if (e.touches.length == 2) {
    //         handlePinchZoom(e);
    //     }
    // };
    // el.ontouchmove = function (e) {
    //     console.log("ontouchmove", e.touches);
    //     e.preventDefault();
    //     // if (e.touches.length == 1) {
    //     //     toolmove(e.clientX, e.clientX, e.pressure);
    //     // }
    //     if (e.touches.length == 2) {
    //         handlePinchZoom(e);
    //     }
    // };
    // unused
    el.onpointerover = over_handler;
    el.onpointerenter = enter_handler;
    // el.onpointercancel = cancel_handler;
    // el.onpointerout = out_handler;
    // el.onpointerleave = leave_handler;
    // el.gotpointercapture = gotcapture_handler;
    // el.lostpointercapture = lostcapture_handler;
}
// var touchPointCache = [];
var touchZoomCache = 0;
var touchPanCache = new DOMPoint(0, 0);
function handlePanZoom() {
    let start1 = getTransformedPointer(touchesCacheBegin[0].offsetX, touchesCacheBegin[0].offsetY);
    let start2 = getTransformedPointer(touchesCacheBegin[1].offsetX, touchesCacheBegin[1].offsetY);
    let current1 = getTransformedPointer(touchesCache[0].offsetX, touchesCache[0].offsetY);
    let current2 = getTransformedPointer(touchesCache[1].offsetX, touchesCache[1].offsetY);
    var PINCH_THRESHOLD = ev.target.clientWidth / 10;
    if (dist(start1, current1) >= PINCH_THRESHOLD || dist(start2, current2) >= PINCH_THRESHOLD) {
        var offset = new DOMPoint(0.5 * (diff1X + diff2X), 0.5 * (diff1Y + diff2Y));
        var offsetDiff = offset - touchPanCache;
        touchPanCache = offset;
        update_canvasOffset(offsetDiff.x, offsetDiff.y);

        var distStart = dist(start1, start2);
        var distCurrent = dist(current1, current2);
        var currentZoomFactor = distCurrent / distStart;
        //TODO some log or exp to make absolute zoom...
        var startCenter = [(start1.x + start2.x) / 2, (start1.y + start2.y) / 2]
        update_canvasZoom(currentZoomFactor - touchZoomCache, startCenter[0], startCenter[1]);
        touchZoomCache = distCurrent / distStart;
    }
}






















function down_handler(event) {
    switch (tool.type) {
        case toolType.draw:
            let pt = getTransformedPointer(event.offsetX, event.offsetY);
            mouse_path_start_time = Date.now();
            mouse_path = "";
            last_pos = [0, pt.x, pt.y, event.pressure];
            mouse_path += 0 + " " + pt.x + " " + pt.y + " " + event.pressure * 4 + " ";
            break;
        case toolType.erase:
            // let pt = getTransformedPointer(event.offsetX, event.offsetY);
            break;
    }

    console.log("start pressing");
}
function move_handler(event) {
    switch (tool.type) {
        case toolType.draw:
            if (event.buttons > 0) {
                let pt = getTransformedPointer(event.offsetX, event.offsetY);
                let x = pt.x;
                let y = pt.y;
                let current_pos = [0, x, y, event.pressure];
                // console.log(pickr.getColor().toHEXA().toString());
                drawSegmentDisplay([last_pos, current_pos], pickr.getColor().toHEXA().toString());
                let dist = (current_pos[0] - last_pos[0]) ** 2 + (current_pos[1] - last_pos[1]) ** 2
                last_pos = current_pos;

                time_delta = Math.min(80, Date.now() - mouse_path_last_time);
                // let velocity = dist / Math.max(1, time_delta);
                // let thickness_factor = 1.5 - velocity / 8.0;
                let thickness_factor = 1
                mouse_path_last_time = Date.now();
                mouse_path += time_delta + " " + x + " " + y + " " + (event.pressure * 4 + Math.min(3, Math.max(0.0, thickness_factor))) + " ";
            }
            break;
        case toolType.erase: break;
    }
}
function up_handler(event) {
    switch (tool.type) {
        case toolType.draw:
            if (objectStore.hasRoom(currentRoomId)) {
                sendPath(matrixClient, currentRoomId, mouse_path, pickr.getColor().toHEXA().toString(), [0, 0]);
            } else {
                console.log("NO ROOM SELECTED TO DRAW IN!")
                updateDisplayCanvas();
            }
            console.log("stop pressing");
            break;
        case toolType.erase:
            console.log("try to erase");
            let pt = getTransformedPointer(event.offsetX, event.offsetY);
            let sortedEvents = objectStore.allSorted();
            var id = ""
            let eraser_size = 70;
            let userId = matrixClient.getUserId();
            for (let i = sortedEvents.length - 1; i >= 0; i--) {
                let event = sortedEvents[i];
                if (event.type == "p.whiteboard.object" && event.sender == userId) {
                    let points = pathStringToArray(event.content.path, event.content.objpos);
                    for (j in points) {
                        let p = points[j];
                        if ((pt.x - p[1]) ** 2 + (pt.y - p[2]) ** 2 < eraser_size) {
                            id = event.event_id;
                            break;
                        }
                    }
                }
            }
            matrixClient.redactEvent(currentRoomId, id).then(t => {
                console.log("redacted (eraser): ", t);
            });
            break;
    }

}