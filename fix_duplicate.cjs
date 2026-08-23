const fs = require('fs');
const path = require('path');
const p = path.resolve('src/lib/ViewerManager.ts');
let code = fs.readFileSync(p, 'utf8');

code = code.replace(
    /newObj\.posX = obj\.posX;\s*newObj\.posY = obj\.posY;\s*newObj\.posZ = obj\.posZ;/g,
    `newObj.posX = obj.mesh.position.x;
              newObj.posY = obj.mesh.position.y;
              newObj.posZ = obj.mesh.position.z;`
);

fs.writeFileSync(p, code);
