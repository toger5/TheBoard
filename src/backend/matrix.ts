import * as sdk from "matrix-js-sdk";
import { showLoading, hideLoading, /*updateRoomList,*/ AppData } from "../main";
import NotebookTree from '../sturctures/notebook-tree'
import { isBoardCommitEvent, isBoardObjectEvent, isBoardRoom } from "./filter";
import { setAlpha } from "../helper";
import * as BoardEvent from './board-event-consts'
import { MatrixBackendDriverAccount, MatrixBackendDriverRoom } from "./matrix-backend-driver";
// import { project } from "paper/dist/paper-core";
export const paper = require('paper');

export enum BackendEvent {
    BoardEvent = "board_event",
    BoardEventLocalEcho = "board_event_echo",
    RoomMessage = "room_message",
}

// supposed order of operations
// MatrixBackend.init()
//      driverAccount.init
//      driverRoom.init
//      MatrixBackend.setupClientConnections()
// MatrixBackend.login()
//      driverAccount.login
//      driverRoom.scrollback
export class MatrixBackend {
    private driverAccount: MatrixBackendDriverAccount;
    private driverRoom: MatrixBackendDriverRoom;

    constructor(driverAccount, driverRoom) {
        this.driverAccount = driverAccount;
        this.driverRoom = driverRoom;
    }

    public get currentRoomId(){
        return this.driverRoom.roomId;
    }

    async init() {
        await this.driverAccount.init();
        await this.driverRoom.init();
        this.setupClientConnections();
    }

    login(username?, password?, baseUrl?, loginCallback?): Promise<any> {
        return this.driverAccount.login(username, password, baseUrl)
    }

    scrollback(roomId, scrollback_count = 200, loadingMsg = null) {
        if (loadingMsg) { showLoading(loadingMsg); } else {
            showLoading("load " + scrollback_count + " elements from message history");
        }
        const _this = this;
        return new Promise<void>((resolve, reject) => {
            _this.driverRoom.scrollback(roomId, scrollback_count, loadingMsg)
                .then((roomMessages) => {
                    hideLoading();
                    resolve();
                })
        });
    }

    // Sending
    sendPath(paths) {
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
        return this.driverRoom.sendBoardObjectEvent(content)
    }

    sendText(textPaperItem) {
        let precision = 2;
        const content = {
            "version": 1,
            "text": textPaperItem.content,
            "fontSize": parseInt(textPaperItem.fontSize),
            "fontFamily": textPaperItem.fontFamily,
            "color": textPaperItem.fillColor.toCSS(true),
            "position": {
                "x": textPaperItem.point.x.toFixed(precision),
                "y": textPaperItem.point.y.toFixed(precision)
            },
            "objtype": "text"
        };
        return this.driverRoom.sendBoardObjectEvent(content)
    }

    async sendImage(textPaperRaster, file) {
        let precision = 2;
        // let file = new File(textPaperRaster.source,)
        this.driverRoom.uploadContent(file, true, (prog) => { showLoading("Upload Image: " + Math.round(prog.loaded / prog.total * 100)) + "%" }).then((mxcUrl) => {
            hideLoading();
            const content = {
                "version": 1,
                "url": mxcUrl,
                "position": {
                    "x": textPaperRaster.position.x.toFixed(precision),
                    "y": textPaperRaster.position.y.toFixed(precision)
                },
                "size": {
                    "width": Math.round(textPaperRaster.bounds.size.width.toFixed(precision)),
                    "height": Math.round(textPaperRaster.bounds.size.height.toFixed(precision))
                },
                "objtype": "image"
            };
            return this.driverRoom.sendBoardObjectEvent(content)
        })
    }

