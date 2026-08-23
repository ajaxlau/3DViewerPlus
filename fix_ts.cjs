const fs = require('fs');
const path = require('path');
const p = path.resolve('src/lib/ViewerManager.ts');
let code = fs.readFileSync(p, 'utf8');

code = code.replace('const addFacet = (a, b, c) => {', 'const addFacet = (a: number, b: number, c: number) => {');

fs.writeFileSync(p, code);
