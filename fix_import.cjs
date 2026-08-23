const fs = require('fs');
const path = require('path');
const p = path.resolve('src/lib/ViewerManager.ts');
let code = fs.readFileSync(p, 'utf8');

const badStr = `      const THREE = window.THREE;
      
      geometry.center(); // Center the geometry

      let material;`;

const goodStr = `      const THREE = window.THREE;
      
      geometry.computeBoundingBox();
      const center = new THREE.Vector3();
      geometry.boundingBox.getCenter(center);
      geometry.translate(-center.x, -center.y, -center.z);

      let material;`;

code = code.split(badStr).join(goodStr);

const badStr2 = `      const mesh = new THREE.Mesh(geometry, material);
      mesh.renderOrder = 999;
      
      // Give it some initial position slightly above center
      mesh.position.set(0, 0, 0);`;

const goodStr2 = `      const mesh = new THREE.Mesh(geometry, material);
      mesh.renderOrder = 999;
      
      mesh.position.copy(center);`;

code = code.split(badStr2).join(goodStr2);
fs.writeFileSync(p, code);
