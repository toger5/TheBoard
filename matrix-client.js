// const { Point } = require("paper/dist/paper-core");

console.log("Loading browser sdk");

var currentRoomId = "";
var matrixClient;
// var paper_canvas = new PaperCanvas();
window.onload = function () {
    init_input(document.getElementById(drawing_canvas.css_id));
    init_color_picker();
    drawing_canvas.init();
    init_tool_wheel();
    init_line_style_selector();
    var pwd_input = document.getElementById("login-form-password");

    pwd_input.addEventListener("keypress", function (event) {
        // Number 13 is the "Enter" key on the keyboard
        if (event.key === "Enter") {
            event.preventDefault();
            document.getElementById("login-submit").click();
        }
    });


}

async function updateRoomList() {
    console.log("startGettingVisibleRooms")
    let visibleRooms = await matrixClient.getVisibleRooms();
    console.log("got all visible rooms")
    let leftbarBody = document.getElementById("leftbar-body");
    for (r in visibleRooms) {
        let room = visibleRooms[r];
        console.log(Array.from(room.currentState.events.keys()))
        if (!room.currentState.events.has('p.whiteboard.settings')) {
            continue // only show rooms which are marked as whitebaord rooms
        }
        let id = room.roomId;
        var roomButton = document.createElement("div");
        console.log(id)
        roomButton.onclick = function (a) { console.log(a); loadRoom(id); };
        roomButton.classList.add("room-button");
        var roomText = document.createElement("p");
        roomText.innerText = visibleRooms[r].name;
        roomButton.appendChild(roomText);
        leftbarBody.insertBefore(roomButton, leftbarBody.firstChild);
    }
    console.log(visibleRooms);
}
async function updateAddRoomList() {
    let visibleRooms = await matrixClient.getVisibleRooms();
    let addRoomBody = document.getElementById("add-room-list");
    for (r of visibleRooms) {
        // let room = visibleRooms[r];
        console.log(Array.from(r.currentState.events.keys()))
        if (r.currentState.events.has('m.space.child')
            || r.currentState.events.has('p.whiteboard.settings')) {
            continue // only show rooms which are no spaces
        }
        let id = r.roomId;
        var roomButton = document.createElement("div");
        roomButton.onclick = async function (a) {
            console.log(a);
            let room = await makeWhitebaordFromRoom(id);
            updateRoomList();
        };
        roomButton.classList.add("room-button");
        var roomText = document.createElement("p");
        roomText.innerText = r.name;
        roomButton.appendChild(roomText);
        addRoomBody.insertBefore(roomButton, addRoomBody.firstChild);
    }
}
function makeWhitebaordFromRoom(roomId) {
    let content = {}
    return matrixClient.sendStateEvent(roomId, "p.whiteboard.settings", content, "")
}
const chunkSize = 300
class ObjectStore {
    constructor() {
        // this.redacted = new Set();
        this.data = {
            "exampleroom": {
                "redacted": new Set(),
                "all": [],
                "allDict": {},
                "user": [],
                "chunk": [],
            }
        }
    }
    currentRoom() {
        return this.data[currentRoomId]
    }
    hasRoom(roomId) {
        return roomId in this.data;
    }
    addRoom(roomId) {
        if (this.hasRoom(roomId)) {
            console.log("room already exists")
        }
        else {
            console.log("add room " + roomId + "to store");
            this.data[roomId] = {
                "redacted": new Set(),
                "all": [],
                "allDict": {},
                "user": {},
                "chunk": [],
            }
        }
    }
    // addToCurrent(obj) {
    //     if (!this.currentRoom().redacted.has(obj.event_id)) {
    //         this.currentRoom().all.push(obj);
    //     }
    // }
    add(obj) {
        if (!obj.room_id in this.data) {
            this.addRoom(obj.room_id);
        }
        let room = this.data[obj.room_id];
        // console.log("adding obj that already exists: ", room.all.some(el => el.event_id == obj.event_id));
        room.allDict[obj.event_id] = obj;
        // if (!room.redacted.has(obj.event_id)) {
        // room.all.push(obj);
        // }
    }
    allSorted() {
        if (currentRoomId in this.data) {
            let begin_sort = Date.now();
            let dic = this.currentRoom().allDict;
            let allList = Object.keys(dic).map(key => dic[key]);
            allList.sort(function (first, second) {
                return first.origin_server_ts - second.origin_server_ts;
            });
            console.log("sorted all events: ", Date.now() - begin_sort, "ms")
            return allList;
            return this.currentRoom().all;
        } else {
            // If there is not current room set, the default behaviour is en empty list -> canvas gets cleared
            return []
        }
    }
    all() {
        if (currentRoomId in this.data) {
            return this.currentRoom().allDict;
        } else {
            // If there is not current room set, the default behaviour is en empty list -> canvas gets cleared
            return {}
        }
    }
    // redactByIdInCurrent(id, remove = true) {
    //     this.currentRoom().redacted.add(id);
    //     if (remove) {
    //         this.currentRoom().all = this.currentRoom().all.filter(e => e.event_id !== id);
    //     }
    // }
    redactById(id, roomId, remove = true) {
        if (!this.hasRoom(roomId)) { this.addRoom(roomId) }
        let room = this.data[roomId];
        // room.redacted.add(id);
        if (remove) {
            if (id in room.allDict) {
                delete room.allDict[id];
                let item = paper.project.getItem({ class: "Path", match: function (item) { return item.data.id == id } })
                if (item) { item.remove(); } else { console.log("could not find item for id: ", id) }
            } else {
                console.log("unecassary redact called for id: ", id)
            }
        }
    }
    // redact_and_remove_by_id(id){
    //     this.redacted.add(id);
    //     this.objects["all"] = this.objects["all"].filter(e => e.event_id !== id);
    // }
    // all_region(x,y,width,height){
    //     //TODO
    //     var ret = [];
    //     this.objects["all"].forEach(obj => {
    //         pos = [obj.objpos.slice(" ").map(x => {return parseInt(x)})];
    //         size = [obj.objsize.slice(" ").map(x => {return parseInt(x)})];
    //         if obj.
    //         ret.push()
    //     });
    // }
}

