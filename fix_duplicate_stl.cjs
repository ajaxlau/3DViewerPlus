const fs = require('fs');
const path = require('path');
const p = path.resolve('src/lib/ViewerManager.ts');
let code = fs.readFileSync(p, 'utf8');

const regex = /\/\/\s*Generate STL for cloneGeo[\s\S]*?const fileDataURL = await new Promise\(\(resolve\) => \{[\s\S]*?reader\.readAsDataURL\(blob\);\s*\}\);\s*const newObj = \{[\s\S]*?fileDataURL\s*\};/m;

const replacement = `const newObj: any = {
          id: \`CustomModel_\${this.nextPlanningObjectId++}\`,
          name: cleanName,
          type: 'custom_model',
          mesh,
          color: '#8b5cf6',
          opacity: 0.7,
          fileName: \`\${cleanName}.stl\`,
          fileDataURL: ''
      };
      
      const generatedStl = this.generateSTLString(newObj, true);
      if (generatedStl) {
          const blob = new Blob([generatedStl], { type: 'text/plain' });
          const fileDataURL = await new Promise((resolve) => {
              const reader = new FileReader();
              reader.onload = (e) => resolve(e.target.result);
              reader.readAsDataURL(blob);
          });
          newObj.fileDataURL = fileDataURL;
      }`;

code = code.replace(regex, replacement);

fs.writeFileSync(p, code);
