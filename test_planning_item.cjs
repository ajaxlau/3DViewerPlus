const fs = require('fs');
const code = fs.readFileSync('src/components/PlanningMenu.tsx', 'utf8');

const regex = /<div\s+ref=\{itemRef\}\s+draggable=\{draggable\}/;
const replacement = `<div
        ref={itemRef}
        onClick={(e) => {
            const target = e.target as HTMLElement;
            if (target.closest('button, input')) return;
            if (viewerManager && typeof viewerManager.highlightPlanningMesh === 'function') {
                viewerManager.highlightPlanningMesh(viewerManager.highlightedPlanningObj?.id === obj.id ? null : obj);
            }
        }}
        draggable={draggable}`;

if (code.match(regex)) {
    fs.writeFileSync('src/components/PlanningMenu.tsx', code.replace(regex, replacement));
    console.log("Replaced successfully!");
} else {
    console.log("Could not find match.");
}
