import { EventEmitter } from 'events';
import {
    ClientEvent,
    createClient,
    EventStatus,
    EventTimeline,
    MatrixClient,
    MatrixEvent,
    Room,
    RoomEvent,
    RoomStateEvent,
    SyncState,
} from 'matrix-js-sdk';
import { BOARD_OBJECT_EVENT_NAME, BOARD_ROOM_STATE_NAME } from './board-event-consts';
import { isBoardObjectEvent, isBoardRoom } from './filter';
import NotebookTree from '../sturctures/notebook-tree';
import {
    BackendEvent,
    MatrixBackendDriverAccount,
    MatrixBackendDriverRoom,
    PaginationResult,
    ProgressHandler,
} from './matrix-backend-driver';

const SESSION_STORAGE_KEY = "theboard_matrix_session";

interface StoredSession {
    baseUrl: string;
    userId: string;
    accessToken: string;
    deviceId: string;
}

function readStoredSession(): StoredSession | undefined {
    try {
        const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
        return raw ? JSON.parse(raw) : undefined;
    } catch {
        return undefined;
    }
}

function writeStoredSession(session: StoredSession | undefined) {
    try {
        if (session) window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
        else window.localStorage.removeItem(SESSION_STORAGE_KEY);
    } catch {
        // storage blocked: the user logs in again next time
    }
}

/**
 * The matrix-js-sdk client shared by the account and the room driver. The client only exists after
 * login, while `MatrixBackend.init()` runs before it, so the room driver waits for `"client"`.
 */
export class MatrixSdkSession extends EventEmitter {
    private _client: MatrixClient | undefined;

    get client(): MatrixClient | undefined {
        return this._client;
    }

    setClient(client: MatrixClient) {
        this._client = client;
        this.emit("client", client);
    }
}

export class MatrixBackendRoomDriverSdk extends EventEmitter implements MatrixBackendDriverRoom {
    private currentRoomId: string | undefined;
    /** The events the client already has of a newly selected room were never emitted: replay them first. */
    private needsReplay = false;
    private mediaUrls = new Map<string, Promise<string>>();

    constructor(private session: MatrixSdkSession) {
        super();
    }

    private get client(): MatrixClient {
        const client = this.session.client;
        if (!client) throw new Error("Not logged in");
        return client;
    }

    get userId(): string {
        return this.session.client?.getUserId() ?? undefined;
    }

    get roomId(): string {
        return this.currentRoomId;
    }

    get canUploadMedia(): boolean {
        return true;
    }

    async init(): Promise<void> {
        this.session.on("client", (client: MatrixClient) => this.attach(client));
        if (this.session.client) this.attach(this.session.client);
    }

    /** Show another room. The caller clears the canvas and loads its history. */
    switchRoom(roomId: string) {
        this.currentRoomId = roomId;
        this.needsReplay = true;
    }

    private attach(client: MatrixClient) {
        client.on(RoomEvent.Timeline, (event: MatrixEvent, room: Room | undefined) => {
            if (!room || room.roomId !== this.currentRoomId || this.needsReplay) return;
            this.emitEvent(event);
        });
        client.on(RoomEvent.LocalEchoUpdated, (event: MatrixEvent, room: Room, oldEventId?: string) => {
            if (room.roomId !== this.currentRoomId || !isBoardObjectEvent(event.getType())) return;
            if (event.status === EventStatus.SENT) {
                this.emit(BackendEvent.BoardEventLocalEcho, event, room.roomId, oldEventId);
            } else if (event.status === EventStatus.NOT_SENT) {
                this.emit(BackendEvent.LocalEchoFailed, oldEventId ?? event.getId(), event.error);
            }
        });
    }

    /** Returns whether a board event or redaction was emitted. */
    private emitEvent(event: MatrixEvent): boolean {
        if (event.getType() === "m.room.redaction") {
            const redacts = event.event.redacts ?? event.getContent().redacts;
            if (!redacts) return false;
            this.emit(BackendEvent.Redact, { ...wrap(event), event: { ...event.event, redacts } });
            return true;
        }
        if (!isBoardObjectEvent(event.getType()) || event.isRedacted()) return false;
        this.emit(BackendEvent.BoardEvent, event);
        return true;
    }

