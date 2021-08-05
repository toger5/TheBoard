// import {  } from "../drawing";
// import { objectStore } from '../main'
// import { sleep } from './paper-canvas';
import { GetToolStrokeWidthIndex } from "./line-style-selector";
import { mousePathToString, paperPathToString, pathPosSizeCorrection, setAlpha } from "../helper";


export default class ToolEraser {
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

    getStrokeWidth() {
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
    addItemsFromPoint(testPoint) {
        let hitOptions = {
            stroke: true,
            fill: true,
            tolerance: this.getStrokeWidth(),
            match: function (hitRes) {
                return !("markedForDeletion" in hitRes.item.data)
                    && ("id" in hitRes.item.data)
            }
        };

        let hitResult = paper.project.hitTest(testPoint, hitOptions);
        let i = 0;
        while (hitResult && i < 10) {
            if (!hitResult) { continue }
            console.log('hitResult', hitResult);
            if (appData.objectStore.getById(hitResult.item.data.id).sender == appData.matrixClient.client.getUserId()) {
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

        this.toolcancel();

        console.log(this.idsToDelete)
        for (let id of this.idsToDelete) {
            console.log(id)
            appData.matrixClient.client.redactEvent(appData.matrixClient.currentRoomId, id).then(t => {
                console.log("redacted (eraser): ", t);
            });
            this.idsToDelete = this.idsToDelete.filter((itemId) => { return itemId == id })
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
            appData.drawingCanvas.activateToolLayer()
            this.previewItem = new paper.Path.Circle(new paper.Point(0, 0), 1);
            this.previewItem.fillColor = '#00000000'
            this.previewItem.strokeWidth = 1
            this.previewItem.strokeColor = '#999'
            this.previewItem.dashArray = [3, 3]
            this.previewItem.strokeCap = 'round'
            // this.previewItem.applyMatrix = false
            // this.previewItem.scaling = new paper.Point(this.getStrokeWidth(), this.getStrokeWidth())
            appData.drawingCanvas.activateDrawLayer()
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