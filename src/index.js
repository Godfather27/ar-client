import {
  WebGLRenderer,
  Scene,
  BoxGeometry,
  Geometry,
  DoubleSide,
  LineBasicMaterial,
  MeshBasicMaterial,
  Raycaster,
  Mesh,
  Line,
  Vector3,
  Face3,
} from 'three';
import { ARUtils, ARPerspectiveCamera, ARView } from 'three.ar.js';
import VRControls from './VRControls';
import { initializeWebRTC } from './webrtc';

const SCALE_FACTOR = 0.75;
const MARKER_SIZE = new Vector3(0.01, 0.01, 0.01);
const raycaster = new Raycaster();
const HIGHLIGHT_COLOR = 0xcc0000;
const createCubeButton = document.querySelector('#spawn')
const deleteCubeButton = document.querySelector('#delete')
const resetButton = document.querySelector('#reset')
const drawButton = document.querySelector('#draw')

let vrDisplay, vrControls, arView, camera, renderer, scene, newCube, newScale, selected, lineGeometry, lineMesh, webrtc, deviceTilt;
let touching = false;
let creating = false;
let moving = false;
let draw = false;
let canvasPoints = [];
let canvasMarkers = [];

window.addEventListener("deviceorientation", handleOrientation, true);
function handleOrientation(event) {
  deviceTilt = event.gamma;
}

