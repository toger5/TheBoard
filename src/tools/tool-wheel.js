import { Point } from 'paper'
import { tools, activeTool } from '../input';
import { setActiveTool } from '../input';
import { mousePathToString, paperPathToString, pathPosSizeCorrection, setAlpha } from "../helper";

export default function init_tool_wheel() {
	let wheelContainer = document.getElementById("tool-wheel");
	let colorPickerCanvas = document.getElementById('color-picker-canvas');
	let boundingrect = colorPickerCanvas.getBoundingClientRect()
	let center = new Point(boundingrect.width, boundingrect.height)
	// center = new Point(208, 208);
	center = center.multiply(0.5);
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