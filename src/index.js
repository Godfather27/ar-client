import {
  WebGLRenderer,
  Scene,
  BoxGeometry,
  Geometry,
  DoubleSide,
  MeshPhongMaterial,
  MeshBasicMaterial,
  Raycaster,
  Mesh,
  Vector3,
  Face3,
} from 'three'
import {
  ARUtils,
  ARPerspectiveCamera,
  ARView,
} from 'three.ar.js';
import VRControls from './VRControls'

const SCALE_FACTOR = 1.5;
const MARKER_SIZE = new Vector3(0.05, 0.05, 0.05);
const HIGHLIGHT_COLOR = 0xffffff;
const createCubeButton = document.querySelector('#spawn')
const deleteCubeButton = document.querySelector('#delete')
const resetButton = document.querySelector('#reset')

let vrDisplay, vrControls, arView, camera, renderer, scene, newCube, selected;
let touching = false;
let moving = false;
let canvasPoints = [];
let canvasMarkers = [];

async function init() {
  let display = await ARUtils.getARDisplay()
  if (display) {
    vrDisplay = display;
  } else {
    ARUtils.displayUnsupportedMessage();
    return;
  }
  createCanvas()
  scene = new Scene();
  arView = new ARView(vrDisplay, renderer);
  camera = new ARPerspectiveCamera(vrDisplay, 60, window.innerWidth / window.innerHeight, 0.01, 100);
  vrControls = new VRControls(camera);
  RegisterListeners(renderer.domElement)

  update();
}

function createCanvas() {
  renderer = new WebGLRenderer({ alpha: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.autoClear = false;
  renderer.domElement;
  document.body.appendChild(renderer.domElement);
}

function RegisterListeners(threeCanvas) {
  window.addEventListener('resize', onWindowResize, false);
  createCubeButton.addEventListener('touchstart', createCube);
  createCubeButton.addEventListener('touchend', endCubeScaling);
  deleteCubeButton.addEventListener('touchend', deleteMesh);
  resetButton.addEventListener('touchend', reset);
  threeCanvas.addEventListener('touchstart', onTouchStart);
  threeCanvas.addEventListener('touchend', onTouchEnd);
}

/**
 * The render loop, called once per frame. Handles updating
 * our scene and rendering.
 */
function update() {
  // Clears color from the frame before rendering the camera (arView) or scene.
  renderer.clearColor();

  // Render the device's camera stream on screen first of all.
  // It allows to get the right pose synchronized with the right frame.
  arView.render();

  // Update our camera projection matrix in the event that
  // the near or far planes have updated
  camera.updateProjectionMatrix();

  // Update our perspective camera's positioning
  vrControls.update();

  if(touching)
    growCube()

  if(selected && moving)
    moveCube()

  if(!moving)
    selectCube()

  // Render our three.js virtual scene
  renderer.clearDepth();
  renderer.render(scene, camera);

  // Kick off the requestAnimationFrame to call this function
  // when a new VRDisplay frame is rendered
  vrDisplay.requestAnimationFrame(update);
}

function selectCube() {
  const raycaster = new Raycaster(camera.position, camera.getWorldDirection(new Vector3()))
  const intersections = raycaster.intersectObjects( scene.children )

  // reset cube color to default
  if(selected && (!intersections.length || selected.uuid !== intersections[0].object.uui)) {
    selected.material.color.setHex(selected.material.defaultColor);
    selected = null;
  }

  // select and highlight cube
  if(intersections.length){
    selected = intersections[0].object;
    selected.material.color.setHex(HIGHLIGHT_COLOR);
  }
}

function cubeFactory(size, spawnPosition=null) {
  let geometry = new BoxGeometry( size.x, size.y, size.z );
  let material = new MeshBasicMaterial( { color: 0x00ff00 } );
  material.defaultColor = 0x00ff00;
  let cube = new Mesh( geometry, material );
  scene.add( cube );

  // set cube position relative to camera
  let cameraDirection = camera.getWorldDirection(new Vector3())
  spawnPosition = spawnPosition ? spawnPosition : {
    x: camera.position.x + cameraDirection.x * SCALE_FACTOR,
    y: camera.position.y + cameraDirection.y * SCALE_FACTOR,
    z: camera.position.z + cameraDirection.z * SCALE_FACTOR
  }
  cube.position.set(spawnPosition.x, spawnPosition.y, spawnPosition.z)
  return cube;
}

function moveCube() {
  let cameraDirection = camera.getWorldDirection(new Vector3())
  let spawnPosition = {
    x: camera.position.x + cameraDirection.x * SCALE_FACTOR,
    y: camera.position.y + cameraDirection.y * SCALE_FACTOR,
    z: camera.position.z + cameraDirection.z * SCALE_FACTOR
  }
  selected.position.set(spawnPosition.x, spawnPosition.y, spawnPosition.z)
}

function growCube() {
  newCube.geometry.scale(1.015, 1.015, 1.015)
}

function setCanvasPoint() {
  let cameraDirection = camera.getWorldDirection(new Vector3())
  let point = new Vector3(
    camera.position.x + cameraDirection.x * SCALE_FACTOR,
    camera.position.y + cameraDirection.y * SCALE_FACTOR,
    camera.position.z + cameraDirection.z * SCALE_FACTOR
  )
  canvasPoints.push(point)
  canvasMarkers.push(cubeFactory(MARKER_SIZE, point))

  if(canvasPoints.length === 4) {
    createCanvasPlane()
    removeCanvasMarker()
    canvasPoints.length = 0;
  }
}

function removeCanvasMarker() {
  canvasMarkers.forEach(deleteMesh)
  canvasMarkers.length = 0;
}

function createCanvasPlane() {
  let geometry = new Geometry();
  geometry.vertices.push(...canvasPoints);
  geometry.faces.push(
    new Face3( 0, 1, 2),
    new Face3( 2, 3, 0)
  );
  let material = new MeshBasicMaterial( { color: 0xffff00, side: DoubleSide } );
  material.defaultColor = 0xffff00
  let canvasMesh = new Mesh( geometry, material );
  scene.add( canvasMesh );

  return canvasMesh;
}

// EVENT FUNCTIONS
function onWindowResize () {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function onTouchStart() {
  if(selected){
    moving = true;
  } else {
    setCanvasPoint();
  }
}

function onTouchEnd() {
  moving = false;
}

function createCube() {
  touching = true;
  newCube = cubeFactory({
    x: 0.1,
    y: 0.1,
    z: 0.1
  });
}

function endCubeScaling() {
  touching = false;
}

function deleteMesh(mesh) {
  if(mesh){
    if(!mesh.isMesh){
      mesh = selected
      selected = undefined
    }
    scene.remove(mesh);
    mesh.geometry.dispose();
    mesh.material.dispose();
    mesh = undefined;
  }
}

function reset(){
  location.reload();
}

document.addEventListener("DOMContentLoaded", () => {
  init();
});