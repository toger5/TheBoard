
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

function getTransformedMouse(x, y) {
    pt = new DOMPoint(x, y);
    return pt.matrixTransform(display_ctx.getTransform().inverse());
}
function over_handler(event) { }
function enter_handler(event) { }

function tooldown(offsetX, offsetY, pressure) {
    switch (tool.type) {
        case toolType.draw:
            let pt = getTransformedMouse(offsetX, offsetY);
            mouse_path_start_time = Date.now();
            mouse_path = "";
            last_pos = [0, pt.x, pt.y, pressure];
            mouse_path += 0 + " " + pt.x + " " + pt.y + " " + pressure * 4 + " ";
            break;
        case toolType.erase:
            // let pt = getTransformedMouse(event.offsetX, event.offsetY);
            break;
    }

    console.log("start pressing");
}
function toolmove(offsetX, offsetY, pressure) {
    switch (tool.type) {
        case toolType.draw:
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
            let pt = getTransformedMouse(offsetX, offsetY);
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

function init_input() {
    var el = document.getElementById("canvas");
    // TOUCH
    el.ontouchstart = function (e) {
        e.preventDefault();
        console.log("touchstart")
        if (e.touches.length == 1) {
            tooldown();
        }
        if (e.touches.length == 2) {
            if (ev.targetTouches.length == 2) {
                for (var i = 0; i < ev.targetTouches.length; i++) {
                    touchPointCache.push(ev.targetTouches[i]);
                }
            }
            // handlePinchZoom(e);
        }
        tooldown();
    };
    el.ontouchend = function (e) {
        console.log("ontouchend");
        e.preventDefault();
        // if (e.touches.length == 1) {
        //     toolup();
        // }
        if (e.touches.length == 2) {
            handlePinchZoom(e);
        }
    };
    el.ontouchmove = function (e) {
        console.log("ontouchmove", e.touches);
        e.preventDefault();
        // if (e.touches.length == 1) {
        //     toolmove(e.clientX, e.clientX, e.pressure);
        // }
        if (e.touches.length == 2) {
            handlePinchZoom(e);
        }
    };

    // POINTER
    el.onpointerdown = function (e) { 
        console.log("onpointerdown");
        tooldown(e.offsetX, e.offsetY, e.pressure); 
    };
    el.onpointermove = function (e) {
        console.log("onpointermove");
        if (e.buttons > 0) {
            let pt = getTransformedMouse(e.offsetX, e.offsetY);
            toolmove(pt.x, pt.y, e.pressure);
        }
    };
    el.onpointerup = function (e) { 
        console.log("onpointerup");
        toolup(e.offsetX, e.offsetY, e.pressure); 
    };
    
    // WHEEL
    el.onwheel = function (e) {
        if (e.ctrlKey) {
            //ctrl is used as the indicator for pinch gestures... (Not a fan...)
            zoom(factor);
        } else {
            let scroll_speed = 0.5;
            update_canvasOffset([e.wheelDeltaX * scroll_speed, e.wheelDeltaY * scroll_speed]);
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
var touchPointCache = [];
var touchZoomCache = 0;
var touchPanCache = new DOMPoint(0, 0);
function handlePinchZoom(e) {

    if (ev.targetTouches.length == 2 && ev.changedTouches.length == 2) {
        // Check if the two target touches are the same ones that started
        // the 2-touch
        var point1 = -1, point2 = -1;
        for (var i = 0; i < tpCache.length; i++) {
            if (touchPointCache[i].identifier == ev.targetTouches[0].identifier) point1 = i;
            if (touchPointCache[i].identifier == ev.targetTouches[1].identifier) point2 = i;
        }
        if (point1 >= 0 && point2 >= 0) {
            // Calculate the difference between the start and move coordinates
            var diff1X = Math.abs(touchPointCache[point1].clientX - ev.targetTouches[0].clientX);
            var diff2X = Math.abs(touchPointCache[point2].clientX - ev.targetTouches[1].clientX);
            var diff1Y = Math.abs(touchPointCache[point1].clientY - ev.targetTouches[0].clientY);
            var diff2Y = Math.abs(touchPointCache[point2].clientY - ev.targetTouches[1].clientY);

            var start1 = DOMPoint(touchPointCache[point1].clientX, touchPointCache[point1].clientY);
            var start2 = DOMPoint(touchPointCache[point2].clientX, touchPointCache[point2].clientY);
            var current1 = DOMPoint(ev.targetTouches[0].clientX, ev.targetTouches[0].clientY);
            var current2 = DOMPoint(ev.targetTouches[1].clientX, ev.targetTouches[1].clientY);
            // This threshold is device dependent as well as application specific
            var PINCH_THRESHOLD = ev.target.clientWidth / 10;
            if (diff1X ** 2 + diff1Y ** 2 >= PINCH_THRESHOLD ** 2 && diff1X ** 2 + diff1Y ** 2 >= PINCH_THRESHOLD ** 2) {
                var offset = new DOMPoint(0.5 * (diff1X + diff2X), 0.5 * (diff1Y + diff2Y));
                var offsetDiff = offset - touchPanCache;
                touchPanCache = offset;
                update_canvasOffset(offsetDiff.x, offsetDiff.y);

                var distStart = dist(start1, start2);
                var distCurrent = dist(current1, current2);
                var currentZoomFactor = distCurrent / distStart;
                //TODO some log or exp to make absolute zoom...
                update_canvasZoom(currentZoomFactor - touchZoomCache);
                touchZoomCache = distCurrent / distStart;
            }
        }
        else {
            // empty tpCache
            tpCache = new Array();
        }
    }
}






















function down_handler(event) {
    switch (tool.type) {
        case toolType.draw:
            let pt = getTransformedMouse(event.offsetX, event.offsetY);
            mouse_path_start_time = Date.now();
            mouse_path = "";
            last_pos = [0, pt.x, pt.y, event.pressure];
            mouse_path += 0 + " " + pt.x + " " + pt.y + " " + event.pressure * 4 + " ";
            break;
        case toolType.erase:
            // let pt = getTransformedMouse(event.offsetX, event.offsetY);
            break;
    }

    console.log("start pressing");
}
function move_handler(event) {
    switch (tool.type) {
        case toolType.draw:
            if (event.buttons > 0) {
                let pt = getTransformedMouse(event.offsetX, event.offsetY);
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
            let pt = getTransformedMouse(event.offsetX, event.offsetY);
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