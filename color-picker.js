// class ColorPicker{
//     constructor(){
//         this.doc = document.getElementById('svg-icon-color-picker').contentDocument;
//         this.segment60degBack = this.doc.getElementById('60degBack');
//         this.segment60degBack.setAttribute("fill","#000")
//     }
// }
let colorPickerSvg;
function init_color_picker() {
    colorPickerSvg = new ColorPicker();
    colorPickerSvg.selectColor([1, 0])
}
function GetPickerColor(){
    return colorPickerSvg.getColor().toCSS(true)
}
class ColorPicker {

    constructor() {
        // this.colors = ["#999", "#FEB326", "#7F58AF"]//,"#8ae234"
        // this.colors = ["#999", "#64C5EB", "#8ae234", "#E84D8A", "#FEB326", "#7F58AF"]//,
        this.colors = ["#999",  "#8ae234", "#ef2929", "#fcaf3e", "#729fcf","#ad7fa8"]//,
        this.darkColors = this.colors.map((c) => { return new paper.Color(c).multiply(0.7) });
        this.darkColors[0] = 'black'
        this.outline = null;
        this.colorPaths = [[], []]
        this.selectedColor = [0, 0];
        this.COLOR_PICKER_BORDER = 20;
        this.innerCircle = 0.35
        this.middleCircle = 0.7

        this.project = new paper.Project("color-picker-canvas");
        this.project.activate();
        let el = document.getElementById('color-picker-canvas');
        let size = paper.view.size;
        let cent = new paper.Point(size.divide(2));
        let radi = size.width / 2 - this.COLOR_PICKER_BORDER;
        let circleBg = new paper.Path.Circle(cent, radi);
        circleBg.shadowBlur = this.COLOR_PICKER_BORDER;
        circleBg.shadowColor = 'grey';
        circleBg.fillColor = 'white';
        // let circleSegment = this.create_segment(cent, 30, radi, 0, 1);
        // let c2 = circleSegment.clone();
        // c2.scale(0.95);
        // c2.strokeWidth = 3
        // c2.strokeColor = 'white'
        // circleSegment.fillColor = 'red';
        this.colorPaths[0] = this.create_segment_ring(this.colors, cent, radi * this.middleCircle - 1, radi, 0);
        this.colorPaths[1] = this.create_segment_ring(this.darkColors, cent, radi * this.innerCircle, radi * this.middleCircle, 1);

        let circleInner = new paper.Path.Circle(cent, this.innerCircle * radi);
        circleInner.shadowBlur = this.COLOR_PICKER_BORDER;
        circleInner.shadowColor = '#444';
        circleInner.fillColor = 'white';

        paper.projects[0].activate();
    }
    create_segment_ring(colors, center, innerRad, outerRad, index) {
        let count = colors.length;
        let offset = Math.PI / count;
        let paths = [];
        for (let i = 0; i < count; i++) {
            let deg = Math.PI * 2 / count * i - offset;
            let deg2 = Math.PI * 2 / count * (i + 1) - offset
            let p = this.create_segment(center, innerRad, outerRad, deg, deg2);
            p.fillColor = colors[i]
            p.onMouseDown = function (e) {
                colorPickerSvg.selectColor([index, i])
            }
            paths.push(p);
        }
        return paths;
    }
    create_segment(center, innerRad, outerRad, startDeg, endDeg) {
        function getPointFromDeg(deg, center, rad) {
            let x = Math.sin(deg) * rad;
            let y = -Math.cos(deg) * rad;
            return center.add(new paper.Point(x, y));
        }

        let p = new paper.Path();
        let middleDeg = (startDeg + endDeg) / 2;
        p.moveTo(getPointFromDeg(startDeg, center, outerRad));
        p.arcTo(getPointFromDeg(middleDeg, center, outerRad), getPointFromDeg(endDeg, center, outerRad));
        p.lineTo(getPointFromDeg(endDeg, center, innerRad));
        p.arcTo(getPointFromDeg(middleDeg, center, innerRad), getPointFromDeg(startDeg, center, innerRad));
        p.closePath();
        return p;
    }

    selectColor(index_arr) {
        this.selectedColor = index_arr
        let path = this.colorPaths[index_arr[0]][index_arr[1]];
        if (this.outline !== null) {
            this.outline.remove();
            // let seg = path.segments.slice();
            // this.outline.tween({segments:seg},1000)
        }
        this.outline = path.clone();
        this.outline.fillColor = "#FFFFFF00"
        this.outline.strokeWidth = 4;
        this.outline.bringToFront();
        this.outline.strokeColor = 'white';
    }
    getColor() {
        let path = this.colorPaths[this.selectedColor[0]][this.selectedColor[1]];
        return path.fillColor;
    }
}