const fs = require('fs');
const path = require('path');
const p = path.resolve('src/lib/ViewerManager.ts');
let code = fs.readFileSync(p, 'utf8');

const regex = /const raycaster = new window\.THREE\.Raycaster\(\);[\s\S]*?const visibleHit = intersects\.find\(\(hit: any\) => \{[\s\S]*?return true;\s*\}\);/m;

const replacement = `const raycaster = new window.THREE.Raycaster();
            raycaster.setFromCamera(mouse, this.viewer.viewer.camera);
            
            // If we are currently interacting with the transform gizmo, don't change selection
            if (this.transformControl && this.transformControl.axis !== null) {
                return;
            }
            
            const planningMeshes = this.planningMode === 'none' 
                ? this.planningObjects.filter(o => ['plane', 'cylinder', 'curve', 'point', 'custom_model'].includes(o.type)).map(o => o.mesh).filter(Boolean)
                : this.planningObjects.filter(o => o.type === 'custom_model').map(o => o.mesh).filter(Boolean);
                
            let scene = this.viewer.viewer.scene || this.viewer.viewer.mainScene;
            if (!scene) return;
            
            const intersectsScene = raycaster.intersectObjects(scene.children, true);
            const intersects = intersectsScene.filter((intersect: any) => {
                let obj = intersect.object;
                
                let isOverlay = false;
                let isGizmo = false;
                while (obj) {
                    if (obj === this.transformControl) {
                        isGizmo = true;
                    }
                    if (obj.userData && obj.userData.isCustomOverlay) {
                        isOverlay = true;
                    }
                    if (!obj.visible) return false;
                    obj = obj.parent;
                }
                
                if (isGizmo) return false; // Never select the gizmo itself
                
                obj = intersect.object;
                let isPlanningMesh = false;
                let isCurrentMesh = false;
                
                while(obj) {
                    if (planningMeshes.includes(obj)) isPlanningMesh = true;
                    if (this.currentMeshes.includes(obj)) isCurrentMesh = true;
                    obj = obj.parent;
                }
                
                if (this.planningMode !== 'none') {
                    if (isCurrentMesh) return true;
                    if (isPlanningMesh) return true; // Allows custom models
                    return false;
                } else {
                    if (isPlanningMesh) return true;
                    if (isCurrentMesh) return true;
                    return false;
                }
            }).sort((a: any, b: any) => a.distance - b.distance);
            
            // Prefer meshes over edges
            let visibleHit = intersects.find((hit: any) => hit.object.isMesh && hit.object.type !== "LineSegments" && hit.object.type !== "EdgesGeometry");
            if (!visibleHit && intersects.length > 0) {
                visibleHit = intersects[0];
            }`;

code = code.replace(regex, replacement);
fs.writeFileSync(p, code);
