const fs = require('fs');
const path = require('path');
const p = path.resolve('src/lib/ViewerManager.ts');
let code = fs.readFileSync(p, 'utf8');

code = code.replace(
    /const localMat = new window\.THREE\.Matrix4\(\)\.compose\(localPos, localQuat, localScale\);\s*const modelRoot = this\.getModelRoot\(\);\s*if \(modelRoot\) \{\s*localMat\.premultiply\(modelRoot\.matrixWorld\);\s*\}\s*localMat\.decompose\(newObj\.mesh\.position, newObj\.mesh\.quaternion, newObj\.mesh\.scale\);/g,
    `newObj.mesh.position.copy(localPos);
                          newObj.mesh.quaternion.copy(localQuat);
                          newObj.mesh.scale.copy(localScale);`
);

fs.writeFileSync(p, code);
