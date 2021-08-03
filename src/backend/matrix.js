import * as sdk from "matrix-js-sdk";
import { showLoading, hideLoading, updateRoomList } from "../main";
import NotebookTree from '../sturctures/notebook-tree'
// import { drawEvent } from '../drawing'

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


        for (let r in visibleRooms) {
            let room = visibleRooms[r];
            console.log(Array.from(room.currentState.events.keys()))
            if (!room.currentState.events.has('p.whiteboard.settings')) {
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

    async createWhiteboard(visibility = "private", whiteboardName = "unnamed Whiteboard") {

        let roomOpt = {
            // room_alias_name
            visibility: visibility,
            invite: [],
            name: whiteboardName == "" ? "unnamed Whiteboard" : whiteboardName,
        }
        showLoading("Creating whiteboard with Name: " + whiteboardName)
        let roomCreateData = await this.client.createRoom(roomOpt);
        hideLoading();
        return makeWhitebaordFromRoom(roomCreateData.room_id);
    }




    async makeWhitebaordFromRoom(roomId) {
        let content = {}
        let stateId = await this.client.sendStateEvent(roomId, "p.whiteboard.settings", content, "")
        showLoading("make Room " + this.client.getRoom(roomId).name + "a whiteboard")
        let prom = new Promise(function (resolve, reject) {
            let listenerFunc = function (msg, state, prevEvent) {
                if (msg.event.event_id == stateId.event_id) {
                    this.client.removeListener("RoomState.events", listenerFunc)
                    resolve()
                    hideLoading()
                }
            }
            this.client.on("RoomState.events", listenerFunc);
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
            if (msg.getType() === "p.whiteboard.object" && msg.status === "sent") {
                let item = project.getItem({ class: "Path", match: function (item) { return item.data.id == oldId } })
                if (item) {
                    item.data.id = msg.event.event_id
                }
                appData.objectStore.add(msg.event);            }
        })
        // var replacedEvents = new Set();
        this.client.on("Room.timeline", function (msg, room, toStartOfTimeline) {
            if (msg.isRedacted()) {
                console.log("skipped redacted evpped redacted event")
                return;
            }
            if (msg.getType() == "p.whiteboard.object") {
                // ANIMATED toggle
                appData.drawingCanvas.drawEvent(msg.event, Date.now() - msg.getDate().getTime() < 200000);
                // }
                if (msg.status == null) {
                    //event is not sending but loaded from scrollback
                    appData.objectStore.add(msg.event);
                }
            }
            if (msg.getType() == "m.room.redaction") {
                // this is debateable. When an event is super slow the canvas will still show it until some other event happens to trigger a redraw
                // if (Date.now() - msg.event.origin_server_ts < 200000) {
                appData.objectStore.redactById(msg.event.redacts, msg.event.room_id);
                // }
            }
            if (msg.getType() !== "m.room.message") {
                return; // only use messages
            }
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
}