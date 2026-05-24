declare global {
  interface Window {
    OV: any;
    THREE: any;
  }
}

export interface ViewerManagerConfig {
  onStatusChange: (status: string, isEmpty: boolean, filename?: string, url?: string | null) => void;
  onMeshesChange: (meshes: { id: number, name: string, visible: boolean, opacity: number }[]) => void;
  onMeshHighlighted: (id: number | null) => void;
  onPlanningObjectsChange?: (objects: any[]) => void;
  onPlanningPointsChange?: (count: number) => void;
}

export class ViewerManager {
  container: HTMLElement;
  viewer: any;
  config: ViewerManagerConfig;

  currentMeshes: any[] = [];
  theme: 'light' | 'dark' = 'light';
  originalColors: Map<any, any> = new Map();
  highlightedMesh: any = null;
  treeParseInterval: any = null;

  // Planning Tools state
  planningMode: 'none' | 'plane' | 'cylinder' = 'none';
  planningPoints: any[] = [];
  planningPointMarkers: any[] = [];
  planningObjects: any[] = [];
  nextPlanningObjectId: number = 1;

  // Clipping state
  modelBBox: any = null;

  // Snapshot & Rulers
  topRulerRef: HTMLCanvasElement | null = null;
  leftRulerRef: HTMLCanvasElement | null = null;
  rulersVisible: boolean = false;
  rulerAnimationFrame: any = null;
  lastCameraState: string = '';

  constructor(container: HTMLElement, config: ViewerManagerConfig) {
    this.container = container;
    this.config = config;

    // Polyfill to prevent generic Three.js errors from o3dv conflicts
    if (window.THREE && !window.THREE.Object3D.prototype.removeFromParent) {
      window.THREE.Object3D.prototype.removeFromParent = function () {
        if (this.parent !== null) {
          this.parent.remove(this);
        }
      };
    }

    this.initViewer();
    this.setupRaycaster();
  }

  setTheme(theme: 'light' | 'dark') {
    this.theme = theme;
    this.lastCameraState = '';
    if (this.viewer && this.viewer.viewer) {
      const color = theme === 'dark' 
        ? new window.OV.RGBAColor(2, 6, 23, 255) 
        : new window.OV.RGBAColor(255, 255, 255, 255);
      try { 
        this.viewer.viewer.SetBackgroundColor(color); 
        this.viewer.viewer.Render(); 
      } catch(e) {}
    }
  }

  setRulerCanvases(top: HTMLCanvasElement, left: HTMLCanvasElement) {
    this.topRulerRef = top;
    this.leftRulerRef = left;
  }

  initViewer() {
    if (this.viewer) return;
    try {
      const bgColor = this.theme === 'dark' 
        ? new window.OV.RGBAColor(2, 6, 23, 255) 
        : new window.OV.RGBAColor(255, 255, 255, 255);

      this.viewer = new window.OV.EmbeddedViewer(this.container, {
        backgroundColor: bgColor,
        defaultColor: new window.OV.RGBColor(200, 200, 200),
        edgeSettings: new window.OV.EdgeSettings(false, new window.OV.RGBColor(0, 0, 0), 1),
      });
      this.enforceFreeOrbit();

      window.addEventListener('resize', () => {
        if (this.viewer) this.viewer.Resize();
        if (this.rulersVisible) {
          this.resizeRulers();
          this.lastCameraState = ''; 
        }
      });
    } catch (e) {
      console.error("Viewer initialization failed:", e);
    }
  }

  enforceFreeOrbit() {
    if (!this.viewer || !this.viewer.viewer || !this.viewer.viewer.navigation) return;
    try {
      this.viewer.viewer.navigation.fixUpVector = false;
      const cam = this.viewer.viewer.navigation.camera;
      if (cam && cam.up && typeof this.viewer.viewer.SetUpVector === 'function') {
        this.viewer.viewer.SetUpVector(cam.up, false);
      }
    } catch (error) {}
    if (this.viewer.viewer.scene) {
      try { this.viewer.viewer.Render(); } catch(e) {}
    }
  }

  loadFiles(files: FileList | File[]) {
    if (!files || files.length === 0) return;
    const fileArray = Array.from(files);
    const filename = fileArray[0].name;

    this.config.onStatusChange('Loading model data...', false, filename, null);
    
    try {
      this.viewer.LoadModelFromFileList(fileArray);
    } catch(e) { console.error(e); }
    
    this.waitForModelAndBuildTree(filename);
  }

  loadUrl(url: string, cameraArgs?: number[]) {
    if (!url) return;
    const filename = url.split('/').pop()?.split('?')[0] || 'Remote Model';

    this.config.onStatusChange('Loading model from URL...', false, filename, url);
    
    try {
      this.viewer.LoadModelFromUrlList([url]);
    } catch(e) { console.error(e); }
    
    this.waitForModelAndBuildTree(filename, cameraArgs);
  }

