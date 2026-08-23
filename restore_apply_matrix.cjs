const fs = require('fs');
const path = require('path');
const p = path.resolve('src/lib/ViewerManager.ts');
let code = fs.readFileSync(p, 'utf8');

// Replace commented applyMatrix4 in loadFromLocalStorage and _recreatePlanningObjects
code = code.replace(
    /\/\/\s*if \(modelRoot && window\.THREE\) \{\s*\/\/\s*geometry\.applyMatrix4\(modelRoot\.matrixWorld\);\s*\/\/\s*\}/g,
    `if (modelRoot && window.THREE) { geometry.applyMatrix4(modelRoot.matrixWorld); }`
);

// Add it to importCustomPlanningModel
code = code.replace(
    /const THREE = window\.THREE;\s*geometry\.computeBoundingBox\(\);/g,
    `const THREE = window.THREE;
      const modelRoot = this.getModelRoot();
      if (modelRoot && THREE) { geometry.applyMatrix4(modelRoot.matrixWorld); }
      geometry.computeBoundingBox();`
);

fs.writeFileSync(p, code);