    async paginateBackwards(limit: number): Promise<PaginationResult> {
        const room = this.client.getRoom(this.currentRoomId);
        if (!room) throw new Error(`Unknown room ${this.currentRoomId}`);
        if (this.needsReplay) {
            this.needsReplay = false;
            const events = room.getLiveTimeline().getEvents();
            let count = 0;
            for (let i = events.length - 1; i >= 0; i--) {
                if (this.emitEvent(events[i])) count++;
            }
            if (count > 0) {
                return { count, reachedStart: room.getLiveTimeline().getPaginationToken(EventTimeline.BACKWARDS) === null };
            }
        }
        const timeline = room.getLiveTimeline();
        const before = timeline.getEvents().length;
        if (timeline.getPaginationToken(EventTimeline.BACKWARDS) !== null) {
            // Emits the older events through RoomEvent.Timeline (toStartOfTimeline).
            await this.client.scrollback(room, limit);
        }
        const after = room.getLiveTimeline().getEvents().length;
        return {
            count: Math.max(0, after - before),
            reachedStart: room.getLiveTimeline().getPaginationToken(EventTimeline.BACKWARDS) === null,
        };
    }

    async uploadContent(file: File, progressHandler?: ProgressHandler): Promise<string> {
        const response = await this.client.uploadContent(file, { progressHandler });
        return response.content_uri;
    }

    /** Authenticated media (MSC3916) needs the access token, which an <img> cannot send: fetch it into a blob URL. */
    mediaUrl(mxcUri: string): Promise<string> {
        let url = this.mediaUrls.get(mxcUri);
        if (!url) {
            const client = this.client;
            const httpUrl = client.mxcUrlToHttp(mxcUri, undefined, undefined, undefined, false, true, true);
            url = fetch(httpUrl, { headers: { Authorization: `Bearer ${client.getAccessToken()}` } })
                .then((response) => {
                    if (!response.ok) throw new Error(`Media download failed: ${response.status}`);
                    return response.blob();
                })
                .then((blob) => URL.createObjectURL(blob));
            url.catch(() => this.mediaUrls.delete(mxcUri));
            this.mediaUrls.set(mxcUri, url);
        }
        return url;
    }

    sendBoardObjectEvent(content: any) {
        return this.client.sendEvent(this.currentRoomId, BOARD_OBJECT_EVENT_NAME as any, content);
    }

    redact(id: string): Promise<any> {
        return this.client.redactEvent(this.currentRoomId, id);
    }
}

/** A plain BoardMessage around a MatrixEvent, for emitting a changed copy of its event. */
function wrap(event: MatrixEvent) {
    return {
        event: event.event,
        status: event.status,
        getDate: () => event.getDate(),
        getType: () => event.getType(),
        getRoomId: () => event.getRoomId(),
    };
}

export class MatrixBackendAccountDriverSdk extends EventEmitter implements MatrixBackendDriverAccount {
    private stored: StoredSession | undefined;
    /** Resolves the pending `login()` without credentials once the login form logged in. */
    private loginWaiters: Array<() => void> = [];

    constructor(private session: MatrixSdkSession) {
        super();
    }

    private get client(): MatrixClient {
        const client = this.session.client;
        if (!client) throw new Error("Not logged in");
        return client;
    }

    async init(): Promise<void> {
        this.stored = readStoredSession();
    }

