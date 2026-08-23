const fs = require('fs');
let code = fs.readFileSync('src/lib/ViewerManager.ts', 'utf8');

const target = `          if (newObj.mesh && obj.mesh) {
              newObj.mesh.position.copy(obj.mesh.position);
              newObj.mesh.quaternion.copy(obj.mesh.quaternion);
              newObj.posX = obj.mesh.position.x;
              newObj.posY = obj.mesh.position.y;
              newObj.posZ = obj.mesh.position.z;
              newObj.rotQx = obj.rotQx;
              newObj.rotQy = obj.rotQy;
              newObj.rotQz = obj.rotQz;
              newObj.rotQw = obj.rotQw;
          }`;

const replacement = `          if (newObj.mesh && obj.mesh) {
              newObj.mesh.position.copy(obj.mesh.position);
              newObj.mesh.quaternion.copy(obj.mesh.quaternion);
              newObj.mesh.scale.copy(obj.mesh.scale);
              newObj.posX = obj.mesh.position.x;
              newObj.posY = obj.mesh.position.y;
              newObj.posZ = obj.mesh.position.z;
              newObj.rotQx = obj.mesh.quaternion.x;
              newObj.rotQy = obj.mesh.quaternion.y;
              newObj.rotQz = obj.mesh.quaternion.z;
              newObj.rotQw = obj.mesh.quaternion.w;
              newObj.scaleX = obj.mesh.scale.x;
              newObj.scaleY = obj.mesh.scale.y;
              newObj.scaleZ = obj.mesh.scale.z;
          }`;

if (code.includes(target)) {
    code = code.replace(target, replacement);
    fs.writeFileSync('src/lib/ViewerManager.ts', code);
    console.log("Updated viewer manager duplicate object logic");
} else {
    console.log("Target not found!");
}
