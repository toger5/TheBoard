import { Point } from 'paper'
import { tools, activeTool } from '../input';
import { setActiveTool } from '../input';
import { mousePathToString, paperPathToString, pathPosSizeCorrection, setAlpha } from "../helper";
import { APP_TYPE, AppType } from '../main';

const toolList = [
	{ id: 'tool-type-pen', text: 'Pen' },
	{ id: 'tool-type-eraser', text: 'Eraser' },
	{ id: 'tool-type-marker', text: 'Marker' },
	{ id: 'tool-type-line', text: 'Line' },
	{ id: 'tool-type-rect', text: 'Rect' },
	{ id: 'tool-type-text', text: 'Text' },
]

function toolFromObj(obj){
	let btn = document.createElement("button");
	btn.id = obj.id;
	btn.className = "tool-elements";
	btn.innerText = obj.text;
	return btn;
}
export default function init_tool_wheel() {
	if(APP_TYPE == AppType.sdk){
		toolList.push({ id: 'tool-type-image', text: 'Image' })
	}
	let wheelContainer = document.getElementById("tool-wheel");
	let colorPickerCanvas = document.getElementById('color-picker-canvas');
	const insertRefElem = document.getElementById('line-type-selector');
	let boundingrect = colorPickerCanvas.getBoundingClientRect()
	let center = new Point(boundingrect.width, boundingrect.height)
	// center = new Point(208, 208);
	center = center.multiply(0.5);
	for(let t of toolList) wheelContainer.insertBefore(toolFromObj(t), insertRefElem);
	let children = document.querySelectorAll(".tool-elements");
	// let buttons = document.querySelectorAll("#tool-wheel button");
	let settingsButton = document.getElementById("settings-button");
	settingsButton.style.left = center.x
	settingsButton.style.bottom = center.y
	let rad = center.x + 15;
	let offset = -Math.PI / 4;// -Math.PI / 4;
	for (let i = 0; i < children.length; i++) {
		// all units in em
		console.log(children[i].tagName);
		let child = children[i];
		let angle = i * Math.PI / 7 + offset;
		let pos = new Point(Math.sin(angle) * rad, Math.cos(angle) * rad);
		child.style.left = center.x + pos.x;
		child.style.bottom = center.y + pos.y;
		let b = child;
		if (!(b.id in tools)) { continue }
		b.onclick = function (buttonEv) {
			for (let btn of children) {
				btn.classList.remove('active');
			}
			activeTool.deactivate()
			setActiveTool(b.id);
			activeTool.activate()
			b.classList.add('active');

		}
		if (activeTool == tools[b.id]) {
			b.classList.add('active');
		}
	}
}