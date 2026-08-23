const fs = require('fs');
let code = fs.readFileSync('src/lib/ViewerManager.ts', 'utf8');

const target = `                        if (hitObj && (hitObj.type === 'plane' || hitObj.type === 'cylinder' || hitObj.type === 'custom_model')) {
                            this.transformControl.attach(hitPlanningMesh);
                            this.highlightPlanningMesh(hitObj);
                        } else {`;
const replacement = `                        if (hitObj && (hitObj.type === 'plane' || hitObj.type === 'cylinder' || hitObj.type === 'custom_model')) {
                            if (this.highlightedPlanningObj === hitObj) {
                                this.transformControl.detach();
                                this.highlightPlanningMesh(null);
                                if (this.config.onTransformActiveChange) this.config.onTransformActiveChange(false);
                            } else {
                                this.transformControl.attach(hitPlanningMesh);
                                this.highlightPlanningMesh(hitObj);
                            }
                        } else {`;

if (code.includes(target)) {
    fs.writeFileSync('src/lib/ViewerManager.ts', code.replace(target, replacement));
    console.log("Replaced successfully!");
} else {
    console.log("Could not find match.");
}
