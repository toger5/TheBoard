function parsePath(p_path, objpos) {
    let arr = p_path.split(" ");
    var offset = objpos.split(" ");
    var returnval = [];
    for (let i = 0; i < arr.length; i += 4) {
        let time = parseInt(arr[i]);
        let x = parseInt(arr[i + 1]) + parseInt(offset[0]);
        let y = parseInt(arr[i + 2]) + parseInt(offset[1]);
        let lineWidth = parseFloat(arr[i + 3]);
        returnval.push([time, x, y, lineWidth]);
    }
    return returnval;
}
function mousePathToString(points) {
    let mouse_path_string = "";
    for (p of points) {
        mouse_path_string += p[0] + " " + p[1] + " " + p[2] + " " + p[3] + " ";
    }
    return mouse_path_string;
}
function pathPosSizeCorrection(points) {
    let posMin = [Number.MAX_VALUE, Number.MAX_VALUE];
    let posMax = [-Number.MAX_VALUE, -Number.MAX_VALUE];
    for (p of points) {
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
function pathChunkPosCorrection(chunk, points){
    return points.map((p) => { return [p[0], p[1] - chunk[0], p[2] - chunk[1], p[3]] });
}
function dist(p, q) {
    return Math.sqrt((p.x - q.x) ** 2 + (p.y - q.y) ** 2);
}
function parsePoint(string){
    let arr = (string || "0 0").split(" ");
    return [parseInt(arr[0]),parseInt(arr[1])];
}
