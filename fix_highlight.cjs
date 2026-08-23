const fs = require('fs');
const path = require('path');
const p = path.resolve('src/lib/ViewerManager.ts');
let code = fs.readFileSync(p, 'utf8');

const regex = /highlightPlanningMesh\(obj: any \| null\) \{[\s\S]*?this\.highlightedPlanningObj = obj;[\s\S]*?if \(this\.viewer && this\.viewer\.viewer\) \{/m;

const replacement = `highlightPlanningMesh(obj: any | null) {
      if (this.highlightedPlanningObj && this.highlightedPlanningObj.mesh && window.THREE) {
          // Revert to original color using originalColors map
          const matColor = this.highlightedPlanningObj.color;
          const updateMat = (m: any) => {
              if (this.originalColors.has(m)) {
                  const orig = this.originalColors.get(m);
                  if (orig.color !== null && m.color) m.color.setHex(orig.color);
                  if (orig.vertexColors !== null) m.vertexColors = orig.vertexColors;
                  if (orig.map !== null) m.map = orig.map;
                  if (orig.emissive !== null && m.emissive) m.emissive.setHex(orig.emissive);
              } else {
                  if (m.color) m.color.set(matColor);
                  if (m.emissive) m.emissive.setHex(0x000000);
              }
              if (this.highlightedPlanningObj.opacity !== undefined) {
                  m.transparent = true;
                  m.opacity = this.highlightedPlanningObj.opacity;
              }
              m.needsUpdate = true;
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
              if (!this.originalColors.has(m)) {
                  this.originalColors.set(m, {
                      color: m.color ? m.color.getHex() : null,
                      vertexColors: m.vertexColors !== undefined ? m.vertexColors : null,
                      map: m.map !== undefined ? m.map : null,
                      emissive: (m.emissive !== undefined && m.emissive.getHex) ? m.emissive.getHex() : null,
                  });
              }
              if (m.color) m.color.setHex(0xaed8f2); // highlight color
              if (m.vertexColors !== undefined) m.vertexColors = typeof m.vertexColors === 'number' ? 0 : false;
              if (m.map !== undefined) m.map = null;
              if (m.emissive) m.emissive.setHex(0x0a1a2a);
              m.needsUpdate = true;
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
      
      if (this.viewer && this.viewer.viewer) {`;

code = code.replace(regex, replacement);
fs.writeFileSync(p, code);
