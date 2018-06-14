import {
  WebGLRenderer,
  Scene,
} from 'three'
import {
  ARUtils,
  ARPerspectiveCamera,
  ARView,
} from 'three.ar.js';
import VRControls from './VRControls'

let vrDisplay;
let vrControls;
let arView;
let camera;
let renderer;
let scene;
// Drawing constants.

/**
 * Use the `getARDisplay()` utility to leverage the WebVR API
 * to see if there are any AR-capable WebVR VRDisplays. Returns
 * a valid display if found. Otherwise, display the unsupported
 * browser message.
 */
ARUtils.getARDisplay()
  .then((display) => {
    if (display) {
      vrDisplay = display;
      init();
    } else {
      ARUtils.displayUnsupportedMessage();
    }
  });

function init() {
  screen.lockOrientationUniversal = screen.lockOrientation || screen.mozLockOrientation || screen.msLockOrientation;
  if(screen.lockOrientationUniversal && window.screen.lockOrientationUniversal("portrait")){
    console.log('locked screen to portrait')
  } else {
    console.log('no lock capability')
  };
  // Setup the three.js rendering environment
  createCanvas();
  scene = new Scene();
  // Creating the ARView, which is the object that handles
  // the rendering of the camera stream behind the three.js
  // scene
  arView = new ARView(vrDisplay, renderer);
  // The ARPerspectiveCamera is very similar to PerspectiveCamera,
  // except when using an AR-capable browser, the camera uses
  // the projection matrix provided from the device, so that the
  // perspective camera's depth planes and field of view matches
  // the physical camera on the device.
  camera = new ARPerspectiveCamera(vrDisplay, 60, window.innerWidth / window.innerHeight, 0.01, 100);
  // VRControls is a utility from three.js that applies the device's
  // orientation/position to the perspective camera, keeping our
  // real world and virtual world in sync.
  vrControls = new VRControls(camera);

  // Bind our event handlers
  window.addEventListener('resize', onWindowResize, false);
  // Start drawing when the user touches the screen.
  renderer.domElement.addEventListener('touchstart', onTouchStart);
  // Stop the current draw stroke when the user finishes the touch.
  renderer.domElement.addEventListener('touchend', onTouchEnd);

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

  // Update Brush Physics
  // updatePhysics();

  // Check for shake to undo functionality
  // checkForShake();

  // Update the current graffiti stroke.
  // if (drawing) {
  //   processDraw();
  // }
  // Uncomment to draw brush reticle
  // processDrawBrush();

  // Render our three.js virtual scene
  renderer.clearDepth();
  renderer.render(scene, camera);

  // Kick off the requestAnimationFrame to call this function
  // when a new VRDisplay frame is rendered
  vrDisplay.requestAnimationFrame(update);
}

/**
 * On window resize, update the perspective camera's aspect ratio,
 * and call `updateProjectionMatrix` so that we can get the latest
 * projection matrix provided from the device
 */
function onWindowResize () {
  console.log('RESIZE')
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function onTouchStart() {
  console.log("DRAWING START")
}

function onTouchEnd() {
  console.log("DRAWING END")
}