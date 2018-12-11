// Rraw 3D cube on the gray background and apply rotation to it.
const canvas = document.getElementById('webgl');
let gl = null;  // WebGL rendering context
window.onload = initializeWebGL;  // init WebGL when DOM is ready

function initializeWebGL() {
    if (!window.WebGLRenderingContext) {
        console.log('WebGL is supported, but disabled :-(');
        return;
    }

    gl = getWebGLContext(canvas);  // initialize WebGL rendering context, if available
    if (!gl) {
        console.log('Your browser does not support WebGL.');
        return;
    }

    console.log('WebGL is initialized.');
    console.log(gl);  // output the WebGL rendering context object to console for reference
    console.log(gl.getSupportedExtensions());  // print list of supported extensions

    // Vertex shader program
    const vertexSource = `
        attribute vec4 aVertexPosition;
        attribute vec4 aVertexColor;

        uniform mat4 uModelViewMatrix;
        uniform mat4 uProjectionMatrix;

        varying lowp vec4 vColor;

        void main(void) {
          gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
          vColor = aVertexColor;
        }
    `;

    // Fragment shader program
    const fragmentSource = `
        varying lowp vec4 vColor;

        void main(void) {
          gl_FragColor = vColor;
        }
    `;

    // Initialize a shader program; this is where all the lighting is established.
    const shaderProgram = initShaderProgram(vertexSource, fragmentSource);

    // Collect all the info needed to use the shader program.
    programInfo = {
        program: shaderProgram,
        attribLocations: {
            vertexPosition: gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
            vertexColor: gl.getAttribLocation(shaderProgram, 'aVertexColor'),
        },
        uniformLocations: {
            projectionMatrix: gl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
            modelViewMatrix: gl.getUniformLocation(shaderProgram, 'uModelViewMatrix'),
        },
    };

    // Call the routine that builds all the drawing objects.
    buffers = initBuffers();

    // Draw the scene repeatedly
    let then = 0;
    let rotation = 0.0;
    function render(now) {
        now *= 0.001;  // convert to seconds
        rotation += now - then;  // update the rotation for the next draw
        then = now;

        drawScene(programInfo, buffers, rotation);

        requestAnimationFrame(render);
    }
    requestAnimationFrame(render);
}

// Get WebGL context, if standard is not available, then try on different alternatives
function getWebGLContext(canvas) {
    return canvas.getContext('webgl') ||               // standard
           canvas.getContext('experimental-webgl') ||  // Safari, etc.
           canvas.getContext('moz-webgl') ||           // Firefox, Mozilla
           canvas.getContext('webkit-3d');             // last try, Safari and maybe others
}

// Initialize a shader program, so WebGL knows how to draw the data.
function initShaderProgram(vertexSource, fragmentSource) {
    const vertexShader = loadShader(gl.VERTEX_SHADER, vertexSource);
    const fragmentShader = loadShader(gl.FRAGMENT_SHADER, fragmentSource);

    // Create the shader program
    const shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    // If creating the shader program failed, alert
    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        alert('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram));
        return null;
    }
    return shaderProgram;
}

// Create shader of the given type, upload the source and compile it.
function loadShader(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);  // send the source to the shader object
    gl.compileShader(shader);  // compile the shader program
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {  // check if it compiled successfully
        alert('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}

// Initialize the buffers of a simple two-dimensional square.
function initBuffers() {
    const positionBuffer = gl.createBuffer();  // create a buffer for the square's positions
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);  // select the buffer

    // Create an array of positions for the 3D cube.
    const positions = [
        // Front face
        -1.0, -1.0,  1.0,
         1.0, -1.0,  1.0,
         1.0,  1.0,  1.0,
        -1.0,  1.0,  1.0,
        // Back face
        -1.0, -1.0, -1.0,
        -1.0,  1.0, -1.0,
         1.0,  1.0, -1.0,
         1.0, -1.0, -1.0,
        // Top face
        -1.0,  1.0, -1.0,
        -1.0,  1.0,  1.0,
         1.0,  1.0,  1.0,
         1.0,  1.0, -1.0,
        // Bottom face
        -1.0, -1.0, -1.0,
         1.0, -1.0, -1.0,
         1.0, -1.0,  1.0,
        -1.0, -1.0,  1.0,
        // Right face
         1.0, -1.0, -1.0,
         1.0,  1.0, -1.0,
         1.0,  1.0,  1.0,
         1.0, -1.0,  1.0,
        // Left face
        -1.0, -1.0, -1.0,
        -1.0, -1.0,  1.0,
        -1.0,  1.0,  1.0,
        -1.0,  1.0, -1.0,
    ];

    // Pass the list of positions into WebGL to build the shape by creating a Float32Array
    // from the JavaScript array, then use it to fill the current buffer.
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

    // Set up solid color for each face.
    const faceColors = [
        [1.0,  0.0,  0.0,  1.0],  // Front face: red
        [0.0,  1.0,  0.0,  1.0],  // Back face: green
        [0.0,  0.0,  1.0,  1.0],  // Top face: blue
        [0.0,  1.0,  1.0,  1.0],  // Bottom face: cyan
        [1.0,  0.0,  1.0,  1.0],  // Right face: magenta
        [1.0,  1.0,  0.0,  1.0],  // Left face: yellow
    ];

    // Convert the array of colors into a table for all the vertices.
    let colors = [];

    for (let i = 0; i < faceColors.length; i++) {
        const c = faceColors[i];

        // Repeat each color four times for the four vertices of the face.
        colors = colors.concat(c, c, c, c);
    }

    const colorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);

    // Build the element array buffer; this specifies the indices
    // into the vertex arrays for each face's vertices.
    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);

    // This array defines each face as two triangles, using the indices
    // into the vertex array to specify each triangle's position.
    const indices = [
         0,  1,   2,       0,  2,  3,  // front
         4,  5,   6,       4,  6,  7,  // back
         8,  9,  10,       8, 10, 11,  // top
        12, 13,  14,      12, 14, 15,  // bottom
        16, 17,  18,      16, 18, 19,  // right
        20, 21,  22,      20, 22, 23,  // left
    ];

    // Send the element array to GL. The cube is described as a collection of 12 triangles.
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

    return {
        position: positionBuffer,
        color: colorBuffer,
        indices: indexBuffer,
    };
}

