
// Handle input:
let mouse_path = [];
let mouse_path_last_time = Date.now();
let last_pos = []
let tool_canceled = false;
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

function over_handler(event) { }
function enter_handler(event) { }

function tooldown(offsetX, offsetY, pressure) {
    tool_canceled = false;
    switch (tool.type) {
        case toolType.draw:
            let pt = drawing_canvas.getTransformedPointer(offsetX, offsetY);
            mouse_path_start_time = Date.now();
            last_pos = [0, pt.x, pt.y, pressure];
            mouse_path = [[0, pt.x, pt.y, pressure * 4]];
            break;
        case toolType.erase:
            // let pt = getTransformedPointer(event.offsetX, event.offsetY);
            break;
    }

    console.log("tooldown");
}
function toolmove(offsetX, offsetY, pressure) {
    console.log("toolmove");
    switch (tool.type) {
        case toolType.draw:
            if (mouse_path.length == 0) {
                break;
            }
            // no pressure for now
            pressure = 1;
            let x = offsetX;
            let y = offsetY;
            time_delta = Math.min(80, Date.now() - mouse_path_last_time);
            let thickness_factor = 1
            mouse_path_last_time = Date.now();
            let current_pos = [time_delta, x, y, (pressure * 2 + Math.min(3, Math.max(0.0, thickness_factor)))];
            let dist = (current_pos[1] - last_pos[1]) ** 2 + (current_pos[2] - last_pos[2]) ** 2

            // let velocity = dist / Math.max(1, time_delta);
            // let thickness_factor = 1.5 - velocity / 8.0;
            // todo fix pressure
            mouse_path.push(current_pos);
            drawing_canvas.drawSegmentDisplay([last_pos, current_pos], pickr.getColor().toHEXA().toString());
            last_pos = current_pos;
            break;
        case toolType.erase: break;
    }
}
function toolcancel() {
    console.log("CANCEL");
    switch (tool.type) {
        case toolType.draw:
            mouse_path = [];
            mouse_path_last_time = Date.now();
            last_pos = []
            tool_canceled = true;
            break;
        case toolType.erase: break;
    }
}

