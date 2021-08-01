var _tool_stroke_width_index = 1
var TOOL_STROKE_WIDTH_OPTION_COUNT = 4
export default function init_line_style_selector(){
    let button = document.getElementById("line-type-selector-button")
    button.onclick = function (btnEv) {
        _tool_stroke_width_index += 1;
        _tool_stroke_width_index = _tool_stroke_width_index % TOOL_STROKE_WIDTH_OPTION_COUNT
        updateVisiblePreviewItem()
    }
    function updateVisiblePreviewItem() {
        let previewItems = document.querySelectorAll("#line-type-selector-button div");
        for (let i = 0; i < TOOL_STROKE_WIDTH_OPTION_COUNT; i++) {
            if (i == _tool_stroke_width_index) {
                previewItems[i].style.display = "block"
            } else {
                previewItems[i].style.display = "none"
            }
        }
    }
    updateVisiblePreviewItem(1);
}
export function GetToolStrokeWidthIndex() {
    return _tool_stroke_width_index;
}