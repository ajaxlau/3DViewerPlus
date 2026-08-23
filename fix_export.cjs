const fs = require('fs');
const path = require('path');
const p = path.resolve('src/lib/ViewerManager.ts');
let code = fs.readFileSync(p, 'utf8');

const regex = /const serializableObj = \{ \.\.\.obj \};[\s\S]*?delete serializableObj\.labelDiv;\s*metadataList\.push\(serializableObj\);/m;

const replacement = `const serializableObj = { 
              ...obj,
              posX: obj.mesh?.position?.x,
              posY: obj.mesh?.position?.y,
              posZ: obj.mesh?.position?.z,
              rotQx: obj.mesh?.quaternion?.x,
              rotQy: obj.mesh?.quaternion?.y,
              rotQz: obj.mesh?.quaternion?.z,
              rotQw: obj.mesh?.quaternion?.w,
              scaleX: obj.mesh?.scale?.x,
              scaleY: obj.mesh?.scale?.y,
              scaleZ: obj.mesh?.scale?.z
          };
          delete serializableObj.mesh;
          delete serializableObj.labelSprite;
          delete serializableObj.labelDiv;
          metadataList.push(serializableObj);`;

code = code.replace(regex, replacement);
fs.writeFileSync(p, code);
