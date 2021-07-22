class ToolRect {
    constructor() {

        // Tool state
        this.canvas_rect = null;

        // Tool settings
        this.strokeWidth = 2;
        this.strokeWidthOptions = [1, 2, 4];
    }

    tooldown(proX, proY, pressure) {
        this.tool_canceled = false;
        let pt = new paper.Point(proX, proY);
        
        this.canvas_rect = new paper.Path.Rectangle(pt, pt)
        let colorAlpha = setAlpha(GetPickerColor(), 0.3);
        this.canvas_rect.strokeColor = colorAlpha;
        this.canvas_rect.strokeWidth = this.strokeWidth;
        this.canvas_rect.strokeCap = "round"
        // this.mouse_path_start_time = Date.now();
        // this.last_pos = [0, pt.x, pt.y, pressure];
        // this.mouse_path = [[0, pt.x, pt.y, pressure * 4]];
        console.log("tooldown");
    }
    toolmove(proX, proY, pressure) {
        console.log("toolmove");
        this.canvas_rect.segments[1].point.x = proX
        this.canvas_rect.segments[2].point.x = proX
        this.canvas_rect.segments[2].point.y = proY
        this.canvas_rect.segments[3].point.y = proY
        // this.canvas_rect.lastSegment.point = new paper.Point(proX, proY);
    }

    toolup(proX, proY) {
        if (this.tool_canceled) { return; }
        if (objectStore.hasRoom(currentRoomId)) {
            // let [corrected_mouse_path, pos, size] = pathPosSizeCorrection([[0,this.canvas_rect.firstSegment.point.x,this.canvas_rect.firstSegment.point.y,0],[0,this.canvas_rect.lastSegment.point.x,this.canvas_rect.lastSegment.point.y,0]]);

            // let paper_mouse_path = new paper.Path(corrected_mouse_path.map((s) => { return [s[1], s[2]] }));

            let [pos, size, string_path] = paperPathToString(this.canvas_rect);
            // paper_mouse_path.remove();
            let version = 2;
            sendPath(matrixClient, currentRoomId,
                string_path,
                GetPickerColor(), setAlpha(GetPickerColor(), 0.08),[pos.x, pos.y], [size.width, size.height], this.strokeWidth, true, version);
        } else {
            console.log("NO ROOM SELECTED TO DRAW IN!")
            drawing_canvas.updateDisplay();
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
}