async function init() {
  const display = await ARUtils.getARDisplay();
  if (display) {
    vrDisplay = display;
  } else {
    ARUtils.displayUnsupportedMessage();
    return;
  }
  await createCanvas();
  webrtc = initializeWebRTC();


  scene = new Scene();
  arView = new ARView(vrDisplay, renderer);
  camera = new ARPerspectiveCamera(
    vrDisplay,
    60,
    window.innerWidth / window.innerHeight,
    0.01,
    100,
  );
  vrControls = new VRControls(camera);
  RegisterListeners();

  // LINE
  lineGeometry = new Geometry();
  let lineMaterial = new LineBasicMaterial( {
    color: 0xff0000,
    linewidth: 5
  } )
  lineMaterial.defaultColor = 0xff0000
  lineMesh = new Line(lineGeometry, lineMaterial);
  scene.add(lineMesh);
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

function RegisterListeners() {
  window.addEventListener('resize', onWindowResize, false);
  createCubeButton.addEventListener('touchstart', createCube);
  createCubeButton.addEventListener('touchend', endCubeScaling);
  deleteCubeButton.addEventListener('touchend', deleteMesh);
  drawButton.addEventListener('touchend', toggleDrawmode);
  resetButton.addEventListener('touchend', reset);
  renderer.domElement.addEventListener('touchstart', onTouchStart);
  renderer.domElement.addEventListener('touchend', onTouchEnd);
}

/**
 * The render loop, called once per frame. Handles updating
 * our scene and rendering.
 */


function cast() {
  raycaster.set(camera.position, camera.getWorldDirection(new Vector3()))
  const intersections = raycaster.intersectObjects( scene.children )

  selectCube(intersections)
  if(draw)
    drawLine(intersections.filter(element => element.object.isDrawable))
}

function drawLine(intersections) {
  if(intersections[0]){
    // WRONG POINTS? WRONG SPACE?
    lineGeometry.vertices.push(intersections[0].point);
    lineGeometry.verticesNeedUpdate = true;
  }
}

function selectCube(intersections) {
  // reset cube color to default
  if (selected && (!intersections.length || selected.uuid !== intersections[0].object.uui)) {
    selected.material.color.setHex(selected.material.defaultColor);
    selected = null;
  }

  // select and highlight cube
  if (intersections.length) {
    selected = intersections[0].object;
    selected.material.color.setHex(HIGHLIGHT_COLOR);
  }
}

function cubeFactory({ size, spawnPosition = null, color = 0xdddddd }) {
  const geometry = new BoxGeometry(size.x, size.y, size.z);
  const material = new MeshBasicMaterial({ color });
  material.defaultColor = color;
  let cube = new Mesh( geometry, material );
  cube.isDrawable = true;
  scene.add( cube );

  // set cube position relative to camera
  const cameraDirection = camera.getWorldDirection(new Vector3());
  spawnPosition = spawnPosition || {
    x: camera.position.x + cameraDirection.x * SCALE_FACTOR,
    y: camera.position.y + cameraDirection.y * SCALE_FACTOR,
    z: camera.position.z + cameraDirection.z * SCALE_FACTOR,
  };
  cube.position.set(spawnPosition.x, spawnPosition.y, spawnPosition.z);
  return cube;
}

function moveCube() {
  const cameraDirection = camera.getWorldDirection(new Vector3());
  const spawnPosition = {
    x: camera.position.x + cameraDirection.x * SCALE_FACTOR,
    y: camera.position.y + cameraDirection.y * SCALE_FACTOR,
    z: camera.position.z + cameraDirection.z * SCALE_FACTOR,
  };
  selected.position.set(spawnPosition.x, spawnPosition.y, spawnPosition.z);
}

function growCube() {
  newScale *= 1.015;
  newCube.geometry.scale(1.015, 1.015, 1.015);
}

function setCanvasPoint() {
  const cameraDirection = camera.getWorldDirection(new Vector3());
  const point = new Vector3(
    camera.position.x + cameraDirection.x * SCALE_FACTOR,
    camera.position.y + cameraDirection.y * SCALE_FACTOR,
    camera.position.z + cameraDirection.z * SCALE_FACTOR,
  );
  canvasPoints.push(point);
  canvasMarkers.push(cubeFactory({
    size: MARKER_SIZE,
    spawnPosition: point,
    color: 0xff0000,
  }));

  if (canvasPoints.length === 4) {
    createCanvasPlane();
    removeCanvasMarker();
    canvasPoints.length = 0;
  }
}

function removeCanvasMarker() {
  canvasMarkers.forEach(deleteMarker);
  canvasMarkers.length = 0;
}

function createCanvasPlane() {
  const geometry = new Geometry();
  geometry.vertices.push(...canvasPoints);
  geometry.faces.push(new Face3(0, 1, 2), new Face3(2, 3, 0));
  let material = new MeshBasicMaterial({color: 0xffffff, transparent: true, opacity: 0.5, side: DoubleSide});
  material.defaultColor = 0xffffff;
  let mesh = new Mesh(geometry, material);
  mesh.isDrawable = true;
  scene.add(mesh);
  return mesh;
}

// EVENT FUNCTIONS
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function onTouchStart() {
  if (selected) {
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
  newScale = 0.1;
  newCube = cubeFactory({
    size: {
      x: 0.1,
      y: 0.1,
      z: 0.1,
    },
  });
}

function endCubeScaling() {
  touching = false;
  creating = true;
}

function deleteMarker(mesh){
  scene.remove(mesh);
  if(mesh.geometry) mesh.geometry.dispose();
  if(mesh.material) mesh.material.dispose();
}

function deleteMesh() {
  if(selected){
    scene.remove(selected);
    if(selected.geometry) selected.geometry.dispose();
    if(selected.material) selected.material.dispose();
    webrtc.sendDirectlyToAll('chat','message', {
      type: 'deleteBox',
      uuid: selected.uuid,
    });
    selected = undefined;
  }
}

function reset() {
  location.reload();
}

function toggleDrawmode() {
  draw = !draw;
  if(draw) {
    drawButton.style.background = "#00FF00";
  } else {
    drawButton.style.background = "#FFFFFF";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  init();
});


function update() {

  webrtc.sendDirectlyToAll('chat', 'message', {
    direction: camera.getWorldDirection(new Vector3()),
    deviceTilt,
    position: camera.position,
    type: 'arPosition',
  })
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

  if (touching) growCube();
  if (creating){
    const id = generateQuickGuid();
    var position = new Vector3();
    position.getPositionFromMatrix( newCube.matrixWorld );
    webrtc.sendDirectlyToAll('chat', 'message', {
      scale: newScale,
      rotation: newCube.rotation,
      position: newCube.position,
      type: 'arBox',
      id: newCube.uuid
    });
    creating = false;
  }

  if (selected && moving) moveCube();

  if(!moving)
    cast()

  // Render our three.js virtual scene
  renderer.clearDepth();
  renderer.render(scene, camera);

  // Kick off the requestAnimationFrame to call this function
  // when a new VRDisplay frame is rendered
  vrDisplay.requestAnimationFrame(update);
}

function generateQuickGuid() {
  return Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15);
}