    updateRoomTree() {
        return this.driverAccount.updateRoomTree();
        // let roomTree = new NotebookTree();
        // let dateNow = Date.now()
        // // console.log("startGettingVisibleRooms")
        // // return new Promise( (resolve, reject) {
        // let visibleRooms = this.client.getRooms();
        // // console.log("got all visible rooms" + (Date.now() - dateNow))
        // let spaces = visibleRooms.filter(r => r.currentState.events.has('m.space.child'))

        // for (let room of visibleRooms) {
        //     // console.log(Array.from(room.currentState.events.keys()))
        //     if (!isBoardRoom(room.currentState.events)) {
        //         continue // only show rooms which are marked as whitebaord rooms
        //     }
        //     let found = spaces.find(spaceRoom => spaceRoom.currentState.events.get('m.space.child').has(room.roomId))
        //     if (found) {
        //         if (found.roomId in roomTree.notebooks) {
        //             roomTree.notebooks[found.roomId].push(room.roomId)
        //         } else {
        //             roomTree.notebooks[found.roomId] = [room.roomId]
        //         }
        //         console.log("whiteboard is in space!: ", found)
        //     } else {
        //         roomTree.whiteboards.push(room.roomId)
        //     }
        // }
        // return roomTree;
    }

    async createWhiteboard(visibility, whiteboardName) {
        return this.driverAccount.createWhiteboard(visibility, whiteboardName);
        // let roomOpt = {
        //     // room_alias_name
        //     visibility: visibility,
        //     invite: [],
        //     name: whiteboardName == "" ? "unnamed Whiteboard" : whiteboardName,
        // }
        // showLoading("Creating whiteboard with Name: " + whiteboardName)
        // let roomCreateData = await AppData.instance.matrixBackend.client.createRoom(roomOpt);
        // hideLoading();
        // AppData.instance.matrixBackend.makeWhiteboardFromRoom.bind(AppData.instance.matrixBackend);
        // return AppData.instance.matrixBackend.makeWhiteboardFromRoom(roomCreateData.room_id);
    }
    makeWhiteboardFromRoom(roomId): Promise<any> {
        return this.driverAccount.makeWhiteboardFromRoom(roomId)
        // let content = {}
        // let client = AppData.instance.matrixBackend.client;
        // let stateId = await client.sendStateEvent(roomId, BoardEvent.BOARD_ROOM_STATE_NAME, content, "")
        // showLoading("make Room " + client.getRoom(roomId).name + "a whiteboard")
        // let prom = new Promise(function (resolve, reject) {
        //     let listenerFunc = function (msg, state, prevEvent) {
        //         if (msg.event.event_id == stateId.event_id) {
        //             client.removeListener("RoomState.events", listenerFunc)
        //             resolve()
        //             hideLoading()
        //         }
        //     }
        //     client.on("RoomState.events", listenerFunc);
        // })
        // return prom;
    }


