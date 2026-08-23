const fs = require('fs');
let code = fs.readFileSync('src/lib/ViewerManager.ts', 'utf8');

const target = `              if (m.color) m.color.set(obj.color);
              if (obj.opacity !== undefined) {
                  m.transparent = true;
                  m.opacity = obj.opacity;
                  m.needsUpdate = true;
              }`;

const replacement = `              if (m.color) {
                  m.color.set(obj.color);
                  if (obj.type === 'custom_model') {
                      if (m.vertexColors !== undefined) m.vertexColors = typeof m.vertexColors === 'number' ? 0 : false;
                      if (m.map !== undefined) m.map = null;
                  }
              }
              if (obj.opacity !== undefined) {
                  m.transparent = true;
                  m.opacity = obj.opacity;
                  if (obj.type === 'custom_model') {
                      // Avoid self-occlusion artifacts when transparent
                      if (obj.opacity < 1.0) {
                          m.depthWrite = false;
                      } else {
                          m.depthWrite = true;
                      }
                  }
                  m.needsUpdate = true;
              }`;

if (code.includes(target)) {
    fs.writeFileSync('src/lib/ViewerManager.ts', code.replace(target, replacement));
    console.log("Replaced successfully!");
} else {
    console.log("Could not find match.");
}
