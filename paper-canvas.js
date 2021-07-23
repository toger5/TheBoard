class PaperCanvas {
    constructor() {
        this.css_id = "paper";
        this.displayPaths = [];
        this.toolLayer = null
        this.drawLayer = null;
        this.canvas = null;
    }
    activateToolLayer(){
        this.toolLayer.activate()
    }
    activateDrawLayer(){
        this.drawLayer.activate();
    }
    init() {
        // Get a reference to the canvas object
        this.canvas = document.getElementById('paper');
        // Create an empty project and a view for the canvas:
        paper.setup(this.canvas);
        
        this.drawLayer = paper.project.activeLayer;
        this.toolLayer = new paper.Layer()
    }
    offset(offset_delta) {
        paper.view.center = paper.view.center.subtract(offset_delta);
    }
    resetOffset() {
        this.setOffset(new paper.Point(0, 0));
    }
    setOffset(offset) {
        paper.view.center = offset;
    }
    getZoom() {
        return paper.view.zoom;
    }
    zoom(factor, zoomOrigin) {
        if (zoomOrigin === null) {
            paper.view.scale(factor)
        } else {
            var zoomOriProj = paper.view.viewToProject(zoomOrigin);
            paper.view.scale(factor, zoomOriProj);
        }
    }
    setZoom(zoom, zoomOrigin = paper.view.center) {
        var currentViewCenter = paper.view.center;
        var zoomOriProj = paper.view.viewToProject(zoomOrigin);
        paper.view.center = zoomOriProj;
        var scale = paper.view.zoom;
        paper.view.zoom = zoom;
        paper.view.center = currentViewCenter;
    }
    resetZoom() {
        this.setZoom(1);
    }
    asyncAddPathV1(){
        console.log("WAIT WHAT???")
    }
    asyncAddPathV2(segments, color, fillColor, strokeWidth, closed = false, id = "") {
        // TODO make async animation using dash
        let p = this.addPathV2(segments, color, fillColor, strokeWidth, closed, id);
        let length = 0;
        length = p.length;
        p.dashArray = [length, length];
        // TODO dont hardcode the speed. instead get it from the event
        // "drawSpeed": "20 50 50 20 12"
        // 20ms for the first 50 px length, 50 ms for the second px length...
        p.tween({ dashOffset: length }, { dashOffset: 0 }, 2 * length).then(() => {
            p.dashArray = []
        })
        // p.tween({ dashArray: [10, 10] }, { dashArray: [1000, 10] }, 3000);
    }

    addPathV2(segments, color, fillColor, strokeWidth, closed = false, id = "") {
        var p = new paper.Path(segments);
        p.strokeColor = color;
        // if (fillColor != "#00000000") { p.fillColor = fillColor; }
        p.fillColor = fillColor;
        
        p.strokeWidth = strokeWidth;
        p.strokeCap = "round";
        p.closed = closed;
        if(id != ""){
            p.data.id = id
        }
        return p;
        // p.moveTo(new paper.Point(points[0][1], points[0][2]));
        // for (let i = 1; i < points.length; i++) {
        //     p.lineTo(new paper.Point(points[i][1], points[i][2]));
        // }
    }
    addPathV1(points, color, [pos, size], id = "") {
        var p = new paper.Path();
        p.strokeColor = color;
        p.strokeWidth = 2;
        p.strokeCap = "round";
        if(id != ""){
            p.data.id = id
        }
        p.moveTo(new paper.Point(points[0][1], points[0][2]));
        for (let i = 1; i < points.length; i++) {
            p.lineTo(new paper.Point(points[i][1], points[i][2]));
        }
    }
    updateDisplay() {
        if (this.dispPath !== null) {
            // this.dispPath.remove();
            this.displayPaths.push(this.dispPath);
            this.dispPath = null;
        }
        // for(p of this.displayPaths){
        //     p.remove();
        // }
    }
    // TODO call this function in a moment where ne drawing animaiotn is running
    clearDisplayPaths() {
        this.displayPaths.forEach((p) => { p.remove() });
    }
    clear() {
        var length = paper.project.activeLayer.removeChildren();
        console.log("removed ", length, " items")
    }
    drawBoundingBox(box) {
        console.log("drawBoundingBox not implemented for paper-canvas")
    }
    reload(animated = false) {
        this.clear();
        var starttime = Date.now();
        console.log("!! Paper Canvas redraw START");
        objectStore.allSorted().forEach(obj => {
            if (obj.type == "p.whiteboard.object") {
                drawEvent(obj, animated, animated);
            }
        });
        console.log("!! Paper Canvas redraw DONE in", Date.now() - starttime);
    }
    getTransformedPointer(x, y) {
        return paper.view.viewToProject(new paper.Point(x, y))
    }
}