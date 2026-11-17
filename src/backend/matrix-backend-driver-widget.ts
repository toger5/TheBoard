import { EventEmitter } from 'events';
import initWidgetSdk, { WidgetApi } from 'widget-base-sdk';
import { BOARD_OBJECT_EVENT_NAME } from './board-event-consts';
import { isBoardObjectEvent } from './filter';
import {
    BackendEvent,
    evToMsg,
    MatrixBackendDriverAccount,
    MatrixBackendDriverRoom,
    PaginationResult,
    ProgressHandler,
} from './matrix-backend-driver';

// Capabilities (MSC4412 capability format). Actions without an MSC use the placeholder namespace.
const NS = "org.matrix.mscXXXX";
const LEGACY_BOARD_OBJECT_EVENT_NAME = "p.whiteboard.object";
const REDACTION = "m.room.redaction";

export const CAPABILITIES = {
    sendBoardObject: `widget:${NS}.send_event.timeline:${BOARD_OBJECT_EVENT_NAME}`,
    sendRedaction: `widget:${NS}.send_event.timeline:${REDACTION}`,
    readBoardObject: `widget:${NS}.read_timeline:${BOARD_OBJECT_EVENT_NAME}`,
    readLegacyBoardObject: `widget:${NS}.read_timeline:${LEGACY_BOARD_OBJECT_EVENT_NAME}`,
    readRedaction: `widget:${NS}.read_timeline:${REDACTION}`,
    paginateTimeline: `widget:${NS}.paginate_timeline`,
    notifyTimelineUpdate: `host:${NS}.notify_timeline_update`,
    forwardBoardObject: `host:${NS}.forward_event.timeline:${BOARD_OBJECT_EVENT_NAME}`,
    forwardRedaction: `host:${NS}.forward_event.timeline:${REDACTION}`,
    roomName: `host:${NS}.update_state:m.room.name`,
    matrixContext: `widget:${NS}.get_matrix_context`,
    uploadFile: "widget:org.matrix.msc4039.upload_file",
    downloadFile: "widget:org.matrix.msc4039.download_file",
};
/** Without these the board cannot work at all. */
const REQUIRED_CAPABILITIES = [
    CAPABILITIES.sendBoardObject,
    CAPABILITIES.readBoardObject,
    CAPABILITIES.forwardBoardObject,
    CAPABILITIES.matrixContext,
];

const TIMELINE_FILTER = [
    { type: BOARD_OBJECT_EVENT_NAME },
    { type: LEGACY_BOARD_OBJECT_EVENT_NAME },
    { type: REDACTION },
];
/** How long to wait for `notify_timeline_update` after asking the client to paginate. */
const PAGINATION_TIMEOUT_MS = 60_000;
/** Paginations in a row that bring no new events before the history counts as complete. */
const MAX_EMPTY_PAGINATIONS = 3;

type PaginationStatus = "idle" | "paginating" | "start_reached";
interface TimelineUpdate {
    pagination?: { status: PaginationStatus; error?: { code?: string; message?: string } };
    reset?: boolean;
    decrypted?: string[];
}

/**
 * Room driver for the widget mode, on widget-base-sdk (MSC4412). History is read from the client's
 * timeline cache with `read_timeline`, extended with `paginate_timeline` when it runs out
 * (spec/patch/new/timeline-reading.md in matrix-widget-tools-sdk). Live events arrive with
 * `forward_event`; both paths are deduplicated by event id.
 */
export class MatrixBackendRoomDriverWidget extends EventEmitter implements MatrixBackendDriverRoom {
    private api: WidgetApi;
    private _roomId: string;
    private _userId: string;
    public roomName = "unknown";
    private allowed = new Set<string>();

    /** Every event id emitted (or deliberately skipped) so far. */
    private seenIds = new Set<string>();
    /** Ids of redacted events, so that an older event read after its redaction is not drawn. */
    private redactedIds = new Set<string>();
    /** The oldest event `read_timeline` returned: where the next read continues. */
    private oldestId: string | undefined;
    private timelineWaiters: Array<(update: TimelineUpdate) => void> = [];

    // Local echo: a sent event can be forwarded by the client before or after `send_event` answers.
    private pendingSends = 0;
    /** Server event id → id of the local echo, for sends that answered before the event was forwarded. */
    private echoEventMap = new Map<string, string>();
    /** Own events forwarded while sends were pending, by event id. */
    private earlyEchoes = new Map<string, any>();

    private mediaUrls = new Map<string, Promise<string>>();