function toolup(offsetX, offsetY) {
    if (tool_canceled) { return; }
    switch (tool.type) {
        case toolType.draw:
            if (objectStore.hasRoom(currentRoomId)) {
                // let before = mouse_path.length;
                // console.log("pointsBefore: ",mouse_path.length);
                // let simplePoints = simplify(mouse_path.map((p)=>{return {x:p[1],y:p[2]}}),1,false);
                // mouse_path = simplePoints.map((el)=>{return [30,el.x,el.y,mouse_path[0][3]]});
                // console.log("pointsAfter : ",mouse_path.length,"---",100*mouse_path.length/before,"%");
                let [corrected_mouse_path, pos, size] = pathPosSizeCorrection(mouse_path);
                let string_path;
                let version;
                if (drawing_canvas instanceof UnlimitedCanvas) {
                    string_path = mousePathToString(corrected_mouse_path);
                    version = 1;
                }
                else if (drawing_canvas instanceof PaperCanvas) {
                    let paper_mouse_path = new paper.Path(corrected_mouse_path.map((s) => { return [s[1], s[2]] }));
                    paper_mouse_path.simplify();
                    string_path = paperPathToString(paper_mouse_path);
                    version = 2;
                }
                sendPath(matrixClient, currentRoomId,
                    string_path,
                    pickr.getColor().toHEXA().toString(), pos, size, version);
            } else {
                console.log("NO ROOM SELECTED TO DRAW IN!")
                drawing_canvas.updateDisplay();
            }
            console.log("stop pressing");
            break;
        case toolType.erase:
            console.log("try to erase");
            let pt = drawing_canvas.getTransformedPointer(offsetX, offsetY);
            let sortedEvents = objectStore.allSorted();
            var id = ""
            let eraser_size = 70;
            let userId = matrixClient.getUserId();
            for (let i = sortedEvents.length - 1; i >= 0; i--) {
                let event = sortedEvents[i];
                if (event.type == "p.whiteboard.object" && event.sender == userId) {
                    let points = parsePath(event.content.path, event.content.objpos);
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
    // drawing_canvas.offset(new paper.Point(event.wheelDeltaX * scroll_speed, event.wheelDeltaY * scroll_speed));
    drawing_canvas.offset(new paper.Point(deltaX * scroll_speed, deltaY * scroll_speed));
}
function zoom(offsetX, offsetY, factor) {
    let zoom_speed = 0.002;
    // update_canvasZoom(1 + event.wheelDeltaY * zoom_speed, event.offsetX, event.offsetY);
    drawing_canvas.zoom(1 + factor * zoom_speed, new paper.Point(offsetX, offsetY));
}
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
                tooldown(e.offsetX, e.offsetY, e.pressure);
            } else {
                toolcancel();
                touchZoomCache = get_canvasZoom();
            }
            touchesCacheBegin.push(e);
            touchesCache.push(e);
        } else {
            tooldown(e.offsetX, e.offsetY, e.pressure);
        }
    };
    el.onpointermove = function (e) {
        console.log("onpointermove");
        // console.log("buttons: ", e.buttons);
        if (e.buttons == 1 && touchesCache.length < 2) {
            let pt = drawing_canvas.getTransformedPointer(e.offsetX, e.offsetY);
            toolmove(pt.x, pt.y, e.pressure);
        } else if (touchesCache.length == 2 && e.pointerType == "touch") {
            console.log("e.offsetX", e.offsetX);
            let index = touchesCache.findIndex((el) => { return e.pointerId === el.pointerId });
            touchesCache[index] = e;
            handlePanZoom();
        }
    };
    el.onpointerup = function (e) {
        console.log("onpointerup");
        if (e.pointerType == "touch") {
            touchesCache = touchesCache.filter((cache_event) => { cache_event.pointerId == e.pointerId });
            touchesCacheBegin = touchesCacheBegin.filter((cache_event) => { cache_event.pointerId == e.pointerId });
            touchPanCache = new DOMPoint(0, 0);
        }
        toolup(e.offsetX, e.offsetY, e.pressure);
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






















// function down_handler(event) {
//     switch (tool.type) {
//         case toolType.draw:
//             let pt = getTransformedPointer(event.offsetX, event.offsetY);
//             mouse_path_start_time = Date.now();
//             mouse_path = "";
//             last_pos = [0, pt.x, pt.y, event.pressure];
//             mouse_path += 0 + " " + pt.x + " " + pt.y + " " + event.pressure * 4 + " ";
//             break;
//         case toolType.erase:
//             // let pt = getTransformedPointer(event.offsetX, event.offsetY);
//             break;
//     }

//     console.log("start pressing");
// }
// function move_handler(event) {
//     switch (tool.type) {
//         case toolType.draw:
//             if (event.buttons > 0) {
//                 let pt = getTransformedPointer(event.offsetX, event.offsetY);
//                 let x = pt.x;
//                 let y = pt.y;
//                 let current_pos = [0, x, y, event.pressure];
//                 // console.log(pickr.getColor().toHEXA().toString());
//                 drawSegmentDisplay([last_pos, current_pos], pickr.getColor().toHEXA().toString());
//                 let dist = (current_pos[0] - last_pos[0]) ** 2 + (current_pos[1] - last_pos[1]) ** 2
//                 last_pos = current_pos;

//                 time_delta = Math.min(80, Date.now() - mouse_path_last_time);
//                 // let velocity = dist / Math.max(1, time_delta);
//                 // let thickness_factor = 1.5 - velocity / 8.0;
//                 let thickness_factor = 1
//                 mouse_path_last_time = Date.now();
//                 mouse_path += time_delta + " " + x + " " + y + " " + (event.pressure * 4 + Math.min(3, Math.max(0.0, thickness_factor))) + " ";
//             }
//             break;
//         case toolType.erase: break;
//     }
// }
// function up_handler(event) {
//     switch (tool.type) {
//         case toolType.draw:
//             if (objectStore.hasRoom(currentRoomId)) {
//                 sendPath(matrixClient, currentRoomId, mouse_path, pickr.getColor().toHEXA().toString(), [0, 0]);
//             } else {
//                 console.log("NO ROOM SELECTED TO DRAW IN!")
//                 updateDisplayCanvas();
//             }
//             console.log("stop pressing");
//             break;
//         case toolType.erase:
//             console.log("try to erase");
//             let pt = getTransformedPointer(event.offsetX, event.offsetY);
//             let sortedEvents = objectStore.allSorted();
//             var id = ""
//             let eraser_size = 70;
//             let userId = matrixClient.getUserId();
//             for (let i = sortedEvents.length - 1; i >= 0; i--) {
//                 let event = sortedEvents[i];
//                 if (event.type == "p.whiteboard.object" && event.sender == userId) {
//                     let points = pathStringToArray(event.content.path, event.content.objpos);
//                     for (j in points) {
//                         let p = points[j];
//                         if ((pt.x - p[1]) ** 2 + (pt.y - p[2]) ** 2 < eraser_size) {
//                             id = event.event_id;
//                             break;
//                         }
//                     }
//                 }
//             }
//             matrixClient.redactEvent(currentRoomId, id).then(t => {
//                 console.log("redacted (eraser): ", t);
//             });
//             break;
//     }

// }