  waitForModelAndBuildTree(filename: string, pendingCamera?: number[]) {
    if (this.treeParseInterval) clearInterval(this.treeParseInterval);
    
    let attempts = 0;
    let lastMeshCount = -1;
    let stableCount = 0;
    
    this.treeParseInterval = setInterval(() => {
      attempts++;
      try {
        const scene = this.viewer && this.viewer.viewer ? (this.viewer.viewer.scene || this.viewer.viewer.mainScene) : null;
        let currentMeshCount = 0;
        
        if (scene) {
          scene.traverse((c: any) => { 
            if (c.isMesh && c.type !== "LineSegments" && c.type !== "EdgesGeometry") {
                currentMeshCount++; 
            }
          });
        }
        
        if (currentMeshCount > 0 && currentMeshCount === lastMeshCount) {
          stableCount++;
          if (stableCount >= 2 || attempts >= 120) {
            clearInterval(this.treeParseInterval);
            this.buildModelTree();
            this.setupExplosion();
            
            this.config.onStatusChange(`Model loaded successfully.\n**${filename}**`, false);

            if (pendingCamera && this.viewer.viewer.navigation) {
                try {
                    const c = pendingCamera;
                    const eye = new window.OV.Coord3D(c[0], c[1], c[2]);
                    const center = new window.OV.Coord3D(c[3], c[4], c[5]);
                    const up = new window.OV.Coord3D(c[6], c[7], c[8]);
                    this.viewer.viewer.navigation.SetCamera(new window.OV.Camera(eye, center, up, c[9] || 45.0));
                } catch(e) { console.warn("Failed to set imported camera", e); }
            }
            this.enforceFreeOrbit();
          }
        } else if (currentMeshCount > 0) {
          lastMeshCount = currentMeshCount;
          stableCount = 0;
        } else if (attempts >= 120) {
          clearInterval(this.treeParseInterval);
          this.config.onStatusChange(`Loading finished.\n**${filename}**`, false);
          this.config.onMeshesChange([]);
        }
      } catch (err) {
        clearInterval(this.treeParseInterval);
        this.config.onStatusChange(`Error parsing model.`, false);
      }
    }, 500);
  }

  buildModelTree() {
    this.clearHighlight();
    this.originalColors.clear();
    this.currentMeshes = [];

    const scene = this.viewer?.viewer?.scene || this.viewer?.viewer?.mainScene;
    if (!scene) return;

    const meshInfos: any[] = [];
    scene.traverse((child: any) => {
      if (child.isMesh && child.type !== "LineSegments" && child.type !== "EdgesGeometry") {
        this.currentMeshes.push(child);
        const meshIndex = this.currentMeshes.length - 1;
        
        let name = child.name || (child.parent && child.parent.name ? `${child.parent.name} (Mesh)` : null) || `Mesh ${meshIndex + 1}`;
        if (name.length > 25) name = name.substring(0, 22) + '...';
        
        const opacity = child.material && child.material.opacity !== undefined ? child.material.opacity : 1;
        
        meshInfos.push({
          id: meshIndex,
          name,
          visible: child.visible !== false,
          opacity: opacity
        });
      }
    });

    this.config.onMeshesChange(meshInfos);
  }

  setGlobalOpacity(val: number) {
    const scene = this.viewer?.viewer?.scene || this.viewer?.viewer?.mainScene;
    if (!scene) return;

    scene.traverse((child: any) => {
        if (child.isMesh && child.type !== "LineSegments" && child.type !== "EdgesGeometry") {
            if (child.material) {
                const materials = Array.isArray(child.material) ? child.material : [child.material];
                materials.forEach((mat: any) => {
                    mat.transparent = val < 1.0;
                    mat.opacity = val;
                    mat.needsUpdate = true;
                    mat.depthWrite = val === 1.0;
                });
            }
        }
    });
    try { this.viewer.viewer.Render(); } catch(e) {}
  }

  setMeshOpacity(id: number, val: number) {
    const mesh = this.currentMeshes[id];
    if (mesh && mesh.material) {
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      materials.forEach((mat: any) => { 
        mat.transparent = val < 1.0; 
        mat.opacity = val; 
        mat.needsUpdate = true; 
        mat.depthWrite = val === 1.0; 
      });
      try { this.viewer.viewer.Render(); } catch(err) {}
    }
  }

  toggleMeshVisibility(id: number) {
    const mesh = this.currentMeshes[id];
    if (mesh) {
        mesh.visible = !mesh.visible;
        try { this.viewer.viewer.Render(); } catch(err) {}
    }
  }

  // --- HIGHLIGHTING & RAYCASTING ---
  
  setupRaycaster() {
    let pointerDownPos = { x: 0, y: 0 };
    
    this.container.addEventListener('pointerdown', (e) => {
        pointerDownPos = { x: e.clientX, y: e.clientY };
    });

    this.container.addEventListener('pointerup', (e) => {
        const dist = Math.sqrt(Math.pow(e.clientX - pointerDownPos.x, 2) + Math.pow(e.clientY - pointerDownPos.y, 2));
        if (dist > 5) return; 

        if (window.THREE && this.viewer?.viewer?.camera) {
            const rect = this.container.getBoundingClientRect();
            const mouse = new window.THREE.Vector2();
            mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
            
            const raycaster = new window.THREE.Raycaster();
            raycaster.setFromCamera(mouse, this.viewer.viewer.camera);
            
            const intersects = raycaster.intersectObjects(this.currentMeshes, false);
            const visibleHit = intersects.find((hit: any) => hit.object.visible);
            
            if (this.planningMode !== 'none') {
                 if (visibleHit) {
                     this.addPlanningPoint(visibleHit.point);
                 }
                 return;
            }

            if (visibleHit) {
                const hitMesh = visibleHit.object;
                const idx = this.currentMeshes.indexOf(hitMesh);
                if (this.highlightedMesh === hitMesh) {
                    this.highlightMesh(null);
                } else {
                    this.highlightMesh(idx);
                }
            } else {
                this.highlightMesh(null);
            }
        }
    });
  }

