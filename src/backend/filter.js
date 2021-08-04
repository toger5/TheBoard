import * as BordEvents from './board-event-consts'
export function isBoardObjectEvent(type){
    return type === "p.whiteboard.object" || type === BordEvents.BOARD_OBJECT_EVENT_NAME
}
export function isBoardCommitEvent(type){
    return type === BordEvents.BOARD_COMMIT_EVENT_NAME
}

export function isBoardRoom(events){
    return events.has(BordEvents.BOARD_ROOM_STATE_NAME) || events.has('p.whiteboard.settings')
}