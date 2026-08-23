const fs = require('fs');
const path = require('path');
const p = path.resolve('src/lib/ViewerManager.ts');
let code = fs.readFileSync(p, 'utf8');

code = code.replace(
    /const material = new window\.THREE\.MeshStandardMaterial\(\{[\s\S]*?color: 0x8b5cf6,[\s\S]*?transparent: true,[\s\S]*?opacity: 0\.7,[\s\S]*?depthTest: false,[\s\S]*?side: window\.THREE\.DoubleSide[\s\S]*?\}\);/m,
    `const material = new window.THREE.MeshStandardMaterial({
                  color: 0x8b5cf6,
                  transparent: true,
                  opacity: 0.7,
                  depthTest: true,
                  depthWrite: true,
                  side: window.THREE.DoubleSide
              });`
);

fs.writeFileSync(p, code);
