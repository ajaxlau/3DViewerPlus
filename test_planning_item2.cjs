const fs = require('fs');
let code = fs.readFileSync('src/components/PlanningMenu.tsx', 'utf8');

const target = "isDraggingThis \n                 ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/25 ring-2 ring-blue-500/30' \n                 : 'border-slate-200 dark:border-slate-800'";
const replacement = `isDraggingThis
                 ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/25 ring-2 ring-blue-500/30'
                 : viewerManager?.highlightedPlanningObj?.id === obj.id
                     ? 'border-blue-400 bg-blue-50/20 dark:bg-blue-900/10 ring-1 ring-blue-400/50'
                     : 'border-slate-200 dark:border-slate-800'`;

if (code.includes(target)) {
    fs.writeFileSync('src/components/PlanningMenu.tsx', code.replace(target, replacement));
    console.log("Replaced successfully!");
} else {
    // Try regex
    const regex = /isDraggingThis\s+\?\s+'border-blue-500 bg-blue-50\/50 dark:bg-blue-950\/25 ring-2 ring-blue-500\/30'\s+:\s+'border-slate-200 dark:border-slate-800'/g;
    if (code.match(regex)) {
        fs.writeFileSync('src/components/PlanningMenu.tsx', code.replace(regex, replacement));
        console.log("Replaced using regex!");
    } else {
        console.log("Could not find match.");
    }
}
