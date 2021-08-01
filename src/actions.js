import { login, matrixClient, objectStore, currentRoomId } from './main'
import { parsePoint } from './helper'


window.actions = {
    loginClicked: loginClicked,
    redactLastAction: redactLastAction,
    formSubmit: formSubmit,
    replaceLastEvent: replaceLastEvent,
    moveLastEvent: moveLastEvent,
    showAddRoomMenu: showAddRoomMenu,
    hideAddRoomMenu: hideAddRoomMenu,
    showSettingsMenu: showSettingsMenu,
    hideSettingsMenu: hideSettingsMenu,
}
function sendmsgs(amount, client, room) {
    for (let i = 0; i < amount; i++) {
        const content = {
            "body": i + " Test Message",
            "msgtype": "m.text"
        };
        client.sendEvent(room, "m.room.message", content, "", (err, res) => {
            console.log(err);
        });
    }
}
function toggleGrid() {
    console.log(setting_grid);
    if (setting_grid === "") {
        setting_grid = "squares";
    }
    else if (setting_grid === "squares") {
        setting_grid = "dots";
    }
    else if (setting_grid === "dots") {
        setting_grid = "";
    }
    reloadCacheCanvas();
    drawingCanvas.updateDisplay();
}
function toggleTool() {
    if (tool.type === toolType.draw) {
        tool.type = toolType.erase;
    }
    else if (tool.type === toolType.erase) {
        tool.type = toolType.draw;
    }
    // else if (tool === "mouse"){
    //     tool = "draw";
    // }
    document.getElementById("tool").innerText = "Tool: " + tool.getString();
}
function redactLastAction(client, roomId) {
    let id = "";
    // let room = client.getRoom(roomId);
    let userId = client.getUserId();
    let sortedEvents = objectStore.allSorted();
    for (let i = sortedEvents.length - 1; (id === "" && i >= 0); i--) {
        let event = sortedEvents[i];
        console.log("looping through events to find the one to redact");
        if (event.type == "p.whiteboard.object" && event.sender == userId) {
            id = event.event_id;
            break;
        }
    }
    client.redactEvent(roomId, id).then(t => {
        console.log("redacted: ", t);
    });
}
function sendRandomText(client, room) {
    textList = ["hallo du", "noch nen test string", "affe", "haus is gross", "wie gehts"];
    text = textList[Math.floor(Math.random() * textList.length)];
    const content = {
        "body": text,
        "msgtype": "m.text"
    };
    client.sendEvent(room, "m.room.message", content, "", (err, res) => {
        console.log(err);
    });
}
function sendCustomEvent(client, room) {
    console.log("try to send custom event: ...")
    const content = {
        "version": 2,
        "svg": "none",
        "objtype": "p.path",
        "objpos": "100 100",
        "objcolor": "#000",
        "closed": true,
        "objFillColor": '#ff000030',
        "strokeWidth": 3,
        "path": "0 0 0 0 0 0 0 100 0 20 0 0 100 100 0 0 0 0 0 100 0 0 0 0 ",
    };
    client.sendEvent(room, "p.whiteboard.object", content, "", (err, res) => {
        console.log(err);
    });
}
export function sendPath(client, room, string_path, color, fillColor, offset, size, strokeWidth, closed, version) {
    console.log("send random path: ...")
    const content = {
        "version": version,
        "svg": "none",
        "objtype": "p.path",
        "objpos": offset[0] + " " + offset[1],
        "objsize": size[0] + " " + size[1],
        "objcolor": color == "" ? "#" + ["F55", "5F5", "55F"][Math.floor(Math.random() * 3)] : color,
        "objFillColor": fillColor == "" ? "#" + ["F55", "5F5", "55F"][Math.floor(Math.random() * 3)] : fillColor,
        "path": string_path,
        "strokeWidth": strokeWidth,
        "closed": closed,
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
        "objpos": Math.floor(Math.random() * 80) + " " + Math.floor(Math.random() * 80),
        "objcolor": "#" + ["F55", "5F5", "55F"][Math.floor(Math.random() * 3)],
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
        "objpos": Math.floor(100 + Math.random() * 80) + " " + Math.floor(100 + Math.random() * 80),
        "objcolor": "#" + ["F55", "5F5", "55F"][Math.floor(Math.random() * 3)],
        "path": randomStroke(),
    };
    client.sendEvent(room, "p.whiteboard.object", content, "", (err, res) => {
        console.log(err);
    });
}
function randomPath() {
    var path = ""
    for (let i = 0; i < Math.floor(Math.random() * 50); i++) {
        path += i * 0.1 + " " + Math.floor(Math.random() * 40) + " " + Math.floor(Math.random() * 40) + " " + Math.floor(Math.random() * 6) + " "
    }
    return path;
}
export function loginClicked() {
    // let serverUrl = "matrix.org"
    function checkUsername(username) {
        console.log("username to check: ", username);
        return true
    }
    function checkpwd(pwd) {
        console.log("pwd to check: ", pwd);
        return true
    }
    let username = document.getElementById("login-form-username").value;
    let pwd = document.getElementById("login-form-password").value;
    if (checkpwd(pwd) && checkUsername(username)) {
        let domain = username.split(":")[1]
        login(username, pwd, domain);
    }
}
function randomWalk() {
    var walk = "";
    var width = 0.1;
    var len = Math.floor(Math.random() * 50);
    var pos = [0, 0];
    for (let i = 0; i < len; i++) {
        var widthdiff = Math.random() * 0.2;
        width += Math.min(i < len / 2 ? widthdiff : -widthdiff, 3)
        pos = [pos[0] + Math.random() * 5 - 2.5, pos[1] + Math.random() * 5 - 2.5]
        walk += i * 0.1 + " " + pos[0] + " " + pos[1] + " " + width + " ";
    }
    return walk;
}
function randomStroke() {
    var walk = "";
    var width = 0.1;
    var len = Math.floor(Math.random() * 200) + 80;
    var pos = [0, 0];
    var angle = 0;
    var v_a = 0.2
    for (let i = 0; i < len; i++) {
        angle += v_a + 3 * Math.random() * v_a;
        if (Math.random() < 0.07) {
            v_a = -v_a;
        }
        var widthdiff = 0.1;
        width += (i > (len - 20) || i < 20) ? -widthdiff * Math.sign(i - len / 2) : 0;
        // width = Math.sign(width) * Math.min(Math.abs(width),8);
        stepdist = 4 + Math.random() * 5;
        console.log(width)
        pos = [pos[0] + stepdist * Math.sin(angle), pos[1] + stepdist * Math.cos(angle)];
        walk += i * 0.1 + " " + pos[0] + " " + pos[1] + " " + width + " ";
    }
    return walk;
}

