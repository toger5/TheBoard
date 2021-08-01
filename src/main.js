import * as sdk from "matrix-js-sdk";
import NotebookTree from './notebook-tree.js'
import init_input from './input.js'
import ObjectStore from './sturctures/object-store'
import { drawingCanvas, drawEvent} from './drawing'
import { init_color_picker } from "./color-picker.js";
import init_tool_wheel from "./tools/tool-wheel.js";
import init_line_style_selector from "./tools/line-style-selector.js";
import { loginClicked } from "./actions.js";

export var currentRoomId = "";
export var currentUserId;
export var matrixClient;
export var objectStore = new ObjectStore();
// var paper_canvas = new PaperCanvas();
window.onload = function () {
    init_input(document.getElementById(drawingCanvas.css_id));
    init_color_picker();
    drawingCanvas.init();
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
var roomTree = new NotebookTree();

async function updateRoomTree() {
    roomTree.clear();
    let dateNow = Date.now()
    console.log("startGettingVisibleRooms")
    // return new Promise(function (resolve, reject) {
    let visibleRooms = matrixClient.getRooms();
    console.log("got all visible rooms" + (Date.now() - dateNow))
    let spaces = visibleRooms.filter(r => r.currentState.events.has('m.space.child'))


    for (let r in visibleRooms) {
        let room = visibleRooms[r];
        console.log(Array.from(room.currentState.events.keys()))
        if (!room.currentState.events.has('p.whiteboard.settings')) {
            continue // only show rooms which are marked as whiteboard rooms
        }
        let found = spaces.find(spaceRoom => spaceRoom.currentState.events.get('m.space.child').has(room.roomId))
        if (found) {
            if (found.roomId in roomTree.notebooks) {
                roomTree.notebooks[found.roomId].push(room.roomId)
            } else {
                roomTree.notebooks[found.roomId] = [room.roomId]
            }
            console.log("whiteboard is in space!: ", found)
        } else {
            roomTree.whiteboards.push(room.roomId)
        }
    }

    // resolve(room);
    // });
}
async function updateRoomList() {
    updateRoomTree()
    let leftbarBody = document.getElementById("leftbar-body")
    leftbarBody.innerHTML = ''
    for (let noteb of Object.keys(roomTree.notebooks)) {
        let notebookRoom = matrixClient.getRoom(noteb)
        leftbarBody.appendChild(createNotebook(notebookRoom.name, roomTree.notebooks[noteb]))
    }
    for (let whiteboard of roomTree.whiteboards) {
        leftbarBody.appendChild(createDOMWhiteboard(whiteboard, '#eee'))
    }
    // let id = room.roomId;
    // var roomButton = document.createElement("div");
    // console.log(id)
    // roomButton.onclick = function (a) { console.log(a); loadRoom(id); };
    // roomButton.classList.add("room-button");
    // var roomText = document.createElement("p");
    // roomText.innerText = visibleRooms[r].name;
    // roomButton.appendChild(roomText);
    // leftbarBody.insertBefore(roomButton, leftbarBody.firstChild);
}
function createNotebook(name, whiteboards) {
    let notebook = document.createElement("div")
    let header = document.createElement("div")
    let list = document.createElement("div")

    header.innerHTML = name;
    header.classList.add("notebook-header");
    let color = Color.random().toCSS()
    header.style.borderLeftColor = color;

    function getExpandHeight(list) {
        let height = 0
        for (let l of list.children) {
            height += l.getBoundingClientRect().height;
        }
        return height;
    }
    header.onclick = function (a) {
        if (list.style.height == "") { list.style.height = getExpandHeight(list) }
        if (list.getBoundingClientRect().height != 0) { list.style.height = 0 }
        else { list.style.height = getExpandHeight(list) }
    };
    notebook.appendChild(header);

    for (let id of whiteboards) {
        list.appendChild(createDOMWhiteboard(id, color))
    }
    list.classList.add("notebook-list");
    // list.style.height = getExpandHeight(list);
    notebook.appendChild(list);

    return notebook;
}
function createDOMWhiteboard(id, color) {
    let whiteboardButton = document.createElement("button")
    let room = matrixClient.getRoom(id);
    whiteboardButton.onclick = function (a) { console.log(a); loadRoom(id); };
    whiteboardButton.classList.add("room-button");
    whiteboardButton.style.borderLeftColor = color;
    whiteboardButton.innerHTML = room.name + "<br><span style='font-size:0.5em;color:#000'>" + room.roomId + "</span>";
    return whiteboardButton;
}
async function updateAddRoomList() {
    let visibleRooms = matrixClient.getVisibleRooms();
    let addRoomBody = document.getElementById("add-room-list");
    addRoomBody.innerHTML = ""
    for (let r of visibleRooms) {
        // let room = visibleRooms[r];
        console.log(Array.from(r.currentState.events.keys()))
        if (r.currentState.events.has('m.space.child')
            || r.currentState.events.has('p.whiteboard.settings')) {
            continue // only show rooms which are no spaces and are not already a whiteboard
        }
        let id = r.roomId;
        var roomButton = document.createElement("div");
        roomButton.onclick = async function (a) {
            console.log(a);
            a.currentTarget.style.backgroundColor = '#5e5'
            let room = await makeWhiteboardFromRoom(id);
            updateAddRoomList();
            updateRoomList();
            hideAddRoomMenu();
        };
        roomButton.classList.add("room-button");
        var roomText = document.createElement("p");
        roomText.innerText = r.name;
        roomButton.appendChild(roomText);
        addRoomBody.insertBefore(roomButton, addRoomBody.firstChild);
    }
}
async function createWhiteboard(visibility = "private", whiteboardName = "unnamed Whiteboard") {

    let roomOpt = {
        // room_alias_name
        visibility: visibility,
        invite: [],
        name: whiteboardName == "" ? "unnamed Whiteboard" : whiteboardName,
    }
    showLoading("Creating whiteboard with Name: " + whiteboardName)
    let roomCreateData = await matrixClient.createRoom(roomOpt);
    hideLoading();
    return makeWhiteboardFromRoom(roomCreateData.room_id);
}
async function makeWhiteboardFromRoom(roomId) {
    let content = {}
    let stateId = await matrixClient.sendStateEvent(roomId, "p.whiteboard.settings", content, "")
    showLoading("make Room " + matrixClient.getRoom(roomId).name + "a whiteboard")
    let prom = new Promise(function (resolve, reject) {
        let listenerFunc = function (msg, state, prevEvent) {
            if (msg.event.event_id == stateId.event_id) {
                matrixClient.removeListener("RoomState.events", listenerFunc)
                resolve()
                hideLoading()
            }
        }
        matrixClient.on("RoomState.events", listenerFunc);
    })
    return prom;
}

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

export async function login(username, password, serverDomain) {
    showLoading("Getting homeserver Information for domain " + serverDomain);
    let clientConf = await sdk.AutoDiscovery.findClientConfig(serverDomain);
    let baseUrl = clientConf["m.homeserver"].base_url;
    showLoading("login with: " + username + " on server: " + baseUrl);
    matrixClient = sdk.createClient({
        baseUrl: baseUrl
    });
    setupMatrixClientConnections();
    let registeredResult = await matrixClient.loginWithPassword(username, password, function (err) {
        if (err instanceof Error) {
            showLoading(err.message)
            return;
        } else {
            window.appData.currentRoomId = currentRoomId;
            window.appData.matrixClient = matrixClient;
            window.appData.objectStore = objectStore;

            hideLogin();
        }
    })
    currentUserId = registeredResult.user_id
    console.log(registeredResult);
    document.getElementById("userIdLabel").innerHTML = registeredResult.user_id;
    // document.getElementById("userIdLabel").innerHTML = registeredResult.user_id;
    showLoading("start client");
    let startedResult = await matrixClient.startClient({ initialSyncLimit: 0, lazyLoadMembers: true });
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
                showLoading("Select a whiteboard or create a new one")
                break;
        }
    });
    matrixClient.on("Room.localEchoUpdated", function (msg, room, oldId, newStatus) {
        if (msg.getType() === "p.whiteboard.object" && msg.status === "sent") {
            let item = project.getItem({ class: "Path", match: function (item) { return item.data.id == oldId } })
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
            // drawingCanvas.updateDisplay(true);
            // }
        }
        if (msg.getType() !== "m.room.message") {
            return; // only use messages
        }
        // console.log("event: ",msg)
        // console.log(msg.event.content.body);
    });
}
function cancelRoomLoading() {
    return new Promise((resolve, reject) => {
        resolve();
    });
}
async function loadRoom(roomId, scrollback_count = -1, allMessages = true) {
    drawingCanvas.clear();
    drawingCanvas.resetOffset();
    drawingCanvas.resetZoom();
    drawingCanvas.setZoom(0.5)
    showLoading("switching Room to: " + currentRoomId);
    console.log("switching Room to: " + currentRoomId);
    document.getElementById('leftbar').classList.remove('no-room-selected');
    objectStore.addRoom(roomId);
    currentRoomId = roomId;
    appData.currentRoomId = roomId;
    let s_back = scrollback_count;
    if (scrollback_count == -1) {
        if (Object.keys(objectStore.all()).length == 0) { s_back = 300; }
        else { s_back = 0; }
    }
    let room = matrixClient.getRoom(roomId);
    let settings = room.currentState.events.get('p.whiteboard.settings');
    if (settings.has("colorpalette")) {
        SetColorPalette(settings.get("colorpalette"))
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
        drawingCanvas.updateDisplay();
        currentScrollbackDate = new Date(roomLoaded.timeline[0].event.origin_server_ts);
        totalLoaded += s_back;
        scrollBackToken = room.oldState.paginationToken;
        if (!allMessages) { break; }
    }
    drawingCanvas.reload();
    drawingCanvas.updateDisplay();
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
            resolve(matrixClient.getRoom(currentRoomId));
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
