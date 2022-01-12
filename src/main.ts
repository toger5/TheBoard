
import init_input from './input.js'
import 'core-js'
import ObjectStore from './sturctures/object-store'
import { MatrixBackend } from './backend/matrix';
import PaperCanvas from './paper-canvas'
import { init_color_picker } from "./color-picker";
import init_tool_wheel from "./tools/tool-wheel";
import init_line_style_selector from "./tools/line-style-selector";
import "./components/login-container";
import * as BoardEvent from './backend/board-event-consts';
import './actions'
import { posFromEv, sizeFromEv } from './helper'
import { MatrixBackendAccountDriverWidget, MatrixBackendRoomDriverWidget } from './backend/matrix-backend-driver-widget';
import { MatrixBackendAccountDriverSdk, MatrixBackendRoomDriverSdk } from './backend/matrix-backend-driver-sdk';
/*
 * Copyright 2020 The Matrix.org Foundation C.I.C.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
export enum AppType {
    widget = "widget",
    sdk = "sdk",
}

export const APP_TYPE = AppType.widget as any;

export class AppData {
    private static internalInstance: AppData;
    public matrixBackend: MatrixBackend;
    public objectStore: ObjectStore;
    public drawingCanvas: PaperCanvas;
    constructor() {
        this.matrixBackend = new MatrixBackend(
            APP_TYPE == AppType.sdk ? new MatrixBackendAccountDriverSdk() : new MatrixBackendAccountDriverWidget(),
            APP_TYPE == AppType.sdk ? new MatrixBackendRoomDriverSdk() : new MatrixBackendRoomDriverWidget(),
        );
        this.objectStore = new ObjectStore();
        this.drawingCanvas = new PaperCanvas();
    }
    public static get instance(): AppData {
        if (!AppData.internalInstance) {
            AppData.internalInstance = new AppData();
        }
        return AppData.internalInstance;
    }
}
(window as any).AppData = AppData;
window.onload = async function () {
    console.log("A")
    await AppData.instance.matrixBackend.init();
    console.log("B")
    await AppData.instance.matrixBackend.login();
    console.log("C")
    AppData.instance.drawingCanvas.init();
    init_input(document.getElementById(AppData.instance.drawingCanvas.css_id));
    init_color_picker();
    init_tool_wheel();
    init_line_style_selector();
    loadRoomWidget();

    // window.AppData.instance.rightPanel = new RightPanel()
    // window.actions.updateRoomList = () => { updateRoomList() };
    // window.actions.updateAddRoomList = updateAddRoomList;
}
/*






export function updateRoomList() {
    let roomTree = AppData.instance.matrixBackend.updateRoomTree()
    let leftbarBody = document.getElementById("leftbar-body")
    leftbarBody.innerHTML = ''

    for (let noteb of Object.keys(roomTree.notebooks)) {
        let notebookRoom = AppData.instance.matrixBackend.client.getRoom(noteb)
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
    let room = AppData.instance.matrixBackend.client.getRoom(id);
    whiteboardButton.onclick = function (a) { console.log(a); loadRoom(id); };
    whiteboardButton.classList.add("room-button");
    whiteboardButton.style.borderLeftColor = color;
    whiteboardButton.innerHTML = room.name + "<br><span style='font-size:0.5em;color:#000'>" + room.roomId + "</span>";
    return whiteboardButton;
}
export async function updateAddRoomList() {
    let visibleRooms = AppData.instance.matrixBackend.client.getVisibleRooms();
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
            let room = await AppData.instance.matrixBackend.makeWhiteboardFromRoom(id);
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
*/
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
async function loadRoomWidget() {
    const roomId = AppData.instance.matrixBackend.currentRoomId;
    let drawC = AppData.instance.drawingCanvas;
    drawC.clear();
    AppData.instance.objectStore.addRoom(roomId);
    drawC.setZoom(1.0)
    drawC.reload() // load already cached messages which we won't get from scrollback events
    await AppData.instance.matrixBackend.scrollback(roomId, 1000);
}
async function loadRoom(roomId, scrollback_count = 500, allMessages = true) {
    /*
    let drawC = AppData.instance.drawingCanvas;
    drawC.clear();

    // animate class list to the left. no-room-selected class puts it in the center:
    // document.getElementById('leftbar').classList.remove('no-room-selected');

    AppData.instance.objectStore.addRoom(roomId);

    AppData.instance.matrixBackend.currentRoomId = roomId;
    drawC.setZoom(1.0)
    let viewNeedToScrollToLastObject = centerToNewestObject()
    drawC.reload() // load already cached messages which we won't get from scrollback events

    // setup gui for the loading process
    let room = AppData.instance.matrixBackend.client.getRoom(roomId);
    AppData.instance.rightPanel.updateMember(roomId)

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
        let roomLoaded = await AppData.instance.matrixBackend.scrollback(AppData.instance.matrixBackend.currentRoomId, scrollback_count, "Loaded: " + Math.floor(percent * 100) + "% (elements: " + totalLoaded + ")</br> <span style='font-size:10px'>to Date: " + currentScrollbackDate.toLocaleDateString('de-DE', dateOptions) + "  Target: " + createDate.toLocaleDateString('de-DE', dateOptions) + "</span>");
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
        let allSorted = AppData.instance.objectStore.allSorted()
        if (allSorted.length > 0) {
            let lastObj = allSorted[allSorted.length - 1]
            let pos = posFromEv(lastObj.content);
            let size = sizeFromEv(lastObj.content);
            AppData.instance.drawingCanvas.setOffset(pos.add(size.multiply(0.5)))
            return false
        }
        return true
    }
    */
}
