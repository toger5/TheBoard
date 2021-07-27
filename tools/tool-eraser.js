
class ToolEraser {
    constructor() {

        // Tool state
        this.removedElementsArray
        this.tool_canceled = false
        this.idsToDelete = []

        // Tool settings
        // this.strokeWidth = 10;
        this.strokeWidthOptions = [5, 10, 20, 40];

        // Preview
        this.previewItem = null

    }

    getStrokeWidth(){
        return this.strokeWidthOptions[GetToolStrokeWidthIndex()];
    }
    tooldown(proX, proY, pressure) {
        this.tool_canceled = false;
        this.addItemsFromPoint(new paper.Point(proX, proY))
        console.log("tooldown");
    }
    toolmove(proX, proY, pressure) {
        console.log("toolmove");
        this.addItemsFromPoint(new paper.Point(proX, proY))
    }
    addItemsFromPoint(testPoint){
        var hitOptions = {
            stroke: true,
            tolerance: this.getStrokeWidth(),
            match: function (hitRes){
                return !("markedForDeletion" in hitRes.item.data)
                    && ("id" in hitRes.item.data)
            }
        };

        var hitResult = paper.project.hitTest(testPoint, hitOptions);
        var i = 0;
        while (hitResult && i < 10) {
            if (!hitResult) { continue }
            console.log('hitResult', hitResult);
            if(objectStore.getById(hitResult.item.data.id).sender == currentUserId){
                hitResult.item.opacity = 0.5;
                hitResult.item.data.markedForDeletion = true
                this.idsToDelete.push(hitResult.item.data.id)
                hitResult = paper.project.hitTest(testPoint, hitOptions);
            }
            i++;
        }
    }
    toolup(proX, proY) {
        if (this.tool_canceled) { return; }

        // console.log("try to erase");
        // let pt = drawing_canvas.getTransformedPointer(proX, proY);
        // let sortedEvents = objectStore.allSorted();
        // var id = ""
        // let eraser_size = 70;
        // let userId = matrixClient.getUserId();
        // for (let i = sortedEvents.length - 1; i >= 0; i--) {
        //     let event = sortedEvents[i];
        //     if (event.type == "p.whiteboard.object" && event.sender == userId) {
        //         let points = parsePath(event.content.path, event.content.objpos);
        //         for (let j in points) {
        //             let p = points[j];
        //             if ((pt.x - p[1]) ** 2 + (pt.y - p[2]) ** 2 < eraser_size) {
        //                 id = event.event_id;
        //                 break;
        //             }
        //         }
        //     }
        // }
        this.toolcancel();

        console.log(this.idsToDelete)
        for(let id of this.idsToDelete){
            console.log(id)
            matrixClient.redactEvent(currentRoomId, id).then(t => {
                console.log("redacted (eraser): ", t);
            });
            this.idsToDelete = this.idsToDelete.filter((itemId)=>{return itemId == id})
            // await sleep(300);
        }
        this.idsToDelete = [];

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
            // this.previewItem.scaling = new paper.Point(this.getStrokeWidth(), this.getStrokeWidth())
            drawing_canvas.activateDrawLayer()
        }
        if (this.previewItem.bounds.size.width != 2 * this.getStrokeWidth()) {
            let w = 2 * this.getStrokeWidth() / this.previewItem.bounds.size.width
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