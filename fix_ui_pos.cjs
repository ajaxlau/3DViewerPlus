const fs = require('fs');
const path = require('path');
const p = path.resolve('src/components/PlanningMenu.tsx');
let code = fs.readFileSync(p, 'utf8');

code = code.replace(
    /\{obj\.type === 'custom_model' && \(\s*<div ref=\{popoverRef\} className="flex items-center gap-0\.5">/g,
    `{obj.type === 'custom_model' && (
                      <span className="text-[11px] font-mono leading-tight whitespace-nowrap tracking-tight">
                          {localPos.x !== undefined && <span className="ml-2 text-[9px] text-slate-400 dark:text-slate-500 font-normal">Pos: {localPos.x.toFixed(1)}, {localPos.y?.toFixed(1)}, {localPos.z?.toFixed(1)}</span>}
                      </span>
                  )}
                  {obj.type === 'custom_model' && (
                      <div ref={popoverRef} className="flex items-center gap-0.5">`
);

fs.writeFileSync(p, code);
