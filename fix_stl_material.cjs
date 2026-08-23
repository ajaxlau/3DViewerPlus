const fs = require('fs');
const path = require('path');
const p = path.resolve('src/lib/ViewerManager.ts');
let code = fs.readFileSync(p, 'utf8');

const importRegex = /let material;\s*if \(this\.currentMeshes\.length > 0 && this\.currentMeshes\[0\]\.material\) \{[\s\S]*?\} else \{\s*material = new THREE\.MeshStandardMaterial\(\{[\s\S]*?side: THREE\.DoubleSide\s*\}\);\s*\}/m;
code = code.replace(importRegex, `const material = new window.THREE.MeshStandardMaterial({
              color: 0x8b5cf6,
              transparent: true,
              opacity: 0.7,
              depthTest: true,
              depthWrite: true,
              side: window.THREE.DoubleSide
          });`);

fs.writeFileSync(p, code);