    setupClientConnections() {
        this.driverAccount.on("prepared", function (state, prevState, data) {
            // updateRoomList();
            showLoading("Select a whiteboard or create a new one");
            switch (state) {
                case "ERROR":
                    // update UI to say "Connection Lost"
                    break;
                case "SYNCING":
                    // update UI to remove any "Connection Lost" message
                    break;
                case "PREPARED":
                    // the client instance is ready to be queried.
                    // updateRoomList()
                    showLoading("Select a whiteboard or create a new one")
                    break;
            }
        });
        this.driverRoom.on(BackendEvent.BoardEventLocalEcho, function (msg, room, oldId, newStatus) {
            if (isBoardObjectEvent(msg.getType()) && msg.status === "sent") {

                let item = paper.project.getItem({ match: function (item) { return item.data.id == oldId } })
                if (item) {
                    item.data.id = msg.event.event_id
                    console.log("updated event Id for item")
                }
                AppData.instance.objectStore.add(msg.event);
            }
        })

        this.driverRoom.on(BackendEvent.BoardEvent, (msg: any) => {
            // let age = Date.now() - msg.getDate().getTime();
            // console.log("age ", age)
            let scrollbackEvent = msg.getDate().getTime() ? Date.now() - msg.getDate().getTime() < 10000 : false;
            let yourEvent = msg.event.sender == this.driverRoom.userId;
            const animated = !scrollbackEvent;// || yourEvent;
            let toBeginningOfTimeline = !animated;
            AppData.instance.drawingCanvas.drawEvent(msg.event, animated, toBeginningOfTimeline, false);
            if (msg.status == null) {
                // event already has a proper ID. because it is not status == sending, but loaded from scrollback or from another user
                console.log("the status from the message of the widget", msg.status)
                AppData.instance.objectStore.add(msg.event);
            }else{
                console.log("Ev is sending so it does not get added to the objectStore (will be added during local echo)")
            }
            // AppData.instance.objectStore.add(msg.event);
        });
        // this.client.on("Room.timeline", function (msg, room, toStartOfTimeline) {
        //     if (msg.isRedacted()) { return; } // skipp redacted events
        //     if (isBoardObjectEvent(msg.getType())) {
        //         let age = Date.now() - msg.getDate().getTime();
        //         // console.log("age ", age)
        //         let animated = Date.now() - msg.getDate().getTime() < 10000;
        //         let toBeginningOfTimeline = !animated;
        //         if (msg.event.room_id === AppData.instance.matrixBackend.currentRoomId) {
        //             AppData.instance.drawingCanvas.drawEvent(msg.event, animated, toBeginningOfTimeline, false);
        //         }
        //         if (msg.status == null) {
        //             // event already has a proper ID. because it is not status == sending, but loaded from scrollback
        //             AppData.instance.objectStore.add(msg.event);
        //         }
        //     }
        //     else if (isBoardCommitEvent(msg.getType())) {
        //         console.log("Commit Event", msg.event)
        //     }
        //     else if (msg.getType() == "m.room.redaction") {
        //         let room = AppData.instance.matrixBackend.client.getRoom(msg.event.room_id)
        //         if (room.timeline[0].getTs() < msg.getTs()) {
        //             AppData.instance.objectStore.redactById(msg.event.redacts, msg.getRoomId());
        //         }
        //     }
        //     // if (msg.getType() !== "m.room.message") {
        //     //     return;
        //     // }
        // });
    }
}
// old stuff:
// export default class MatrixBackend {
//     constructor() {
//         this.client = null
//         this.currentRoomId = null
//     }

//     updateRoomTree() {
//         let roomTree = new NotebookTree();
//         let dateNow = Date.now()
//         // console.log("startGettingVisibleRooms")
//         // return new Promise( (resolve, reject) {
//         let visibleRooms = this.client.getRooms();
//         // console.log("got all visible rooms" + (Date.now() - dateNow))
//         let spaces = visibleRooms.filter(r => r.currentState.events.has('m.space.child'))

//         for (let room of visibleRooms) {
//             // console.log(Array.from(room.currentState.events.keys()))
//             if (!isBoardRoom(room.currentState.events)) {
//                 continue // only show rooms which are marked as whitebaord rooms
//             }
//             let found = spaces.find(spaceRoom => spaceRoom.currentState.events.get('m.space.child').has(room.roomId))
//             if (found) {
//                 if (found.roomId in roomTree.notebooks) {
//                     roomTree.notebooks[found.roomId].push(room.roomId)
//                 } else {
//                     roomTree.notebooks[found.roomId] = [room.roomId]
//                 }
//                 console.log("whiteboard is in space!: ", found)
//             } else {
//                 roomTree.whiteboards.push(room.roomId)
//             }
//         }
//         return roomTree;
//     }

//     async createWhiteboard(visibility, whiteboardName) {
//         let roomOpt = {
//             // room_alias_name
//             visibility: visibility,
//             invite: [],
//             name: whiteboardName == "" ? "unnamed Whiteboard" : whiteboardName,
//         }
//         showLoading("Creating whiteboard with Name: " + whiteboardName)
//         let roomCreateData = await AppData.instance.matrixBackend.client.createRoom(roomOpt);
//         hideLoading();
//         AppData.instance.matrixBackend.makeWhiteboardFromRoom.bind(AppData.instance.matrixBackend);
//         return AppData.instance.matrixBackend.makeWhiteboardFromRoom(roomCreateData.room_id);
//     }
//     async makeWhiteboardFromRoom(roomId) {
//         let content = {}
//         let client = AppData.instance.matrixBackend.client;
//         let stateId = await client.sendStateEvent(roomId, BoardEvent.BOARD_ROOM_STATE_NAME, content, "")
//         showLoading("make Room " + client.getRoom(roomId).name + "a whiteboard")
//         let prom = new Promise(function (resolve, reject) {
//             let listenerFunc = function (msg, state, prevEvent) {
//                 if (msg.event.event_id == stateId.event_id) {
//                     client.removeListener("RoomState.events", listenerFunc)
//                     resolve()
//                     hideLoading()
//                 }
//             }
//             client.on("RoomState.events", listenerFunc);
//         })
//         return prom;
//     }

