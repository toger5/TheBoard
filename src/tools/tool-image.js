import { Path, Point, Raster, Rectangle, Size } from "paper/dist/paper-core";
import { GetPickerColor } from "../color-picker";
import { GetToolStrokeWidthIndex } from "./line-style-selector";
import { setAlpha } from "../helper";
import { hideLoading, showLoading } from "../main";
import CreateIcon from './create-icon-2.png';
import CancelIcon from './cancel-icon-2.png';
import Tool from "./tool-super";
let HANDLE_SIZE = 25
let HANDLE_BORDER_SIZE = 1
let HANDLE_COLOR_IDLE = "#ffffff77"
let HANLDE_COLOR_BORDER = '#34a4eb'
let HANDLE_COLOR_ACTIVE = "#ffffffcc"
export default class ToolImage extends Tool{
    constructor() {
        super()
        // Tool state
        this.canvas_line = null
        this.tool_canceled = true
        this.textEditMode = false
        this.previewImage = null
        this.previewGroup = null
        this.selectedFile = null
        this.viewZoomCallback = null
        this.cancelButton = null
        this.submitButton = null
    }

    tooldown(proX, proY, pressure) {

    }
    toolmove(proX, proY, pressure) {
        console.log("textToolMove");
        // this.canvas_line.lastSegment.point = new paper.Point(proX, proY);
    }
    toolsubmit() {
        appData.matrixClient.sendImage(this.previewImage, this.selectedFile)
        this.previewGroup.visible = false;
        this.toolcancel()
    }
    toolup(proX, proY) {
        // appData.matrixClient.sendImage(this.previewImage, this.selectedFile)
        // this.previewImage.visible = false
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
        // this.previewGroup.visible = false;
        console.log("CANCEL does nothing for the image tool");
        // this.textEditMode = false
        // this.previewText.content = "Text..."
        // this.updateBox()
        // this.tool_canceled = true;
    }
    toolpreviewmove(pos) {
        // if (this.previewItem === null) { return }
        // if (!this.previewImage.visible) {
        //     this.previewImage.visible = true
        //     this.previewItem.visible = true
        // }
        // this.previewItem.strokeColor = 'black';
        // this.previewItem.opacity = 0.6
        // this.previewItem.dashArray = [5, 5]
        // this.previewImage.position = pos
        // this.previewItem.position = pos
    }

