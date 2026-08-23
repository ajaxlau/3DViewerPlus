const fs = require('fs');
const path = require('path');
const p = path.resolve('src/lib/ViewerManager.ts');
let lines = fs.readFileSync(p, 'utf8').split('\n');

// Find the loadFromLocalStorage part where we have applyMatrix4
let insideLoad = false;
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('if (modelRoot && window.THREE) {') && lines[i+1].includes('geometry.applyMatrix4(modelRoot.matrixWorld);') && lines[i+2].includes('}')) {
        // Comment them out
        lines[i] = '// ' + lines[i];
        lines[i+1] = '// ' + lines[i+1];
        lines[i+2] = '// ' + lines[i+2];
    }
    
    if (lines[i].includes('mesh.position.set(0, 0, 0);') && lines[i-1].includes('mesh.renderOrder = 999;')) {
        lines[i] = '// ' + lines[i];
    }
}

fs.writeFileSync(p, lines.join('\n'));
