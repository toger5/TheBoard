export function parsePath(p_path, objpos) {
    let arr = p_path.split(" ");
    var offset = objpos.split(" ");
    var returnval = [];
    for (let i = 0; i < arr.length; i += 4) {
        let time = parseFloat(arr[i]);
        let x = parseFloat(arr[i + 1]) + parseFloat(offset[0]);
        let y = parseFloat(arr[i + 2]) + parseFloat(offset[1]);
        let lineWidth = parseFloat(arr[i + 3]);
        returnval.push([time, x, y, lineWidth]);
    }
    return returnval;
}
export function parseBezierPath(p_path, objpos) {
    let arr = p_path.split(" ");
    arr = arr.filter((e) => e != "")
    var offset = objpos.split(" ");
    var returnval = [];
    for (let i = 0; i < arr.length; i += 6) {
        let seg = new paper.Segment(
            new paper.Point(parseFloat(arr[i + 0]) + parseFloat(offset[0]),
                parseFloat(arr[i + 1]) + parseFloat(offset[1])),
            new paper.Point(parseFloat(arr[i + 2]), parseFloat(arr[i + 3])),
            new paper.Point(parseFloat(arr[i + 4]), parseFloat(arr[i + 5])))
        // let time = parseFloat(arr[i]);
        // let x = parseFloat(arr[i + 1]) + parseFloat(offset[0]);
        // let y = parseFloat(arr[i + 2]) + parseFloat(offset[1]);
        // let lineWidth = parseFloat(arr[i + 3]);
        returnval.push(seg);
    }
    return returnval;
}
export function mousePathToString(points) {
    //format:
    // time x y width
    let mouse_path_string = "";
    for (let p of points) {
        mouse_path_string += p[0] + " " + p[1] + " " + p[2] + " " + p[3] + " ";
    }
    return mouse_path_string;
}
export function paperPathToString(path) {
    //format:
    // x y handleInX handleInY handleOutX handleOutY
    let movedPath = path.clone();
    let boundingRect = movedPath.bounds;
    movedPath.position = movedPath.position.subtract(boundingRect.topLeft);
    var precision = 3;
    let paper_path_string = "";
    for (let s of movedPath.segments) {
        paper_path_string += s.point.x.toFixed(precision) + " " + s.point.y.toFixed(precision) + " " + s.handleIn.x.toFixed(precision) + " " + s.handleIn.y.toFixed(precision) + " " + s.handleOut.x.toFixed(precision) + " " + s.handleOut.y.toFixed(precision) + " ";
    }
    movedPath.remove();
    return [boundingRect.topLeft, boundingRect.size, paper_path_string.trim()];
}
export function pathPosSizeCorrection(points) {
    let posMin = [Number.MAX_VALUE, Number.MAX_VALUE];
    let posMax = [-Number.MAX_VALUE, -Number.MAX_VALUE];
    for (let p of points) {
        posMin[0] = Math.min(posMin[0], p[1]);
        posMin[1] = Math.min(posMin[1], p[2]);
        posMax[0] = Math.max(posMax[0], p[1]);
        posMax[1] = Math.max(posMax[1], p[2]);
    }
    let correctedPoints = points.map((p) => { return [p[0], p[1] - posMin[0], p[2] - posMin[1], p[3]] });
    let width = posMax[0] - posMin[0];
    let height = posMax[1] - posMin[1];
    // path pos size
    return [correctedPoints, posMin, [width, height]];
}
export function paperPathPosSizeCorrection(path) {
    let points = [];
    for (let s of segments) {
        points.push([0, s.point.x, s.point.y, path.strokeWidth]);
    }

}
// export function pathChunkPosCorrection(chunk, points) {
//     return points.map((p) => { return [p[0], p[1] - chunk[0], p[2] - chunk[1], p[3]] });
// }
export function dist(p, q) {
    return Math.sqrt((p.x - q.x) ** 2 + (p.y - q.y) ** 2);
}
export function parsePointDeprecated(string) {
    let arr = (string || "0 0").split(" ");
    return new paper.Point(parseFloat(arr[0]), parseFloat(arr[1]));
}
export function parsePoint(point) {
    let pointArr = [point.x, point.y]
    return new paper.Point(pointArr);
}
export function posFromEv(evContent) {
    switch (evContent.objtype) {
        case "path": return parsePoint(evContent.paths[0].position)
        default: return parsePoint(evContent.position)
    }
}
export function sizeFromEv(evContent) {
    // TODO save or calculate obj size
    console.log("using unimplemented objsize function: { return new paper.Point(0, 0) }")
    return new paper.Point(0, 0)
}
export function setAlpha(color, opacity) {
    // coerce values so ti is between 0 and 1.
    const _opacity = Math.round(Math.min(Math.max(opacity || 1, 0), 1) * 255);
    const _opStr = _opacity.toString(16).toUpperCase();
    if (color.length == 7) {
        return color + _opStr;
    } else if (color.length == 9) {
        color[7] = _opStr[0];
        color[8] = _opStr[1];
        return color;
    }
}