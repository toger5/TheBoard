class ToolLine {
    constructor() {

        // Tool state
        this.canvas_line = null;
        // this.mouse_path_last_time = Date.now();
        // this.last_pos = []
        // this.tool_canceled = false;

        // Tool settings
        this.strokeWidth = 2;
        this.strokeWidthOptions = [1, 2, 4];
    }

    tooldown(proX, proY, pressure) {
        this.tool_canceled = false;
        let pt = new paper.Point(proX, proY);
        this.canvas_line = new paper.Path([pt,pt])
        let colorAlpha = setAlpha(GetPickerColor(), 0.3);
        this.canvas_line.strokeColor = colorAlpha;
        this.canvas_line.strokeWidth = this.strokeWidth;
        this.canvas_line.strokeCap = "round"
        // this.mouse_path_start_time = Date.now();
        // this.last_pos = [0, pt.x, pt.y, pressure];
        // this.mouse_path = [[0, pt.x, pt.y, pressure * 4]];
        console.log("tooldown");
    }
    toolmove(proX, proY, pressure) {
        console.log("toolmove");
        this.canvas_line.lastSegment.point = new paper.Point(proX, proY);
    }

    toolup(proX, proY) {
        if (this.tool_canceled) { return; }
        if (objectStore.hasRoom(currentRoomId)) {
            let [corrected_mouse_path, pos, size] = pathPosSizeCorrection([[0,this.canvas_line.firstSegment.point.x,this.canvas_line.firstSegment.point.y,0],[0,this.canvas_line.lastSegment.point.x,this.canvas_line.lastSegment.point.y,0]]);

            let paper_mouse_path = new paper.Path(corrected_mouse_path.map((s) => { return [s[1], s[2]] }));
            
            let string_path = paperPathToString(paper_mouse_path);
            paper_mouse_path.remove();
            let version = 2;
            sendPath(matrixClient, currentRoomId,
                string_path,
                GetPickerColor(), pos, size, version, this.strokeWidth);
        } else {
            console.log("NO ROOM SELECTED TO DRAW IN!")
            drawing_canvas.updateDisplay();
        }
        this.toolcancel();
    }
    toolcancel() {
        console.log("CANCEL");
        if(this.canvas_line !== null){
            this.canvas_line.remove();
            this.canvas_line = null;
            this.tool_canceled = true;
        }
    }
}