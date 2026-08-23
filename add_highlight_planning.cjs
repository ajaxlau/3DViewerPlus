const fs = require('fs');
const path = require('path');
const p = path.resolve('src/lib/ViewerManager.ts');
let code = fs.readFileSync(p, 'utf8');

const insert = `
  highlightedPlanningObj: any = null;

  highlightPlanningMesh(obj: any | null) {
      if (this.highlightedPlanningObj && this.highlightedPlanningObj.mesh && window.THREE) {
          // Revert to original color
          const matColor = this.highlightedPlanningObj.color;
          const updateMat = (m: any) => {
              if (m.color) m.color.set(matColor);
              if (this.highlightedPlanningObj.opacity !== undefined) {
                  m.transparent = true;
                  m.opacity = this.highlightedPlanningObj.opacity;
              }
              if (m.emissive) m.emissive.setHex(0x000000);
          };
          if (typeof this.highlightedPlanningObj.mesh.traverse === 'function') {
              this.highlightedPlanningObj.mesh.traverse((child: any) => {
                  if (child.material && !child.userData?.isEdge) {
                      if (Array.isArray(child.material)) {
                          child.material.forEach(updateMat);
                      } else {
                          updateMat(child.material);
                      }
                  }
              });
          }
      }

      this.highlightedPlanningObj = obj;

      if (obj && obj.type === 'custom_model' && obj.mesh && window.THREE) {
          // Highlight it
          const updateMatHighlight = (m: any) => {
              if (m.color) m.color.setHex(0xaed8f2); // highlight color
              // Maybe add slight emissive to make it glow
              if (m.emissive) m.emissive.setHex(0x223344);
          };
          if (typeof obj.mesh.traverse === 'function') {
              obj.mesh.traverse((child: any) => {
                  if (child.material && !child.userData?.isEdge) {
                      if (Array.isArray(child.material)) {
                          child.material.forEach(updateMatHighlight);
                      } else {
                          updateMatHighlight(child.material);
                      }
                  }
              });
          }
      }
      
      if (this.viewer && this.viewer.viewer) {
          this.viewer.viewer.Render();
      }
  }

`;

code = code.replace('  highlightMesh(id: number | null) {', insert + '  highlightMesh(id: number | null) {');

fs.writeFileSync(p, code);
