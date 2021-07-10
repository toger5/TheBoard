var pickr;
function load_pickr() {
    pickr = Pickr.create({
        el: '.color-picker',
        theme: 'nano', // or 'monolith', or 'nano'
        silent:false,
        swatches: [
            'rgba(244, 67, 54, 1)',
            'rgba(233, 30, 99, 1)',
            'rgba(156, 39, 176, 1)',
            'rgba(103, 58, 183, 1)',
            'rgba(63, 81, 181, 1)',
            'rgba(33, 150, 243, 1)',
            // 'rgba(3, 169, 244, 0.7)',
            // 'rgba(0, 188, 212, 0.7)',
            // 'rgba(0, 150, 136, 0.75)',
            // 'rgba(76, 175, 80, 0.8)',
            // 'rgba(139, 195, 74, 0.85)',
            // 'rgba(205, 220, 57, 0.9)',
            // 'rgba(255, 235, 59, 0.95)',
            // 'rgba(255, 193, 7, 1)'
        ],
        components: {

            // Main components
            preview: false,
            palette: false,
            comparison: false,
            opacity: false,
            hue: true,

            // Input / output Options
            interaction: {
                hex: false,
                rgba: false,
                hsla: false,
                hsva: false,
                cmyk: false,
                input: false,
                clear: false,
                save: true
            }
        }
    });
    pickr.on('init', instance => {
        console.log('Event: "init"', instance);
    }).on('hide', instance => {
        console.log('Event: "hide"', instance);
    }).on('show', (color, instance) => {
        console.log('Event: "show"', color, instance);
    }).on('save', (color, instance) => {
        console.log('Event: "save"', color, instance);
    }).on('clear', instance => {
        console.log('Event: "clear"', instance);
    }).on('change', (color, source, instance) => {
        pickr.applyColor(true);
        console.log('Event: "change"', color, source, instance);
    }).on('changestop', (source, instance) => {
        console.log('Event: "changestop"', source, instance);
    }).on('cancel', instance => {
        console.log('Event: "cancel"', instance);
    }).on('swatchselect', (color, instance) => {
        console.log('Event: "swatchselect"', color, instance);
    });
}