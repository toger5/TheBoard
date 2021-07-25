function init_tool_wheel() {
  let wheelContainer = document.getElementById("tool-wheel");
  let colorPickerCanvas = document.getElementById('color-picker-canvas');
  let boundingrect = colorPickerCanvas.getBoundingClientRect()
  let center = new paper.Point(boundingrect.width, boundingrect.height)
  // center = new paper.Point(208, 208);
  center = center.multiply(0.5);
  let children = document.querySelectorAll(".tool-elements");
  let buttons = document.querySelectorAll("#tool-wheel button");
  let rad = center.x+15;
  let offset = -Math.PI / 10;// -Math.PI / 4;
  for (let i = 0; i < children.length; i++) {
    // all units in em
    console.log(wheelContainer.children[i].tagName);
    let child = children[i];
    let angle = i * Math.PI / 7 + offset;
    let pos = new paper.Point(Math.sin(angle) * rad, Math.cos(angle) * rad);
    child.style.left = center.x + pos.x;
    child.style.bottom = center.y + pos.y;
  }
  for(let b of buttons){
    b.onclick = function (buttonEv) {
      for (let btn of buttons) {
        btn.classList.remove('active');
      }
      activeTool.deactivate()
      activeTool = tools[b.id];
      activeTool.activate()
      b.classList.add('active');
    }
    if(activeTool == tools[b.id]){
      b.classList.add('active');
    }
  }
}