  setPlanningMode(mode: 'none' | 'plane' | 'cylinder') {
      this.planningMode = mode;
      this.clearPlanningPoints();
  }

  clearPlanningPoints() {
      this.planningPoints = [];
      if (this.viewer && this.viewer.viewer && window.THREE) {
          const scene = this.viewer.viewer.scene || this.viewer.viewer.mainScene;
          if (scene) {
              this.planningPointMarkers.forEach(marker => {
                  scene.remove(marker);
                  if (marker.geometry) marker.geometry.dispose();
                  if (marker.material) marker.material.dispose();
              });
          }
      }
      this.planningPointMarkers = [];
      if (this.config.onPlanningPointsChange) {
          this.config.onPlanningPointsChange(0);
      }
      if (this.viewer && this.viewer.viewer) {
          this.viewer.viewer.Render();
      }
  }

  addPlanningPoint(point: any) {
      if (!window.THREE || !this.viewer || !this.viewer.viewer) return;
      const scene = this.viewer.viewer.scene || this.viewer.viewer.mainScene;
      if (!scene) return;
      
      const THREE = window.THREE;

      if (this.planningMode === 'plane' && this.planningPoints.length >= 3) return;
      if (this.planningMode === 'cylinder' && this.planningPoints.length >= 2) return;

      this.planningPoints.push(point);
      
      const geometry = new THREE.SphereGeometry(2, 16, 16);
      const material = new THREE.MeshBasicMaterial({ color: 0xff0000, depthTest: false });
      const marker = new THREE.Mesh(geometry, material);
      marker.onBeforeRender = function() {};
      marker.onAfterRender = function() {};
      if (material) {
        material.onBeforeRender = function() {};
      }
      marker.position.copy(point);
      marker.renderOrder = 999; 
      scene.add(marker);
      this.planningPointMarkers.push(marker);

      if (this.config.onPlanningPointsChange) {
          this.config.onPlanningPointsChange(this.planningPoints.length);
      }
      this.viewer.viewer.Render();
  }

  undoPlanningPoint() {
      if (this.planningPoints.length > 0) {
          this.planningPoints.pop();
          const marker = this.planningPointMarkers.pop();
          if (marker) {
              const scene = this.viewer?.viewer?.scene || this.viewer?.viewer?.mainScene;
              if (scene) scene.remove(marker);
              if (marker.geometry) marker.geometry.dispose();
              if (marker.material) marker.material.dispose();
          }
          if (this.config.onPlanningPointsChange) {
              this.config.onPlanningPointsChange(this.planningPoints.length);
          }
          if (this.viewer && this.viewer.viewer) {
              this.viewer.viewer.Render();
          }
      }
  }

  confirmPlanningObject(options: { planeWidth?: number, planeHeight?: number, cylinderRadius?: number, cylinderExtension?: number } = {}) {
      if (this.planningMode === 'plane' && this.planningPoints.length === 3) {
          this.createPlanningPlane(this.planningPoints[0], this.planningPoints[1], this.planningPoints[2], options.planeWidth, options.planeHeight);
          this.setPlanningMode('none');
          if (this.config.onPlanningObjectsChange) {
              this.config.onPlanningObjectsChange(this.planningObjects);
          }
      } else if (this.planningMode === 'cylinder' && this.planningPoints.length === 2) {
          this.createPlanningCylinder(this.planningPoints[0], this.planningPoints[1], options.cylinderRadius, options.cylinderExtension);
          this.setPlanningMode('none');
          if (this.config.onPlanningObjectsChange) {
              this.config.onPlanningObjectsChange(this.planningObjects);
          }
      }
  }

