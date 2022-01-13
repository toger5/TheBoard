import EventEmitter from "events";

export interface MatrixBackendDriverAccount extends EventEmitter {
    init(): Promise<any>;
    updateRoomTree();
    createWhiteboard(visibility, whiteboardName): Promise<any>;
    makeWhiteboardFromRoom(roomId): Promise<any>;
    login(username?: string, password?: string, baseUrl?: string, loginCallback?: () => void): Promise<any>;
}

export interface MatrixBackendDriverRoom extends EventEmitter {
    init(): Promise<any>;
    get roomId(): string;
    get userId(): string;
    scrollback(roomId: string, scrollback_count?: Number, loadingMsg?: string): Promise<any>;
    uploadContent(file, onlyContentUri, progressHandler: (state: { loaded: number; total: number; }) => void): Promise<any>;
    // uploadContent(file: File, onlyContentUri: boolean, progressHandler: (prog: Number)=>void );
    sendBoardObjectEvent(content: any): Promise<any>;
    redact(id: string): Promise<any>;
}