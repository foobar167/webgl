const canvas = document.getElementById('webgl');

//Set canvas width and height
canvas.width  = window.innerWidth;
canvas.height = window.innerHeight;

var gl = null;  // WebGL rendering context
var extensions = null;  // array of supported extensions
window.onload = InitializeWebGL;  // init WebGL when DOM is ready

// Get WebGL context, if standard is not available; fall back on alternatives
function GetWebGLContext(canvas) {
    return canvas.getContext('webgl') ||               // standard
           canvas.getContext('experimental-webgl') ||  // alternative, Safari, etc.
           canvas.getContext('moz-webgl') ||           // Firefox, Mozilla
           canvas.getContext('webkit-3d');             // last try. Safari, maybe others
// Note that 'webgl' is not available as of Safari version <= 7.0.3
// So we have to fall back to ambiguous alternatives for it,
// and some other browser implementations.
}

function InitializeWebGL() {
    // ! used twice in a row to cast object state to a Boolean value
    if (!!window.WebGLRenderingContext === true) {
        if (gl = GetWebGLContext(canvas)) {  // initialize WebGL rendering context, if available
            console.log('WebGL is initialized.');

            // Ensure OpenGL viewport is resized to match canvas dimensions
            gl.viewportWidth = canvas.width;
            gl.viewportHeight = canvas.height;

            console.log(gl);  // output the WebGL rendering context object to console for reference
            console.log(extensions = gl.getSupportedExtensions());  // list available extensions

            gl.clearColor(0.0, 0.0, 0.0, 1.0);  // set screen clear color to black RGBA
            gl.clear(gl.COLOR_BUFFER_BIT);  // enable color; required for clearing the screen
            //gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);  // clear viewport with black
        } else {
            console.log('Your browser does not support WebGL.');
        }
    } else {
        console.log('WebGL is supported, but disabled :-(');
    }
}
