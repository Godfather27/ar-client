import * as THREE from "three";

const materials = {
  lines: new THREE.LineBasicMaterial({
    color: 0x0000ff,
    linewidth: 2,
    linecap: "round", //ignored by WebGLRenderer
    linejoin: "round"
  }),
  cubes: new THREE.MeshPhongMaterial({
    // light
    specular: 0xffffff,
    // intermediate
    color: 0xcccccc,
    // dark
    emissive: 0x888888,
    shininess: 10,
    wireframe: false
  }),
  canvasPlanes: new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.7,
    side: THREE.DoubleSide
  })
};

materials.lines.defaultColor = 0x0000ff;
materials.cubes.defaultColor = 0xcccccc;
materials.canvasPlanes.defaultColor = 0xffffff;

export default materials;