//     async login(username, password, baseUrl, loginCallback) {
//         showLoading("login with: " + username + " on server: " + baseUrl);
//         this.client = sdk.createClient({
//             baseUrl: baseUrl
//         });
//         AppData.instance.matrixBackend = this;
//         window.actions.createWhiteboard = this.createWhiteboard;
//         window.actions.scrollback = this.scrollback;
//         AppData.instance.matrixBackend.setupClientConnections();
//         let registeredResult = await this.client.loginWithPassword(username, password, function (err) {
//             if (err instanceof Error) {
//                 showLoading(err.message)
//                 return;
//             } else {
//                 loginCallback();
//             }
//         })
//         console.log(registeredResult);
//         document.getElementById("userIdLabel").innerHTML = registeredResult.user_id;
//         // document.getElementById("userIdLabel").innerHTML = registeredResult.user_id;
//         showLoading("start client");
//         let startedResult = await this.client.startClient({ initialSyncLimit: 0, lazyLoadMembers: true });
//         showLoading("initial sync");
//     }

//     setupClientConnections() {
//         this.client.on("sync", function (state, prevState, data) {
//             switch (state) {
//                 case "ERROR":
//                     // update UI to say "Connection Lost"
//                     break;
//                 case "SYNCING":
//                     // update UI to remove any "Connection Lost" message
//                     break;
//                 case "PREPARED":
//                     // the client instance is ready to be queried.
//                     updateRoomList()
//                     showLoading("Select a whiteboard or create a new one")
//                     break;
//             }
//         });
//         this.client.on("Room.localEchoUpdated", function (msg, room, oldId, newStatus) {
//             if (isBoardObjectEvent(msg.getType()) && msg.status === "sent") {

//                 let item = project.getItem({ match: function (item) { return item.data.id == oldId } })
//                 if (item) {
//                     item.data.id = msg.event.event_id
//                 }
//                 AppData.instance.objectStore.add(msg.event);
//             }
//         })
//         // var replacedEvents = new Set();
//         this.client.on("Room.timeline", function (msg, room, toStartOfTimeline) {
//             if (msg.isRedacted()) { return; } // skipp redacted events
//             if (isBoardObjectEvent(msg.getType())) {
//                 let age = Date.now() - msg.getDate().getTime();
//                 // console.log("age ", age)
//                 let animated = Date.now() - msg.getDate().getTime() < 10000;
//                 let toBeginningOfTimeline = !animated;
//                 if (msg.event.room_id === AppData.instance.matrixBackend.currentRoomId) {
//                     AppData.instance.drawingCanvas.drawEvent(msg.event, animated, toBeginningOfTimeline, false);
//                 }
//                 if (msg.status == null) {
//                     // event already has a proper ID. because it is not status == sending, but loaded from scrollback
//                     AppData.instance.objectStore.add(msg.event);
//                 }
//             }
//             else if (isBoardCommitEvent(msg.getType())) {
//                 console.log("Commit Event", msg.event)
//             }
//             else if (msg.getType() == "m.room.redaction") {
//                 let room = AppData.instance.matrixBackend.client.getRoom(msg.event.room_id)
//                 if (room.timeline[0].getTs() < msg.getTs()) {
//                     AppData.instance.objectStore.redactById(msg.event.redacts, msg.getRoomId());
//                 }
//             }
//             // if (msg.getType() !== "m.room.message") {
//             //     return;
//             // }
//         });
//     }

