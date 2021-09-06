// import { currentRoomId } from "../main";
export default class ObjectStore {
    constructor() {
        // this.redacted = new Set();
        this.data = {
            "exampleroom": {
                "redacted": new Set(),
                "all": [],
                "allDict": {},
                "user": [],
                "chunk": [],
            }
        }
    }
    currentRoom() {
        return this.data[appData.matrixClient.currentRoomId]
    }
    hasRoom(roomId) {
        return roomId in this.data;
    }
    addRoom(roomId) {
        if (this.hasRoom(roomId)) {
            console.log("room already exists")
        }
        else {
            console.log("add room " + roomId + "to store");
            this.data[roomId] = {
                "redacted": new Set(),
                "all": [],
                "allDict": {},
                "user": {},
                "chunk": [],
            }
        }
    }
    // addToCurrent(obj) {
    //     if (!this.currentRoom().redacted.has(obj.event_id)) {
    //         this.currentRoom().all.push(obj);
    //     }
    // }
    add(obj) {
        if (!obj.room_id in this.data) {
            this.addRoom(obj.room_id);
        }
        let room = this.data[obj.room_id];
        // console.log("adding obj that already exists: ", room.all.some(el => el.event_id == obj.event_id));
        room.allDict[obj.event_id] = obj;
        // if (!room.redacted.has(obj.event_id)) {
        // room.all.push(obj);
        // }
    }
    allSorted() {
        if (appData.matrixClient.currentRoomId in this.data) {
            let begin_sort = Date.now();
            let dic = this.currentRoom().allDict;
            let allList = Object.keys(dic).map(key => dic[key]);
            allList.sort(function (first, second) {
                return first.origin_server_ts - second.origin_server_ts;
            });
            console.log("sorted all events: ", Date.now() - begin_sort, "ms")
            return allList;
        } else {
            // If there is not current room set, the default behaviour is en empty list -> canvas gets cleared
            return []
        }
    }
    all() {
        if (appData.matrixClient.currentRoomId in this.data) {
            return this.currentRoom().allDict;
        } else {
            // If there is not current room set, the default behaviour is en empty list -> canvas gets cleared
            return {}
        }
    }
    getById(id) {
        let found = Object.values(this.all()).find(el => el.event_id == id);
        return found;
    }
    // redactByIdInCurrent(id, remove = true) {
    //     this.currentRoom().redacted.add(id);
    //     if (remove) {
    //         this.currentRoom().all = this.currentRoom().all.filter(e => e.event_id !== id);
    //     }
    // }
    redactById(id, roomId, remove = true) {
        if (!this.hasRoom(roomId)) { this.addRoom(roomId) }
        let room = this.data[roomId];
        // room.redacted.add(id);
        if (remove) {
            if (id in room.allDict) {
                delete room.allDict[id];
                let item = paper.project.getItem({match: function (item) { return item.data.id == id } })
                if (item) { item.remove(); } else { console.log("could not find item for id: ", id) }
            } else {
                console.log("unecassary redact called for id: ", id)
            }
        }
    }
    // redact_and_remove_by_id(id){
    //     this.redacted.add(id);
    //     this.objects["all"] = this.objects["all"].filter(e => e.event_id !== id);
    // }
    // all_region(x,y,width,height){
    //     //TODO
    //     var ret = [];
    //     this.objects["all"].forEach(obj => {
    //         pos = [obj.objpos.slice(" ").map(x => {return parseInt(x)})];
    //         size = [obj.objsize.slice(" ").map(x => {return parseInt(x)})];
    //         if obj.
    //         ret.push()
    //     });
    // }
}