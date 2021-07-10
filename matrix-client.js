console.log("Loading browser sdk");

var currentRoomId = "";
const matrixClient = matrixcs.createClient({
    baseUrl: "https://matrix.org",
});

async function updateRoomList() {
    let visibleRooms = await matrixClient.getVisibleRooms();
    // var rooms = matrixClient.getRooms();
    // let idLabel = document.getElementById("userIdLabel");
    let leftbar = document.getElementById("leftbar");
    for (r in visibleRooms) {
        var roomButton = document.createElement("div");
        let id = visibleRooms[r].roomId;
        console.log(id)
        roomButton.onclick = function (a) { console.log(a); loadRoom(id); };
        roomButton.classList.add("room-button");
        var roomText = document.createElement("p");
        roomText.innerText = visibleRooms[r].name;
        roomButton.appendChild(roomText);
        leftbar.appendChild(roomButton);
    }
    console.log(visibleRooms);
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
        if (!room.redacted.has(obj.event_id)) {
            // room.all.push(obj);
        }
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
            delete room.allDict[id];
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
    span.innerHTML = "Loading: " + msg
}
function hideLoading() {
    let loading = document.getElementById("loading");
    loading.style.display = "none";
}
function hideLogin() {
    let login = document.getElementById("loginContainer");
    login.style.display = "none"
}
async function login(username, password) {
    showLoading("login with:", username, " ", password);
    let registerResult = await matrixClient.loginWithPassword(username, password, function (obj) {
        console.log(obj);
        hideLogin();
    })
    console.log(registerResult);
    document.getElementById("userIdLabel").innerHTML = registerResult.user_id;
    showLoading("start client");
    let startedResult = await matrixClient.startClient({ initialSyncLimit: 0 });
    showLoading("initial sync");
}
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
            // loadRoom(room_sdktesting2);
            showLoading("Press on an UNENCRYPTED Room (left) to start drawing")
            break;
    }
});
matrixClient.on("Room.localEchoUpdated", function (msg, room, oldId, newId) {
    if (msg.getType() === "p.whiteboard.object" && msg.status === "sent") {
        objectStore.add(msg.event);
        // console.log("now its sent")
    }
})
matrixClient.on("Room.timeline", function (msg, room, toStartOfTimeline) {
    if (msg.isRedacted()) {
        console.log("skipped redacted evpped redacted event")
        return;
    }
    if (msg.getType() == "p.whiteboard.object") {
        // console.log("event from : ", new Date(), msg.getDate());
        if (Date.now() - msg.getDate().getTime() < 200000) {
            drawEvent(msg.event, true);
        }
        if (msg.status == null) {
            //event is not sending but loaded from scrollback
            objectStore.add(msg.event);
        }
    }
    if (msg.getType() == "m.room.redaction") {
        // this is debatable. When an event is super slow the canvas will still show it until some other event happens to trigger a redraw
        if (Date.now() - msg.event.origin_server_ts < 200000) {
            objectStore.redactById(msg.event.redacts, msg.event.room_id);
            reloadCacheCanvas();
            updateDisplayCanvas(true);
        }
    }
    if (msg.getType() !== "m.room.message") {
        return; // only use messages
    }
    // console.log("event: ",msg)
    // console.log(msg.event.content.body);
});

function loadRoom(roomId, scrollback_count = -1) {
    showLoading("switching Room to: " + currentRoomId);
    console.log("switching Room to: " + currentRoomId);
    objectStore.addRoom(roomId);
    currentRoomId = roomId;
    let s_back = scrollback_count;
    if (scrollback_count == -1) {
        if (Object.keys(objectStore.all()).length == 0) { s_back = 200; }
        else { s_back = 0; }
    }
    showLoading("load room history");
    scrollback(currentRoomId, s_back).then(function(){ 
        reloadCacheCanvas();
        updateDisplayCanvas();
    });
}
function scrollback(roomId, scrollback_count = 200) {
    console.log("load scrollback for: " + roomId);
    console.log("load scrollback with element count: " + scrollback_count);
    return new Promise(function (resolve, reject) {
        if (scrollback_count == 0) {
            hideLoading();
            resolve();
        }
        matrixClient.scrollback(matrixClient.getRoom(roomId), scrollback_count)
            .then((room) => {
                // if (false) {
                //     for (i = room.timeline.length - 1; i >= 0; i--) {
                //         let event = room.timeline[i].event;
                //         if (event.type == "m.room.redaction") {
                //             console.log("scrollbak adds to redact: ", event.redacts);
                //             // can skip the removal becasue we iterate in backwards order
                //             objectStore.redactById(event.redacts, roomId, false);
                //         }
                //         // can be skipped, because this is also done in the on function
                //         if (event.type == "p.whiteboard.object") {
                //             objectStore.add(event);
                //         }
                //     }
                // }
                console.log("scrollback loaded");
                hideLoading();
                resolve();
                // reloadCacheCanvas();
                // updateDisplayCanvas();
            });
    });
}

function init_body() {
    init_drawing();
    init_input();
    load_pickr();


    var pwd_input = document.getElementById("login-form-password");

    pwd_input.addEventListener("keypress", function (event) {
        // Number 13 is the "Enter" key on the keyboard
        if (event.key === "Enter") {
            event.preventDefault();
            document.getElementById("login-submit").click();
        }
    });
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