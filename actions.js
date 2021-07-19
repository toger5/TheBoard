function sendmsgs(amount,client, room){
    for (let i = 0;i < amount; i++){
        const content = {
            "body": i+" Test Message",
            "msgtype": "m.text"
        };
        client.sendEvent(room, "m.room.message", content, "", (err, res) => {
            console.log(err);
        });
    }
}
function toggleGrid(){
    console.log(setting_grid);
    if (setting_grid === ""){
        setting_grid = "squares";
    }
    else if (setting_grid === "squares"){
        setting_grid = "dots";
    }
    else if (setting_grid === "dots"){
        setting_grid = "";
    }
    reloadCacheCanvas();
    drawing_canvas.updateDisplay();
}
function toggleTool(){
    if (tool.type === toolType.draw){
        tool.type = toolType.erase;
    }
    else if (tool.type === toolType.erase){
        tool.type = toolType.draw;
    }
    // else if (tool === "mouse"){
    //     tool = "draw";
    // }
    document.getElementById("tool").innerText = "Tool: " + tool.getString();
}
function redactLastAction(client, roomId){
    let id = "";
    // let room = client.getRoom(roomId);
    let userId = client.getUserId();
    let sortedEvents = objectStore.allSorted();
    for(i = sortedEvents.length-1;(id === "" && i >= 0); i--){
        let event = sortedEvents[i];
        console.log("looping through events to find the one to redact");
        if (event.type == "p.whiteboard.object" && event.sender == userId){
            id = event.event_id;
            break;
        }
    }
    client.redactEvent(roomId, id).then(t=>{
        console.log("redacted: ",t);
    });
}
function sendRandomText(client, room){
    textList = ["hallo du", "noch nen test string", "affe", "haus is gross", "wie gehts"];
    text = textList[Math.floor(Math.random()*textList.length)];
    const content = {
        "body": text,
        "msgtype": "m.text"
    };
    client.sendEvent(room, "m.room.message", content, "", (err, res) => {
        console.log(err);
    });
}
function sendCustomEvent(client, room){
    console.log("try to send custom event: ...")
    const content = {
        "svg": "none",
        "objtype": "p.path",
        "objpos": "100 100",
        "objcolor": "#000",
        "path": "0.0 1 1 0.1 2 1 0.3 4 4",
    };
    client.sendEvent(room, "p.whiteboard.object", content, "", (err, res) => {
        console.log(err);
    });
}
function sendPath(client, room, string_path, color, offset, size, version){
    console.log("send random path: ...")
    const content = {
        "version": version,
        "svg": "none",
        "objtype": "p.path",
        "objpos": offset[0]+" "+offset[1],
        "objsize": size[0]+" "+size[1],
        "objcolor": color == "" ? "#"+["F55","5F5","55F"][Math.floor(Math.random()*3)]: color,
        "path": string_path,
        "pathStroke": "2",
    };
    client.sendEvent(room, "p.whiteboard.object", content, "", (err, res) => {
        console.log(err);
    });
}
function sendRandomPath(client, room) {
    console.log("send random path: ...")
    
    const content = {
        "svg": "none",
        "objtype": "p.path",
        "objpos": Math.floor(Math.random()*80)+" "+Math.floor(Math.random()*80),
        "objcolor": "#"+["F55","5F5","55F"][Math.floor(Math.random()*3)],
        "path": randomPath(),
    };
    client.sendEvent(room, "p.whiteboard.object", content, "", (err, res) => {
        console.log(err);
    });
}
function sendRandomWalk(client, room) {
    console.log("send random path: ...")
    
    const content = {
        "svg": "none",
        "objtype": "p.path",
        "objpos": Math.floor(100+Math.random()*80)+" "+Math.floor(100+Math.random()*80),
        "objcolor": "#"+["F55","5F5","55F"][Math.floor(Math.random()*3)],
        "path": randomStroke(),
    };
    client.sendEvent(room, "p.whiteboard.object", content, "", (err, res) => {
        console.log(err);
    });
}
function randomPath(){
    var path = ""
    for (let i = 0; i< Math.floor(Math.random()*50); i++){
        path += i*0.1+" "+Math.floor(Math.random()*40)+" "+Math.floor(Math.random()*40)+" "+Math.floor(Math.random()*6)+" "
    }
    return path;
}
function loginClicked(){
    function checkUsername(username){
        console.log("username to check: ",username);
        return true
    }
    function checkpwd(pwd){
        console.log("pwd to check: ",pwd);
        return true
    }
    let username = document.getElementById("login-form-username").value;
    let pwd = document.getElementById("login-form-password").value;
    if(checkpwd(pwd) && checkUsername(username)){
        login(username,pwd);
    }
}
function randomWalk(){
    var walk = "";
    var width = 0.1;
    var len = Math.floor(Math.random()*50);
    var pos = [0,0];
    for (let i = 0; i< len; i++){
        var widthdiff = Math.random()*0.2;
        width += Math.min(i < len/2 ? widthdiff : -widthdiff, 3)
        pos = [pos[0]+Math.random()*5 - 2.5,pos[1]+Math.random()*5-2.5]
        walk += i*0.1+" "+pos[0]+" "+pos[1]+" "+width+" ";
    }
    return walk;
}
function randomStroke(){
    var walk = "";
    var width = 0.1;
    var len = Math.floor(Math.random()*200)+80;
    var pos = [0,0];
    var angle = 0;
    var v_a = 0.2
    for (let i = 0; i< len; i++){
        angle += v_a+3*Math.random()*v_a;
        if (Math.random()<0.07) {
            v_a = -v_a;
        }
        var widthdiff = 0.1;
        width += (i>(len-20) || i<20) ? -widthdiff * Math.sign(i-len/2): 0;
        // width = Math.sign(width) * Math.min(Math.abs(width),8);
        stepdist = 4+Math.random()*5;
        console.log(width)
        pos = [pos[0]+stepdist*Math.sin(angle),pos[1]+stepdist*Math.cos(angle)];
        walk += i*0.1+" "+pos[0]+" "+pos[1]+" "+width+" ";
    }
    return walk;
}

function formSubmit(e){
    e.preventDefault();
    console.log('onsub');
    return false;
}