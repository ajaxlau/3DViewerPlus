const fs = require('fs');
const path = require('path');
const p = path.resolve('src/lib/ViewerManager.ts');
let code = fs.readFileSync(p, 'utf8');

// 1. Fix loadFromLocalStorage (remove applyMatrix4 and mesh.position.set(0,0,0) and mesh.position.copy(center))
const badLoad = `              if (modelRoot && window.THREE) {
                  geometry.applyMatrix4(modelRoot.matrixWorld);
              }
              geometry.computeBoundingBox();
              const center = new window.THREE.Vector3();
              geometry.boundingBox.getCenter(center);
              geometry.translate(-center.x, -center.y, -center.z);
              const material = new THREE.MeshBasicMaterial({ 
                   color: 0x8b5cf6, 
                   transparent: true, 
                   opacity: 0.7,
                  depthTest: false,
                  side: THREE.DoubleSide
              });
              const mesh = new THREE.Mesh(geometry, material);
              mesh.renderOrder = 999;
              mesh.position.set(0, 0, 0);`;

const goodLoad = `              geometry.computeBoundingBox();
              const center = new window.THREE.Vector3();
              geometry.boundingBox.getCenter(center);
              geometry.translate(-center.x, -center.y, -center.z);
              const material = new THREE.MeshBasicMaterial({ 
                   color: 0x8b5cf6, 
                   transparent: true, 
                   opacity: 0.7,
                  depthTest: false,
                  side: THREE.DoubleSide
              });
              const mesh = new THREE.Mesh(geometry, material);
              mesh.renderOrder = 999;`;

code = code.split(badLoad).join(goodLoad);

// Write it back
fs.writeFileSync(p, code);
