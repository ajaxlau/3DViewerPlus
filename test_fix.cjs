const fs = require('fs');
let code = fs.readFileSync('src/lib/ViewerManager.ts', 'utf8');

const target1 = `      const newObj: any = {
          id: \`CustomModel_\${this.nextPlanningObjectId++}\`,
          name: cleanName,
          type: 'custom_model',
          mesh,
          color: '#8b5cf6',
          opacity: 0.7,
          fileName: \`\${cleanName}.stl\`,
          fileDataURL: ''
      };`;

const replacement1 = `      const newObj: any = {
          id: \`CustomModel_\${this.nextPlanningObjectId++}\`,
          name: cleanName,
          type: 'custom_model',
          mesh,
          color: '#8b5cf6',
          opacity: 0.7,
          fileName: \`\${cleanName}.stl\`,
          fileDataURL: ''
      };
      
      // Align the duplicated model with the rendering effect of all models
      this.updateMeshColorAndVisibility(newObj);`;

code = code.replace(target1, replacement1);
fs.writeFileSync('src/lib/ViewerManager.ts', code);
console.log("Updated viewer manager duplicate logic");
