const fs = require('fs');
let code = fs.readFileSync('src/lib/ViewerManager.ts', 'utf8');

const target = `              newObj.scaleX = obj.mesh.scale.x;
              newObj.scaleY = obj.mesh.scale.y;
              newObj.scaleZ = obj.mesh.scale.z;
          }`;

const replacement = `              newObj.scaleX = obj.mesh.scale.x;
              newObj.scaleY = obj.mesh.scale.y;
              newObj.scaleZ = obj.mesh.scale.z;
              newObj.mesh.updateMatrixWorld(true);
          }`;

if (code.includes(target)) {
    code = code.replace(target, replacement);
    fs.writeFileSync('src/lib/ViewerManager.ts', code);
    console.log("Updated viewer manager duplicate matrix world logic");
} else {
    console.log("Target not found!");
}
