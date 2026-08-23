const fs = require('fs');
let indexHtml = fs.readFileSync('index.html', 'utf8');

// Add Google Fonts
if (!indexHtml.includes('fonts.googleapis.com')) {
    indexHtml = indexHtml.replace('</title>', '</title>\n    <link rel="preconnect" href="https://fonts.googleapis.com">\n    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap" rel="stylesheet">');
    fs.writeFileSync('index.html', indexHtml);
    console.log("Updated index.html");
}

let indexCss = fs.readFileSync('src/index.css', 'utf8');
if (!indexCss.includes('--font-display')) {
    indexCss = indexCss.replace('--font-sans: "Helvetica Neue", Helvetica, Arial, sans-serif;', '--font-sans: "Plus Jakarta Sans", sans-serif;\n  --font-display: "Outfit", sans-serif;');
    fs.writeFileSync('src/index.css', indexCss);
    console.log("Updated src/index.css");
}

// Fix App.tsx (remove nested cards and slate to zinc)
let appTsx = fs.readFileSync('src/App.tsx', 'utf8');
appTsx = appTsx.replace(/bg-slate-100 dark:bg-slate-950 sm:p-4/g, 'bg-white dark:bg-zinc-950');
appTsx = appTsx.replace(/sm:border sm:border-slate-300 dark:sm:border-slate-700 bg-white dark:bg-slate-900 shadow-sm rounded-sm/g, '');
appTsx = appTsx.replace(/slate/g, 'zinc');
fs.writeFileSync('src/App.tsx', appTsx);
console.log("Updated App.tsx");

// Fix Header.tsx
let headerTsx = fs.readFileSync('src/components/Header.tsx', 'utf8');
headerTsx = headerTsx.replace(/tracking-\[0\.1em\] uppercase/g, 'font-display tracking-tight text-base md:text-lg');
headerTsx = headerTsx.replace(/slate/g, 'zinc');
fs.writeFileSync('src/components/Header.tsx', headerTsx);
console.log("Updated Header.tsx");

// Fix Sidebar.tsx
let sidebarTsx = fs.readFileSync('src/components/Sidebar.tsx', 'utf8');
sidebarTsx = sidebarTsx.replace(/slate/g, 'zinc');
sidebarTsx = sidebarTsx.replace(/tracking-wider uppercase/g, 'tracking-normal font-medium'); // remove hero eyebrows
fs.writeFileSync('src/components/Sidebar.tsx', sidebarTsx);
console.log("Updated Sidebar.tsx");

// Fix PlanningMenu.tsx
let planningTsx = fs.readFileSync('src/components/PlanningMenu.tsx', 'utf8');
planningTsx = planningTsx.replace(/slate/g, 'zinc');
planningTsx = planningTsx.replace(/tracking-wider uppercase/g, 'tracking-normal font-medium'); // remove hero eyebrows
fs.writeFileSync('src/components/PlanningMenu.tsx', planningTsx);
console.log("Updated PlanningMenu.tsx");

// Fix Modals.tsx
let modalsTsx = fs.readFileSync('src/components/Modals.tsx', 'utf8');
modalsTsx = modalsTsx.replace(/slate/g, 'zinc');
modalsTsx = modalsTsx.replace(/tracking-wider uppercase/g, 'tracking-normal font-medium');
fs.writeFileSync('src/components/Modals.tsx', modalsTsx);
console.log("Updated Modals.tsx");

// Fix ViewerCanvas.tsx
let viewerCanvasTsx = fs.readFileSync('src/components/ViewerCanvas.tsx', 'utf8');
viewerCanvasTsx = viewerCanvasTsx.replace(/slate/g, 'zinc');
viewerCanvasTsx = viewerCanvasTsx.replace(/tracking-wider uppercase/g, 'tracking-normal font-medium');
fs.writeFileSync('src/components/ViewerCanvas.tsx', viewerCanvasTsx);
console.log("Updated ViewerCanvas.tsx");

