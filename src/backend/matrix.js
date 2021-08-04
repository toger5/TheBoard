import * as sdk from "matrix-js-sdk";
import { showLoading, hideLoading, updateRoomList } from "../main";
import NotebookTree from '../sturctures/notebook-tree'
import { isBoardCommitEvent, isBoardObjectEvent, isBoardRoom } from "./filter";
import { setAlpha } from "../helper";
import * as BoardEvent from './board-event-consts'
export default class MatrixBackend {
    constructor() {
        this.client = null
        this.currentRoomId = null
    }

    updateRoomTree() {
        let roomTree = new NotebookTree();
        let dateNow = Date.now()
        console.log("startGettingVisibleRooms")
        // return new Promise( (resolve, reject) {
        let visibleRooms = this.client.getRooms();
        console.log("got all visible rooms" + (Date.now() - dateNow))
        let spaces = visibleRooms.filter(r => r.currentState.events.has('m.space.child'))

        for (let room of visibleRooms) {
            // console.log(Array.from(room.currentState.events.keys()))
            if (!isBoardRoom(room.currentState.events)) {
                continue // only show rooms which are marked as whitebaord rooms
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
        return roomTree;
    }

    async createWhiteboard(visibility, whiteboardName) {
        let roomOpt = {
            // room_alias_name
            visibility: visibility,
            invite: [],
            name: whiteboardName == "" ? "unnamed Whiteboard" : whiteboardName,
        }
        showLoading("Creating whiteboard with Name: " + whiteboardName)
        let roomCreateData = await appData.matrixClient.client.createRoom(roomOpt);
        hideLoading();
        appData.matrixClient.makeWhiteboardFromRoom.bind(appData.matrixClient);
        return appData.matrixClient.makeWhiteboardFromRoom(roomCreateData.room_id);
    }
    async makeWhiteboardFromRoom(roomId) {
        let content = {}
        let client = appData.matrixClient.client;
        let stateId = await client.sendStateEvent(roomId, BoardEvent.BOARD_ROOM_STATE_NAME, content, "")
        showLoading("make Room " + client.getRoom(roomId).name + "a whiteboard")
        let prom = new Promise(function (resolve, reject) {
            let listenerFunc = function (msg, state, prevEvent) {
                if (msg.event.event_id == stateId.event_id) {
                    client.removeListener("RoomState.events", listenerFunc)
                    resolve()
                    hideLoading()
                }
            }
            client.on("RoomState.events", listenerFunc);
        })
        return prom;
    }

    async login(username, password, baseUrl, loginCallback) {
        showLoading("login with: " + username + " on server: " + baseUrl);
        this.client = sdk.createClient({
            baseUrl: baseUrl
        });
        appData.matrixClient = this;
        window.actions.createWhiteboard = this.createWhiteboard;
        window.actions.scrollback = this.scrollback;
        this.setupClientConnections();
        let registeredResult = await this.client.loginWithPassword(username, password, function (err) {
            if (err instanceof Error) {
                showLoading(err.message)
                return;
            } else {
                loginCallback();
            }
        })
        console.log(registeredResult);
        document.getElementById("userIdLabel").innerHTML = registeredResult.user_id;
        // document.getElementById("userIdLabel").innerHTML = registeredResult.user_id;
        showLoading("start client");
        let startedResult = await this.client.startClient({ initialSyncLimit: 0, lazyLoadMembers: true });
        showLoading("initial sync");
    }

    setupClientConnections() {
        this.client.on("sync", function (state, prevState, data) {
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
        this.client.on("Room.localEchoUpdated", function (msg, room, oldId, newStatus) {
            if (isBoardObjectEvent(msg.getType()) && msg.status === "sent") {

                let item = project.getItem({ class: "Path", match: function (item) { return item.data.id == oldId } })
                if (item) {
                    item.data.id = msg.event.event_id
                }
                appData.objectStore.add(msg.event);
            }
        })
        // var replacedEvents = new Set();
        this.client.on("Room.timeline", function (msg, room, toStartOfTimeline) {
            if (msg.isRedacted()) {
                console.log("skipped redacted evpped redacted event")
                return;
            }
            if (isBoardObjectEvent(msg.getType())) {
                let animated = Date.now() - msg.getDate().getTime() < 200000;
                appData.drawingCanvas.drawEvent(msg.event, animated);

                if (msg.status == null) {
                    //event is not sending but loaded from scrollback
                    appData.objectStore.add(msg.event);
                }
            }
            else if (isBoardCommitEvent(msg.getType())) {
                console.log("Commit Event", msg.event)
            }
            else if (msg.getType() == "m.room.redaction") {
                appData.objectStore.redactById(msg.event.redacts, msg.event.room_id);
            }
            // if (msg.getType() !== "m.room.message") {
            //     return;
            // }
        });
    }

    scrollback(roomId, scrollback_count = 200, loadingMsg = null) {
        console.log("load scrollback for: " + roomId);
        console.log("load scrollback with element count: " + scrollback_count);
        if (loadingMsg) { showLoading(loadingMsg); } else {
            showLoading("load " + scrollback_count + " elements from message history");
        }
        let client = this.client;
        let curRoomId = this.currentRoomId;
        return new Promise(function (resolve, reject) {
            if (scrollback_count == 0) {
                hideLoading();
                resolve(client.getRoom(curRoomId));
            }
            client.scrollback(client.getRoom(roomId), scrollback_count)
                .then((room) => {
                    console.log("scrollback loaded");
                    hideLoading();
                    resolve(room);
                });
        });
    }


    // Sending
    sendPath(paths, color, fillColor) {
        let precision = 2;
        let pathsObjArr = paths.map((p) => {
            let pZeroPos = p.clone();
            pZeroPos.position = pZeroPos.position.subtract(pZeroPos.bounds.topLeft);
            let pathObj = {
                "segments": pZeroPos.segments.map((s) => [s.point.x, s.point.y, s.handleIn.x, s.handleIn.y, s.handleOut.x, s.handleOut.y].map((v) => v.toFixed(precision)).join(" ")),
                "closed": pZeroPos.closed,
                "fillColor": pZeroPos.fillColor ? setAlpha(pZeroPos.fillColor.toCSS(true), pZeroPos.fillColor.alpha) : null,
                "strokeColor": pZeroPos.strokeColor ? setAlpha(pZeroPos.strokeColor.toCSS(true), pZeroPos.strokeColor.alpha) : null,
                "strokeWidth": pZeroPos.strokeWidth,
                "position": {
                    "x": p.bounds.topLeft.x.toFixed(precision),
                    "y": p.bounds.topLeft.y.toFixed(precision)
                }
            }

            pZeroPos.remove()
            return pathObj;
        })
        const content = {
            "version": 3,
            "objtype": "path",
            "paths": pathsObjArr,
        };
        appData.matrixClient.sendBoardObjectEvent(content)
    }
    sendBoardObjectEvent(content) {
        appData.matrixClient.client.sendEvent(appData.matrixClient.currentRoomId, BoardEvent.BOARD_OBJECT_EVENT_NAME, content, "", (err, res) => {
            console.log(err);
        });
    }
}