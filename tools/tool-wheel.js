function init_tool_wheel() {
  let wheelContainer = document.getElementById("tool-wheel");
  let colorPickerCanvas = document.getElementById('color-picker-canvas');
  let center = new paper.Point(colorPickerCanvas.width, colorPickerCanvas.height)
  center = new paper.Point(208, 208);
  center = center.multiply(0.5);
  let buttons = document.querySelectorAll("#tool-wheel button");
  let rad = center.x + 20;
  let offset = -Math.PI / 4;
  for (let i = 0; i < buttons.length; i++) {
    // all units in em
    console.log(wheelContainer.children[i].tagName);
    let c = buttons[i];
    let angle = i * Math.PI / 7 + offset;
    let pos = new paper.Point(Math.sin(angle) * rad, Math.cos(angle) * rad);
    c.style.left = center.x + pos.x;
    c.style.bottom = center.y + pos.y;
    c.onclick = function (buttonEv) {
      for (b of buttons) {
        b.classList.remove('active');
      }
      activeTool = tools[c.id];
      c.classList.add('active');
    }
  }
}
function setActiveTool(c){

}
function get_width_em(elem) {
  return elem.width / parseFloat(getComputedStyle(elem).fontSize);
}
function get_height_em(elem) {
  return elem.height / parseFloat(getComputedStyle(elem).fontSize);
}