    /**
     * With credentials: log in with a password. Without: resume the stored session, or show the
     * login form and resolve once the user logged in with it (the form calls this with credentials).
     */
    async login(username?: string, password?: string, baseUrl?: string, loginCallback?: () => void): Promise<void> {
        if (username && password && baseUrl) {
            const loginClient = createClient({ baseUrl });
            const response = await loginClient.loginRequest({
                type: "m.login.password",
                identifier: { type: "m.id.user", user: username },
                password,
                initial_device_display_name: "TheBoard",
            });
            this.stored = { baseUrl, userId: response.user_id, accessToken: response.access_token, deviceId: response.device_id };
            writeStoredSession(this.stored);
            await this.start(this.stored);
            loginCallback?.();
            const waiters = this.loginWaiters;
            this.loginWaiters = [];
            waiters.forEach((resolve) => resolve());
            return;
        }
        if (this.stored) {
            try {
                await this.start(this.stored);
                return;
            } catch (e) {
                console.warn("The stored session could not be resumed", e);
                writeStoredSession(undefined);
                this.stored = undefined;
            }
        }
        this.emit("login_required");
        await new Promise<void>((resolve) => this.loginWaiters.push(resolve));
    }

    async logout(): Promise<void> {
        await this.session.client?.logout(true).catch((e) => console.warn("Logout failed", e));
        writeStoredSession(undefined);
        this.stored = undefined;
    }

    private async start(stored: StoredSession) {
        const client = createClient({
            baseUrl: stored.baseUrl,
            userId: stored.userId,
            accessToken: stored.accessToken,
            deviceId: stored.deviceId,
        });
        // Throws for an expired token before the client starts syncing.
        await client.whoami();
        this.session.setClient(client);
        const prepared = new Promise<void>((resolve, reject) => {
            const onSync = (state: SyncState) => {
                if (state === SyncState.Prepared || state === SyncState.Syncing) {
                    client.off(ClientEvent.Sync, onSync);
                    resolve();
                } else if (state === SyncState.Error) {
                    client.off(ClientEvent.Sync, onSync);
                    reject(new Error("The first sync failed"));
                }
            };
            client.on(ClientEvent.Sync, onSync);
        });
        await client.startClient({ initialSyncLimit: 20, lazyLoadMembers: true });
        await prepared;
    }

    /** Whiteboard rooms, grouped by the space (notebook) that contains them. */
    updateRoomTree(): NotebookTree {
        const roomTree = new NotebookTree();
        const visibleRooms = this.client.getVisibleRooms();
        const spaces = visibleRooms.filter((r) => r.isSpaceRoom());
        for (const room of visibleRooms) {
            if (!isBoardRoom(room.currentState.events)) continue;
            const space = spaces.find((s) => s.currentState.getStateEvents("m.space.child", room.roomId));
            if (space) {
                (roomTree.notebooks[space.roomId] ??= []).push(room.roomId);
            } else {
                roomTree.whiteboards.push(room.roomId);
            }
        }
        return roomTree;
    }

    /** Rooms that are no spaces and no whiteboards yet ("make a whiteboard from a room"). */
    convertibleRooms(): Room[] {
        return this.client.getVisibleRooms().filter((r) => !r.isSpaceRoom() && !isBoardRoom(r.currentState.events));
    }

    getRoom(roomId: string): Room | null {
        return this.client.getRoom(roomId);
    }

    async createWhiteboard(visibility, whiteboardName): Promise<string> {
        const { room_id } = await this.client.createRoom({
            visibility,
            invite: [],
            name: whiteboardName === "" ? "unnamed Whiteboard" : whiteboardName,
        });
        await this.makeWhiteboardFromRoom(room_id);
        return room_id;
    }

    /** Mark a room as a whiteboard and wait until the state event came back through sync. */
    async makeWhiteboardFromRoom(roomId): Promise<void> {
        const client = this.client;
        let sentId: string | undefined;
        const seen = new Set<string>();
        const synced = new Promise<void>((resolve) => {
            const onState = (event: MatrixEvent) => {
                const id = event.getId();
                if (event.getRoomId() !== roomId || event.getType() !== BOARD_ROOM_STATE_NAME || !id) return;
                seen.add(id);
                if (id === sentId) {
                    client.off(RoomStateEvent.Events, onState);
                    resolve();
                }
            };
            client.on(RoomStateEvent.Events, onState);
        });
        const { event_id } = await client.sendStateEvent(roomId, BOARD_ROOM_STATE_NAME as any, {} as any, "");
        sentId = event_id;
        if (seen.has(event_id)) return;
        await synced;
    }
}
