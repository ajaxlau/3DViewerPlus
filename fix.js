const fs = require('fs');
const path = require('path');
const p = path.resolve('src/lib/ViewerManager.ts');
let code = fs.readFileSync(p, 'utf8');

const badStr = `let material;
      if (this.currentMeshes.length > 0 && this.currentMeshes[0].material) {
          material = Array.isArray(this.currentMeshes[0].material) ? this.currentMeshes[0].material[0].clone() : this.currentMeshes[0].material.clone();
          material.color.setHex(0x8b5cf6);
          material.transparent = true;
          material.opacity = 0.7;
          material.depthTest = true;
          material.depthWrite = true;
      } else {
          material = new THREE.MeshStandardMaterial({
              color: 0x8b5cf6,
              transparent: true,
              opacity: 0.7,
              depthTest: true,
              depthWrite: true,
              side: THREE.DoubleSide
          });
      }
      //`;

const oldStr = `const material = new THREE.MeshBasicMaterial({`;

code = code.split(badStr).join(oldStr);
fs.writeFileSync(p, code);
