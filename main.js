'use strict';

let gl;                         // The webgl context.
let surface;                    // A surface model
let shProgram;                  // A shader program
let spaceball;                  // A SimpleRotator object that lets the user rotate the view by mouse.

let point;
let texturePoint;
let scale;

let video;
let track;
let texture;
let webCamTexture;
let webCamSurface;

function deg2rad(angle) {
    return angle * Math.PI / 180;
}


// Constructor
function Model(name) {
    this.name = name;
    this.iVertexBuffer = gl.createBuffer();
    this.iTextureBuffer = gl.createBuffer();
    this.count = 0;
    this.countText = 0;

    this.BufferData = function (vertices) {

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STREAM_DRAW);

        this.count = vertices.length / 3;
    }

    this.TextureBufferData = function (normals) {

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iTextureBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STREAM_DRAW);

        this.countText = normals.length / 2;
    }

    this.Draw = function () {

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.vertexAttribPointer(shProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribVertex);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iTextureBuffer);
        gl.vertexAttribPointer(shProgram.iAttribTexture, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribTexture);

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, this.count);
    }
}

// Constructor
function ShaderProgram(name, program) {

    this.name = name;
    this.prog = program;

    // Location of the attribute variable in the shader program.
    this.iAttribVertex = -1;
    this.iAttribTexture = -1;
    // Location of the uniform matrix representing the combined transformation.
    this.iModelViewProjectionMatrix = -1;

    this.iTranslatePoint = -1;
    this.iTexturePoint = -1;
    this.iscale = -1;
    this.iTMU = -1;

    this.Use = function () {
        gl.useProgram(this.prog);
    }
}


/* Draws a colored cube, along with a set of coordinate axes.
 * (Note that the use of the above drawPrimitive function is not an efficient
 * way to draw with WebGL.  Here, the geometry is so simple that it doesn't matter.)
 */
let conv, // convergence
    eyes, // eye separation
    ratio, // aspect ratio
    fov; // field of view
let a, b, c;
let top1, bottom, left, right, near, far;
function draw() {

    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    calcCamParameters();
    
    applyLeftFrustrum();

    let projectionLeft = m4.frustum(left, right, bottom, top1, near, far);

    applyRightFrustrum();

    let projectionRight = m4.frustum(left, right, bottom, top1, near, far);

    /* Get the view matrix from the SimpleRotator object.*/
    let modelView = spaceball.getViewMatrix();

    let rotateToPointZero = m4.axisRotation([0.707, 0.707, 0], 0.7);
    let translateToPointZero = m4.translation(0, 0, -10);
    let translateToLeft = m4.translation(-0.03, 0, -20);
    let translateToRight = m4.translation(0.03, 0, -20);

    let matAccum0 = m4.multiply(rotateToPointZero, modelView);
    let matAccumLeft = m4.multiply(translateToLeft, matAccum0);
    let matAccumRight = m4.multiply(translateToRight, matAccum0);

    gl.uniform1i(shProgram.iTMU, 0);
    gl.enable(gl.TEXTURE_2D);
    gl.uniform2fv(shProgram.iTexturePoint, [texturePoint.x, texturePoint.y]);
    gl.uniform1f(shProgram.iscale, -1000.0);

    let projectionNoRotation = m4.perspective(Math.PI / 32, 1, 8, 22);
    let translatetoCenter = m4.translation(-0.5, -0.5, 0);
    let matrixWebCam = m4.multiply(projectionNoRotation,translatetoCenter);
    gl.bindTexture(gl.TEXTURE_2D, webCamTexture);
    gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        video
    );
    gl.uniformMatrix4fv(shProgram.iModelViewMatrix, false, translateToPointZero);
    gl.uniformMatrix4fv(shProgram.iProjectionMatrix, false, matrixWebCam);
    webCamSurface.Draw();
    gl.clear(gl.DEPTH_BUFFER_BIT);

    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1f(shProgram.iscale, scale);
    gl.uniformMatrix4fv(shProgram.iModelViewMatrix, false, matAccumLeft);
    gl.uniformMatrix4fv(shProgram.iProjectionMatrix, false, projectionLeft);
    gl.colorMask(false, true, true, false);
    surface.Draw();

    gl.clear(gl.DEPTH_BUFFER_BIT);

    gl.uniformMatrix4fv(shProgram.iModelViewMatrix, false, matAccumRight);
    gl.uniformMatrix4fv(shProgram.iProjectionMatrix, false, projectionRight);
    
    gl.colorMask(true, false, false, false);
    surface.Draw();

    gl.colorMask(true, true, true, true);
}

