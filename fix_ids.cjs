const fs = require('fs');
let code = fs.readFileSync('src/lib/ViewerManager.ts', 'utf8');

const _recreate = code.indexOf('_recreatePlanningObjects');
if (_recreate !== -1) {
    const start = _recreate;
    const end = code.indexOf('async importPlanningObjectsZip', start);
    let recreateFn = code.substring(start, end);

    recreateFn = recreateFn.replace(/id: obj\.id( \|\| `.*?_\$\{this\.nextPlanningObjectId\+\+\}`)?/g, (match, p1) => {
        return `id: (obj.id && !this.planningObjects.some(existing => existing.id === obj.id)) ? obj.id : \`${p1 ? p1.replace(/\|\| `(.*?)`/, '$1') : 'CustomModel_${this.nextPlanningObjectId++}'}\``;
    });

    code = code.substring(0, start) + recreateFn + code.substring(end);
    fs.writeFileSync('src/lib/ViewerManager.ts', code);
    console.log("Fixed _recreatePlanningObjects IDs.");
} else {
    console.log("Not found.");
}