    public get roomId(): string { return this._roomId; }
    public get userId(): string { return this._userId; }
    public get canUploadMedia(): boolean {
        return this.allowed.has(CAPABILITIES.uploadFile) && this.allowed.has(CAPABILITIES.downloadFile);
    }

    public async init(): Promise<void> {
        await initWidgetSdk();
        const api = WidgetApi.connectToParent();
        this.api = api;

        let capabilitiesDecided: (allowed: string[]) => void;
        const decided = new Promise<string[]>((resolve) => { capabilitiesDecided = resolve; });
        api.onCapabilitiesChanged((allowed: string[]) => {
            this.allowed = new Set(allowed);
            capabilitiesDecided(allowed);
        });
        api.onEvent((ev: any) => this.onForwardedEvent(ev));
        api.onStateUpdate((state: any[]) => {
            for (const ev of state) {
                if (ev.type === "m.room.name" && ev.content?.name) this.roomName = ev.content.name;
            }
        });
        api.onTimelineUpdate((update: TimelineUpdate) => this.onTimelineUpdate(update));

        await api.requestCapabilities(Object.values(CAPABILITIES));
        const allowed = await decided;
        const missing = REQUIRED_CAPABILITIES.filter((c) => !allowed.includes(c));
        if (missing.length > 0) {
            throw new Error("The board was not allowed to: " + missing.join(", "));
        }
        const context = await api.getMatrixContext();
        this._userId = context.user_id;
        this._roomId = context.room_id;
        await api.notifyReady();
    }

    // ---- History ----

    public async paginateBackwards(limit: number): Promise<PaginationResult> {
        let count = 0;
        let emptyPaginations = 0;
        while (true) {
            let result: { events: any[]; pagination: PaginationStatus };
            try {
                result = await this.api.readTimeline({
                    ...(this.oldestId === undefined ? {} : { from: this.oldestId }),
                    limit,
                    filter: TIMELINE_FILTER,
                });
            } catch (e) {
                if (this.oldestId !== undefined && /event_not_cached/.test(String(e))) {
                    // The client dropped our cursor: read again from the newest event (deduplicated).
                    this.oldestId = undefined;
                    continue;
                }
                throw e;
            }
            let fresh = 0;
            for (const ev of result.events) {
                this.oldestId = ev.event_id;
                if (this.handleEvent(ev)) fresh++;
            }
            count += fresh;
            if (result.events.length >= limit) return { count, reachedStart: false };
            if (result.pagination === "start_reached") return { count, reachedStart: true };

            // The cache is exhausted: let the client fetch older events, then read again.
            if (fresh === 0) emptyPaginations++; else emptyPaginations = 0;
            if (emptyPaginations > MAX_EMPTY_PAGINATIONS) {
                console.warn("The client keeps paginating without finding older board events; stopping.");
                return { count, reachedStart: true };
            }
            if (result.pagination === "idle") {
                if (!this.allowed.has(CAPABILITIES.paginateTimeline)) return { count, reachedStart: true };
                const status = await this.paginateClient(limit);
                if (status === "start_reached") continue; // the read after it returns `start_reached`
            } else {
                await this.nextTimelineUpdate();
            }
        }
    }

    /** Ask the client to fetch older events and wait until it is done. */
    private async paginateClient(limit: number): Promise<PaginationStatus> {
        // The update can arrive before the response, so listen first.
        const updated = this.nextTimelineUpdate();
        const response = await this.api.paginateTimeline(limit);
        if (response.pagination === "start_reached") {
            updated.catch(() => { /* no update follows */ });
            return "start_reached";
        }
        const update = await updated;
        return update.pagination?.status ?? "idle";
    }

