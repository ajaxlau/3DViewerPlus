const fs = require('fs');
const path = require('path');
const p = path.resolve('src/lib/ViewerManager.ts');
let code = fs.readFileSync(p, 'utf8');

const badDup = `      // Clone geometry
      const cloneGeo = sourceMesh.geometry.clone();

      // Material for overlay - inherit from source mesh to match quality
      let material;`;

const goodDup = `      // Clone geometry
      const cloneGeo = sourceMesh.geometry.clone();
      
      cloneGeo.computeBoundingBox();
      const center = new THREE.Vector3();
      cloneGeo.boundingBox.getCenter(center);
      cloneGeo.translate(-center.x, -center.y, -center.z);

      // Material for overlay - inherit from source mesh to match quality
      let material;`;

code = code.split(badDup).join(goodDup);

const badMesh = `      const mesh = new THREE.Mesh(cloneGeo, material);
      sourceMesh.matrixWorld.decompose(mesh.position, mesh.quaternion, mesh.scale);
      mesh.updateMatrixWorld(true);
      mesh.renderOrder = 999;`;

const goodMesh = `      const mesh = new THREE.Mesh(cloneGeo, material);
      sourceMesh.matrixWorld.decompose(mesh.position, mesh.quaternion, mesh.scale);
      mesh.position.copy(center.clone().applyMatrix4(sourceMesh.matrixWorld));
      mesh.updateMatrixWorld(true);
      mesh.renderOrder = 999;`;

code = code.split(badMesh).join(goodMesh);

const badName = `      let rawName = sourceMesh.name || (sourceMesh.parent && sourceMesh.parent.name ? sourceMesh.parent.name : \`Submesh \${meshIndex + 1}\`);
      let cleanName = rawName.replace(/\\.\\.\\.$/, '').trim();
      if (!cleanName.toLowerCase().includes('copy')) {
          cleanName = \`\${cleanName} (Copy)\`;
      }

      const newObj = {
          id: \`CustomModel_\${this.nextPlanningObjectId++}\`,
          name: cleanName,
          type: 'custom_model',
          mesh,
          color: '#8b5cf6',
          opacity: 0.7,
          fileName: \`\${cleanName}.stl\`
      };`;

const goodName = `      let rawName = sourceMesh.name || (sourceMesh.parent && sourceMesh.parent.name ? sourceMesh.parent.name : \`Submesh \${meshIndex + 1}\`);
      let cleanName = rawName.replace(/\\.\\.\\.$/, '').trim();
      if (!cleanName.toLowerCase().includes('copy')) {
          cleanName = \`\${cleanName} (Copy)\`;
      }

      // Generate STL for cloneGeo
      const positionAttr = cloneGeo.getAttribute('position');
      const indexAttr = cloneGeo.getIndex();
      let stl = \`solid \${cleanName} coordinate_system=Right-Handed_Cartesian units=millimeter origin=0,0,0\\n\`;
      const vA = new THREE.Vector3();
      const vB = new THREE.Vector3();
      const vC = new THREE.Vector3();
      const cb = new THREE.Vector3();
      const ab = new THREE.Vector3();
      const addFacet = (a, b, c) => {
          vA.fromBufferAttribute(positionAttr, a);
          vB.fromBufferAttribute(positionAttr, b);
          vC.fromBufferAttribute(positionAttr, c);
          cb.subVectors(vC, vB);
          ab.subVectors(vA, vB);
          cb.cross(ab).normalize();
          stl += \`  facet normal \${cb.x} \${cb.y} \${cb.z}\\n    outer loop\\n      vertex \${vA.x} \${vA.y} \${vA.z}\\n      vertex \${vB.x} \${vB.y} \${vB.z}\\n      vertex \${vC.x} \${vC.y} \${vC.z}\\n    endloop\\n  endfacet\\n\`;
      };
      if (indexAttr) {
          for (let i = 0; i < indexAttr.count; i += 3) {
              addFacet(indexAttr.getX(i), indexAttr.getX(i+1), indexAttr.getX(i+2));
          }
      } else {
          for (let i = 0; i < positionAttr.count; i += 3) {
              addFacet(i, i+1, i+2);
          }
      }
      stl += \`endsolid \${cleanName}\\n\`;
      
      const blob = new Blob([stl], { type: 'text/plain' });
      const fileDataURL = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target.result);
          reader.readAsDataURL(blob);
      });

      const newObj = {
          id: \`CustomModel_\${this.nextPlanningObjectId++}\`,
          name: cleanName,
          type: 'custom_model',
          mesh,
          color: '#8b5cf6',
          opacity: 0.7,
          fileName: \`\${cleanName}.stl\`,
          fileDataURL
      };`;

code = code.split(badName).join(goodName);
fs.writeFileSync(p, code);