//     // scrollback(roomId, scrollback_count = 200, loadingMsg = null) {
//     //     if (loadingMsg) { showLoading(loadingMsg); } else {
//     //         showLoading("load " + scrollback_count + " elements from message history");
//     //     }
//     //     let client = this.client;
//     //     return new Promise(function (resolve, reject) {
//     //         if (scrollback_count == 0) {
//     //             hideLoading();
//     //             resolve(client.getRoom(roomId));
//     //         }
//     //         client.scrollback(client.getRoom(roomId), scrollback_count)
//     //             .then((room) => {
//     //                 // console.log("scrollback loaded");
//     //                 hideLoading();
//     //                 resolve(room);
//     //             });
//     //     });
//     // }


//     // Sending
//     // sendPath(paths) {
//     //     let precision = 2;
//     //     let pathsObjArr = paths.map((p) => {
//     //         let pZeroPos = p.clone();
//     //         pZeroPos.position = pZeroPos.position.subtract(pZeroPos.bounds.topLeft);
//     //         let pathObj = {
//     //             "segments": pZeroPos.segments.map((s) => [s.point.x, s.point.y, s.handleIn.x, s.handleIn.y, s.handleOut.x, s.handleOut.y].map((v) => v.toFixed(precision)).join(" ")),
//     //             "closed": pZeroPos.closed,
//     //             "fillColor": pZeroPos.fillColor ? setAlpha(pZeroPos.fillColor.toCSS(true), pZeroPos.fillColor.alpha) : null,
//     //             "strokeColor": pZeroPos.strokeColor ? setAlpha(pZeroPos.strokeColor.toCSS(true), pZeroPos.strokeColor.alpha) : null,
//     //             "strokeWidth": pZeroPos.strokeWidth,
//     //             "position": {
//     //                 "x": p.bounds.topLeft.x.toFixed(precision),
//     //                 "y": p.bounds.topLeft.y.toFixed(precision)
//     //             }
//     //         }

//     //         pZeroPos.remove()
//     //         return pathObj;
//     //     })
//     //     const content = {
//     //         "version": 3,
//     //         "objtype": "path",
//     //         "paths": pathsObjArr,
//     //     };
//     //     return AppData.instance.matrixBackend.sendBoardObjectEvent(content)
//     // }

//     // sendText(textPaperItem) {
//     //     let precision = 2;
//     //     const content = {
//     //         "version": 1,
//     //         "text": textPaperItem.content,
//     //         "fontSize": parseInt(textPaperItem.fontSize),
//     //         "fontFamily": textPaperItem.fontFamily,
//     //         "color": textPaperItem.fillColor.toCSS(true),
//     //         "position": {
//     //             "x": textPaperItem.point.x.toFixed(precision),
//     //             "y": textPaperItem.point.y.toFixed(precision)
//     //         },
//     //         "objtype": "text"
//     //     };
//     //     return AppData.instance.matrixBackend.sendBoardObjectEvent(content)
//     // }

//     // async sendImage(textPaperRaster, file) {
//     //     let precision = 2;
//     //     // let file = new File(textPaperRaster.source,)
//     //     AppData.instance.matrixBackend.client.uploadContent(file, { onlyContentUri: true, progressHandler: (prog) => { showLoading("Upload Image: " + Math.round(prog.loaded / prog.total * 100)) + "%" } }).then((mxcUrl) => {
//     //         hideLoading();
//     //         const content = {
//     //             "version": 1,
//     //             "url": mxcUrl,
//     //             "position": {
//     //                 "x": textPaperRaster.position.x.toFixed(precision),
//     //                 "y": textPaperRaster.position.y.toFixed(precision)
//     //             },
//     //             "size": {
//     //                 "width": Math.round(textPaperRaster.bounds.size.width.toFixed(precision)),
//     //                 "height": Math.round(textPaperRaster.bounds.size.height.toFixed(precision))
//     //             },
//     //             "objtype": "image"
//     //         };
//     //         return AppData.instance.matrixBackend.sendBoardObjectEvent(content)
//     //     })
//     // }

//     // sendBoardObjectEvent(content) {
//     //     return AppData.instance.matrixBackend.client.sendEvent(AppData.instance.matrixBackend.currentRoomId, BoardEvent.BOARD_OBJECT_EVENT_NAME, content, "", (err, res) => {
//     //         console.log(err);
//     //     });
//     // }
// }