import { drawingCanvas } from "../drawing";
import PaperCanvas from "../paper-canvas";
import { sendPath } from "../actions";
import { objectStore, currentRoomId, matrixClient } from "../main";
import { GetToolStrokeWidthIndex } from "./line-style-selector";
import { GetPickerColor } from "../color-picker";
import { mousePathToString, paperPathToString, pathPosSizeCorrection, setAlpha } from "../helper";
export default class ToolPen {
    constructor(marker = false) {
        this.isMarker = marker

        // Tool state
        this.mouse_path = [];
        this.mouse_path_last_time = Date.now();
        this.last_pos = []
        this.tool_canceled = false;

        // Tool settings
        this.strokeWidthOptions = [1, 2, 4, 8];

        this.previewItem = null;

        this.previewPaths = [];
        this.previewPathTween = null;
    }
    getStrokeWidth() {
        return this.strokeWidthOptions[GetToolStrokeWidthIndex()] * (this.isMarker ? 10 : 1);
    }
    getStrokeColor() {
        return this.isMarker ? setAlpha(GetPickerColor(), 0.1) : GetPickerColor();
    }
    tooldown(proX, proY, pressure) {
        this.tool_canceled = false;

        this.mouse_path_start_time = Date.now();
        this.last_pos = [0, proX, proY, pressure];
        this.mouse_path = [[0, proX, proY, pressure * 4]];

        drawingCanvas.activateToolLayer()
        for (let path of this.previewPaths) {
            if (!path.visible) {
                path.remove()
            }
        }
        this.previewPaths.filter((path) => { path.visible })

        let prev = new Path();
        this.previewPaths.push(prev);

        let colorAlpha = new Color(this.getStrokeColor());
        colorAlpha.alpha = colorAlpha.alpha * 0.6;
        // let colorAlpha = setAlpha(this.getStrokeColor(), 0.3);
        prev.strokeColor = colorAlpha;
        prev.strokeWidth = this.getStrokeWidth();
        prev.strokeCap = "round"
        prev.moveTo(new Point(proX, proY))
        drawingCanvas.activateDrawLayer()

        console.log("tooldown");
    }
    toolmove(proX, proY, pressure) {
        console.log("toolmove");
        // no pressure for now
        pressure = 1;
        let x = proX;
        let y = proY;
        let time_delta = Math.min(80, Date.now() - this.mouse_path_last_time);
        let thickness_factor = 1
        this.mouse_path_last_time = Date.now();

        let currentPos = [time_delta, x, y, (pressure * 2 + Math.min(3, Math.max(0.0, thickness_factor)))];
        let dist = (currentPos[1] - this.last_pos[1]) ** 2 + (currentPos[2] - this.last_pos[2]) ** 2

        // let velocity = dist / Math.max(1, time_delta);
        // let thickness_factor = 1.5 - velocity / 8.0;
        // todo fix pressure
        let currentPosPoint = new Point(currentPos[1], currentPos[2])
        this.mouse_path.push(currentPos);
        this.previewPaths[this.previewPaths.length - 1].lineTo(currentPosPoint);
        this.previewPaths[this.previewPaths.length - 1].smooth()
        // drawingCanvas.drawSegmentDisplay([this.last_pos, currentPos], this.getStrokeColor(), this.getStrokeWidth());
        this.last_pos = currentPos;

    }
    toolpreviewmove(pos) {
        if (this.previewItem === null) {
            drawingCanvas.activateToolLayer()
            this.previewItem = new Path.Circle(new Point(0, 0), 0.5);
            this.previewItem.applyMatrix = false
            drawingCanvas.activateDrawLayer()
        }
        this.previewItem.scaling = new Point(this.getStrokeWidth(), this.getStrokeWidth())
        this.previewItem.fillColor = this.getStrokeColor();
        this.previewItem.position = pos;
    }
    toolup(proX, proY) {
        if (this.tool_canceled) { return; }
        if (objectStore.hasRoom(currentRoomId)) {
            let [corrected_mouse_path, pos, size] = pathPosSizeCorrection(this.mouse_path);
            let string_path;
            let version;
            // if (drawingCanvas instanceof UnlimitedCanvas) {
            //     string_path = mousePathToString(corrected_mouse_path);
            //     version = 1;
            // }
            // else 
            if (drawingCanvas instanceof PaperCanvas) {
                let paper_mouse_path = new Path(corrected_mouse_path.map((s) => { return [s[1], s[2]] }));
                paper_mouse_path.simplify(1 / drawingCanvas.getZoom());
                string_path = paperPathToString(paper_mouse_path)[2];
                paper_mouse_path.remove();
                version = 2;
            }
            sendPath(matrixClient, currentRoomId,
                string_path,
                this.getStrokeColor(), '#00000000', pos, size, this.getStrokeWidth(), false, version);

        } else {
            console.log("NO ROOM SELECTED TO DRAW IN!")
            drawingCanvas.updateDisplay();
        }
        this.toolcancel();
    }
    toolcancel() {
        console.log("CANCEL");
        this.mouse_path = [];
        this.mouse_path_last_time = Date.now();
        this.last_pos = []
        this.tool_canceled = true;

        let prev = this.previewPaths[this.previewPaths.length - 1]
        let l = prev.length;
        prev.dashArray = [l, l]
        prev.tween({ dashOffset: 0 }, { dashOffset: -l }, 2 * l).then((e) => {
            prev.visible = false
        });
    }
    activate() {
        if (this.previewItem) {
            this.previewItem.visible = true;
        }
    }
    deactivate() {
        if (this.previewItem) {
            this.previewItem.visible = false;
        }
    }
}