// Draw the scene.
function drawScene(programInfo, buffers, rotation) {
    resize(gl.canvas);  // resize canvas if necessary

    gl.clearColor(0.2, 0.2, 0.2, 1.0);  // set screen clear color to gray, fully opaque
    gl.clearDepth(1.0);                 // clear everything
    gl.enable(gl.DEPTH_TEST);           // enable depth testing
    gl.depthFunc(gl.LEQUAL);            // near things obscure far things
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);  // clear the canvas

    const fieldOfView = 45 * Math.PI / 180;   // FOV in radians
    const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    const zNear = 0.1;  // see objects between 0.1 units and 100 units away from the camera
    const zFar = 100.0;
    const projectionMatrix = mat4.create();

    // glmatrix.js always has the first argument as the destination to receive the result.
    mat4.perspective(projectionMatrix,
                     fieldOfView,
                     aspect,
                     zNear,
                     zFar);

    // Set the drawing position to the "identity" point, which is the center of the scene.
    const modelViewMatrix = mat4.create();

    // Move the drawing position a bit
    mat4.translate(modelViewMatrix,     // destination matrix
                   modelViewMatrix,     // matrix to translate
                   [-0.0, 0.0, -6.0]);  // amount to translate
    mat4.rotate(modelViewMatrix,  // destination matrix
        modelViewMatrix,          // matrix to rotate
        rotation,                 // amount to rotate in radians
        [0, 0, 1]);               // axis to rotate around (Z)
    mat4.rotate(modelViewMatrix,  // destination matrix
        modelViewMatrix,          // matrix to rotate
        rotation * 0.7,           // amount to rotate in radians
        [0, 1, 0]);               // axis to rotate around (X)
    mat4.rotate(modelViewMatrix,  // destination matrix
        modelViewMatrix,          // matrix to rotate
        rotation * 0.3,           // amount to rotate in radians
        [1, 0, 0]);               // axis to rotate around (Y)

    // Tell WebGL how to pull out the positions from the position
    // buffer into the vertexPosition attribute.
    {
        const numComponents = 3;
        const type = gl.FLOAT;
        const normalize = false;
        const stride = 0;
        const offset = 0;
        gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
        gl.vertexAttribPointer(
            programInfo.attribLocations.vertexPosition,
            numComponents,
            type,
            normalize,
            stride,
            offset);
        gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);
    }

    // Tell WebGL how to pull out the colors from the color buffer
    // into the vertexColor attribute.
    {
        const numComponents = 4;
        const type = gl.FLOAT;
        const normalize = false;
        const stride = 0;
        const offset = 0;
        gl.bindBuffer(gl.ARRAY_BUFFER, buffers.color);
        gl.vertexAttribPointer(
            programInfo.attribLocations.vertexColor,
            numComponents,
            type,
            normalize,
            stride,
            offset);
        gl.enableVertexAttribArray(
            programInfo.attribLocations.vertexColor);
    }

    // Tell WebGL which indices to use to index the vertices.
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.indices);

    // Tell WebGL to use our program when drawing.
    gl.useProgram(programInfo.program);

    // Set the shader uniforms
    gl.uniformMatrix4fv(
        programInfo.uniformLocations.projectionMatrix,
        false,
        projectionMatrix);
    gl.uniformMatrix4fv(
        programInfo.uniformLocations.modelViewMatrix,
        false,
        modelViewMatrix);

    {
        const vertexCount = 36;  // 12 triangles
        const type = gl.UNSIGNED_SHORT;
        const offset = 0;
        gl.drawElements(gl.TRIANGLES, vertexCount, type, offset);
    }
}

// Resize canvas if window is changed.
function resize(cnv) {
    // Lookup the size the browser is displaying the canvas.
    const displayWidth  = cnv.clientWidth;
    const displayHeight = cnv.clientHeight;

    // Check if the canvas is not the same size.
    if (cnv.width  !== displayWidth ||
        cnv.height !== displayHeight) {

        // Make the canvas the same size
        cnv.width  = displayWidth;
        cnv.height = displayHeight;

        // First time WebGL set the viewport to match the size of the canvas,
        // but after that it's up to you to set it.
        gl.viewport(0, 0, cnv.width, cnv.height);
    }
}
