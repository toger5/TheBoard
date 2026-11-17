import { EventEmitter } from "events";
import { BOARD_OBJECT_EVENT_NAME } from "./board-event-consts";

/** Events a room driver emits. */
export enum BackendEvent {
    /** `(msg: BoardMessage)`: a board object, live or from history, or the local echo of a send. */
    BoardEvent = "board_event",
    /** `(msg: BoardMessage, roomId, echoId)`: the server's copy of a local echo arrived. */
    BoardEventLocalEcho = "board_event_echo",
    /** `(echoId, error)`: sending a local echo failed. */
    LocalEchoFailed = "board_event_echo_failed",
    RoomMessage = "room_message",
    /** `(msg: BoardMessage)`: `msg.event.redacts` was redacted. */
    Redact = "redact",
}

/**
 * What a room driver emits for every event (`BackendEvent.*`). matrix-js-sdk's `MatrixEvent` has
 * this shape already; the widget driver wraps the plain client-format events with `evToMsg`.
 */
export interface BoardMessage {
    event: any;
    /** `null`/`undefined`: from the server. `"sending"`/`"NOT_SENT"`: a local echo. `"sent"`: echo confirmed. */
    status?: string | null;
    getDate(): Date;
    getType(): string;
    getRoomId(): string;
}

export function evToMsg(ev: any, status?: string): BoardMessage {
    return {
        event: ev,
        status: status,
        getDate: () => new Date(ev.origin_server_ts),
        getType: () => ev.type ?? BOARD_OBJECT_EVENT_NAME,
        getRoomId: () => ev.room_id,
    };
}

export interface PaginationResult {
    /** Board events and redactions emitted by this call. */
    count: number;
    /** There is nothing older to load. */
    reachedStart: boolean;
}

export type ProgressHandler = (state: { loaded: number; total: number }) => void;

export interface MatrixBackendDriverAccount extends EventEmitter {
    init(): Promise<void>;
    updateRoomTree(): any;
    createWhiteboard(visibility, whiteboardName): Promise<any>;
    makeWhiteboardFromRoom(roomId): Promise<any>;
    login(username?: string, password?: string, baseUrl?: string, loginCallback?: () => void): Promise<void>;
}

export interface MatrixBackendDriverRoom extends EventEmitter {
    init(): Promise<void>;
    get roomId(): string;
    get userId(): string;
    /** Whether `uploadContent` (and so the image tool) works. */
    get canUploadMedia(): boolean;
    /**
     * Load up to `limit` older events of the current room, emitting them (newest first) as
     * `BackendEvent.BoardEvent` / `BackendEvent.Redact`.
     */
    paginateBackwards(limit: number): Promise<PaginationResult>;
    /** Upload a file; resolves with its `mxc://` URI. */
    uploadContent(file: File, progressHandler?: ProgressHandler): Promise<string>;
    /** A URL the browser can load for an `mxc://` URI. */
    mediaUrl(mxcUri: string): Promise<string>;
    sendBoardObjectEvent(content: any): Promise<any>;
    redact(id: string): Promise<any>;
}
