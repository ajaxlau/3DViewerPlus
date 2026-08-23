const fs = require('fs');
let code = fs.readFileSync('src/lib/ViewerManager.ts', 'utf8');

const target = `                  if (obj.type === 'custom_model') {
                      if (obj.posX !== undefined) {
                          const localPos = new window.THREE.Vector3(obj.posX, obj.posY, obj.posZ);
                          const localQuat = new window.THREE.Quaternion(obj.rotQx || 0, obj.rotQy || 0, obj.rotQz || 0, obj.rotQw !== undefined ? obj.rotQw : 1);
                          const localScale = new window.THREE.Vector3(obj.scaleX || 1, obj.scaleY || 1, obj.scaleZ || 1);
                          
                          newObj.mesh.position.copy(localPos);
                          newObj.mesh.quaternion.copy(localQuat);
                          newObj.mesh.scale.copy(localScale);
                      }
                  } else if (obj.type !== 'plane' && obj.type !== 'cylinder' && obj.type !== 'point' && obj.type !== 'curve' && obj.type !== 'angle' && obj.type !== 'measurement') {
                      if (obj.posX !== undefined) newObj.mesh.position.set(obj.posX, obj.posY, obj.posZ);
                      if (obj.rotQx !== undefined) newObj.mesh.quaternion.set(obj.rotQx, obj.rotQy, obj.rotQz, obj.rotQw);
                      if (obj.scaleX !== undefined) newObj.mesh.scale.set(obj.scaleX, obj.scaleY, obj.scaleZ);
                  }`;

const replacement = `                  if (obj.type === 'custom_model' || (obj.type !== 'plane' && obj.type !== 'cylinder' && obj.type !== 'point' && obj.type !== 'curve' && obj.type !== 'angle' && obj.type !== 'measurement')) {
                      if (obj.posX !== undefined) {
                          const localPos = new window.THREE.Vector3(obj.posX, obj.posY, obj.posZ);
                          const localQuat = new window.THREE.Quaternion(obj.rotQx || 0, obj.rotQy || 0, obj.rotQz || 0, obj.rotQw !== undefined ? obj.rotQw : 1);
                          const localScale = new window.THREE.Vector3(obj.scaleX || 1, obj.scaleY || 1, obj.scaleZ || 1);
                          
                          const mLocal = new window.THREE.Matrix4().compose(localPos, localQuat, localScale);
                          if (modelRoot && window.THREE) {
                              mLocal.premultiply(modelRoot.matrixWorld);
                          }
                          mLocal.decompose(localPos, localQuat, localScale);

                          newObj.mesh.position.copy(localPos);
                          newObj.mesh.quaternion.copy(localQuat);
                          newObj.mesh.scale.copy(localScale);
                      }
                  }`;

if (code.includes(target)) {
    fs.writeFileSync('src/lib/ViewerManager.ts', code.replace(target, replacement));
    console.log("Replaced successfully!");
} else {
    console.log("Could not find match.");
}
