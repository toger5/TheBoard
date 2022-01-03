import EventEmitter from 'events'
import { MatrixClient } from 'matrix-js-sdk';
import { BOARD_OBJECT_EVENT_NAME } from './board-event-consts';
import { MatrixBackendDriverAccount, MatrixBackendDriverRoom } from './matrix-backend-driver'

export class MatrixBackendRoomDriverSdk extends EventEmitter implements MatrixBackendDriverRoom {
    private client: MatrixClient;
    private currentRoomId: string;
    constructor(client?, currentRoomId?: string){
        super()
        this.client = client;
        this.currentRoomId = currentRoomId;
    }
    get roomId(): string {
        throw new Error('Method not implemented.');
    }
    init(): Promise<any> {
        throw new Error('Method not implemented.');
    }
    scrollback(roomId: string, scrollback_count = 200, loadingMsg = null) {
        let client = this.client;
        return new Promise(function (resolve, reject) {
            if (scrollback_count == 0) {
                resolve(client.getRoom(roomId));
            }
            client.scrollback(client.getRoom(roomId), scrollback_count)
                .then((room) => {
                    resolve(room);
                });
        });
    }
   

    

    uploadContent(file, onlyContentUri, progressHandler:(state: {loaded: number;total: number;}) => void){
        //(prog) => { showLoading("Upload Image: " + Math.round(prog.loaded / prog.total * 100)) + "%" }
        return this.client.uploadContent(file, { onlyContentUri: onlyContentUri, progressHandler: progressHandler})
    }
    sendBoardObjectEvent(content) {
        return this.client.sendEvent(this.currentRoomId, BOARD_OBJECT_EVENT_NAME, content, "", (err, res) => {
            console.log(err);
        });
    }
}


export class MatrixBackendAccountDriverSdk extends EventEmitter implements MatrixBackendDriverAccount {
    init(): Promise<any> {
        return new Promise((r:(_v?)=>void) => {r()});
    }
    login(username?: string, password?: string, baseUrl?: string, loginCallback?: () => void): Promise<any> {
        return new Promise(r => r);
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
    updateRoomTree() { console.warn("TODO") };
    createWhiteboard(visibility, whiteboardName) { console.warn("TODO"); return new Promise(r => r) };

    makeWhiteboardFromRoom(roomId) { console.warn("TODO"); return new Promise(r => r) };
}