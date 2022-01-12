import EventEmitter from 'events';
import { WidgetApi, WidgetApiToWidgetAction } from 'matrix-widget-api';
import { BOARD_OBJECT_EVENT_NAME } from './board-event-consts';
import { BackendEvent } from './matrix';
import { MatrixBackendDriverAccount, MatrixBackendDriverRoom } from './matrix-backend-driver';

export class MatrixBackendRoomDriverWidget extends EventEmitter implements MatrixBackendDriverRoom {
    private widgetApi: WidgetApi;
    private _roomId: string;
    private _userId?: string;
    private roomName: string;
    private emittedEventIds: Set<string>;
    constructor(roomId?: string) {
        super()
        this._roomId = roomId;
        this.roomName = "unknown";
        this.emittedEventIds = new Set();
    }
    get roomId(): string {
        return this._roomId;
    }
    get userId(): string {
        return this._userId;
    }
    init(): Promise<string> {
        const _this = this;
        return new Promise((resolve: (value?) => void) => {
            function parseFragment() {
                const fragmentString = (window.location.hash || "?");
                return new URLSearchParams(fragmentString.substring(Math.max(fragmentString.indexOf('?'), 0)));
            }

            function assertParam(fragment, name) {
                const val = fragment.get(name);
                if (!val) throw new Error(`${name} is not present in URL - cannot load widget`);
                return val;
            }

            function handleError(e) {
                console.error(e);
                document.getElementById("container").innerText = "There was an error with the widget. See JS console for details.";
            }

            // const widgetId = "TheBoard.github.io"; // if you know the widget ID, supply it.

            const qs = parseFragment();
            let widgetId = assertParam(qs, 'widgetId');
            // let widgetId = null;
            _this._userId = assertParam(qs, 'userId');
            const api = new WidgetApi(widgetId);
            api.requestCapabilityToReceiveEvent(BOARD_OBJECT_EVENT_NAME);
            api.requestCapabilityToSendEvent(BOARD_OBJECT_EVENT_NAME);

            // api.requestCapabilityToReceiveEvent("m.room.message");
            // api.requestCapabilityToSendEvent("m.room.message");

            api.requestCapabilityToReceiveState("m.room.name");
            // api.requestCapabilityToSendEvent(BOARD_COMMIT_EVENT_NAME);
            // api.requestCapabilityToReceiveEvent(BOARD_COMMIT_EVENT_NAME);
            // Add custom action handlers (if needed)
            // api.on(`action:${WidgetApiToWidgetAction.UpdateVisibility}`, (ev: CustomEvent<IVisibilityActionRequest>) => {
            //     ev.preventDefault(); // we're handling it, so stop the widget API from doing something.
            //     console.log(ev.detail); // custom handling here
            //     api.transport.reply(ev.detail, <IWidgetApiRequestEmptyData>{});
            // });
            // api.on("action:com.example.my_action", (ev: CustomEvent<ICustomActionRequest>) => {
            //     ev.preventDefault(); // we're handling it, so stop the widget API from doing something.
            //     console.log(ev.detail); // custom handling here
            //     api.transport.reply(ev.detail, {custom: "reply"});
            // });
            api.on("ready", function (test) {
                api.readStateEvents("m.room.name", 1, "").then((nameEvent) => {
                    _this._roomId = nameEvent[0].room_id;
                    _this.roomName = nameEvent[0].content.name;
                    resolve();
                })
            });
            api.on(`action:${WidgetApiToWidgetAction.SendEvent}`, (ev) => {
                // console.log("ToWidget.SendEvent", ev)
                switch (ev.detail.data.type) {
                    case BOARD_OBJECT_EVENT_NAME:
                        console.log("from on action: ", ev.detail.data)
                        // This really needs to be improved. a local echo list is required with all the temp id's
                        // if(ev.detail.data.sender == this.userId){
                        if (_this.emittedEventIds.has(ev.detail.data.event_id)) {
                            console.log("REMOVED: ", ev.detail.data)
                            _this.emittedEventIds.delete(ev.detail.data.event_id);
                        } else {
                            _this.emit(BackendEvent.BoardEvent, _this.evToMsg(ev.detail.data), _this.roomId);
                        }
                        // }else{
                        //     _this.emit(BackendEvent.BoardEvent, _this.evToMsg(ev.detail.data));
                        // }
                        break;
                    case "m.room.message":
                        // there are no permissions for this atm
                        console.log(ev.detail.data.content)
                        _this.emit(BackendEvent.RoomMessage, ev.detail.data);
                        break;
                    default:
                        break;
                }
            })
            this.widgetApi = api;
            // Start the messaging
            api.start();
        });
    }

