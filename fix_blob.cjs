const fs = require('fs');
let code = fs.readFileSync('src/lib/ViewerManager.ts', 'utf8');

const target = `      const blob = new Blob([stl], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = \`\${obj.name || obj.id}.stl\`;
      link.click();
      URL.revokeObjectURL(url);`;

const replacement = `      const blob = new Blob([stl], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const safeName = (obj.name || obj.id).replace(/\\.stl$/i, '');
      link.download = \`\${safeName}.stl\`;
      link.click();
      URL.revokeObjectURL(url);`;

if (code.includes(target)) {
    fs.writeFileSync('src/lib/ViewerManager.ts', code.replace(target, replacement));
    console.log("Replaced successfully!");
} else {
    console.log("Could not find match.");
}
