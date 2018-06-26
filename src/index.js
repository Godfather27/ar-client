import * as THREE from "three";
import { ARUtils, ARPerspectiveCamera, ARView } from "three.ar.js";
import VRControls from "./scripts/VRControls";
import { initializeWebRTC, sendToVR } from "./scripts/webrtc";
import materials from "./scripts/materials";
import ui from "./scripts/ui";

const SCALE_FACTOR = 0.75;
const MARKER_SIZE = new THREE.Vector3(0.01, 0.01, 0.01);
const raycaster = new THREE.Raycaster();
const HIGHLIGHT_COLOR = 0xa7bd5b;
const LINE_CUBE_DISTANCE = 0.005;

const cubes = new THREE.Group();

let vrDisplay,
  vrControls,
  arView,
  camera,
  renderer,
  scene,
  newCube,
  newScale,
  selected,
  lineMesh,
  lineGeometry,
  webrtc,
  deviceTilt,
  bufferIterator;

let canvasPoints = [];
let canvasMarkers = [];
const currentState = {
  touching: false,
  creating: false,
  moving: false,
  draw: false
};

window.addEventListener("deviceorientation", handleOrientation, true);
function handleOrientation(event) {
  deviceTilt = event.gamma;
}

document.addEventListener("DOMContentLoaded", () => {
  init();
});

async function init() {
  const display = await ARUtils.getARDisplay();
  if (display) {
    vrDisplay = display;
  } else {
    ARUtils.displayUnsupportedMessage();
    return;
  }
  await createCanvas();
  webrtc = await initializeWebRTC();

  webrtc.on("channelMessage", (peer, channel, data) => {
    if (channel === "chat") {
      if(data.payload.type === 'addPoint') drawForeignLine(data.payload);
      if(data.payload.type === 'moveCube') foreignMoveCube(data.payload);
    }
  });


  

  scene = new THREE.Scene();
  arView = new ARView(vrDisplay, renderer);
  camera = new ARPerspectiveCamera(
    vrDisplay,
    60,
    window.innerWidth / window.innerHeight,
    0.01,
    100
  );
  vrControls = new VRControls(camera);
  scene.add(cubes);

  let light = new THREE.PointLight(0xffffff, 0.5);
  light.position.set(10, 10, 10);
  scene.add(light);
  let light2 = new THREE.PointLight(0xffffff, 0.3);
  light2.position.set(-10, 10, -10);
  scene.add(light2);

  RegisterListeners();

  update();
}