  createPlanningPlane(p1: any, p2: any, p3: any, customWidth?: number, customHeight?: number) {
      if (!window.THREE || !this.viewer || !this.viewer.viewer) return;
      const scene = this.viewer.viewer.scene || this.viewer.viewer.mainScene;
      if (!scene) return;

      const THREE = window.THREE;
      
      const center = new THREE.Vector3().addVectors(p1, p2).add(p3).divideScalar(3);
      const v1 = new THREE.Vector3().subVectors(p2, p1);
      const v2 = new THREE.Vector3().subVectors(p3, p1);
      const normal = new THREE.Vector3().crossVectors(v1, v2).normalize();
      
      const width = customWidth || 100;
      const height = customHeight || 100;

      const geometry = new THREE.PlaneGeometry(width, height);
      const material = new THREE.MeshBasicMaterial({ 
          color: 0x00ff00, 
          side: THREE.DoubleSide, 
          transparent: true, 
          opacity: 0.5 
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.onBeforeRender = function() {};
      mesh.onAfterRender = function() {};
      if (material) {
        material.onBeforeRender = function() {};
      }
      
      // Orient the plane
      const testNormal = new THREE.Vector3(0, 0, 1);
      const quaternion = new THREE.Quaternion().setFromUnitVectors(testNormal, normal);
      mesh.quaternion.copy(quaternion);
      mesh.position.copy(center);

      scene.add(mesh);
      this.viewer.viewer.Render();

      this.planningObjects.push({
          id: `Plane_${this.nextPlanningObjectId++}`,
          type: 'plane',
          mesh,
          width,
          height,
          color: '#00ff00'
      });
  }

  createPlanningCylinder(p1: any, p2: any, customRadius?: number, customExtension?: number) {
      if (!window.THREE || !this.viewer || !this.viewer.viewer) return;
      const scene = this.viewer.viewer.scene || this.viewer.viewer.mainScene;
      if (!scene) return;

      const THREE = window.THREE;

      const distance = p1.distanceTo(p2);
      const center = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
      const direction = new THREE.Vector3().subVectors(p2, p1).normalize();

      const radius = customRadius || 0.5; // Default diameter 1mm => radius 0.5
      const extension = customExtension !== undefined ? customExtension : 20; // 20mm default extension
      const length = distance + (extension * 2);

      // CylinderGeometry is along Y axis by default
      const geometry = new THREE.CylinderGeometry(radius, radius, length, 32);
      const material = new THREE.MeshBasicMaterial({ 
          color: 0x0000ff, 
          transparent: true, 
          opacity: 0.5 
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.onBeforeRender = function() {};
      mesh.onAfterRender = function() {};
      if (material) {
        material.onBeforeRender = function() {};
      }

      const up = new THREE.Vector3(0, 1, 0);
      const quaternion = new THREE.Quaternion().setFromUnitVectors(up, direction);
      mesh.quaternion.copy(quaternion);
      mesh.position.copy(center);

      scene.add(mesh);
      this.viewer.viewer.Render();

      this.planningObjects.push({
          id: `Cylinder_${this.nextPlanningObjectId++}`,
          type: 'cylinder',
          mesh,
          radius,
          length,
          color: '#0000ff'
      });
  }

  updatePlanningObjectTransform(id: string, updates: { posX?: number, posY?: number, posZ?: number, rotX?: number, rotY?: number, rotZ?: number }) {
      if (!window.THREE) return;
      const THREE = window.THREE;
      const obj = this.planningObjects.find(o => o.id === id);
      if (!obj) return;
      
      if (updates.posX !== undefined) obj.mesh.position.x = updates.posX;
      if (updates.posY !== undefined) obj.mesh.position.y = updates.posY;
      if (updates.posZ !== undefined) obj.mesh.position.z = updates.posZ;

      if (updates.rotX !== undefined || updates.rotY !== undefined || updates.rotZ !== undefined) {
          const rx = updates.rotX !== undefined ? THREE.MathUtils.degToRad(updates.rotX) : obj.mesh.rotation.x;
          const ry = updates.rotY !== undefined ? THREE.MathUtils.degToRad(updates.rotY) : obj.mesh.rotation.y;
          const rz = updates.rotZ !== undefined ? THREE.MathUtils.degToRad(updates.rotZ) : obj.mesh.rotation.z;
          obj.mesh.rotation.set(rx, ry, rz);
      }

      this.viewer.viewer.Render();
      if (this.config.onPlanningObjectsChange) {
          this.config.onPlanningObjectsChange(this.planningObjects);
      }
  }

  removePlanningObject(id: string) {
      const idx = this.planningObjects.findIndex(o => o.id === id);
      if (idx > -1) {
          const obj = this.planningObjects[idx];
          if (this.viewer && this.viewer.viewer) {
             const scene = this.viewer.viewer.scene || this.viewer.viewer.mainScene;
             if (scene) {
                 scene.remove(obj.mesh);
                 if (obj.mesh.geometry) obj.mesh.geometry.dispose();
                 if (obj.mesh.material) obj.mesh.material.dispose();
                 this.viewer.viewer.Render();
             }
          }
          this.planningObjects.splice(idx, 1);
          if (this.config.onPlanningObjectsChange) {
              this.config.onPlanningObjectsChange(this.planningObjects);
          }
      }
  }

  generateSTLString(obj: any): string | null {
      if (!window.THREE) return null;
      const THREE = window.THREE;
      const mesh = obj.mesh;
      const geometry = mesh.geometry;
      if (!geometry.isBufferGeometry) return null;
      
      const cloneGeo = geometry.clone();
      cloneGeo.applyMatrix4(mesh.matrixWorld);

      let stl = `solid ${obj.id}\n`;

      const positionAttr = cloneGeo.getAttribute('position');
      const indexAttr = cloneGeo.getIndex();
      
      const vA = new THREE.Vector3();
      const vB = new THREE.Vector3();
      const vC = new THREE.Vector3();
      const cb = new THREE.Vector3();
      const ab = new THREE.Vector3();

      const addFacet = (a: number, b: number, c: number) => {
          vA.fromBufferAttribute(positionAttr, a);
          vB.fromBufferAttribute(positionAttr, b);
          vC.fromBufferAttribute(positionAttr, c);

          cb.subVectors(vC, vB);
          ab.subVectors(vA, vB);
          cb.cross(ab).normalize();

          stl += `  facet normal ${cb.x} ${cb.y} ${cb.z}\n`;
          stl += `    outer loop\n`;
          stl += `      vertex ${vA.x} ${vA.y} ${vA.z}\n`;
          stl += `      vertex ${vB.x} ${vB.y} ${vB.z}\n`;
          stl += `      vertex ${vC.x} ${vC.y} ${vC.z}\n`;
          stl += `    endloop\n`;
          stl += `  endfacet\n`;
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
      
      stl += `endsolid ${obj.id}\n`;
      return stl;
  }

  exportPlanningObjectSTL(id: string) {
      const obj = this.planningObjects.find(o => o.id === id);
      if (!obj) return;
      const stl = this.generateSTLString(obj);
      if (!stl) return;

      const blob = new Blob([stl], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${obj.id}.stl`;
      link.click();
      URL.revokeObjectURL(url);
  }

  async exportAllPlanningObjectsZip() {
      if (this.planningObjects.length === 0) return;
      
      // dynamically import jszip to avoid server crashing on load? It's client side so we can import JSZip
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();

      this.planningObjects.forEach(obj => {
          const stl = this.generateSTLString(obj);
          if (stl) {
              zip.file(`${obj.id}.stl`, stl);
          }
      });

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'planning_objects.zip';
      link.click();
      URL.revokeObjectURL(url);
  }

  highlightMesh(id: number | null) {
    this.clearHighlight();
    if (id !== null && this.currentMeshes[id]) {
        const mesh = this.currentMeshes[id];
        this.highlightedMesh = mesh;
        if (mesh.material) {
            const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
            materials.forEach((mat: any) => {
                if (!this.originalColors.has(mat)) {
                    this.originalColors.set(mat, {
                        color: mat.color ? mat.color.getHex() : 0xcccccc,
                        roughness: mat.roughness !== undefined ? mat.roughness : null,
                        metalness: mat.metalness !== undefined ? mat.metalness : null,
                        shininess: mat.shininess !== undefined ? mat.shininess : null,
                        specular: mat.specular !== undefined && mat.specular.getHex ? mat.specular.getHex() : null,
                        vertexColors: mat.vertexColors !== undefined ? mat.vertexColors : null,
                        map: mat.map !== undefined ? mat.map : null,
                        emissive: (mat.emissive !== undefined && mat.emissive.getHex) ? mat.emissive.getHex() : null,
                    });
                }
                
                // Set the beautiful reflective light blue color from the reference
                if (mat.color) {
                    mat.color.setHex(0xaed8f2);
                }
                
                // Disable vertex coloring and textures temporarily so the color is exact and not mixed
                if (mat.vertexColors !== undefined) {
                    mat.vertexColors = typeof mat.vertexColors === 'number' ? 0 : false;
                }
                if (mat.map !== undefined) {
                    mat.map = null;
                }
                if (mat.emissive !== undefined && mat.emissive.setHex) {
                    mat.emissive.setHex(0x000000);
                }
                
                // Enhance reflectivity and shine
                if (mat.roughness !== undefined) {
                    mat.roughness = 0.11; // smooth reflective surface
                }
                if (mat.metalness !== undefined) {
                    mat.metalness = 0.18; // elegant slight metallic reflection
                }
                if (mat.shininess !== undefined) {
                    mat.shininess = 80; // high gloss for Phong material
                }
                if (mat.specular !== undefined && mat.specular.setHex) {
                    mat.specular.setHex(0xffffff); // pure white specular reflecting light
                }
                
                mat.needsUpdate = true;
            });
        }
    }
    this.config.onMeshHighlighted(id);
    if (this.viewer?.viewer) {
        try { this.viewer.viewer.Render(); } catch(e) {}
    }
  }

  clearHighlight() {
      if (this.highlightedMesh && this.highlightedMesh.material) {
          const materials = Array.isArray(this.highlightedMesh.material) ? this.highlightedMesh.material : [this.highlightedMesh.material];
          materials.forEach((mat: any) => {
              if (this.originalColors.has(mat)) {
                  const orig = this.originalColors.get(mat);
                  if (orig) {
                      if (mat.color) {
                          mat.color.setHex(orig.color);
                      }
                      if (orig.roughness !== null && mat.roughness !== undefined) {
                          mat.roughness = orig.roughness;
                       }
                      if (orig.metalness !== null && mat.metalness !== undefined) {
                          mat.metalness = orig.metalness;
                       }
                      if (orig.shininess !== null && mat.shininess !== undefined) {
                          mat.shininess = orig.shininess;
                       }
                      if (orig.specular !== null && mat.specular !== undefined && mat.specular.setHex) {
                          mat.specular.setHex(orig.specular);
                       }
                      if (orig.vertexColors !== null && mat.vertexColors !== undefined) {
                          mat.vertexColors = orig.vertexColors;
                       }
                      if (orig.map !== null && mat.map !== undefined) {
                          mat.map = orig.map;
                       }
                      if (orig.emissive !== null && mat.emissive !== undefined && mat.emissive.setHex) {
                          mat.emissive.setHex(orig.emissive);
                       }
                  }
              }
              mat.needsUpdate = true;
          });
          this.highlightedMesh = null;
      }
  }

  // --- CLIPPING ---
  
  setClippingActive(active: boolean, planesState: any) {
    if (active) {
      if (!this.modelBBox) {
        this.modelBBox = new window.THREE.Box3();
      }
      this.modelBBox.makeEmpty();
      this.currentMeshes.forEach(mesh => {
          const meshBox = new window.THREE.Box3().setFromObject(mesh);
          this.modelBBox.union(meshBox);
      });
    }
    this.updateClippingPlanes(active ? planesState : null);
  }

  updateClippingPlanes(planesState: any) {
    if (!this.viewer?.viewer?.renderer) return;
    const renderer = this.viewer.viewer.renderer;
    renderer.localClippingEnabled = true;

    if (planesState && this.modelBBox && !this.modelBBox.isEmpty()) {
        const activePlanes: any[] = [];
        
        ['x', 'y', 'z'].forEach(axis => {
            const state = planesState[axis];
            if (state && state.active) {
                if (!state.plane) state.plane = new window.THREE.Plane();
                
                let min, max;
                if (axis === 'x') { min = this.modelBBox.min.x; max = this.modelBBox.max.x; }
                else if (axis === 'y') { min = this.modelBBox.min.y; max = this.modelBBox.max.y; }
                else if (axis === 'z') { min = this.modelBBox.min.z; max = this.modelBBox.max.z; }

                const pos = min + (max - min) * (state.sliderVal / 100);

                const normal = new window.THREE.Vector3();
                if (axis === 'x') normal.set(1, 0, 0);
                if (axis === 'y') normal.set(0, 1, 0);
                if (axis === 'z') normal.set(0, 0, 1);

                if (state.invert) normal.negate();

                const pointOnPlane = new window.THREE.Vector3();
                if (axis === 'x') pointOnPlane.x = pos;
                if (axis === 'y') pointOnPlane.y = pos;
                if (axis === 'z') pointOnPlane.z = pos;

                state.plane.normal.copy(normal);
                state.plane.constant = -normal.dot(pointOnPlane);
                
                activePlanes.push(state.plane);
            }
        });

        this.currentMeshes.forEach(mesh => {
            if (mesh.material) {
                const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
                materials.forEach((mat: any) => {
                    mat.clippingPlanes = activePlanes;
                    mat.clipShadows = true;
                    mat.side = window.THREE.DoubleSide;
                    mat.needsUpdate = true;
                });
            }
        });
    } else {
        this.currentMeshes.forEach(mesh => {
            if (mesh.material) {
                const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
                materials.forEach((mat: any) => {
                    mat.clippingPlanes = null;
                    mat.needsUpdate = true;
                });
            }
        });
    }
    try { this.viewer.viewer.Render(); } catch(e) {}
  }

  // --- EXPLOSION ---
  
  setupExplosion() {
    const scene = this.viewer?.viewer?.scene || this.viewer?.viewer?.mainScene;
    if (!scene || this.currentMeshes.length === 0) return;

    const boundingBox = new window.THREE.Box3().setFromObject(scene);
    const modelCenter = new window.THREE.Vector3();
    if (!boundingBox.isEmpty()) {
        if (typeof boundingBox.getCenter === 'function' && boundingBox.getCenter.length === 0) {
            modelCenter.copy(boundingBox.getCenter());
        } else {
            boundingBox.getCenter(modelCenter);
        }
    }

    const size = new window.THREE.Vector3();
    if (!boundingBox.isEmpty()) {
        if (typeof boundingBox.getSize === 'function' && boundingBox.getSize.length === 0) {
            size.copy(boundingBox.getSize());
        } else {
            boundingBox.getSize(size);
        }
    }
    const maxDim = Math.max(size.x, size.y, size.z) || 100;

    this.currentMeshes.forEach(mesh => {
        mesh.userData = mesh.userData || {};
        mesh.userData.originalPosition = mesh.position.clone();
        
        const meshBox = new window.THREE.Box3().setFromObject(mesh);
        const meshCenter = new window.THREE.Vector3();
        if (!meshBox.isEmpty()) {
            if (typeof meshBox.getCenter === 'function' && meshBox.getCenter.length === 0) {
                meshCenter.copy(meshBox.getCenter());
            } else {
                meshBox.getCenter(meshCenter);
            }
        } else {
            meshCenter.copy(mesh.position);
        }
        
        let dir = new window.THREE.Vector3().subVectors(meshCenter, modelCenter);
        if (dir.lengthSq() < 0.0001) dir.set(0, 1, 0); 
        else dir.normalize();
        
        mesh.userData.explosionDir = dir;
        mesh.userData.maxDim = maxDim;
    });
  }

  setExplode(val: number) {
      if (!this.viewer?.viewer) return;
      this.currentMeshes.forEach(mesh => {
          if (mesh.userData && mesh.userData.originalPosition && mesh.userData.explosionDir) {
              const moveDist = val * mesh.userData.maxDim * 0.5;
              mesh.position.copy(mesh.userData.originalPosition)
                  .add(mesh.userData.explosionDir.clone().multiplyScalar(moveDist));
          }
      });
      try { this.viewer.viewer.Render(); } catch(err) {}
  }


  // --- RULERS ---
  
  setRulersVisible(val: boolean) {
      this.rulersVisible = val;
      if (val) {
          this.resizeRulers();
          this.lastCameraState = '';
          this.updateRulersLoop();
      } else {
          if (this.rulerAnimationFrame) cancelAnimationFrame(this.rulerAnimationFrame);
      }
  }

  resizeRulers() {
      if (this.topRulerRef) {
          const rect = this.topRulerRef.getBoundingClientRect();
          if (this.topRulerRef.width !== rect.width) this.topRulerRef.width = rect.width;
          if (this.topRulerRef.height !== rect.height) this.topRulerRef.height = rect.height;
      }
      if (this.leftRulerRef) {
          const rect = this.leftRulerRef.getBoundingClientRect();
          if (this.leftRulerRef.width !== rect.width) this.leftRulerRef.width = rect.width;
          if (this.leftRulerRef.height !== rect.height) this.leftRulerRef.height = rect.height;
      }
  }

  updateRulersLoop = () => {
    if (!this.rulersVisible) return;
    try {
        if (this.viewer?.viewer?.navigation) {
            let cam: any = null;
            if (typeof this.viewer.viewer.navigation.GetCamera === 'function') {
                cam = this.viewer.viewer.navigation.GetCamera();
            } else if (this.viewer.viewer.navigation.camera) {
                // Three.js camera + target from controls?
                const threeCam = this.viewer.viewer.navigation.camera;
                // In o3dv, perhaps it's stored in get target?
                cam = {
                    eye: threeCam.position,
                    center: this.viewer.viewer.navigation.controls?.target || new window.THREE.Vector3()
                };
            }
            
            if (cam && cam.eye && cam.center) {
                const canvasRect = this.container.getBoundingClientRect();
                const stateStr = `${Math.round(cam.eye.x * 100)},${Math.round(cam.eye.y * 100)},${Math.round(cam.eye.z * 100)},${Math.round(cam.center.x * 100)},${Math.round(cam.center.y * 100)},${Math.round(cam.center.z * 100)},${Math.round(canvasRect.width)},${Math.round(canvasRect.height)}`;
                if (stateStr !== this.lastCameraState) { 
                    this.lastCameraState = stateStr;
                    this.resizeRulers(); 
                    this.drawRulers(cam, this.topRulerRef, this.leftRulerRef); 
                }
            }
        }
    } catch(e) {
        console.error("Rulers error:", e);
    }
    this.rulerAnimationFrame = requestAnimationFrame(this.updateRulersLoop);
  }

  drawRulers(cam: any, topRuler: HTMLCanvasElement | null, leftRuler: HTMLCanvasElement | null) {
      const dx = cam.eye.x - cam.center.x, dy = cam.eye.y - cam.center.y, dz = cam.eye.z - cam.center.z;
      const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
      const fov = 45 * (Math.PI / 180);
      const canvasRect = this.container.getBoundingClientRect();
      if (canvasRect.height === 0) return;

      const visibleHeight = 2 * dist * Math.tan(fov / 2);
      const pixelsPerUnit = canvasRect.height / visibleHeight;
      const minTickDistancePx = 60;
      const unitsPerMajorTick = minTickDistancePx / pixelsPerUnit;
      if (unitsPerMajorTick <= 0 || !isFinite(unitsPerMajorTick)) return;

      const exp = Math.floor(Math.log10(unitsPerMajorTick));
      const mag = Math.pow(10, exp);
      const norm = unitsPerMajorTick / mag;
      let step = 1;
      if (norm > 5) step = 10; else if (norm > 2) step = 5; else if (norm > 1) step = 2;
      step *= mag;

      if (topRuler) this.renderRulerCanvas(topRuler, true, pixelsPerUnit, step);
      if (leftRuler) this.renderRulerCanvas(leftRuler, false, pixelsPerUnit, step);
  }

  renderRulerCanvas(canvas: HTMLCanvasElement, isHorizontal: boolean, pixelsPerUnit: number, step: number, scale = 1) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h); 
    ctx.fillStyle = this.theme === 'dark' ? '#333333' : '#fafafa'; 
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = this.theme === 'dark' ? '#aaaaaa' : '#555555'; 
    ctx.strokeStyle = this.theme === 'dark' ? '#555555' : '#cccccc'; 
    ctx.lineWidth = Math.max(1, scale * 0.5);
    ctx.font = `${Math.round(10 * scale)}px sans-serif`; 
    ctx.textBaseline = 'top';

    const zeroPos = isHorizontal ? w / 2 : h / 2;
    const maxUnits = (isHorizontal ? w : h) / pixelsPerUnit / 2;
    const maxTicks = Math.ceil(maxUnits / step) * step;

    ctx.beginPath();
    if (isHorizontal) { ctx.moveTo(0, h); ctx.lineTo(w, h); } else { ctx.moveTo(w, 0); ctx.lineTo(w, h); }

    for(let i = -maxTicks; i <= maxTicks; i += step) {
        const pos = zeroPos + (i * pixelsPerUnit);
        const label = Math.abs(i).toString();
        if (isHorizontal) {
            ctx.moveTo(pos, h); ctx.lineTo(pos, h - 8 * scale); 
            ctx.textAlign = 'center'; ctx.fillText(label, pos, 4 * scale);
        } else {
            ctx.moveTo(w, pos); ctx.lineTo(w - 8 * scale, pos); 
            ctx.save(); ctx.translate(w - 12 * scale, pos);
            ctx.rotate(-Math.PI/2); ctx.textAlign = 'center'; ctx.fillText(label, 0, -4 * scale); ctx.restore();
        }
        const minorStep = step / 10, minorPx = minorStep * pixelsPerUnit;
        if (minorPx > 4 * scale) {
            for(let j = 1; j < 10; j++) {
                const mpos = zeroPos + ((i + j * minorStep) * pixelsPerUnit);
                const tickLen = (j === 5) ? 6 * scale : 3 * scale;
                if (isHorizontal) { ctx.moveTo(mpos, h); ctx.lineTo(mpos, h - tickLen); } 
                else { ctx.moveTo(w, mpos); ctx.lineTo(w - tickLen, mpos); }
            }
        }
    }
    ctx.stroke();
  }

  captureSnapshot(width: number, height: number, isTransparent: boolean): string | null {
      if (!this.viewer?.viewer?.renderer) return null;
      const v = this.viewer.viewer;
      const renderer = v.renderer;

      const oldWidth = this.container.clientWidth;
      const oldHeight = this.container.clientHeight;
      if (oldHeight === 0) return null;

      const oldAspect = v.camera.aspect;
      const oldLeft = v.camera.left;
      const oldRight = v.camera.right;
      const oldTop = v.camera.top;
      const oldBottom = v.camera.bottom;
      const oldClearAlpha = renderer.getClearAlpha();
      
      const defaultBg = this.theme === 'dark' ? { r: 20, g: 20, b: 20, a: 255 } : { r: 240, g: 240, b: 240, a: 255 };
      const bg = v.backgroundColor || defaultBg;
      const hexColor = (bg.r << 16) | (bg.g << 8) | bg.b;
      
      const targetAspect = width / height;

      if (v.camera.isOrthographicCamera || v.camera.type === 'OrthographicCamera') {
          const currentHeight = v.camera.top - v.camera.bottom;
          const centerH = (v.camera.top + v.camera.bottom) / 2;
          const centerW = (v.camera.right + v.camera.left) / 2;
          const halfH = currentHeight / 2;
          
          v.camera.top = centerH + halfH;
          v.camera.bottom = centerH - halfH;
          v.camera.left = centerW - (halfH * targetAspect);
          v.camera.right = centerW + (halfH * targetAspect);
      } else {
          v.camera.aspect = targetAspect;
      }
      
      v.camera.updateProjectionMatrix();
      renderer.setSize(width, height, false); 
      
      if (isTransparent) {
          renderer.setClearColor(0x000000, 0); 
      } else {
          renderer.setClearColor(hexColor, bg.a / 255);
      }
      
      try { renderer.render(v.scene, v.camera); } catch(e) { console.error(e); }

      const masterCanvas = document.createElement('canvas');
      masterCanvas.width = width;
      masterCanvas.height = height;
      const ctx = masterCanvas.getContext('2d');
      if (!ctx) return null;
      
      ctx.drawImage(renderer.domElement, 0, 0, width, height);

      // Draw Rulers if active
      if (this.rulersVisible) {
          const scaleFactor = Math.max(1, height / oldHeight);
          const rulerThickness = Math.round(24 * scaleFactor);
          
          try {
              const cam = v.navigation.GetCamera();
              if (cam && cam.eye && cam.center) {
                  const dx = cam.eye.x - cam.center.x, dy = cam.eye.y - cam.center.y, dz = cam.eye.z - cam.center.z;
                  const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
                  const fov = 45 * (Math.PI / 180);

                  const visibleHeight = 2 * dist * Math.tan(fov / 2);
                  const pixelsPerUnit = height / visibleHeight;
                  const minTickDistancePx = 60 * scaleFactor;
                  const unitsPerMajorTick = minTickDistancePx / pixelsPerUnit;
                  
                  if (unitsPerMajorTick > 0 && isFinite(unitsPerMajorTick)) {
                      const exp = Math.floor(Math.log10(unitsPerMajorTick));
                      const mag = Math.pow(10, exp);
                      const norm = unitsPerMajorTick / mag;
                      let step = 1;
                      if (norm > 5) step = 10; else if (norm > 2) step = 5; else if (norm > 1) step = 2;
                      step *= mag;

                      const topCanvas = document.createElement('canvas');
                      topCanvas.width = width - rulerThickness;
                      topCanvas.height = rulerThickness;
                      
                      const leftCanvas = document.createElement('canvas');
                      leftCanvas.width = rulerThickness;
                      leftCanvas.height = height - rulerThickness;

                      this.renderRulerCanvas(topCanvas, true, pixelsPerUnit, step, scaleFactor);
                      this.renderRulerCanvas(leftCanvas, false, pixelsPerUnit, step, scaleFactor);
                      
                      ctx.fillStyle = this.theme === 'dark' ? '#333333' : '#fafafa';
                      ctx.fillRect(0, 0, rulerThickness, rulerThickness);
                      ctx.strokeStyle = this.theme === 'dark' ? '#555555' : '#e0e0e0';
                      ctx.lineWidth = 1 * scaleFactor;
                      ctx.strokeRect(0, 0, rulerThickness, rulerThickness);
                      ctx.fillStyle = this.theme === 'dark' ? '#aaaaaa' : '#888888';
                      ctx.font = `bold ${Math.round(9 * scaleFactor)}px sans-serif`;
                      ctx.textAlign = 'center';
                      ctx.textBaseline = 'middle';
                      ctx.fillText('mm', rulerThickness / 2, rulerThickness / 2);
                      
                      ctx.drawImage(topCanvas, rulerThickness, 0);
                      ctx.drawImage(leftCanvas, 0, rulerThickness);
                  }
              }
          } catch(e) {}
      }
      
      const dataUrl = masterCanvas.toDataURL('image/png');
      
      // Restore
      if (v.camera.isOrthographicCamera || v.camera.type === 'OrthographicCamera') {
          v.camera.left = oldLeft;
          v.camera.right = oldRight;
          v.camera.top = oldTop;
          v.camera.bottom = oldBottom;
      } else {
          v.camera.aspect = oldAspect;
      }
      v.camera.updateProjectionMatrix();
      renderer.setSize(oldWidth, oldHeight, false);
      renderer.setClearColor(hexColor, oldClearAlpha);
      
      try { v.Render(); } catch(e) {}
      return dataUrl;
  }
}
