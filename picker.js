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
}