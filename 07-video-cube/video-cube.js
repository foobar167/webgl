// Set video to 3D cube.
const canvas = document.getElementById('webgl');
let gl = null;  // WebGL rendering context
let copy_video = false;  // set to true when video can be copied to texture
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
        attribute vec3 aVertexNormal;
        attribute vec2 aTextureCoord;

        uniform mat4 uModelViewMatrix;
        uniform mat4 uNormalMatrix;
        uniform mat4 uProjectionMatrix;

        varying highp vec2 vTextureCoord;
        varying highp vec3 vLighting;

        void main(void) {
            gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
            vTextureCoord = aTextureCoord;

            // Apply lighting effect
            highp vec3 ambientLight = vec3(0.3, 0.3, 0.3);  // gray
            highp vec3 directionalLightColor = vec3(1, 1, 1);  // white
            highp vec3 directionalVector = normalize(vec3(1.0, 0.8, 0.7));

            highp vec4 transformedNormal = uNormalMatrix * vec4(aVertexNormal, 1.0);

            highp float directional = max(dot(transformedNormal.xyz, directionalVector), 0.0);
            vLighting = ambientLight + (directionalLightColor * directional);
        }
    `;

    // Fragment shader program
    const fragmentSource = `
        varying highp vec2 vTextureCoord;
        varying highp vec3 vLighting;
        uniform sampler2D uSampler;

        void main(void) {
            highp vec4 texelColor = texture2D(uSampler, vTextureCoord);
            gl_FragColor = vec4(texelColor.rgb * vLighting, texelColor.a);
        }
    `;

    // Initialize a shader program; this is where all the lighting is established.
    const shaderProgram = initShaderProgram(vertexSource, fragmentSource);

    // Collect all the info needed to use the shader program.
    programInfo = {
        program: shaderProgram,
        attribLocations: {
            vertexPosition: gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
            vertexNormal:   gl.getAttribLocation(shaderProgram, 'aVertexNormal'),
            textureCoord:   gl.getAttribLocation(shaderProgram, 'aTextureCoord'),
        },
        uniformLocations: {
            projectionMatrix: gl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
            modelViewMatrix:  gl.getUniformLocation(shaderProgram, 'uModelViewMatrix'),
            normalMatrix:     gl.getUniformLocation(shaderProgram, 'uNormalMatrix'),
            uSampler:         gl.getUniformLocation(shaderProgram, 'uSampler'),
        },
    };

    // Call the routine that builds all the drawing objects.
    buffers = initBuffers();
    const texture = initTexture();
    const video = setupVideo('textures/firefox.mp4');

    // Draw the scene repeatedly
    let then = 0;
    let rotation = 0.0;
    function render(now) {
        now *= 0.001;  // convert to seconds
        rotation += now - then;  // update the rotation for the next draw
        then = now;

        if (copy_video) {
            updateTexture(texture, video);
        }

        drawScene(programInfo, buffers, rotation, texture);

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
    // Set up a buffer for the square's positions.
    const positionBuffer = gl.createBuffer();
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

    // Set up the normals for the vertices to compute lighting.
    const normalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);

    const vertexNormals = [
        // Front
         0.0,  0.0,  1.0,
         0.0,  0.0,  1.0,
         0.0,  0.0,  1.0,
         0.0,  0.0,  1.0,
        // Back
         0.0,  0.0, -1.0,
         0.0,  0.0, -1.0,
         0.0,  0.0, -1.0,
         0.0,  0.0, -1.0,
        // Top
         0.0,  1.0,  0.0,
         0.0,  1.0,  0.0,
         0.0,  1.0,  0.0,
         0.0,  1.0,  0.0,
        // Bottom
         0.0, -1.0,  0.0,
         0.0, -1.0,  0.0,
         0.0, -1.0,  0.0,
         0.0, -1.0,  0.0,
        // Right
         1.0,  0.0,  0.0,
         1.0,  0.0,  0.0,
         1.0,  0.0,  0.0,
         1.0,  0.0,  0.0,
        // Left
        -1.0,  0.0,  0.0,
        -1.0,  0.0,  0.0,
        -1.0,  0.0,  0.0,
        -1.0,  0.0,  0.0,
    ];

    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexNormals), gl.STATIC_DRAW);

    // Set up the texture coordinates for the faces.
    const textureCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, textureCoordBuffer);

    const textureCoordinates = [
        // Front
        0.0,  1.0,
        1.0,  1.0,
        1.0,  0.0,
        0.0,  0.0,
        // Back
        0.0,  1.0,
        1.0,  1.0,
        1.0,  0.0,
        0.0,  0.0,
        // Top
        0.0,  1.0,
        1.0,  1.0,
        1.0,  0.0,
        0.0,  0.0,
        // Bottom
        0.0,  1.0,
        1.0,  1.0,
        1.0,  0.0,
        0.0,  0.0,
        // Right
        0.0,  1.0,
        1.0,  1.0,
        1.0,  0.0,
        0.0,  0.0,
        // Left
        0.0,  1.0,
        1.0,  1.0,
        1.0,  0.0,
        0.0,  0.0,
    ];

    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCoordinates), gl.STATIC_DRAW);

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
        normal: normalBuffer,
        textureCoord: textureCoordBuffer,
        indices: indexBuffer,
    };
}

// Init a texture. Create an empty texture object, put a single pixel in it,
// and set its filtering for later use.
function initTexture() {
    const texture = gl.createTexture();

    // Because video have to be downloaded over the internet it might take a moment until
    // it is ready. Until then put a single pixel in the texture so we can use it immediately.
    const level = 0;
    const internalFormat = gl.RGBA;
    const width = 1;
    const height = 1;
    const border = 0;
    const srcFormat = gl.RGBA;
    const srcType = gl.UNSIGNED_BYTE;
    const pixel = new Uint8Array([0, 0, 255, 255]);  // opaque blue
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, level, internalFormat, width, height,
                  border, srcFormat, srcType, pixel);

    // Turn off mips and set wrapping to clamp to edge,
    // so it will work regardless of the dimensions of the video.
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

    return texture;
}

// Create <video> element to retrieve the video frames.
function setupVideo(url) {
    const video = document.createElement('video');

    let playing = false;  // event to make sure the video is playing
    let timeupdate = false;  // event to make sure the time has been updated

    video.autoplay = true;  // set video to autoplay
    video.muted = true;  // mute the sound
    video.loop = true;  // loop the video

    // Check 2 events, because it will produce an error if upload a video to WebGL that has no data
    // available yet. Checking for both of these events guarantees there is data available and
    // it's safe to start uploading video to a WebGL texture.
    video.addEventListener('playing',
        function() { playing = true; checkReady(); },
        true);

    video.addEventListener('timeupdate',
        function() { timeupdate = true; checkReady(); },
        true);

    video.src = url;  // set video URL
    video.play();  // play the video

    // Set a global variable, copy_video, to true to indicate that it's safe to start copying
    // the video to a texture. Waiting for these 2 events ensures there is data in the video.
    function checkReady() {
        if (playing && timeupdate) {
            copy_video = true;
        }
    }

    return video;
}

// Update the video texture. WebGL knows how to pull the current frame out and use it as a texture.
function updateTexture(texture, video) {
    const level = 0;
    const internalFormat = gl.RGBA;
    const srcFormat = gl.RGBA;
    const srcType = gl.UNSIGNED_BYTE;
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, level, internalFormat, srcFormat, srcType, video);
}

// Draw the scene.
function drawScene(programInfo, buffers, rotation, texture) {
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
                modelViewMatrix,  // matrix to rotate
                rotation,         // amount to rotate in radians
                [0, 0, 1]);       // axis to rotate around (Z)
    mat4.rotate(modelViewMatrix,  // destination matrix
                modelViewMatrix,  // matrix to rotate
                rotation * 0.7,   // amount to rotate in radians
                [0, 1, 0]);       // axis to rotate around (X)
    mat4.rotate(modelViewMatrix,  // destination matrix
                modelViewMatrix,  // matrix to rotate
                rotation * 0.3,   // amount to rotate in radians
                [1, 0, 0]);       // axis to rotate around (Y)

    // Generate and deliver to the shader a normal matrix, which is used to transform the normals
    const normalMatrix = mat4.create();
    mat4.invert(normalMatrix, modelViewMatrix);
    mat4.transpose(normalMatrix, normalMatrix);

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

    // Tell WebGL how to pull out the texture coordinates from the texture coordinate
    // buffer into the textureCoord attribute.
    {
        const numComponents = 2;
        const type = gl.FLOAT;
        const normalize = false;
        const stride = 0;
        const offset = 0;
        gl.bindBuffer(gl.ARRAY_BUFFER, buffers.textureCoord);
        gl.vertexAttribPointer(
            programInfo.attribLocations.textureCoord,
            numComponents,
            type,
            normalize,
            stride,
            offset);
        gl.enableVertexAttribArray(
            programInfo.attribLocations.textureCoord);
    }

    // Tell WebGL how to pull out the normals
    // from the normal buffer into the vertexNormal attribute.
    {
        const numComponents = 3;
        const type = gl.FLOAT;
        const normalize = false;
        const stride = 0;
        const offset = 0;
        gl.bindBuffer(gl.ARRAY_BUFFER, buffers.normal);
        gl.vertexAttribPointer(
            programInfo.attribLocations.vertexNormal,
            numComponents,
            type,
            normalize,
            stride,
            offset);
        gl.enableVertexAttribArray(
            programInfo.attribLocations.vertexNormal);
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
    gl.uniformMatrix4fv(
        programInfo.uniformLocations.normalMatrix,
        false,
        normalMatrix);

    // Specify the texture to map onto the faces.
    // Tell WebGL to affect texture unit 0.
    gl.activeTexture(gl.TEXTURE0);

    // Bind the texture to texture unit 0.
    gl.bindTexture(gl.TEXTURE_2D, texture);

    // Tell the shader we bound the texture to texture unit 0.
    gl.uniform1i(programInfo.uniformLocations.uSampler, 0);

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
