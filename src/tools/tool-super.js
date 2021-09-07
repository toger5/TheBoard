// import {  } from "../drawing";
// import { objectStore } from '../main'
// import { sleep } from './paper-canvas';
import { GetToolStrokeWidthIndex } from "./line-style-selector";
import { UserFilter } from "../paper-canvas";
import jsxElem, {render} from "jsx-no-react"
export default class Tool {
    constructor() {

        // Tool state
        this.tool_canceled = false

        // Tool settings
        this.strokeWidthOptions = [5, 10, 20, 40];

        // Preview
        this.previewItem = null

    }

    getStrokeWidth() {
        return this.strokeWidthOptions[GetToolStrokeWidthIndex()];
    }
    tooldown(proX, proY, pressure) {
        console.log("tooldown:",(proX, proY, pressure));
    }
    toolmove(proX, proY, pressure) {
        console.log("toolmove:",(proX, proY, pressure));
    }
    
    toolup(proX, proY) {
        console.log("toolup:",(proX, proY));
    }
    toolcancel() {
        console.log("toolcancel");
    }
    toolpreviewmove(pos) {
        console.log("toolpreviewmove",(pos));
    }
    activate() {
        console.log("activate")
    }
    deactivate() {
        console.log("deactivate")
    }
    getSettingsPanel(){
        return <p>placeholder settings</p>
    }
}