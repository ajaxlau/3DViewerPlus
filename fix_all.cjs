const fs = require('fs');
const path = require('path');
const p = path.resolve('src/lib/ViewerManager.ts');
let code = fs.readFileSync(p, 'utf8');

// 1. Fix bounding sphere issue in importCustomPlanningModel, duplicateSubmeshToPlanningObjects, loadFromLocalStorage
code = code.replace(
    /geometry\.computeBoundingBox\(\);\s+const center = new (window\.)?THREE\.Vector3\(\);\s+geometry\.boundingBox\.getCenter\(center\);\s+geometry\.translate\(-center\.x, -center\.y, -center\.z\);/g,
    `geometry.computeBoundingBox();
      geometry.computeBoundingSphere();
      const center = new window.THREE.Vector3();
      geometry.boundingBox.getCenter(center);
      geometry.translate(-center.x, -center.y, -center.z);
      geometry.computeBoundingBox();
      geometry.computeBoundingSphere();`
);

// 2. Fix depthTest and material type for custom_model in loadFromLocalStorage
code = code.replace(
    /const material = new THREE\.MeshBasicMaterial\(\{[\s\S]*?color: 0x8b5cf6,[\s\S]*?opacity: 0\.7,[\s\S]*?depthTest: false,[\s\S]*?side: THREE\.DoubleSide[\s\S]*?\}\);/g,
    `const material = new THREE.MeshStandardMaterial({
                  color: 0x8b5cf6,
                  transparent: true,
                  opacity: 0.7,
                  depthTest: true,
                  depthWrite: true,
                  side: THREE.DoubleSide
              });`
);

// 3. Prevent LineSegments (edges) from getting their color modified in updateMeshColorAndVisibility
code = code.replace(
    /const line = new THREE\.LineSegments\(edges, lineMaterial\);\s+mesh\.add\(line\);/g,
    `const line = new THREE.LineSegments(edges, lineMaterial);
              line.userData.isEdge = true;
              mesh.add(line);`
);

code = code.replace(
    /if \(child\.material\) \{/g,
    `if (child.material && !child.userData?.isEdge) {`
);

// Write back
fs.writeFileSync(p, code);
