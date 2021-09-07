import { Point, Rectangle, Size } from "paper/dist/paper-core";
import { GetPickerColor } from "../color-picker";
import { GetToolStrokeWidthIndex } from "./line-style-selector";
import { setAlpha } from "../helper";
import { hideLoading, showLoading } from "../main";
import Tool from "./tool-super";
export default class ToolText extends Tool{
    constructor() {
        super()
        // Tool state
        this.canvas_line = null;
        // this.tool_canceled = true;
        this.textEditMode = false
        this.previewItem = null;
        this.previewText = null;
        this.strokeWidthOptions = [10, 30, 50, 80];
    }
    getTextSize() {
        return this.strokeWidthOptions[GetToolStrokeWidthIndex()];
    }
    tooldown(proX, proY, pressure) {
        
    }
    toolmove(proX, proY, pressure) {
        console.log("textToolMove");
        // this.canvas_line.lastSegment.point = new paper.Point(proX, proY);
    }

    toolup(proX, proY) {
        console.log("textToolUp");
        if (this.textEditMode) {
            this.toolcancel()
            this.toolpreviewmove(new Point(proX,proY))
            //move cursor
            return
        }
        showLoading("Press Enter to send the Text (click or esc to cancel)")
        this.previewText.content = ""
        this.updateBox()

        let input = document.createElement('input');
        input.type = 'text'
        input.oninput = (e) => { 
            this.previewText.fillColor = GetPickerColor();
            this.previewText.content = input.value 
            this.updateBox()
        }
        input.onkeyup =(e)=>{
            if (e.key === "Enter") {
                appData.matrixClient.sendText(this.previewText);
                this.toolcancel()
                this.previewText.visible = false
                this.previewItem.visible = false
                hideLoading()
                // this.previewText.fillColor = setAlpha(GetPickerColor(),0.5);
            }
            if (e.key === "Escape"){
                this.toolcancel()
                this.toolpreviewmove(new Point(proX,proY))
            }
        }
        document.body.appendChild(input)
        input.focus()
        input.style.opacity = 0
        input.style.width = 0
        this.textEditMode = true
        // this.previewItem.fillColor = '#eeeeee22'
        // if (this.tool_canceled) { return; }
        // if (appData.objectStore.hasRoom(appData.matrixClient.currentRoomId)) {
        //     // let [corrected_mouse_path, pos, size] = pathPosSizeCorrection([[0,this.canvas_line.firstSegment.point.x,this.canvas_line.firstSegment.point.y,0],[0,this.canvas_line.lastSegment.point.x,this.canvas_line.lastSegment.point.y,0]]);

        //     // let paper_mouse_path = new paper.Path(corrected_mouse_path.map((s) => { return [s[1], s[2]] }));

        //     // let [pos, size, string_path] = paperPathToString(this.canvas_line);
        //     // paper_mouse_path.remove();
        //     // let version = 2;
        //     // sendPath(appData.matrixClient.client, appData.matrixClient.currentRoomId,
        //     //     string_path,
        //     //     GetPickerColor(),'#00000000', [pos.x,pos.y], [size.width,size.height], this.getStrokeWidth(), false, version);
        //     this.canvas_line.strokeWidth = this.getStrokeWidth();
        //     this.canvas_line.strokeColor = GetPickerColor();
        //     appData.matrixClient.sendPath([this.canvas_line]);
        // } else {
        //     console.log("NO ROOM SELECTED TO DRAW IN!")
        // }
        // this.toolcancel();
    }
    toolcancel() {
        console.log("CANCEL");
        this.textEditMode = false
        this.previewText.content = "Text..."
        this.updateBox()
        // this.tool_canceled = true;
    }
    toolpreviewmove(pos) {
        if (this.textEditMode) { return }
        let width = this.getTextSize() * 5;
        let height = this.getTextSize()*1.1;
        let fontSize = this.getTextSize();
        if (this.previewItem === null) {
            appData.drawingCanvas.activateToolLayer()
            // this.previewItem = new Path.Rectangle(pos.add(0,0), new Size(300, 300));
            this.previewItem = new Path.Rectangle(pos.add(new Point(0, height / 2)), new Size(width, height));
            this.previewItem.dashArray = [5,5]
            this.previewText = new PointText(new Point(-width/2, 0))
            this.previewItem.addChild(this.previewText)
            this.previewText.fontFamily = 'Just Another Hand'
            this.previewText.content = "Text..."
            // Maybe use a group for the two items and move the group
            appData.drawingCanvas.activateDrawLayer()
        }
        if(!this.previewItem.visible){
            this.previewText.visible = true
            this.previewItem.visible = true
        }
        this.previewItem.strokeColor = setAlpha(GetPickerColor(),0.3); // TODO: fix box
        this.previewText.point = pos
        this.updateBox()

        this.previewText.fillColor = setAlpha(GetPickerColor(),0.5);
        this.previewText.fontSize = fontSize
        
        
    }
    updateBox(){
        let b = this.previewText.bounds
        let d = 5
        this.previewItem.segments[0].point = b.topLeft.add(new Point(-d,-d))
        this.previewItem.segments[1].point = b.bottomLeft.add(new Point(-d,0))
        this.previewItem.segments[2].point = b.bottomRight.add(new Point(d,0))
        this.previewItem.segments[3].point = b.topRight.add(new Point(d,-d))
    }
    activate() {
        // this.tool_canceled = false
        this.textEditMode = false
        if (this.previewItem) {
            this.previewItem.visible = true;
        }
        if (this.previewText){
            this.previewText.visible = true;
            this.previewText.content = "Text..."
        }
    }
    deactivate() {
        if (this.previewItem) {
            this.previewItem.visible = false;
        }
        if (this.previewText){
            this.previewText.visible = false;
        }
    }
}