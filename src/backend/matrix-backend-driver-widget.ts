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
    private echoEventMap: Map<string, string>;
    constructor(roomId?: string) {
        super()
        this._roomId = roomId;
        this.roomName = "unknown";
        this.echoEventMap = new Map();
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

            const qs = parseFragment();
            let widgetId = assertParam(qs, 'widgetId');
            _this._userId = assertParam(qs, 'userId');
            const api = new WidgetApi(widgetId);
            api.requestCapabilityToReceiveEvent(BOARD_OBJECT_EVENT_NAME);
            api.requestCapabilityToSendEvent(BOARD_OBJECT_EVENT_NAME);
            
            api.requestCapabilityToReceiveEvent("m.room.redaction");
            api.requestCapabilityToSendEvent("m.room.redaction");
            
            api.requestCapabilityToReceiveState("m.room.name");

            api.on("ready", function (test) {
                api.readStateEvents("m.room.name", 1, "").then((nameEvent) => {
                    _this._roomId = nameEvent[0].room_id;
                    _this.roomName = nameEvent[0].content.name;
                    resolve();
                })
            });
            api.on(`action:${WidgetApiToWidgetAction.SendEvent}`, (ev) => {
                switch (ev.detail.data.type) {
                    case BOARD_OBJECT_EVENT_NAME:
                        if (_this.echoEventMap.has(ev.detail.data.event_id)) {
                            const oldId = _this.echoEventMap.get(ev.detail.data.event_id)
                            const msg = this.evToMsg(ev.detail.data, "sent");
                            _this.emit(BackendEvent.BoardEventLocalEcho, msg, ev.detail.data.room_id, oldId)
                            _this.echoEventMap.delete(ev.detail.data.event_id);
                        } else {
                            _this.emit(BackendEvent.BoardEvent, _this.evToMsg(ev.detail.data), _this.roomId);
                        }
                        break;
                    case "m.room.message":
                        // there are no permissions for this atm
                        console.log(ev.detail.data.content)
                        _this.emit(BackendEvent.RoomMessage, _this.evToMsg(ev.detail.data));
                        break;
                    case "m.room.redaction":
                        console.log("redaction: ", ev.detail.data.content)
                        _this.emit(BackendEvent.Redact, _this.evToMsg(ev.detail.data));
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

    scrollback = (roomId: string, scrollback_count = 200, loadingMsg = null) => {
        // let client = this.client;

        return new Promise((resolve, reject) => {
            if (scrollback_count == 0) {
                resolve(roomId);
            }
            this.widgetApi.readRoomEvents(BOARD_OBJECT_EVENT_NAME, 1000).then((roomEvents) => {
                console.log("room events", roomEvents)
                let messages = (roomEvents as any[]).map((val) => this.evToMsg(val));
                for (const msg of messages) {
                    this.emit(BackendEvent.BoardEvent, msg)
                }
                resolve(messages);
            });
        });
    }
    private evToMsg(ev, state?: string) {
        let roomId = ev.room_id;
        let msg = {
            event: ev,
            status: state,
            getDate: () => new Date(ev.origin_server_ts * 1000),
            getType: () => BOARD_OBJECT_EVENT_NAME,
            getRoomId: () => roomId,
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
        const roomId = this.roomId;
        let msg = this.evToMsg({
            content: content,
            event_id: tempEventId,
        }, "NOT_SENT")

        const returnVal = this.widgetApi.sendRoomEvent(BOARD_OBJECT_EVENT_NAME, content).then((value) => {
            // remember the id of the event send from this widget so it can be handled as an echo when the server sends it.
            this.echoEventMap.set(value.event_id, tempEventId);
        });
        this.emit(BackendEvent.BoardEvent, msg)
        return returnVal;
    }

    redact(id: string) {
        return this.widgetApi.sendRoomEvent("m.room.redaction", {"redacts":id});
    }
}

export class MatrixBackendAccountDriverWidget extends EventEmitter implements MatrixBackendDriverAccount {
    init(): Promise<any> {
        console.log("nothing to implement for widget account driver");
        return new Promise((r: (_v?) => void) => { r() });
    }
    login(username?: string, password?: string, baseUrl?: string, loginCallback?: () => void): Promise<any> {
        return new Promise((r: (_v?) => void) => { r() });
    }
    updateRoomTree() { console.warn("updateRoomTree not available in widget") };
    createWhiteboard(visibility, whiteboardName) { console.warn("createWhiteboard not available in widget"); return new Promise(r => r) };
    makeWhiteboardFromRoom(roomId) { console.warn("TODO makeWhiteboardFromRoom is not implemented for widget"); return new Promise(r => r) };
}