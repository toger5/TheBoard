
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
    constructor(){
        this.type = toolType.draw;
    }
    getString(){
        return ["draw","erase","line","rect"][tool.type]
    }
}
var tool = new Tool;

function getTransformedMouse(x, y) {
    pt = new DOMPoint(x, y);
    return pt.matrixTransform(display_ctx.getTransform().inverse());
}
function over_handler(event) { }
function enter_handler(event) { }
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
            }else{
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

function cancel_handler(event) { }
function out_handler(event) { }
function leave_handler(event) { }
function gotcapture_handler(event) { }
function lostcapture_handler(event) { }

function init_input() {
    var el = document.getElementById("canvas");
    // Register pointer event handlers
    el.onpointerover = over_handler;
    el.onpointerenter = enter_handler;
    el.onpointerdown = down_handler;
    el.onpointermove = move_handler;
    el.onpointerup = up_handler;
    el.onpointercancel = cancel_handler;
    el.onpointerout = out_handler;
    el.onpointerleave = leave_handler;
    el.gotpointercapture = gotcapture_handler;
    el.lostpointercapture = lostcapture_handler;
    el.addEventListener('wheel', scroll);
    // document.addEventListener("scroll", scroll);
}

function scroll(event) {
    if (event.ctrlKey) {
        //ctrl is used as the indicator for pinch gestures... (Not a fan...)
        let zoom_speed = 0.002;
        update_canvasZoom(1 + event.wheelDeltaY * zoom_speed, event.offsetX, event.offsetY);
    } else {
        let scroll_speed = 0.5;
        update_canvasOffset([event.wheelDeltaX * scroll_speed, event.wheelDeltaY * scroll_speed]);
    }
    event.preventDefault();
}