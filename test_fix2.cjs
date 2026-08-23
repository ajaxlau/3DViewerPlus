const fs = require('fs');
let code = fs.readFileSync('src/lib/ViewerManager.ts', 'utf8');

const target = `              if (this.highlightedPlanningObj.opacity !== undefined) {
                  m.transparent = true;
                  m.opacity = this.highlightedPlanningObj.opacity;
              }
              m.needsUpdate = true;
          };`;

const replacement = `              if (this.highlightedPlanningObj.opacity !== undefined) {
                  m.transparent = true;
                  m.opacity = this.highlightedPlanningObj.opacity;
              }
              if (this.originalColors.has(m)) {
                  this.originalColors.delete(m);
              }
              m.needsUpdate = true;
          };`;

if (code.includes(target)) {
    code = code.replace(target, replacement);
    fs.writeFileSync('src/lib/ViewerManager.ts', code);
    console.log("Updated viewer manager delete originalColors logic");
} else {
    console.log("Target not found!");
}
