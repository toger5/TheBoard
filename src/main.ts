
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
import { MatrixBackendAccountDriverSdk, MatrixBackendRoomDriverSdk, MatrixSdkSession } from './backend/matrix-backend-driver-sdk';
import { Color } from 'paper';
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

/**
 * `?mode=widget|sdk` decides; otherwise the board is a widget when it is embedded in a frame and
 * logs in with matrix-js-sdk when it is opened directly.
 */
function detectAppType(): AppType {
    const mode = new URLSearchParams(window.location.search).get("mode");
    if (mode === AppType.widget || mode === AppType.sdk) return mode;
    return window.parent !== window ? AppType.widget : AppType.sdk;
}

export const APP_TYPE: AppType = detectAppType();
const LAST_ROOM_STORAGE_KEY = "theboard_last_room";

export class AppData {
    private static internalInstance: AppData;
    public matrixBackend: MatrixBackend;
    public objectStore: ObjectStore;
    public drawingCanvas: PaperCanvas;
    /** Only in sdk mode. */
    public sdkSession?: MatrixSdkSession;
    constructor() {
        if (APP_TYPE == AppType.sdk) {
            this.sdkSession = new MatrixSdkSession();
            this.matrixBackend = new MatrixBackend(
                new MatrixBackendAccountDriverSdk(this.sdkSession),
                new MatrixBackendRoomDriverSdk(this.sdkSession),
            );
        } else {
            this.matrixBackend = new MatrixBackend(
                new MatrixBackendAccountDriverWidget(),
                new MatrixBackendRoomDriverWidget(),
            );
        }
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
    document.body.classList.add(APP_TYPE == AppType.widget ? "widget-mode" : "sdk-mode");
    const backend = AppData.instance.matrixBackend;
    try {
        if (APP_TYPE == AppType.sdk) {
            backend.driverAccount.on("login_required", () => {
                hideLoading();
                document.body.classList.add("login-required");
            });
        }
        await backend.init();
        await backend.login();
        document.body.classList.remove("login-required");
    } catch (e) {
        console.error(e);
        showLoading("The board could not start: " + (e?.message ?? e));
        return;
    }
    AppData.instance.drawingCanvas.init();
    init_input(document.getElementById(AppData.instance.drawingCanvas.css_id));
    init_color_picker();
    init_tool_wheel();
    init_line_style_selector();

    if (APP_TYPE == AppType.widget) {
        await loadRoom(backend.currentRoomId);
    } else {
        document.getElementById("userIdLabel").innerText = backend.getUserId();
        updateRoomList();
        const roomId = roomIdFromHash() ?? readLastRoom();
        if (roomId && AppData.instance.sdkSession.client.getRoom(roomId)) {
            await loadRoom(roomId);
        } else {
            showLoading("Select a whiteboard or create a new one");
        }
        window.addEventListener("hashchange", () => {
            const id = roomIdFromHash();
            if (id && id !== backend.currentRoomId) loadRoom(id);
        });
    }
}

// ---- Room selection (sdk mode) ----

function roomIdFromHash(): string | undefined {
    const match = /^#\/room\/(.+)$/.exec(window.location.hash);
    return match ? decodeURIComponent(match[1]) : undefined;
}

function readLastRoom(): string | undefined {
    try { return window.localStorage.getItem(LAST_ROOM_STORAGE_KEY) ?? undefined; } catch { return undefined; }
}

function sdkAccount(): MatrixBackendAccountDriverSdk {
    return AppData.instance.matrixBackend.driverAccount as MatrixBackendAccountDriverSdk;
}

export function updateRoomList() {
    if (APP_TYPE != AppType.sdk) return;
    const account = sdkAccount();
    const roomTree = account.updateRoomTree();
    const leftbarBody = document.getElementById("leftbar-body");
    leftbarBody.innerHTML = "";

    for (const notebookId of Object.keys(roomTree.notebooks)) {
        const notebookRoom = account.getRoom(notebookId);
        leftbarBody.appendChild(createNotebook(notebookRoom?.name ?? notebookId, roomTree.notebooks[notebookId]));
    }

    const spacer = document.createElement("div");
    spacer.style.height = "10px";
    leftbarBody.appendChild(spacer);

    for (const whiteboard of roomTree.whiteboards) {
        leftbarBody.appendChild(createDOMWhiteboard(whiteboard, "#eee"));
    }

    const addButton = document.createElement("button");
    addButton.id = "add-room-button";
    addButton.onclick = () => { (window as any).actions.showAddRoomMenu(); };
    addButton.innerText = "+";
    leftbarBody.appendChild(addButton);
}

function createNotebook(name: string, whiteboards: string[]) {
    const notebook = document.createElement("div");
    const header = document.createElement("div");
    const list = document.createElement("div");

    header.innerText = name;
    header.classList.add("notebook-header");
    const color = Color.random().toCSS(true);
    header.style.borderLeftColor = color;

    const expandedHeight = () => Array.from(list.children).reduce((h, l) => h + l.getBoundingClientRect().height, 0) + "px";
    header.onclick = () => {
        list.style.height = list.getBoundingClientRect().height != 0 ? "0px" : expandedHeight();
    };
    notebook.appendChild(header);

    for (const id of whiteboards) {
        list.appendChild(createDOMWhiteboard(id, color));
    }
    list.classList.add("notebook-list");
    notebook.appendChild(list);
    return notebook;
}

function createDOMWhiteboard(id: string, color: string) {
    const button = document.createElement("button");
    const room = sdkAccount().getRoom(id);
    button.onclick = () => { window.location.hash = "#/room/" + encodeURIComponent(id); };
    button.classList.add("room-button");
    button.style.borderLeftColor = color;
    const name = document.createElement("span");
    name.innerText = room?.name ?? id;
    const roomId = document.createElement("span");
    roomId.style.fontSize = "0.5em";
    roomId.style.color = "#000";
    roomId.innerText = id;
    button.append(name, document.createElement("br"), roomId);
    return button;
}

export function updateAddRoomList() {
    if (APP_TYPE != AppType.sdk) return;
    const addRoomBody = document.getElementById("add-room-list");
    addRoomBody.innerHTML = "";
    for (const room of sdkAccount().convertibleRooms()) {
        const roomButton = document.createElement("div");
        roomButton.onclick = async (ev) => {
            (ev.currentTarget as HTMLElement).style.backgroundColor = "#5e5";
            showLoading("Making " + room.name + " a whiteboard");
            await AppData.instance.matrixBackend.makeWhiteboardFromRoom(room.roomId);
            hideLoading();
            updateAddRoomList();
            updateRoomList();
            (window as any).actions.hideAddRoomMenu();
        };
        roomButton.classList.add("room-button");
        const roomText = document.createElement("p");
        roomText.innerText = room.name;
        roomButton.appendChild(roomText);
        addRoomBody.insertBefore(roomButton, addRoomBody.firstChild);
    }
}

async function createWhiteboard(visibility: string, name: string) {
    showLoading("Creating whiteboard " + name);
    try {
        const roomId = await AppData.instance.matrixBackend.createWhiteboard(visibility, name);
        updateRoomList();
        if (roomId) window.location.hash = "#/room/" + encodeURIComponent(roomId);
    } finally {
        hideLoading();
    }
}

Object.assign((window as any).actions, { updateRoomList, updateAddRoomList, createWhiteboard, loadRoom });

/** Show a room: clear the canvas and load its whole history. */
export async function loadRoom(roomId: string) {
    const backend = AppData.instance.matrixBackend;
    if (APP_TYPE == AppType.sdk) {
        (backend.driverRoom as MatrixBackendRoomDriverSdk).switchRoom(roomId);
        try { window.localStorage.setItem(LAST_ROOM_STORAGE_KEY, roomId); } catch { /* not remembered */ }
        document.getElementById("leftbar")?.classList.remove("no-room-selected");
        const room = sdkAccount().getRoom(roomId);
        document.getElementById("roomNameLabel").innerText = room?.name ?? roomId;
    }
    const drawC = AppData.instance.drawingCanvas;
    drawC.clear();
    AppData.instance.objectStore.resetRoom(roomId);
    drawC.setZoom(1.0);
    await backend.loadHistory();
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
