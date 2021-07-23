
class ToolEraser {
    constructor() {

        // Tool state
        this.removedElementsArray
        this.tool_canceled = false

        // Tool settings
        this.strokeWidth = 10;
        this.strokeWidthOptions = [5, 10, 20, 40];

        // Preview
        this.previewItem = null
    }

    tooldown(offsetX, offsetY, pressure) {
        this.tool_canceled = false;

        // let pt = drawing_canvas.getTransformedPointer(offsetX, offsetY);
        // mouse_path_start_time = Date.now();
        // last_pos = [0, pt.x, pt.y, pressure];
        // mouse_path = [[0, pt.x, pt.y, pressure * 4]];

        console.log("tooldown");
    }
    toolmove(offsetX, offsetY, pressure) {
        console.log("toolmove");

    }
    toolup(offsetX, offsetY) {
        if (this.tool_canceled) { return; }

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
                for (let j in points) {
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

        this.toolcancel();
    }
    toolcancel() {
        console.log("CANCEL");
        this.tool_canceled = true;

    }
    toolpreviewmove(pos) {
        if (this.previewItem === null) {
            drawing_canvas.activateToolLayer()
            this.previewItem = new paper.Path.Circle(new paper.Point(0, 0), 1);
            this.previewItem.fillColor = '#00000000'
            this.previewItem.strokeWidth = 1
            this.previewItem.strokeColor = '#999'
            this.previewItem.dashArray = [3, 3]
            this.previewItem.strokeCap = 'round'
            // this.previewItem.applyMatrix = false
            this.previewItem.scaling = new paper.Point(this.strokeWidth, this.strokeWidth)
            drawing_canvas.activateDrawLayer()
        }
        if (this.previewItem.bounds.size.width != this.strokeWidth) {
            let w = this.strokeWidth / this.previewItem.bounds.size.width
            this.previewItem.scaling = new paper.Point(w, w)
        }
        this.previewItem.position = pos;
    }
    activate() {
        if (this.previewItem) {
            this.previewItem.visible = true
        }
    }
    deactivate() {
        this.previewItem.visible = false
    }
}