    private nextTimelineUpdate(): Promise<TimelineUpdate> {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                this.timelineWaiters = this.timelineWaiters.filter((w) => w !== waiter);
                reject(new Error("The client did not finish paginating in time"));
            }, PAGINATION_TIMEOUT_MS);
            const waiter = (update: TimelineUpdate) => {
                clearTimeout(timer);
                const error = update.pagination?.error;
                if (error) reject(new Error(`Pagination failed: ${error.code ?? ""} ${error.message ?? ""}`));
                else resolve(update);
            };
            this.timelineWaiters.push(waiter);
        });
    }

    private onTimelineUpdate(update: TimelineUpdate) {
        // After a reset our cursor may be invalid; the next read starts at the newest event again.
        if (update.reset) this.oldestId = undefined;
        if (update.pagination?.status === "paginating" && !update.reset) return;
        if (!update.pagination && !update.reset) return; // only `decrypted`: board events are not encrypted here
        const waiters = this.timelineWaiters;
        this.timelineWaiters = [];
        waiters.forEach((w) => w(update));
    }

    // ---- Events ----

    /** Emit an event the board has not seen yet. Returns whether it was emitted. */
    private handleEvent(ev: any): boolean {
        if (this.seenIds.has(ev.event_id)) return false;
        this.seenIds.add(ev.event_id);
        if (ev.type === REDACTION) {
            const target = ev.redacts ?? ev.content?.redacts;
            if (!target) return false;
            this.redactedIds.add(target);
            this.emit(BackendEvent.Redact, evToMsg({ ...ev, redacts: target }));
            return true;
        }
        if (!isBoardObjectEvent(ev.type)) return false;
        if (ev.unsigned?.redacted_because || this.redactedIds.has(ev.event_id)) return false;
        this.emit(BackendEvent.BoardEvent, evToMsg(ev));
        return true;
    }

    private onForwardedEvent(ev: any) {
        if (this._roomId && ev.room_id && ev.room_id !== this._roomId) return;
        if (isBoardObjectEvent(ev.type) && ev.sender === this._userId && !this.seenIds.has(ev.event_id)) {
            const echoId = this.echoEventMap.get(ev.event_id);
            if (echoId !== undefined) {
                this.echoEventMap.delete(ev.event_id);
                this.emitLocalEcho(ev, echoId);
                return;
            }
            if (this.pendingSends > 0) {
                // Possibly the event of a send that has not answered yet.
                this.earlyEchoes.set(ev.event_id, ev);
                return;
            }
        }
        this.handleEvent(ev);
    }

    private emitLocalEcho(ev: any, echoId: string) {
        this.seenIds.add(ev.event_id);
        this.emit(BackendEvent.BoardEventLocalEcho, evToMsg(ev, "sent"), ev.room_id, echoId);
    }

    // ---- Sending ----

    public async sendBoardObjectEvent(content: any): Promise<{ event_id: string }> {
        const echoId = `echoId${Date.now()}-${Math.random().toString(36).slice(2)}`;
        this.emit(BackendEvent.BoardEvent, evToMsg({
            type: BOARD_OBJECT_EVENT_NAME,
            content,
            event_id: echoId,
            room_id: this._roomId,
            origin_server_ts: Date.now(),
        }, "NOT_SENT"));

        this.pendingSends++;
        try {
            const { event_id } = await this.api.sendEvent(BOARD_OBJECT_EVENT_NAME, content);
            const early = this.earlyEchoes.get(event_id);
            if (early) {
                this.earlyEchoes.delete(event_id);
                this.emitLocalEcho(early, echoId);
            } else {
                this.echoEventMap.set(event_id, echoId);
            }
            return { event_id };
        } catch (e) {
            this.emit(BackendEvent.LocalEchoFailed, echoId, e);
            throw e;
        } finally {
            this.pendingSends--;
            if (this.pendingSends === 0) {
                // Own events from elsewhere (another device) that arrived meanwhile.
                const others = [...this.earlyEchoes.values()];
                this.earlyEchoes.clear();
                others.forEach((ev) => this.handleEvent(ev));
            }
        }
    }

    public redact(id: string): Promise<any> {
        return this.api.sendEvent(REDACTION, { redacts: id });
    }

    // ---- Media ----

    public async uploadContent(file: File, progressHandler?: ProgressHandler): Promise<string> {
        const data = new Uint8Array(await file.arrayBuffer());
        const { content_uri } = await this.api.uploadFile(data, file.type || null);
        progressHandler?.({ loaded: data.length, total: data.length });
        return content_uri;
    }

    public mediaUrl(mxcUri: string): Promise<string> {
        let url = this.mediaUrls.get(mxcUri);
        if (!url) {
            url = this.api.downloadFile(mxcUri).then(({ data, mimetype }: { data: Uint8Array; mimetype?: string }) =>
                URL.createObjectURL(new Blob([data as BlobPart], mimetype ? { type: mimetype } : {})));
            url.catch(() => this.mediaUrls.delete(mxcUri));
            this.mediaUrls.set(mxcUri, url);
        }
        return url;
    }
}

/** The widget is always in exactly one room, chosen by the client: nothing to do on the account level. */
export class MatrixBackendAccountDriverWidget extends EventEmitter implements MatrixBackendDriverAccount {
    async init(): Promise<void> { }
    async login(): Promise<void> { }
    updateRoomTree() { console.warn("updateRoomTree is not available in a widget"); }
    async createWhiteboard(visibility, whiteboardName) { console.warn("createWhiteboard is not available in a widget"); }
    async makeWhiteboardFromRoom(roomId) { console.warn("makeWhiteboardFromRoom is not available in a widget"); }
}
