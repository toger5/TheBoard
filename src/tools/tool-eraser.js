// import {  } from "../drawing";
// import { objectStore } from '../main'
// import { sleep } from './paper-canvas';
import { GetToolStrokeWidthIndex } from "./line-style-selector";
import { UserFilter, DrawFilter } from "../paper-canvas";
import jsxElem, { render } from "jsx-no-react"
import Tool from "./tool-super";
import { OBJTYPE_IMAGE, OBJTYPE_TEXT, OBJTYPE_PATH } from "../backend/board-event-consts";
export default class ToolEraser extends Tool {
    constructor() {
        super()
        // Tool state
        this.removedElementsArray
        this.tool_canceled = false
        this.idsToDelete = []
        this.ignoredObjectTypes = new Set([OBJTYPE_IMAGE])
        this.ignoredObjectFilter = new DrawFilter()
        // Tool settings
        // this.strokeWidth = 10;
        this.strokeWidthOptions = [5, 10, 20, 40];

        // Preview
        this.previewItem = null

    }
    updateDrawFilter() {
        let ignors = this.ignoredObjectTypes
        this.ignoredObjectFilter.filterFunc = function (event) {
            return !ignors.has(event.content.objtype)
        }
        this.ignoredObjectFilter.falseModifiaction = function (item) { item.opacity *= 0.2 }
        appData.drawingCanvas.addFilter(this.ignoredObjectFilter)
        appData.drawingCanvas.reload(false, false)
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
            let objectEvent = appData.objectStore.getById(hitResult.item.data.id)
            if (objectEvent.sender == appData.matrixClient.client.getUserId() // TODO only filter by user when the permission settings dont allow the deletion
                && !this.ignoredObjectTypes.has(objectEvent.content.objtype)) {
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
            // this.idsToDelete = this.idsToDelete.filter((itemId) => { return itemId == id })
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

        appData.drawingCanvas.addFilter(new UserFilter(appData.matrixClient.client.getUserId()))
        this.updateDrawFilter.call(this)
    }
    deactivate() {
        if (this.previewItem != null) {
            this.previewItem.visible = false
        }
        appData.drawingCanvas.clearFilter()
    }
    getSettingsPanel() {
        let ignors = this.ignoredObjectTypes
        function changedCheckbox(string, state) {
            if (state) {
                ignors.delete(string)
            } else {
                ignors.add(string)
            }
            this.updateDrawFilter.call(this)
        }
        let styleCheckbox = {
            margin: '10px'
        }
        return <>
            <p style="text-align:center;">Eraser</p>
            <input style={styleCheckbox} type="checkbox" id="IDimages" onchange={
                (e) => {
                    changedCheckbox.call(this, OBJTYPE_IMAGE, e.target.checked)
                }
            } checked={!ignors.has(OBJTYPE_IMAGE)} />
            <label for="IDimages">images</label><br />
            <input style={styleCheckbox} type="checkbox" id="IDtext" onchange={(e) => { changedCheckbox.call(this, OBJTYPE_TEXT, e.target.checked) }} checked={!ignors.has(OBJTYPE_TEXT)} />
            <label for="IDtext">text</label><br />
            <input style={styleCheckbox} type="checkbox" id="IDlines" onchange={(e) => { changedCheckbox.call(this, OBJTYPE_PATH, e.target.checked) }} checked={!ignors.has(OBJTYPE_PATH)} />
            <label for="IDlines">lines</label><br />
        </>
    }
}