function calcCamParameters() {
    const D = document;
    const spans = D.getElementsByClassName("slider-value");
  
    conv = 2000.0;
    conv = parseFloat(D.getElementById("conv").value);
    spans[3].innerHTML = conv;
  
    eyes = 70.0;
    eyes = parseFloat(D.getElementById("eyes").value);
    spans[0].innerHTML = eyes;
  
    ratio = 1.0;
  
    fov = Math.PI / 4;
    fov = parseFloat(D.getElementById("fov").value);
    spans[1].innerHTML = fov;
  
    near = 10.0;
    near = parseFloat(D.getElementById("near").value) - 0.0;
    spans[2].innerHTML = near;
  
    far = 20000.0;
  
    top1 = near * Math.tan(fov / 2.0);
    bottom = -top1;
  
    a = ratio * Math.tan(fov / 2.0) * conv;
  
    b = a - eyes / 2;
    c = a + eyes / 2;
  }

function applyLeftFrustrum() {
    left = -b * near / conv;
    right = c * near / conv;
}

function applyRightFrustrum() {
    left = -c * near / conv;
    right = b * near / conv;
}

function playVideoFix(){
    draw();
    window.requestAnimationFrame(playVideoFix);
}

function parabolaSurf(u, t) {
    let a = 0.8
    let c = 2
    let theta = Math.PI * 0.2
    let x = (a + t * Math.cos(theta) + c * t ** 2 * Math.sin(theta)) * Math.cos(u)
    let y = (a + t * Math.cos(theta) + c * t ** 2 * Math.sin(theta)) * Math.sin(u)
    let z = -t * Math.sin(theta) + c * t ** 2 * Math.cos(theta)
    return { x: x*0.5, y: y*0.5, z: z*0.5 }
}

function CreateSurfaceData() {
    const vertexList = [];
  
    let i = 0;
    let j = 0;
    const step = 0.1;
  
    while (i < Math.PI * 2) {
      while (j < 1) {
        const v1 = parabolaSurf(i, j);
        const v2 = parabolaSurf(i + step, j);
        const v3 = parabolaSurf(i, j + step);
  
        vertexList.push(v1.x, v1.y, v1.z);
        vertexList.push(v2.x, v2.y, v2.z);
        vertexList.push(v3.x, v3.y, v3.z);
  
        const v4 = parabolaSurf(i + step, j + step);
        vertexList.push(v2.x, v2.y, v2.z);
        vertexList.push(v4.x, v4.y, v4.z);
        vertexList.push(v3.x, v3.y, v3.z);
  
        j += step;
      }
      j = 0;
      i += step;
    }
  
    return vertexList;
  }
function CreateTexture() {
    const texture = [];
    const numSteps = 100;
    const uMax = Math.PI * 2;
    const vMax = Math.PI;
    const step = Math.PI * 2 / numSteps;
  
    for (let u = 0; u <= uMax; u += step) {
      for (let v = -vMax; v <= vMax; v += step) {
        let u1 = mapValue(u, 0, uMax, 0, 1);
        let v1 = mapValue(v, -vMax, vMax, 0, 1);
        texture.push(u1, v1);
  
        u1 = mapValue(u + step, 0, uMax, 0, 1);
        texture.push(u1, v1);
  
        u1 = mapValue(u, 0, uMax, 0, 1);
        v1 = mapValue(v + step, -vMax, vMax, 0, 1);
        texture.push(u1, v1);
  
        u1 = mapValue(u + step, 0, uMax, 0, 1);
        v1 = mapValue(v, -vMax, vMax, 0, 1);
        texture.push(u1, v1);
  
        v1 = mapValue(v + step, -vMax, vMax, 0, 1);
        texture.push(u1, v1);
  
        u1 = mapValue(u, 0, uMax, 0, 1);
        v1 = mapValue(v + step, -vMax, vMax, 0, 1);
        texture.push(u1, v1);
      }
    }
  
    return texture;
  }

