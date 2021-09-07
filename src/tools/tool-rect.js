// import { drawingCanvas } from "../drawing";
// import { Path, Color, Point } from "paper/dist/paper-core";
import { GetPickerColor } from "../color-picker";
import { GetToolStrokeWidthIndex } from "./line-style-selector";
// import { sendPath } from "../actions";
// import { objectStore, currentRoomId, drawingCanvas} from "../main";
// import { matrixClient } from '../main'//backend;
import { mousePathToString, paperPathToString, pathPosSizeCorrection, setAlpha } from "../helper";
import Tool from "./tool-super";
export default class ToolRect extends Tool{
    constructor() {
        super()
        // Tool state
        this.canvas_rect = null;

        // Tool settings
        this.strokeWidthOptions = [1, 2, 4,8];
    }
    getStrokeWidth(){
        return this.strokeWidthOptions[GetToolStrokeWidthIndex()];
    }

    tooldown(proX, proY, pressure) {
        this.tool_canceled = false;
        let pt = new paper.Point(proX, proY);
        appData.drawingCanvas.activateToolLayer();
        this.canvas_rect = new paper.Path.Rectangle(pt, pt)
        let colorAlpha = setAlpha(GetPickerColor(), 0.3);
        this.canvas_rect.strokeColor = colorAlpha;
        this.canvas_rect.strokeWidth = this.getStrokeWidth();
        this.canvas_rect.strokeCap = "round"
        // this.mouse_path_start_time = Date.now();
        // this.last_pos = [0, pt.x, pt.y, pressure];
        // this.mouse_path = [[0, pt.x, pt.y, pressure * 4]];
        appData.drawingCanvas.activateDrawLayer();
        console.log("tooldown");
    }
    toolmove(proX, proY, pressure) {
        console.log("toolmove");
        this.canvas_rect.segments[1].point.x = proX
        this.canvas_rect.segments[2].point = new paper.Point(proX, proY)
        this.canvas_rect.segments[3].point.y = proY
    }

    toolup(proX, proY) {
        if (this.tool_canceled) { return; }
        if (appData.objectStore.hasRoom(appData.matrixClient.currentRoomId)) {
            // let [corrected_mouse_path, pos, size] = pathPosSizeCorrection([[0,this.canvas_rect.firstSegment.point.x,this.canvas_rect.firstSegment.point.y,0],[0,this.canvas_rect.lastSegment.point.x,this.canvas_rect.lastSegment.point.y,0]]);

            // let paper_mouse_path = new paper.Path(corrected_mouse_path.map((s) => { return [s[1], s[2]] }));

            // let [pos, size, string_path] = paperPathToString(this.canvas_rect);
            // paper_mouse_path.remove();
            // let version = 2;
            let colorAlpha = new Color(GetPickerColor());
            colorAlpha.alpha = 0.08;
            let cA = setAlpha(GetPickerColor(), 0.08);
            this.canvas_rect.fillColor = colorAlpha;// setAlpha(GetPickerColor(), 0.08);
            this.canvas_rect.strokeColor = GetPickerColor();
            appData.matrixClient.sendPath([this.canvas_rect]);

            // sendPath(appData.matrixClient.client, appData.matrixClient.currentRoomId,
            //     string_path,
            //     GetPickerColor(), setAlpha(GetPickerColor(), 0.08),[pos.x, pos.y], [size.width, size.height], this.getStrokeWidth(), true, version);
        } else {
            console.log("NO ROOM SELECTED TO DRAW IN!")
            appData.drawingCanvas.updateDisplay_DEPRECATED();
        }
        this.toolcancel();
    }
    toolcancel() {
        console.log("CANCEL");
        if (this.canvas_rect !== null) {
            this.canvas_rect.remove();
            this.canvas_rect = null;
            this.tool_canceled = true;
        }
    }
    toolpreviewmove(pos){}
    activate(){}
    deactivate(){}
}