function formSubmit(e) {
    e.preventDefault();
    console.log('onsub');
    return false;
}

// function replaceLastEvent(matrixClient, currentRoomId) {
//     let id = "";
//     // let room = client.getRoom(roomId);
//     let userId = matrixClient.getUserId();
//     let sortedEvents = objectStore.allSorted();
//     for (i = sortedEvents.length - 1; (id === "" && i >= 0); i--) {
//         let event = sortedEvents[i];
//         console.log("looping through events to find the one to redact");
//         if (event.type == "p.whiteboard.object" && event.sender == userId) {
//             id = event.event_id;
//             break;
//         }
//     }
//     let replaceId = id;
//     const content = {
//         "version": 2,
//         "svg": "none",
//         "objtype": "p.path",
//         "objpos": "100 100",
//         "objcolor": "#000",
//         "closed": true,
//         "objFillColor": '#ff000030',
//         "strokeWidth": 3,
//         "path": "0 0 0 0 0 0 0 100 0 0 0 0 100 100 0 0 0 0 100 0 0 0 0 0",
//     };
//     // const replaceContent = {
//     //     "body": "",
//     //     "m.new_content": content,
//     //     "m.relates_to": {
//     //         "rel_type": "m.replace",
//     //         "event_id": replaceId
//     //     }
//     // }
//     matrixClient.sendEvent(currentRoomId, "p.whiteboard.object", content, "", (err, res) => {
//         console.log(err);
//     });
//     matrixClient.redactEvent(currentRoomId, replaceId).then(t => {
//         console.log("redacted for replace ", t);
//     });
// }
function lastEvent() {
    let lastEvent = null;
    // let room = client.getRoom(roomId);
    let userId = matrixClient.getUserId();
    let sortedEvents = objectStore.allSorted();
    for (let i = sortedEvents.length - 1; i >= 0; i--) {
        let event = sortedEvents[i];
        console.log("looping through events to find the one to redact");
        if (event.type == "p.whiteboard.object" && event.sender == userId) {
            lastEvent = event;
            break;
        }
    }
    return lastEvent;
}
function replaceEvent(idToReplace, newContent) {
    matrixClient.sendEvent(currentRoomId, "p.whiteboard.object", newContent, "", (err, res) => {
        console.log(err);
    });
    matrixClient.redactEvent(currentRoomId, idToReplace).then(t => {
        console.log("redacted for replace ", t);
    });
}
function replaceLastEvent(matrixClient, currentRoomId) {
    let replaceId = lastEvent().event_id;
    const content = {
        "version": 2,
        "svg": "none",
        "objtype": "p.path",
        "objpos": "100 100",
        "objcolor": "#000",
        "closed": true,
        "objFillColor": '#ff000030',
        "strokeWidth": 3,
        "path": "0 0 0 0 0 0 0 100 0 0 0 0 100 100 0 0 0 0 100 0 0 0 0 0",
    };
    replaceEvent(replaceId, content);
}
function moveLastEvent() {
    let ev = lastEvent();
    let newPoint = parsePoint(ev.content.objpos).add(new paper.Point(100, 0));
    ev.content.objpos = newPoint.x + " " + newPoint.y;
    replaceEvent(ev.event_id, ev.content)
}
function toggleLeftBar() {
    let body = document.getElementById('leftbar-expand');
    let footer = document.getElementById('leftbar-footer')
    if (body.getBoundingClientRect().height == 0) {
        body.style.height = '20em';
        footer.innerHTML = '˄'
    } else {
        body.style.height = '0';
        footer.innerHTML = '˅'
    }
}
function showAddRoomMenu() {
    updateAddRoomList()
    let addRoomMenu = document.getElementById("add-room-container")
    addRoomMenu.style.display = 'block'

}
function hideAddRoomMenu() {
    let addRoomMenu = document.getElementById("add-room-container")
    addRoomMenu.style.display = 'none'
}

function showSettingsMenu() {
    let settingsMenu = document.getElementById("settings-container")
    let roomId = document.getElementById('room-menu-room-id')
    let room = matrixClient.getRoom(currentRoomId);

    roomId.innerHTML = room.roomId
    settingsMenu.style.display = 'block'
}
function hideSettingsMenu() {
    let settingsMenu = document.getElementById("settings-container")
    settingsMenu.style.display = 'none'
}