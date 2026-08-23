const fs = require('fs');
let code = fs.readFileSync('src/lib/ViewerManager.ts', 'utf8');

const target = `          if (this.config.onPlanningObjectsChange) {
              this.config.onPlanningObjectsChange([...this.planningObjects]);
          }
          this.saveToLocalStorage();
          return newObj;`;

const replacement = `          if (this.viewer?.viewer) {
              try { this.viewer.viewer.Render(); } catch (e) {}
          }
          if (this.config.onPlanningObjectsChange) {
              this.config.onPlanningObjectsChange([...this.planningObjects]);
          }
          this.saveToLocalStorage();
          return newObj;`;

if (code.includes(target)) {
    code = code.replace(target, replacement);
    fs.writeFileSync('src/lib/ViewerManager.ts', code);
    console.log("Updated viewer manager duplicate render logic");
} else {
    console.log("Target not found!");
}
