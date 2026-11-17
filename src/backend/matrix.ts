import { showLoading, hideLoading, AppData } from "../main";
import { isBoardObjectEvent } from "./filter";
import { setAlpha } from "../helper";
import {
    BackendEvent,
    BoardMessage,
    MatrixBackendDriverAccount,
    MatrixBackendDriverRoom,
} from "./matrix-backend-driver";
import paper from 'paper';
export { paper, BackendEvent };

/** Events requested from the driver per pagination step. */
const PAGE_SIZE = 200;

// Order of operations
// MatrixBackend.init()
//      driverAccount.init
//      MatrixBackend.setupClientConnections()   (before the room driver can emit anything)
//      driverRoom.init
// MatrixBackend.login()
//      driverAccount.login
// MatrixBackend.loadHistory() / scrollback()
//      driverRoom.paginateBackwards (repeatedly)
export class MatrixBackend {
    readonly driverAccount: MatrixBackendDriverAccount;
    readonly driverRoom: MatrixBackendDriverRoom;

    constructor(driverAccount: MatrixBackendDriverAccount, driverRoom: MatrixBackendDriverRoom) {
        this.driverAccount = driverAccount;
        this.driverRoom = driverRoom;
    }

    public get currentRoomId() {
        return this.driverRoom.roomId;
    }
    public getUserId() {
        return this.driverRoom.userId;
    }
    public get canUploadMedia(): boolean {
        return this.driverRoom.canUploadMedia;
    }
    public mediaUrl(mxcUri: string): Promise<string> {
        return this.driverRoom.mediaUrl(mxcUri);
    }

    async init() {
        await this.driverAccount.init();
        this.setupClientConnections();
        await this.driverRoom.init();
        (window as any).actions.scrollback = this.scrollback;
    }

    login(username?, password?, baseUrl?, loginCallback?): Promise<any> {
        return this.driverAccount.login(username, password, baseUrl, loginCallback)
    }

    /**
     * Load `count` more (older) events of the current room's history; `Infinity` loads all of it.
     * Resolves with how many were loaded and whether the start of the room was reached.
     */
    scrollback = async (roomId?: string, count = 1000, loadingMsg: string = null) => {
        let loaded = 0;
        let reachedStart = false;
        showLoading(loadingMsg ?? "Loading the board history");
        try {
            while (loaded < count) {
                const result = await this.driverRoom.paginateBackwards(Math.min(PAGE_SIZE, count - loaded));
                loaded += result.count;
                showLoading(`Loading the board history (${loaded} elements)`);
                if (result.reachedStart) { reachedStart = true; break; }
            }
        } finally {
            hideLoading();
        }
        return { loaded, reachedStart };
    }

    /** Load the whole history of the current room. */
    loadHistory() {
        return this.scrollback(this.currentRoomId, Infinity);
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
        return this.driverRoom.uploadContent(file, (prog) => { showLoading("Upload Image: " + Math.round(prog.loaded / prog.total * 100) + "%") }).then((mxcUrl) => {
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
            return this.driverRoom.sendBoardObjectEvent(content);
        })
    }

    sendEvent(content): Promise<any> {
        return this.driverRoom.sendBoardObjectEvent(content)
    }

    redactEvent(roomId, id) {
        return this.driverRoom.redact(id);
    }

    updateRoomTree() {
        return this.driverAccount.updateRoomTree();
    }

    async createWhiteboard(visibility, whiteboardName) {
        return this.driverAccount.createWhiteboard(visibility, whiteboardName);
    }
    makeWhiteboardFromRoom(roomId): Promise<any> {
        return this.driverAccount.makeWhiteboardFromRoom(roomId)
    }


    setupClientConnections() {
        this.driverRoom.on(BackendEvent.BoardEventLocalEcho, (msg: BoardMessage, roomId: string, echoId: string) => {
            if (!isBoardObjectEvent(msg.getType()) || msg.status !== "sent") return;
            AppData.instance.drawingCanvas.drawEvent(msg.event, false, false, false);
            const echoItem = findItem(echoId);
            if (echoItem) echoItem.remove();
            AppData.instance.objectStore.add(msg.event);
        });
        this.driverRoom.on(BackendEvent.LocalEchoFailed, (echoId: string, error: any) => {
            console.error("Sending failed", error);
            findItem(echoId)?.remove();
            showLoading("Could not send: " + (error?.message ?? error));
            setTimeout(hideLoading, 4000);
        });
        this.driverRoom.on(BackendEvent.BoardEvent, (msg: BoardMessage) => {
            if (AppData.instance.objectStore.isRedacted(msg.event.event_id, msg.getRoomId())) return;
            const now = Date.now();
            const evTime = msg.getDate().getTime();
            const diff = now - evTime;
            let scrollbackEvent = evTime ? diff > 10000 : false;
            const localEvent = !msg.event.sender; // the sender is not filled for local fake events
            const animated = !scrollbackEvent && !localEvent;

            let item = AppData.instance.drawingCanvas.drawEvent(msg.event, animated, scrollbackEvent, !animated);
            if (msg.status == null || msg.status == "sent") {
                // event already has a proper ID. because it is not status == sending, but loaded from scrollback or from another user
                AppData.instance.objectStore.add(msg.event);
            } else {
                console.log("Ev is sending so it does not get added to the objectStore (will be added during local echo)")
                item.opacity = item.opacity * 0.65;
            };

        });
        this.driverRoom.on(BackendEvent.Redact, (msg: BoardMessage) => {
            AppData.instance.objectStore.redactById(msg.event.redacts, msg.getRoomId(), true);
        });
    }
}

function findItem(id: string) {
    return paper.project.getItem({ match: (item) => item.data.id == id });
}
