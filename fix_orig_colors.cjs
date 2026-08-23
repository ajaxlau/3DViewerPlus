const fs = require('fs');
let code = fs.readFileSync('src/lib/ViewerManager.ts', 'utf8');

const target = `                  if (obj.type === 'custom_model') {
                      // Avoid self-occlusion artifacts when transparent
                      if (obj.opacity < 1.0) {
                          m.depthWrite = false;
                      } else {
                          m.depthWrite = true;
                      }
                  }
                  m.needsUpdate = true;
              }
          };`;

const replacement = `                  if (obj.type === 'custom_model') {
                      // Avoid self-occlusion artifacts when transparent
                      if (obj.opacity < 1.0) {
                          m.depthWrite = false;
                      } else {
                          m.depthWrite = true;
                      }
                  }
                  m.needsUpdate = true;
              }
              // If we manually change the color/opacity, clear the saved original colors
              // so that un-highlighting doesn't revert to an old color.
              if (this.originalColors && this.originalColors.has(m)) {
                  this.originalColors.delete(m);
              }
          };`;

if (code.includes(target)) {
    fs.writeFileSync('src/lib/ViewerManager.ts', code.replace(target, replacement));
    console.log("Replaced successfully!");
} else {
    console.log("Could not find match.");
}
