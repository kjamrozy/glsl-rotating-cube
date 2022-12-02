import CubeVertexShaderSrc from "./shaders/cube.vert";
import CubeFragmentShaderSrc from "./shaders/cube.frag";

export function setup(canvas: HTMLCanvasElement, width: number, height: number) {
  const config : ReturnType<WebGLRenderingContext["getContextAttributes"]> = {
    powerPreference: "low-power",
    alpha: true,
    premultipliedAlpha: true,
    antialias: true,
    // for this particular use case we don't need stencil and depth(read more below)
    stencil: false,
    depth: false,
  };
  const gl = canvas.getContext("webgl", config);
  if (!gl) { return null; }

  gl.clearColor(0.0, 0.0, 0.0, 0.0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  
  gl.frontFace(gl.CCW);

  // enable blending and set proper blend func
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

  // we don't use depth test because cube is convex and
  // you can draw first its faces that are facing away from the camera
  // and later those that are facing toward the camera
  gl.disable(gl.DEPTH_TEST);
  // we just don't use stencil test
  gl.disable(gl.STENCIL_TEST);

  // As noted above we want to first draw faces that are facing
  // away from the camera and later those that are facing towards camera.
  // This can be easily achieved by culling but first we must enable it.
  gl.enable(gl.CULL_FACE);

  setupProgram(gl);
  resize(gl, width, height);
  return gl;
}

export function resize(gl: WebGLRenderingContext, width: number, height: number) {
  gl.canvas.width = width;
  gl.canvas.height = height;
  // in case GL can't create such a large canvas
  width = gl.drawingBufferWidth;
  height = gl.drawingBufferHeight;
  gl.viewport(0, 0, width, height);
}

const dataUniformLocation: WeakMap<WebGLRenderingContext, WebGLUniformLocation> = new WeakMap();

export function draw(gl: WebGLRenderingContext, frameTime: number, mousePosition: { x: number, y: number }) {
  updateUniforms(gl, frameTime, mousePosition);

  gl.clear(gl.COLOR_BUFFER_BIT);

  // Since cube has some opacity we must draw its faces in a proper order
  // with current blending that means that we must draw back to front.
  // Thankfully cube is convex and it's enough to first draw faces that
  // are facing away from the camera and later those that are facing towards the camera.

  // draw faces that are facing away from the camera
  gl.cullFace(gl.FRONT);
  gl.drawElements(gl.TRIANGLES, 6 * 2 * 3, gl.UNSIGNED_BYTE, 0);

  // draw faces that are facing towards the camera
  gl.cullFace(gl.BACK);
  gl.drawElements(gl.TRIANGLES, 6 * 2 * 3, gl.UNSIGNED_BYTE, 0);
}

function updateUniforms(gl: WebGLRenderingContext, frameTime: number, mousePosition: { x: number, y: number }) {
  gl.uniform1fv(dataUniformLocation.get(gl) as WebGLUniformLocation, new Float32Array([
    frameTime,
    gl.drawingBufferWidth,
    gl.drawingBufferHeight,
    mousePosition.x,
    mousePosition.y,
  ]));
}

function setupProgram(gl: WebGLRenderingContext): void {
  const program = gl.createProgram()!;
  const vertexShader = gl.createShader(gl.VERTEX_SHADER)!;
  const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER)!;

  gl.shaderSource(vertexShader, CubeVertexShaderSrc);
  gl.compileShader(vertexShader);
  if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(vertexShader);
    throw new Error(`Could not compile vertex shader. \n\n${info}`);
  }

  gl.shaderSource(fragmentShader, CubeFragmentShaderSrc);
  gl.compileShader(fragmentShader);
  if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(fragmentShader);
    throw new Error(`Could not compile fragment shader. \n\n${info}`);
  }
  
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);

  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(program);
    throw new Error(`Could not compile WebGL program. \n\n${info}`);
  }
  gl.useProgram(program);
  setupAttributes(gl, program);
  setupUniforms(gl, program);
}

const colors = new Float32Array([
  1.0, 0.0, 0.0, // top/bottom - red
  0.0, 1.0, 0.0, // left/right - green
  0.0, 0.0, 1.0, // front/back - blue
]);

function setupUniforms(gl: WebGLRenderingContext, program: WebGLProgram) {
  const loc = gl.getUniformLocation(program, "u_data");
  console.assert(loc, "Can't find u_data location!");
  dataUniformLocation.set(gl, loc!);

  const faceColorsUniformLoc = gl.getUniformLocation(program, "u_faceColors");
  console.assert(faceColorsUniformLoc, "Can't find u_faceColors location!");
  gl.uniform3fv(faceColorsUniformLoc, colors);
}

const {
  triangles: cubeTriangles,
  vertexIndices: cubeVertexIndices,
  faceIndices: cubeFaceIndices,
} = generateData();

function setupAttributes(gl: WebGLRenderingContext, program: WebGLProgram): void {
  const indexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, cubeTriangles, gl.STATIC_DRAW);

  const vertexIndexAttrBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexIndexAttrBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, cubeVertexIndices, gl.STATIC_DRAW);

  const vertexIndexAttribLoc = gl.getAttribLocation(program, "a_vertexIndex");
  console.assert(vertexIndexAttribLoc !== -1, "Missing a_vertexIndex attribute in the vertex shader!");
  gl.enableVertexAttribArray(vertexIndexAttribLoc);
  gl.vertexAttribPointer(vertexIndexAttribLoc, 1, gl.UNSIGNED_BYTE, false, 0, 0);

  const faceIndexAttrBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, faceIndexAttrBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, cubeFaceIndices, gl.STATIC_DRAW);

  const faceIndexAttribLoc = gl.getAttribLocation(program, "a_faceIndex");
  console.assert(faceIndexAttribLoc !== -1, "Missing a_faceIndex attribute in the vertex shader!");
  gl.enableVertexAttribArray(faceIndexAttribLoc);
  gl.vertexAttribPointer(faceIndexAttribLoc, 1, gl.UNSIGNED_BYTE, false, 0, 0);
}

function generateData() {
  // Each cube face will have its unique vertices.
  // No vertex will be shared between two different cube faces.
  // It is like that because a_faceIndex stores face index and thus
  // every cube vertex must be duplicated because there are 4 different
  // faces that contain it.

  // indices of the vertices that constitute a triangle
  const triangles = [] as number[];

  // data for a_vertexIndex
  const vertexIndices = [] as number[];

  // data for a_faceIndex
  const faceIndices = [] as number[];

  [
    // 0 -  top
    [6, 7, 4, 5],

    // 1 - bottom
    [2, 3, 0, 1],

    // 2 - left
    [6,4,0,2],

    // 3 - right
    [5, 7, 3, 1],

    // 4 - back
    [7, 6, 1, 0],

    // 5 - front
    [4, 5, 2, 3],
  ].forEach((indices, faceIndex) => {
    vertexIndices.push(...indices);

    // push faceIndex x4 times because there are 4 vertices per face
    faceIndices.push(faceIndex, faceIndex, faceIndex, faceIndex);

    const offset = faceIndex * 4;
    triangles.push(
      ...[
        0, 2, 1,
        1, 2, 3
      ].map(index => index + offset),
    );
  });
  return {
    triangles: new Uint8Array(triangles),
    faceIndices: new Uint8Array(faceIndices),
    vertexIndices: new Uint8Array(vertexIndices),
  }
}