objectStore = new ObjectStore();
function showLoading(msg) {
    let loading = document.getElementById("loading");
    loading.style.display = "block";
    let span = document.getElementById("loading-span");
    span.innerHTML = msg
}
function hideLoading() {
    let loading = document.getElementById("loading");
    loading.style.display = "none";
}
function hideLogin() {
    let login = document.getElementById("loginContainer");
    login.style.display = "none"
}
async function login(username, password, serverUrl) {
    showLoading("login with: " + username + " on server: " + serverUrl);
    matrixClient = matrixcs.createClient({
        baseUrl: serverUrl,
    });
    setupMatrixClientConnections();
    let registerResult = await matrixClient.loginWithPassword(username, password, function (err) {
        if (err instanceof Error) {
            showLoading(err.message)
            return;
        } else {
            hideLogin();
        }
    })
    console.log(registerResult);
    document.getElementById("userIdLabel").innerHTML = registerResult.user_id;
    // document.getElementById("userIdLabel").innerHTML = registerResult.user_id;
    showLoading("start client");
    let startedResult = await matrixClient.startClient({ initialSyncLimit: 0 });
    showLoading("initial sync");
}
function setupMatrixClientConnections() {
    matrixClient.on("sync", function (state, prevState, data) {
        switch (state) {
            case "ERROR":
                // update UI to say "Connection Lost"
                break;
            case "SYNCING":
                // update UI to remove any "Connection Lost" message
                break;
            case "PREPARED":
                // the client instance is ready to be queried.
                updateRoomList()
                showLoading("Press on an UNENCRYPTED Room (left) to start drawing")
                break;
        }
    });
    matrixClient.on("Room.localEchoUpdated", function (msg, room, oldId, newStatus) {
        if (msg.getType() === "p.whiteboard.object" && msg.status === "sent") {
            let item = paper.project.getItem({ class: "Path", match: function (item) { return item.data.id == oldId } })
            if (item) {
                item.data.id = msg.event.event_id
            }
            objectStore.add(msg.event);

            // console.log("now its sent")
        }
    })
    // var replacedEvents = new Set();
    matrixClient.on("Room.timeline", function (msg, room, toStartOfTimeline) {
        if (msg.isRedacted()) {
            console.log("skipped redacted evpped redacted event")
            return;
        }
        // // message is replaced
        // if (replacedEvents.has(msg.event.event_id)){
        //     console.log("skipped replaced event")
        //     return;
        // }
        if (msg.getType() == "p.whiteboard.object") {
            // console.log("event from : ", new Date(), msg.getDate());
            // let content = msg.event.content
            // if("m.relates_to" in msg.event.content){
            //     if(msg.event.content["m.relates_to"].rel_type == "m.replace"){
            //         replacedEvents.add(msg.event.content["m.relates_to"].event_id)
            //         msg.event.content = msg.event.content["m.new_content"];
            //     }
            // }

            // if (Date.now() - msg.getDate().getTime() < 200000) {
            //     // ANIMATED toggle
            //     drawEvent(msg.event, true);
            // }
            // if (Date.now() - msg.getDate().getTime() < 200000) {
            // ANIMATED toggle
            drawEvent(msg.event, Date.now() - msg.getDate().getTime() < 200000);
            // }
            if (msg.status == null) {
                //event is not sending but loaded from scrollback
                objectStore.add(msg.event);
            }
        }
        if (msg.getType() == "m.room.redaction") {
            // this is debateable. When an event is super slow the canvas will still show it until some other event happens to trigger a redraw
            // if (Date.now() - msg.event.origin_server_ts < 200000) {
            objectStore.redactById(msg.event.redacts, msg.event.room_id);
            // reloadCacheCanvas();
            // drawing_canvas.updateDisplay(true);
            // }
        }
        if (msg.getType() !== "m.room.message") {
            return; // only use messages
        }
        // console.log("event: ",msg)
        // console.log(msg.event.content.body);
    });
}
async function loadRoom(roomId, scrollback_count = -1, allMessages = true) {
    showLoading("switching Room to: " + currentRoomId);
    console.log("switching Room to: " + currentRoomId);
    document.getElementById('leftbar').classList.remove('no-room-selected');
    objectStore.addRoom(roomId);
    currentRoomId = roomId;
    let s_back = scrollback_count;
    if (scrollback_count == -1) {
        if (Object.keys(objectStore.all()).length == 0) { s_back = 300; }
        else { s_back = 0; }
    }
    let room = matrixClient.getRoom(roomId);
    let settings = room.currentState.events.get('p.whiteboard.settings');
    if (settings.has("colorpalette")) {
        colorPickerSvg.setColorPalette(settings.get("colorpalette"))
    }
    showLoading("load room history");
    const dateOptions = { year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric' };
    let scrollBackToken = true
    let currentScrollbackDate = new Date()
    let nowDate = new Date();
    let createDate = new Date(room.currentState.getStateEvents('m.room.create', "").event.origin_server_ts);
    let totalLoaded = 0
    while (scrollBackToken) {
        let percent = 1 - ((currentScrollbackDate - createDate) / (nowDate - createDate))
        let roomLoaded = await scrollback(currentRoomId, s_back, "Loaded: " + Math.floor(percent * 100) + "% (elements: " + totalLoaded + ")</br> <span style='font-size:10px'>to Date: " + currentScrollbackDate.toLocaleDateString('de-DE', dateOptions) + "  Target: " + createDate.toLocaleDateString('de-DE', dateOptions) + "</span>");
        currentScrollbackDate = new Date(roomLoaded.timeline[0].event.origin_server_ts);
        totalLoaded += s_back;
        scrollBackToken = room.oldState.paginationToken;
        drawing_canvas.updateDisplay();
        if (!allMessages) { break; }
    }
}
function scrollback(roomId, scrollback_count = 200, loadingMsg = null) {
    console.log("load scrollback for: " + roomId);
    console.log("load scrollback with element count: " + scrollback_count);
    if (loadingMsg) { showLoading(loadingMsg); } else {
        showLoading("load " + scrollback_count + " elements from message history");
    }
    return new Promise(function (resolve, reject) {
        if (scrollback_count == 0) {
            hideLoading();
            resolve();
        }
        matrixClient.scrollback(matrixClient.getRoom(roomId), scrollback_count)
            .then((room) => {
                console.log("scrollback loaded");
                hideLoading();
                resolve(room);
            });
    });
}

function init_body() {

}


// sendmsgs(10,matrixClient, sdkTestRoomId);
// sendCustomEvent(matrixClient, sdkTestRoomId);
// login();
// matrixClient.publicRooms(function (err, data) {
//     if (err) {
// 	   console.error("err %s", JSON.stringify(err));
//        return;
//     }
//     console.log("data %s [...]", JSON.stringify(data).substring(0, 100));
//     console.log("Congratulations! The SDK is working on the browser!");
//     var result = document.getElementById("result");
//     result.innerHTML = "<p>The SDK appears to be working correctly.</p>";
// });
// client.login