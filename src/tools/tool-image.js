import { Point, Raster, Rectangle, Size } from "paper/dist/paper-core";
import { GetPickerColor } from "../color-picker";
import { GetToolStrokeWidthIndex } from "./line-style-selector";
import { setAlpha } from "../helper";
import { hideLoading, showLoading } from "../main";

export default class ToolImage {
    constructor() {

        // Tool state
        this.canvas_line = null
        this.tool_canceled = true
        this.textEditMode = false
        this.previewImage = null
        this.previewItem = null
        this.selectedFile = null
    }

    tooldown(proX, proY, pressure) {
        
    }
    toolmove(proX, proY, pressure) {
        console.log("textToolMove");
        // this.canvas_line.lastSegment.point = new paper.Point(proX, proY);
    }

    toolup(proX, proY) {
        appData.matrixClient.sendImage(this.previewImage, this.selectedFile)
        this.previewImage.visible = false
        // console.log("textToolUp");
        // if (this.textEditMode) {
        //     this.toolcancel()
        //     this.toolpreviewmove(new Point(proX,proY))
        //     //move cursor
        //     return
        // }
        // showLoading("Press Enter to send the Text (click or esc to cancel)")
        // // this.previewText.content = ""
        // this.updateBox()

        // let input = document.createElement('input');
        // input.type = 'text'
        // input.oninput = (e) => { 
        //     this.previewText.fillColor = GetPickerColor();
        //     this.previewText.content = input.value 
        //     this.updateBox()
        // }
        // input.onkeyup =(e)=>{
        //     if (e.key === "Enter") {
        //         appData.matrixClient.sendText(this.previewText);
        //         this.toolcancel()
        //         this.previewText.visible = false
        //         this.previewImage.visible = false
        //         hideLoading()
        //         // this.previewText.fillColor = setAlpha(GetPickerColor(),0.5);
        //     }
        //     if (e.key === "Escape"){
        //         this.toolcancel()
        //         this.toolpreviewmove(new Point(proX,proY))
        //     }
        // }
        // document.body.appendChild(input)
        // input.focus()
        // input.style.opacity = 0
        // input.style.width = 0
        // this.textEditMode = true
    }
    toolcancel() {
        // console.log("CANCEL");
        // this.textEditMode = false
        // this.previewText.content = "Text..."
        // this.updateBox()
        // this.tool_canceled = true;
    }
    toolpreviewmove(pos) {
        if(this.previewItem === null){return}
        if(!this.previewImage.visible){
            this.previewImage.visible = true
            this.previewItem.visible = true
        }
        this.previewItem.strokeColor = 'black';
        this.previewItem.opacity = 0.6
        this.previewItem.dashArray = [5,5]
        this.previewImage.position = pos
        this.previewItem.position = pos
    }
    activate() {
        console.log("activeted")
        document.getElementById("image-file-select-input").click()
        document.getElementById("image-file-select-input").oninput = (input)=>{
            if (this.previewImage === null) {
                appData.drawingCanvas.activateToolLayer()
                this.previewImage = new paper.Raster()
                this.previewImage.opacity = 0.8
                this.previewItem = new paper.Path.Rectangle(new Point(0,0), this.previewImage.size);
                appData.drawingCanvas.activateDrawLayer()
            }
            this.previewImage.visible = true
            this.selectedFile = input.target.files[0]
            this.previewImage.source = URL.createObjectURL(this.selectedFile)
            // this.previewItem.size = 
        }
    }
    deactivate() {
        if (this.previewImage) {
            this.previewImage.visible = false;
            this.previewItem.visible = false
        }

    }
}