    scrollback(roomId: string, scrollback_count = 200, loadingMsg = null) {
        // let client = this.client;
        const _this = this;
        return new Promise((resolve, reject) => {
            if (scrollback_count == 0) {
                resolve(roomId);
            }
            _this.widgetApi.readRoomEvents(BOARD_OBJECT_EVENT_NAME, 1000).then((roomEvents) => {
                console.log("room events", roomEvents)
                let messages = (roomEvents as any[]).map((val) => _this.evToMsg(val));
                for (const msg of messages) {
                    this.emit(BackendEvent.BoardEvent, msg)
                }
                resolve(messages);
            });
        });
    }
    private evToMsg(ev, state?: string) {
        let msg = {
            event: ev,
            status: state ?? "send",
            getDate: () => new Date(ev.origin_server_ts * 1000),
            getType: () => BOARD_OBJECT_EVENT_NAME,
        }
        return msg;
    }
    uploadContent(file: any, onlyContentUri: any, progressHandler: (state: { loaded: number; total: number; }) => void): Promise<any> {
        // return this.client.uploadContent(file, { onlyContentUri: onlyContentUri, progressHandler: progressHandler })
        // (prog) => { showLoading("Upload Image: " + Math.round(prog.loaded / prog.total * 100)) + "%" }
        console.warn("Can't upload a file with the widget api.")
        return new Promise((r: (_v?) => void) => { r() });
    }

    sendBoardObjectEvent(content) {
        const tempEventId = "echoId" + Date.now()
        // local echo
        //             if (isBoardObjectEvent(msg.getType()) && msg.status === "sent") {

        //                 let item = project.getItem({ match: function (item) { return item.data.id == oldId } })
        //                 if (item) {
        //                     item.data.id = msg.event.event_id
        //                 }
        //                 AppData.instance.objectStore.add(msg.event);
        //             }
        const roomId = this.roomId;
        let msg = this.evToMsg({
            content: content,
            event_id: tempEventId,
        }, "NOT_SENT")

        const returnVal = this.widgetApi.sendRoomEvent(BOARD_OBJECT_EVENT_NAME, content).then((value) => {
            // let msg = value as { event_id: string, room_id: string, content?: any, getType?: () => string, getDate?: () => Date, status: string };
            console.log("from promise: ", value);
            // let m = msg as any;
            let ev = {...msg.event};
            ev.event_id = value.event_id;
            const responseMsg = {
                event: ev,
                status: "sent",
                getType: () => new Date(ev.origin_server_ts * 1000),
                getDate: msg.getDate,
            }
            this.emittedEventIds.add(ev.event_id);
            this.emit(BackendEvent.BoardEventLocalEcho, responseMsg, value.room_id, tempEventId)
        });
        this.emit(BackendEvent.BoardEvent, msg)
        return returnVal;
    }
}

export class MatrixBackendAccountDriverWidget extends EventEmitter implements MatrixBackendDriverAccount {
    init(): Promise<any> {
        console.log("nothing to implement for widget account driver");
        return new Promise((r: (_v?) => void) => { r() });
    }
    login(username?: string, password?: string, baseUrl?: string, loginCallback?: () => void): Promise<any> {
        // const _this = this;
        return new Promise((r: (_v?) => void) => { r() });
        // showLoading("login with: " + username + " on server: " + baseUrl);
        // this.client = sdk.createClient({
        //     baseUrl: baseUrl
        // });
        // AppData.instance.matrixBackend = this;
        // window.actions.createWhiteboard = this.createWhiteboard;
        // window.actions.scrollback = this.scrollback;
        // AppData.instance.matrixBackend.setupClientConnections();
        // let registeredResult = await this.client.loginWithPassword(username, password, function (err) {
        //     if (err instanceof Error) {
        //         showLoading(err.message)
        //         return;
        //     } else {
        //         loginCallback();
        //     }
        // })
        // console.log(registeredResult);
        // document.getElementById("userIdLabel").innerHTML = registeredResult.user_id;
        // // document.getElementById("userIdLabel").innerHTML = registeredResult.user_id;
        // showLoading("start client");
        // let startedResult = await this.client.startClient({ initialSyncLimit: 0, lazyLoadMembers: true });
        // showLoading("initial sync");
    }
    updateRoomTree() { console.warn("updateRoomTree not available in widget") };
    createWhiteboard(visibility, whiteboardName) { console.warn("createWhiteboard not available in widget"); return new Promise(r => r) };

    makeWhiteboardFromRoom(roomId) { console.warn("TODO makeWhiteboardFromRoom is not implemented for widget"); return new Promise(r => r) };
}