function mapValue(val, f1, t1, f2, t2) {
    let m;
    m = (val - f1) * (t2 - f2) / (t1 - f1) + f2

    return Math.min(Math.max(m, f2), t2);
}

function initGL() {
    let prog = createProgram(gl, vertexShaderSource, fragmentShaderSource);

    shProgram = new ShaderProgram('Basic', prog);
    shProgram.Use();

    shProgram.iAttribVertex = gl.getAttribLocation(prog, "vertex");
    shProgram.iAttribTexture = gl.getAttribLocation(prog, "texture");
    shProgram.iModelViewMatrix = gl.getUniformLocation(prog, "ModelViewMatrix");
    shProgram.iProjectionMatrix = gl.getUniformLocation(prog, "ProjectionMatrix");
    shProgram.iTranslatePoint = gl.getUniformLocation(prog, 'translatePoint');
    shProgram.iTexturePoint = gl.getUniformLocation(prog, 'texturePoint');
    shProgram.iscale = gl.getUniformLocation(prog, 'scale');
    shProgram.iTMU = gl.getUniformLocation(prog, 'tmu');

    surface = new Model('Surface');
    surface.BufferData(CreateSurfaceData());
    LoadTexture()
    surface.TextureBufferData(CreateTexture());
    point = new Model('Point');

    webCamSurface = new Model('webCamSurface');
    webCamSurface.BufferData([0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 1.0, 0.0, 1.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0]);
    webCamSurface.TextureBufferData([0,1,1,1,1,0,1,0,0,0,0,1]);

    gl.enable(gl.DEPTH_TEST);
}


/* Creates a program for use in the WebGL context gl, and returns the
 * identifier for that program.  If an error occurs while compiling or
 * linking the program, an exception of type Error is thrown.  The error
 * string contains the compilation or linking error.  If no error occurs,
 * the program identifier is the return value of the function.
 * The second and third parameters are strings that contain the
 * source code for the vertex shader and for the fragment shader.
 */
function createProgram(gl, vShader, fShader) {
    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vShader);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fShader);
    
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error("Link error in program: " + gl.getProgramInfoLog(program));
    }
    
    return program;
    }

function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const shaderType = type === gl.VERTEX_SHADER ? "vertex" : "fragment";
    throw new Error("Error in " + shaderType + " shader: " + gl.getShaderInfoLog(shader));
    }

    return shader;
}

/**
 * initialization function that will be called when the page has loaded
 */
function init() {
    texturePoint = { x: 0.9, y: 0.5 }
    scale = 0.0;
    let canvas;
    try {
        canvas = document.getElementById("webglcanvas");
        gl = canvas.getContext("webgl");
        video = document.createElement('video');
        video.setAttribute('autoplay', true);
        window.vid = video;
        getWebcam();
        CreateWebCamTexture();
        if (!gl) {
            throw "Browser does not support WebGL";
        }
    }
    catch (e) {
        document.getElementById("canvas-holder").innerHTML =
            "<p>Sorry, could not get a WebGL graphics context.</p>";
        return;
    }
    try {
        initGL();  // initialize the WebGL graphics context
    }
    catch (e) {
        document.getElementById("canvas-holder").innerHTML =
            "<p>Sorry, could not initialize the WebGL graphics context: " + e + "</p>";
        return;
    }

    spaceball = new TrackballRotator(canvas, draw, 0);

    playVideoFix()
}

function LoadTexture() {
    texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    const image = new Image();
    image.crossOrigin = 'anonymus';

    image.src = "https://raw.githubusercontent.com/ostrovoyy/vggi/CGW/render_shader-nodes_textures_voronoi_smoothness-distance-zero.png";
    image.onload = function () {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        draw();
      };
}

onmousemove = (e) => {
    scale = map(e.clientX, 0, window.outerWidth, 0, Math.PI)
    draw()
};

function getWebcam() {
    navigator.getUserMedia({ video: true, audio: false }, function (stream) {
        video.srcObject = stream;
        track = stream.getTracks()[0];
    }, function (e) {
        console.error('Rejected!', e);
    });
}

function CreateWebCamTexture() {
    webCamTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, webCamTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
}