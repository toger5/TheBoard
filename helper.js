function pathStringToArray(p_path, objpos){

    let arr = p_path.split(" ");
    var offset = objpos.split(" ");
    var returnval = [];
    for(let i = 0; i < arr.length;i+=4){
        let time = parseInt(arr[i]);
        let x = parseInt(arr[i+1])+parseInt(offset[0]);
        let y = parseInt(arr[i+2])+parseInt(offset[1]);
        let lineWidth = parseFloat(arr[i+3]);
        returnval.push([time,x,y,lineWidth]);
    }
    return returnval;
}
function dist(p,q){
    return Math.sqrt((p.x-q.x)**2+(p.y-q.y)**2);
}