    activate() {
        console.log("activeted")
        let imageTool = this;
        function initToolElements(tool) {
            appData.drawingCanvas.activateToolLayer()
            tool.previewGroup = new paper.Group()
            tool.previewImage = new paper.Raster()
            tool.previewImage.opacity = 0.8
            tool.previewGroup.addChild(tool.previewImage)
            tool.previewBox = new paper.Path.Rectangle({center: [0, 0],
                size: [HANDLE_SIZE, HANDLE_SIZE],
                strokeColor: HANLDE_COLOR_BORDER,
                strokeWidth: HANDLE_BORDER_SIZE
            })
            tool.previewGroup.addChild(tool.previewBox)
            tool.previewHandles = [0, 1, 2, 3].map(() => {
                let h = new paper.Path.Rectangle({
                    center: [0, 0],
                    size: [HANDLE_SIZE, HANDLE_SIZE],
                    strokeColor: HANLDE_COLOR_BORDER,
                    fillColor: HANDLE_COLOR_IDLE,
                    strokeWidth: HANDLE_BORDER_SIZE,
                    applyMatrix: false
                })
                tool.previewGroup.addChild(h)
                return h;
            })
            let _dragHandle = new paper.Path.Ellipse({
                center: [0, 0],
                radius: HANDLE_SIZE,
                strokeColor: HANLDE_COLOR_BORDER,
                fillColor: HANDLE_COLOR_IDLE,
                strokeWidth: HANDLE_BORDER_SIZE,
                applyMatrix: false
            })
            tool.previewDragHandle = _dragHandle

            _dragHandle.onMouseDrag = function (e) {
                imageTool.previewImage.position = e.point
                imageTool.updateHandlePos()
            }
            _dragHandle.onMouseEnter = function (e) { _dragHandle.fillColor = "#ffffffaa" }
            _dragHandle.onMouseLeave = function (e) { _dragHandle.fillColor = HANDLE_COLOR_IDLE }
            tool.previewGroup.addChild(_dragHandle)

            tool.previewHandles.forEach((handle, i) => {
                let indexOppositePoint = (i + 2) % 4
                handle.onMouseDrag = function (e) {
                    let imAspect = (new Point(imageTool.previewImage.size)).normalize()
                    let scaleLockAxis = (i === 0 || i === 2) ? imAspect : new Point(imAspect.x, -imAspect.y)
                    let op = imageTool.previewHandles[indexOppositePoint].position
                    let to = (e.point.subtract(op)).project(scaleLockAxis)//op.add(imAspect.multiply(e.point.subtract(op).dot(imAspect)))
                    imageTool.previewImage.bounds = new Rectangle({ from: op.add(to), to: op })
                    imageTool.updateHandlePos()
                }
                handle.onMouseEnter = function (e) { handle.fillColor = HANDLE_COLOR_ACTIVE }
                handle.onMouseLeave = function (e) { handle.fillColor = HANDLE_COLOR_IDLE }
            })

            tool.cancelButton = new paper.Raster(CancelIcon)
            tool.previewGroup.addChild(tool.cancelButton)
            tool.cancelButton.onClick = () => { tool.toolcancel(); this.previewGroup.visible = false; }
            tool.submitButton = new paper.Raster(CreateIcon)
            tool.submitButton.onClick = () => { tool.toolsubmit() }
            tool.previewGroup.addChild(tool.submitButton)
            appData.drawingCanvas.activateDrawLayer()
        }

        document.getElementById("image-file-select-input").click()
        document.getElementById("image-file-select-input").oninput = (input) => {
            if (this.previewImage === null) {
                initToolElements(imageTool)
            }
            this.viewZoomCallback = () => {
                imageTool.updateHandlePos()
            }
            paper.project.view.on('zoom', this.viewZoomCallback)
            this.previewGroup.visible = true
            this.selectedFile = input.target.files[0]
            let prevImg = this.previewImage;
            this.previewImage.source = ""
            this.previewImage.source = URL.createObjectURL(this.selectedFile)
            prevImg.onLoad = function () {
                imageTool.setInitialSizePos()
                imageTool.updateHandlePos()
            }
        }
    }
    updateHandlePos() {
        this.previewHandles[0].position = this.previewImage.bounds.topLeft
        this.previewHandles[1].position = this.previewImage.bounds.topRight
        this.previewHandles[2].position = this.previewImage.bounds.bottomRight
        this.previewHandles[3].position = this.previewImage.bounds.bottomLeft
        this.previewDragHandle.position = this.previewImage.position
        let z = 1.0 / paper.project.view.zoom;
        this.previewHandles.forEach(h => { h.scaling = new Point(z, z) });
        this.previewDragHandle.scaling = new Point(z, z)
        this.cancelButton.scaling = new Point(z, z)
        this.cancelButton.position = this.previewImage.bounds.bottomCenter.add(new Point(-z * this.cancelButton.size.width / 2, z * this.cancelButton.size.width))
        this.submitButton.scaling = new Point(z, z)
        this.submitButton.position = this.previewImage.bounds.bottomCenter.add(new Point(z * this.cancelButton.size.width / 2, z * this.cancelButton.size.width))
        this.previewBox.bounds = this.previewImage.bounds
        this.previewBox.strokeWidth = HANDLE_BORDER_SIZE*z
    }
    deactivate() {
        if (this.previewGroup) {
            this.previewGroup.visible = false;
        }
        if (this.viewZoomCallback) {
            paper.project.view.off('zoom', this.viewZoomCallback)
        }

    }
    setInitialSizePos() {
        let prevImg = this.previewImage;
        let vw = paper.project.view.size.width
        let vh = paper.project.view.size.height
        prevImg.scaling = new Point(1, 1)
        let w = prevImg.bounds.size.width
        if (w > vw * 0.8) {
            prevImg.scale((vw * 0.8) / w)
        }
        let h = prevImg.bounds.size.height
        if (h > vh * 0.8) {
            prevImg.scale((vh * 0.8) / h)
        }
        prevImg.position = paper.project.view.center
        return prevImg.size;
    }
}