function createCanvas() {
  renderer = new THREE.WebGLRenderer({ alpha: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.autoClear = false;
  renderer.domElement;
  document.body.appendChild(renderer.domElement);
}

function RegisterListeners() {
  window.addEventListener("resize", onWindowResize, false);
  ui.createCubeButton.addEventListener("touchstart", createCube);
  ui.createCubeButton.addEventListener("touchend", endCubeScaling);
  ui.deleteCubeButton.addEventListener("touchend", deleteMesh);
  ui.drawButton.addEventListener("touchend", toggleDrawmode);
  ui.resetButton.addEventListener("touchend", reset);
  renderer.domElement.addEventListener("touchstart", onTouchStart);
  renderer.domElement.addEventListener("touchend", onTouchEnd);
}

function cast() {
  raycaster.set(camera.position, camera.getWorldDirection(new THREE.Vector3()));
  const intersections = raycaster.intersectObjects(cubes.children);
  selectCube(intersections);
  return intersections;
}

function selectCube(intersections) {
  // reset cube color to default
  if (
    selected &&
    (!intersections.length || selected.uuid !== intersections[0].object.uuid)
  ) {
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
  const geometry = new THREE.BoxGeometry(size.x, size.y, size.z);

  let cube = new THREE.Mesh(geometry, materials.cubes.clone());
  cube.isDrawable = true;
  cubes.add(cube);

  // set cube position relative to camera
  const cameraDirection = camera.getWorldDirection(new THREE.Vector3());
  spawnPosition = spawnPosition || {
    x: camera.position.x + cameraDirection.x * SCALE_FACTOR,
    y: camera.position.y + cameraDirection.y * SCALE_FACTOR,
    z: camera.position.z + cameraDirection.z * SCALE_FACTOR
  };
  cube.position.set(spawnPosition.x, spawnPosition.y, spawnPosition.z);
  return cube;
}

function moveCube() {
  const cameraDirection = camera.getWorldDirection(new THREE.Vector3());
  const spawnPosition = {
    x: camera.position.x + cameraDirection.x * SCALE_FACTOR,
    y: camera.position.y + cameraDirection.y * SCALE_FACTOR,
    z: camera.position.z + cameraDirection.z * SCALE_FACTOR
  };
  selected.position.set(spawnPosition.x, spawnPosition.y, spawnPosition.z);
  sendToVR({
    type: "moveBox",
    position: spawnPosition,
    boxId: selected.uuid
  });
}

function growCube() {
  newScale *= 1.015;
  newCube.geometry.scale(1.015, 1.015, 1.015);
}

function setCanvasPoint() {
  const cameraDirection = camera.getWorldDirection(new THREE.Vector3());
  const point = new THREE.Vector3(
    camera.position.x + cameraDirection.x * SCALE_FACTOR,
    camera.position.y + cameraDirection.y * SCALE_FACTOR,
    camera.position.z + cameraDirection.z * SCALE_FACTOR
  );
  canvasPoints.push(point);
  canvasMarkers.push(
    cubeFactory({
      size: MARKER_SIZE,
      spawnPosition: point,
      color: 0xff0000
    })
  );

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
  const geometry = new THREE.Geometry();
  geometry.vertices.push(...canvasPoints);
  geometry.faces.push(new THREE.Face3(0, 1, 2), new THREE.Face3(2, 3, 0));
  let mesh = new THREE.Mesh(geometry, materials.canvasPlanes);
  mesh.isDrawable = true;
  scene.add(mesh);
  return mesh;
}


function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function onTouchStart() {
  if (selected) {
    currentState.moving = true;
  } else {
    //setCanvasPoint();
  }
}

function onTouchEnd() {
  currentState.moving = false;
}

function createCube() {
  ui.createCubeButton.classList.add("activeButton");
  currentState.touching = true;
  newScale = 0.1;
  newCube = cubeFactory({
    size: {
      x: 0.1,
      y: 0.1,
      z: 0.1
    }
  });
}

function endCubeScaling() {
  currentState.touching = false;
  currentState.creating = true;
  ui.createCubeButton.classList.remove("activeButton");
}

function deleteMarker(mesh) {
  cubes.remove(mesh);
  if (mesh.geometry) mesh.geometry.dispose();
  if (mesh.material) mesh.material.dispose();
}

function deleteMesh() {
  if (selected) {
    cubes.remove(selected);
    if (selected.geometry) selected.geometry.dispose();
    if (selected.material) selected.material.dispose();
    sendToVR({
      type: "deleteBox",
      uuid: selected.uuid
    });
    selected = undefined;
  }
}

function reset() {
  location.reload();
}

function toggleDrawmode() {
  currentState.draw = !currentState.draw;
  if (currentState.draw) {
    ui.drawButton.classList.add("activeButton");
  } else {
    ui.drawButton.classList.remove("activeButton");
  }
}

//* RENDER LOOP

function update() {
  sendToVR({
    direction: camera.getWorldDirection(new THREE.Vector3()),
    deviceTilt,
    position: camera.position,
    type: "arPosition"
  });

  renderer.clearColor();
  arView.render();
  camera.updateProjectionMatrix();
  vrControls.update();

  if (currentState.touching) growCube();
  if (currentState.creating) {
    let position = new THREE.Vector3();
    position.getPositionFromMatrix(newCube.matrixWorld);
    sendToVR({
      scale: newScale,
      rotation: newCube.rotation,
      position: newCube.position,
      type: "arBox",
      id: newCube.uuid
    });
    currentState.creating = false;
  }

  if (selected && currentState.moving) moveCube();

  if (!currentState.moving) {
    const intersections = cast();
    draw(intersections);
  }
  renderer.clearDepth();
  renderer.render(scene, camera);
  vrDisplay.requestAnimationFrame(update);
}

function attachToCube(child, scene, parent) {
  child.applyMatrix(new THREE.Matrix4().getInverse(parent.matrixWorld));
  scene.remove(child);
  parent.add(child);
}

//* DRAWING

function draw(intersections) {
  if(lineMesh && (lineMesh.parent !== selected)){
    lineGeometry = undefined;
  }
  if (currentState.draw && !lineGeometry && selected) {
    createLine();
    drawLine(
      intersections.filter(element => element.object.isDrawable),
      bufferIterator
    );
  } else if (currentState.draw && lineGeometry && selected) {
    drawLine(
      intersections.filter(element => element.object.isDrawable),
      bufferIterator
    );
    bufferIterator += 3;
  } else {
    lineGeometry = undefined;
  }
}

function createLine(boxId = undefined) {
  bufferIterator = 0;
  lineGeometry = new THREE.BufferGeometry();
  lineGeometry.addAttribute(
    "position",
    new THREE.BufferAttribute(new Float32Array(1500), 3)
  );
  lineGeometry.setDrawRange(0, 0);
  lineMesh = new THREE.Line(lineGeometry, materials.lines);
  scene.add(lineMesh);
  if(boxId){
    attachToCube(lineMesh, scene, cubes.getObjectByProperty("uuid", boxId));
  } else {
    attachToCube(lineMesh, scene, selected);
  }
}

function drawLine([intersection = undefined], bufferIterator) {
  if (intersection) {
    lineMesh.geometry.attributes.position.array[bufferIterator] =
      intersection.point.x + intersection.face.normal.x * LINE_CUBE_DISTANCE;
    lineMesh.geometry.attributes.position.array[bufferIterator + 1] =
      intersection.point.y + intersection.face.normal.y * LINE_CUBE_DISTANCE;
    lineMesh.geometry.attributes.position.array[bufferIterator + 2] =
      intersection.point.z + intersection.face.normal.z * LINE_CUBE_DISTANCE;
    lineMesh.geometry.attributes.position.needsUpdate = true;
    lineMesh.geometry.setDrawRange(0, bufferIterator / 3);
    sendToVR({
      lineId: lineMesh.uuid,
      boxId: selected.uuid,
      type: "addPoint",
      point: intersection.point
    });
  }
}

//*  Foreign Controls

const foreignLines = new Set();
function drawForeignLine(data) {
  if (!foreignLines.has(data.lineId)) {
    if(!cubes.getObjectByProperty("uuid", data.boxId)) return;
    createLine(data.boxId);
    foreignLines.add(data.lineId);
  } else {

    lineMesh.geometry.attributes.position.array[bufferIterator] = data.point.x;
    lineMesh.geometry.attributes.position.array[bufferIterator + 1] = data.point.y;
    lineMesh.geometry.attributes.position.array[bufferIterator + 2] = data.point.z;
    lineMesh.geometry.attributes.position.needsUpdate = true;
    lineMesh.geometry.setDrawRange(0, bufferIterator / 3);
    bufferIterator += 3;
  }
}

function foreignMoveCube(data) {
  const cube = cubes.getObjectByProperty("uuid", data.boxId)
  if(!cube) return;
  cube.position.set(data.position.x, data.position.y, data.position.z);
}
