
import init_input from './input.js'
// import 'core-js'
import ObjectStore from './sturctures/object-store'
import MatrixBackend from './backend/matrix.js';
import PaperCanvas from './paper-canvas'
import { init_color_picker } from "./color-picker";
import init_tool_wheel from "./tools/tool-wheel";
import init_line_style_selector from "./tools/line-style-selector";
import "./components/login-container";
import { isBoardRoom } from './backend/filter';
import * as BoardEvent from './backend/board-event-consts';
import './actions'
import { RightPanel } from './components/right-panel/right-panel'
import { BOARD_OBJECT_EVENT_NAME } from './backend/board-event-consts'
import { posFromEv, sizeFromEv } from './helper'
window.appData = {
    matrixClient: new MatrixBackend(),
    objectStore: new ObjectStore(),
    drawingCanvas: new PaperCanvas(),
}

window.onload = function () {
    appData.drawingCanvas.init();
    init_input(document.getElementById(appData.drawingCanvas.css_id));
    init_color_picker();
    init_tool_wheel();
    init_line_style_selector();
    window.appData.rightPanel = new RightPanel()
    window.actions.updateRoomList = () => { updateRoomList() };
    window.actions.updateAddRoomList = updateAddRoomList;
}
export function updateRoomList() {
    let roomTree = appData.matrixClient.updateRoomTree()
    let leftbarBody = document.getElementById("leftbar-body")
    leftbarBody.innerHTML = ''

    for (let noteb of Object.keys(roomTree.notebooks)) {
        let notebookRoom = appData.matrixClient.client.getRoom(noteb)
        leftbarBody.appendChild(createNotebook(notebookRoom.name, roomTree.notebooks[noteb]))
    }

    let spacer = document.createElement('div');
    spacer.style.height = '10px'
    leftbarBody.appendChild(spacer)

    for (let whiteboard of roomTree.whiteboards) {
        leftbarBody.appendChild(createDOMWhiteboard(whiteboard, '#eee'))
    }

    let addButton = document.createElement('button');
    addButton.id = 'add-room-button'
    addButton.onclick = (e) => { actions.showAddRoomMenu() }
    addButton.innerText = '+'
    leftbarBody.appendChild(addButton)
    // <button id="add-room-button" onclick="actions.showAddRoomMenu()">+</button>
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
    let room = appData.matrixClient.client.getRoom(id);
    whiteboardButton.onclick = function (a) { console.log(a); loadRoom(id); };
    whiteboardButton.classList.add("room-button");
    whiteboardButton.style.borderLeftColor = color;
    whiteboardButton.innerHTML = room.name + "<br><span style='font-size:0.5em;color:#000'>" + room.roomId + "</span>";
    return whiteboardButton;
}
export async function updateAddRoomList() {
    let visibleRooms = appData.matrixClient.client.getVisibleRooms();
    let addRoomBody = document.getElementById("add-room-list");
    addRoomBody.innerHTML = ""
    for (let r of visibleRooms) {
        // let room = visibleRooms[r];
        console.log(Array.from(r.currentState.events.keys()))
        if (r.currentState.events.has('m.space.child')
            || isBoardRoom(r.currentState.events)) {
            continue // only show rooms which are no spaces and are not already a whiteboard
        }
        let id = r.roomId;
        var roomButton = document.createElement("div");
        roomButton.onclick = async function (a) {
            console.log(a);
            a.currentTarget.style.backgroundColor = '#5e5'
            let room = await appData.matrixClient.makeWhiteboardFromRoom(id);
            updateAddRoomList();
            updateRoomList();
            actions.hideAddRoomMenu();
        };
        roomButton.classList.add("room-button");
        var roomText = document.createElement("p");
        roomText.innerText = r.name;
        roomButton.appendChild(roomText);
        addRoomBody.insertBefore(roomButton, addRoomBody.firstChild);
    }
}
export function showLoading(msg) {
    let loading = document.getElementById("loading");
    // loading.style.display = "block";
    loading.style.transform = 'translate(0, 0)'
    let span = document.getElementById("loading-span");
    span.innerHTML = msg
}
export function hideLoading() {
    let loading = document.getElementById("loading");
    // loading.style.display = "none";
    loading.style.transform = 'translate(0, -80px)'
}

// function cancelRoomLoading() {
//     return new Promise((resolve, reject) => {
//         resolve();
//     });
// }
async function loadRoom(roomId, scrollback_count = 500, allMessages = true) {
    let drawC = appData.drawingCanvas;
    drawC.clear();

    // animate class list to the left. no-room-selected class puts it in the center:
    document.getElementById('leftbar').classList.remove('no-room-selected');

    appData.objectStore.addRoom(roomId);

    appData.matrixClient.currentRoomId = roomId;
    drawC.setZoom(1.0)
    let viewNeedToScrollToLastObject = centerToNewestObject()
    drawC.reload() // load already cached messages which we won't get from scrollback events

    // setup gui for the loading process
    let room = appData.matrixClient.client.getRoom(roomId);
    appData.rightPanel.updateMember(roomId)

    showLoading("switching Room to: " + room.name + "<span style='font-size:10px' >" + roomId + "</span>");
    document.getElementById('roomNameLabel').innerText = room.name
    let settings = room.currentState.events.get(BoardEvent.BOARD_ROOM_STATE_NAME);
    if (settings && settings.has("colorpalette")) {
        SetColorPalette(settings.get("colorpalette"))
    }
    showLoading("load room history");
    const dateOptions = { year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric' };
    let currentScrollbackDate = new Date()
    let nowDate = new Date();
    let createDate = new Date(room.currentState.getStateEvents('m.room.create', "").event.origin_server_ts);
    let totalLoaded = 0
    while (true) {
        let percent = 1 - ((currentScrollbackDate - createDate) / (nowDate - createDate))
        let roomLoaded = await appData.matrixClient.scrollback(appData.matrixClient.currentRoomId, scrollback_count, "Loaded: " + Math.floor(percent * 100) + "% (elements: " + totalLoaded + ")</br> <span style='font-size:10px'>to Date: " + currentScrollbackDate.toLocaleDateString('de-DE', dateOptions) + "  Target: " + createDate.toLocaleDateString('de-DE', dateOptions) + "</span>");
        if (viewNeedToScrollToLastObject) {
            viewNeedToScrollToLastObject = centerToNewestObject()
        }
        currentScrollbackDate = new Date(roomLoaded.timeline[0].event.origin_server_ts);
        if (totalLoaded === roomLoaded.timeline.length) { console.log("Stop Loading because: totalLoaded == roomLoaded.timeline.length"); break; }
        if (roomLoaded.oldState.paginationToken == null) { console.log("Stop Loading because: paginationToken"); break; }
        if (!allMessages) { break }
        totalLoaded = roomLoaded.timeline.length;

    }
    function centerToNewestObject() {
        let allSorted = appData.objectStore.allSorted()
        if (allSorted.length > 0) {
            let lastObj = allSorted[allSorted.length - 1]
            let pos = posFromEv(lastObj.content);
            let size = sizeFromEv(lastObj.content);
            appData.drawingCanvas.setOffset(pos.add(size.multiply(0.5)))
            return false
        }
        return true
    }
}
