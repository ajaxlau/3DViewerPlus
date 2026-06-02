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
  onMeasurementChange?: (measurement: { distance: number, angle: number } | null) => void;
  onPlanningGroupsChange?: (groups: any[]) => void;
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
  planningMode: 'none' | 'plane' | 'cylinder' | 'measure' | 'curve' | 'angle' | 'point' = 'none';
  planningPoints: any[] = [];
  planningNormals: any[] = [];
  planningPointMarkers: any[] = [];
  planningObjects: any[] = [];
  planningGroups: any[] = [];
  nextPlanningObjectId: number = 1;
  defaultCamera: any = null;
  loadedFilename: string | null = null;

  // Clipping state
  modelBBox: any = null;

  // Snapshot & Rulers
  topRulerRef: HTMLCanvasElement | null = null;
  leftRulerRef: HTMLCanvasElement | null = null;
  rulersVisible: boolean = false;
  isAutoRotating: boolean = false;
  rulerAnimationFrame: any = null;
  lastPlanesState: any = null;
  lastCameraState: string = '';

  // Memory Leak Prevention & Disposal tracking
  isDisposed: boolean = false;
  resizeObserver: ResizeObserver | null = null;
  onWindowResize: (() => void) | null = null;
  onPointerDown: ((e: PointerEvent) => void) | null = null;
  onPointerUp: ((e: PointerEvent) => void) | null = null;

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

      this.resizeObserver = new ResizeObserver(() => {
        if (this.viewer) this.viewer.Resize();
        if (this.rulersVisible) {
          this.resizeRulers();
          this.lastCameraState = '';
        }
      });
      this.resizeObserver.observe(this.container);

      // Start the DOM overlay rendering loop
      this.domUpdateLoop();

      this.onWindowResize = () => {
        if (this.viewer) this.viewer.Resize();
        if (this.rulersVisible) {
          this.resizeRulers();
          this.lastCameraState = ''; 
        }
      };
      window.addEventListener('resize', this.onWindowResize);
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

  fitToWindow() {
    if (this.viewer && typeof this.viewer.FitToWindow === 'function') {
      this.viewer.FitToWindow();
    } else if (this.viewer && this.viewer.viewer && typeof this.viewer.viewer.FitToWindow === 'function') {
      this.viewer.viewer.FitToWindow();
    }
  }

  dispose() {
    this.isDisposed = true;

    // 1. Clear loaded-model tree builds or parsing polling intervals
    if (this.treeParseInterval) {
      clearInterval(this.treeParseInterval);
      this.treeParseInterval = null;
    }

    // 2. Halt dynamic rulers & measurement overlay drawing loop
    if (this.rulerAnimationFrame) {
      cancelAnimationFrame(this.rulerAnimationFrame);
      this.rulerAnimationFrame = null;
    }

    // 3. Clear window resize listener references
    if (this.onWindowResize) {
      window.removeEventListener('resize', this.onWindowResize);
      this.onWindowResize = null;
    }

    // 4. Disconnect ResizeObserver
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }

    // 5. Clean up pointer events targeting container element
    if (this.container) {
      if (this.onPointerDown) {
        this.container.removeEventListener('pointerdown', this.onPointerDown);
        this.onPointerDown = null;
      }
      if (this.onPointerUp) {
        this.container.removeEventListener('pointerup', this.onPointerUp);
        this.onPointerUp = null;
      }
    }

    // 6. Dispose existing planning objects to empty WebGL buffers
    try {
      this.clearAllPlanningObjects();
    } catch (e) {
      console.warn("Disposal failed on custom planning items", e);
    }

    // 7. Clear general WebGL context and references in embedded viewer
    if (this.viewer) {
      try {
        if (typeof this.viewer.Clear === 'function') {
          this.viewer.Clear();
        }
      } catch (e) {
        console.warn("Disposal failed on embedded 3d viewer core", e);
      }
      this.viewer = null;
    }

    // 8. Nullify global window helper binding
    if (window._viewerManagerInstance === this) {
      window._viewerManagerInstance = null;
    }
  }

  saveToLocalStorage() {
    if (!this.loadedFilename) return;
    try {
      const serialized = this.planningObjects.map(obj => {
        const base = {
          id: obj.id,
          name: obj.name,
          type: obj.type,
          color: obj.color,
          groupId: obj.groupId,
          visible: obj.visible !== false
        };
        if (obj.type === 'plane') {
          return {
            ...base,
            p1: obj.p1,
            p2: obj.p2,
            p3: obj.p3,
            extWidth: obj.extWidth,
            extLength: obj.extLength,
            thickness: obj.thickness
          };
        } else if (obj.type === 'cylinder') {
          return {
            ...base,
            p1: obj.p1,
            p2: obj.p2,
            diameter: obj.diameter,
            extension: obj.extension
          };
        } else if (obj.type === 'curve') {
          return {
            ...base,
            points: obj.points,
            thickness: obj.thickness
          };
        } else if (obj.type === 'measurement') {
          return {
            ...base,
            p1: obj.p1,
            p2Coord: obj.p2Coord,
            angle: obj.angle
          };
        } else if (obj.type === 'point') {
          return {
            ...base,
            points: obj.points,
            diameter: obj.diameter
          };
        }
        return base;
      });
      localStorage.setItem(`3dpo_planning_objects_${this.loadedFilename}`, JSON.stringify(serialized));
      localStorage.setItem(`3dpo_planning_groups_${this.loadedFilename}`, JSON.stringify(this.planningGroups));
    } catch (e) {
      console.warn("Failed to save planning objects to localStorage", e);
    }
  }

  loadFromLocalStorage() {
    if (!this.loadedFilename) return;
    try {
      // Load groups first
      const groupsStr = localStorage.getItem(`3dpo_planning_groups_${this.loadedFilename}`);
      if (groupsStr) {
        try {
          this.planningGroups = JSON.parse(groupsStr);
        } catch (e) {
          this.planningGroups = [];
        }
      } else {
        this.planningGroups = [];
      }
      this.notifyGroupsChanged();

      const dataStr = localStorage.getItem(`3dpo_planning_objects_${this.loadedFilename}`);
      if (!dataStr) return;
      const parsed = JSON.parse(dataStr);
      if (!Array.isArray(parsed)) return;

      const THREE = window.THREE;
      if (!THREE) return;

      this.clearAllPlanningObjects();

      parsed.forEach(obj => {
        try {
          if (obj.type === 'plane') {
            const p1Val = new THREE.Vector3(obj.p1.x, obj.p1.y, obj.p1.z);
            const p2Val = new THREE.Vector3(obj.p2.x, obj.p2.y, obj.p2.z);
            const p3Val = new THREE.Vector3(obj.p3.x, obj.p3.y, obj.p3.z);
            
            this.createPlanningPlane(p1Val, p2Val, p3Val, obj.extWidth, obj.extLength);
            
            const created = this.planningObjects[this.planningObjects.length - 1];
            if (created) {
              created.id = obj.id;
              created.name = obj.name;
              created.color = obj.color || '#00ff00';
              created.groupId = obj.groupId;
              created.visible = obj.visible !== false;
              if (obj.thickness !== undefined) {
                this.updatePlaneGeometry(created.id, obj.extWidth || 0, obj.thickness);
              }
              if (created.mesh) {
                created.mesh.visible = created.visible;
              }
            }
          } else if (obj.type === 'cylinder') {
            const p1Val = new THREE.Vector3(obj.p1.x, obj.p1.y, obj.p1.z);
            const p2Val = new THREE.Vector3(obj.p2.x, obj.p2.y, obj.p2.z);
            
            this.createPlanningCylinder(p1Val, p2Val, obj.diameter / 2, obj.extension);
            
            const created = this.planningObjects[this.planningObjects.length - 1];
            if (created) {
              created.id = obj.id;
              created.name = obj.name;
              created.color = obj.color || '#0000ff';
              created.groupId = obj.groupId;
              created.visible = obj.visible !== false;
              if (created.mesh) {
                created.mesh.visible = created.visible;
              }
            }
          } else if (obj.type === 'curve') {
            const pts = obj.points.map((p: any) => new THREE.Vector3(p.x, p.y, p.z));
            
            this.createPlanningCurve(pts, obj.thickness);
            
            const created = this.planningObjects[this.planningObjects.length - 1];
            if (created) {
              created.id = obj.id;
              created.name = obj.name;
              created.color = obj.color || '#db2777';
              created.groupId = obj.groupId;
              created.visible = obj.visible !== false;
              if (created.mesh) {
                created.mesh.visible = created.visible;
              }
            }
          } else if (obj.type === 'measurement') {
            const p1Val = new THREE.Vector3(obj.p1.x, obj.p1.y, obj.p1.z);
            const p2Val = new THREE.Vector3(obj.p2Coord.x, obj.p2Coord.y, obj.p2Coord.z);
            
            this.createPlanningMeasurement(p1Val, p2Val, obj.angle || 0);
            
            const created = this.planningObjects[this.planningObjects.length - 1];
            if (created) {
              created.id = obj.id;
              created.name = obj.name;
              created.color = obj.color || '#10b981';
              created.groupId = obj.groupId;
              created.visible = obj.visible !== false;
              if (created.mesh) {
                created.mesh.visible = created.visible;
              }
              if (created.labelDiv && created.baseDistance !== undefined) {
                const text = created.name ? `${created.name} (${created.baseDistance.toFixed(2)} mm)` : `${created.baseDistance.toFixed(2)} mm`;
                created.labelDiv.innerText = text;
                created.labelDiv.style.display = created.visible ? 'block' : 'none';
              }
            }
          } else if (obj.type === 'angle') {
            const p1Val = new THREE.Vector3(obj.p1.x, obj.p1.y, obj.p1.z);
            const p2Val = new THREE.Vector3(obj.p2Coord.x, obj.p2Coord.y, obj.p2Coord.z);
            const p3Val = new THREE.Vector3(obj.p3.x, obj.p3.y, obj.p3.z);
            
            this.createPlanningAngle(p1Val, p2Val, p3Val, obj.angle || 0);
            
            const created = this.planningObjects[this.planningObjects.length - 1];
            if (created) {
              created.id = obj.id;
              created.name = obj.name;
              created.color = obj.color || '#d97706';
              created.groupId = obj.groupId;
              created.visible = obj.visible !== false;
              if (created.mesh) {
                created.mesh.visible = created.visible;
              }
              if (created.labelDiv && created.angle !== undefined) {
                const text = created.name ? `${created.name} (${created.angle.toFixed(1)}°)` : `${created.angle.toFixed(1)}°`;
                created.labelDiv.innerText = text;
                created.labelDiv.style.display = created.visible ? 'block' : 'none';
              }
            }
          } else if (obj.type === 'point') {
            const pVal = new THREE.Vector3(obj.points[0].x, obj.points[0].y, obj.points[0].z);
            
            this.createPlanningPoint(pVal, obj.diameter || 0.2);
            
            const created = this.planningObjects[this.planningObjects.length - 1];
            if (created) {
              created.id = obj.id;
              created.name = obj.name;
              created.color = obj.color || '#9333ea';
              created.groupId = obj.groupId;
              created.visible = obj.visible !== false;
              if (created.mesh) {
                created.mesh.visible = created.visible;
              }
            }
          }
        } catch (err) {
          console.warn("Failed to reconstruct serialized planning object", obj, err);
        }
      });

      let maxSerial = 0;
      parsed.forEach(o => {
        const parts = o.id.split('_');
        if (parts.length > 1) {
          const num = parseInt(parts[1], 10);
          if (!isNaN(num) && num > maxSerial) maxSerial = num;
        }
      });
      this.nextPlanningObjectId = maxSerial + 1;

      if (this.config.onPlanningObjectsChange) {
        this.config.onPlanningObjectsChange(this.planningObjects);
      }
    } catch (e) {
      console.warn("Failed to load planning objects from localStorage", e);
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

            this.loadedFilename = filename;
            
            // Capture the default camera of the model right after build/zoom
            if (this.viewer?.viewer?.navigation && typeof this.viewer.viewer.navigation.GetCamera === 'function') {
                try {
                    const cam = this.viewer.viewer.navigation.GetCamera();
                    if (cam) {
                        this.defaultCamera = new window.OV.Camera(
                            new window.OV.Coord3D(cam.eye.x, cam.eye.y, cam.eye.z),
                            new window.OV.Coord3D(cam.center.x, cam.center.y, cam.center.z),
                            new window.OV.Coord3D(cam.up.x, cam.up.y, cam.up.z),
                            cam.fov || 45.0
                        );
                    }
                } catch(e) { console.warn("Failed to capture default camera", e); }
            }

            if (pendingCamera && this.viewer.viewer.navigation) {
                try {
                    const c = pendingCamera;
                    const eye = new window.OV.Coord3D(c[0], c[1], c[2]);
                    const center = new window.OV.Coord3D(c[3], c[4], c[5]);
                    const up = new window.OV.Coord3D(c[6], c[7], c[8]);
                    this.viewer.viewer.navigation.SetCamera(new window.OV.Camera(eye, center, up, c[9] || 45.0));
                    // Update default camera to override with the URL parameter if present
                    this.defaultCamera = new window.OV.Camera(
                        new window.OV.Coord3D(eye.x, eye.y, eye.z),
                        new window.OV.Coord3D(center.x, center.y, center.z),
                        new window.OV.Coord3D(up.x, up.y, up.z),
                        c[9] || 45.0
                    );
                } catch(e) { console.warn("Failed to set imported camera", e); }
            }
            this.enforceFreeOrbit();
            this.loadFromLocalStorage();
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
    
    this.onPointerDown = (e: PointerEvent) => {
        pointerDownPos = { x: e.clientX, y: e.clientY };
    };
    this.container.addEventListener('pointerdown', this.onPointerDown);

    this.onPointerUp = (e: PointerEvent) => {
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
                     let normal = null;
                     if (visibleHit.face && visibleHit.face.normal && window.THREE) {

                         normal = visibleHit.face.normal.clone();
                         normal.transformDirection(visibleHit.object.matrixWorld);
                     }
                     this.addPlanningPoint(visibleHit.point, normal);
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
    };
    this.container.addEventListener('pointerup', this.onPointerUp);
  }

  setPlanningMode(mode: 'none' | 'plane' | 'cylinder' | 'measure' | 'curve' | 'angle' | 'point') {
      this.planningMode = mode;
      this.clearPlanningPoints();
  }

  clearPlanningPoints() {
      this.planningPoints = [];
      this.planningNormals = [];
      if (this.config.onMeasurementChange) {
          this.config.onMeasurementChange(null);
      }
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

  addPlanningPoint(point: any, normal?: any) {
      if (!window.THREE || !this.viewer || !this.viewer.viewer) return;
      const scene = this.viewer.viewer.scene || this.viewer.viewer.mainScene;
      if (!scene) return;
      
      const THREE = window.THREE;

      if (this.planningMode === 'plane' && this.planningPoints.length >= 3) return;
      if (this.planningMode === 'cylinder' && this.planningPoints.length >= 2) return;
      if (this.planningMode === 'measure' && this.planningPoints.length >= 2) return;
      if (this.planningMode === 'angle' && this.planningPoints.length >= 3) return;

      this.planningPoints.push(point);
      if (normal) {
          this.planningNormals.push(normal);
      } else {
          this.planningNormals.push(new THREE.Vector3(0, 1, 0));
      }
      
      const geometry = new THREE.SphereGeometry(2, 16, 16);
      const isMeasure = this.planningMode === 'measure';
      const isAngle = this.planningMode === 'angle';
      
      let markerColor = 0xff0000;
      if (isMeasure) markerColor = 0x10b981;
      if (isAngle) markerColor = 0xd97706;
      
      const material = new THREE.MeshBasicMaterial({ color: markerColor, depthTest: false });
      const marker = new THREE.Mesh(geometry, material);
      marker.position.copy(point);
      marker.renderOrder = 999; 
      scene.add(marker);
      this.planningPointMarkers.push(marker);

      if (isMeasure && this.planningPoints.length === 2) {
          const p1 = this.planningPoints[0];
          const p2 = this.planningPoints[1];
          const m = this.calculateMeasurement();
          const angle = m ? m.angle : 0;

          // Automatically create the permanent measurement cylinder object
          this.createPlanningMeasurement(p1, p2, angle);

          // Instantly clear the temporary red/green spheres & lines
          this.clearPlanningPoints();

          // Notify context that the objects list updated
          if (this.config.onPlanningObjectsChange) {
              this.config.onPlanningObjectsChange(this.planningObjects);
          }
          return;
      }

      if (isAngle && this.planningPoints.length === 3) {
          const p1 = this.planningPoints[0];
          const p2 = this.planningPoints[1]; // Vertex point
          const p3 = this.planningPoints[2];

          const v1 = new THREE.Vector3().subVectors(p1, p2).normalize();
          const v2 = new THREE.Vector3().subVectors(p3, p2).normalize();
          const dot = Math.min(Math.max(v1.dot(v2), -1.0), 1.0);
          const angleRad = Math.acos(dot);
          const angleDeg = angleRad * (180 / Math.PI);

          this.createPlanningAngle(p1, p2, p3, angleDeg);
          this.clearPlanningPoints();

          if (this.config.onPlanningObjectsChange) {
              this.config.onPlanningObjectsChange(this.planningObjects);
          }
          return;
      }

      if (this.planningMode === 'point' && this.planningPoints.length === 1) {
          const p = this.planningPoints[0];
          this.createPlanningPoint(p, 0.2); // default 0.2mm
          this.clearPlanningPoints();
          if (this.config.onPlanningObjectsChange) {
              this.config.onPlanningObjectsChange(this.planningObjects);
          }
          return;
      }

      if (this.config.onPlanningPointsChange) {
          this.config.onPlanningPointsChange(this.planningPoints.length);
      }
      if (this.config.onMeasurementChange) {
          this.config.onMeasurementChange(this.calculateMeasurement());
      }
      this.viewer.viewer.Render();
  }

  undoPlanningPoint() {
      if (this.planningPoints.length > 0) {
          this.planningPoints.pop();
          this.planningNormals.pop();
          const marker = this.planningPointMarkers.pop();
          if (marker) {
              const scene = this.viewer?.viewer?.scene || this.viewer?.viewer?.mainScene;
              if (scene) scene.remove(marker);
              if (marker.geometry) marker.geometry.dispose();
              if (marker.material) marker.material.dispose();
          }
          // If measure mode line is also present, pop it too
          if (this.planningMode === 'measure' && this.planningPointMarkers.length > 0) {
              const lineMarker = this.planningPointMarkers.pop();
              if (lineMarker) {
                  const scene = this.viewer?.viewer?.scene || this.viewer?.viewer?.mainScene;
                  if (scene) scene.remove(lineMarker);
                  if (lineMarker.geometry) lineMarker.geometry.dispose();
                  if (lineMarker.material) lineMarker.material.dispose();
              }
          }

          if (this.config.onPlanningPointsChange) {
              this.config.onPlanningPointsChange(this.planningPoints.length);
          }
          if (this.config.onMeasurementChange) {
              this.config.onMeasurementChange(this.calculateMeasurement());
          }
          if (this.viewer && this.viewer.viewer) {
              this.viewer.viewer.Render();
          }
      }
  }

  calculateMeasurement() {
      if (!window.THREE || this.planningPoints.length < 2) return null;
      const p1 = this.planningPoints[0];
      const p2 = this.planningPoints[1];
      const distance = p1.distanceTo(p2);
      
      let angle = 0;
      if (this.planningNormals.length >= 2) {
          const n1 = this.planningNormals[0];
          const n2 = this.planningNormals[1];
          const dot = Math.min(Math.max(n1.dot(n2), -1.0), 1.0);
          const angleRad = Math.acos(dot);
          angle = angleRad * (180 / Math.PI);
      }
      return { distance, angle };
  }

  confirmPlanningObject(options: { planeExtWidth?: number, planeExtLength?: number, cylinderRadius?: number, cylinderExtension?: number, curveThickness?: number } = {}) {
      if (this.planningMode === 'plane' && this.planningPoints.length === 3) {
          this.createPlanningPlane(this.planningPoints[0], this.planningPoints[1], this.planningPoints[2], options.planeExtWidth, options.planeExtLength);
          this.setPlanningMode('none');
          if (this.config.onPlanningObjectsChange) {
              this.config.onPlanningObjectsChange(this.planningObjects);
          }
          this.saveToLocalStorage();
      } else if (this.planningMode === 'cylinder' && this.planningPoints.length === 2) {
          this.createPlanningCylinder(this.planningPoints[0], this.planningPoints[1], options.cylinderRadius, options.cylinderExtension);
          this.setPlanningMode('none');
          if (this.config.onPlanningObjectsChange) {
              this.config.onPlanningObjectsChange(this.planningObjects);
          }
          this.saveToLocalStorage();
      } else if (this.planningMode === 'measure' && this.planningPoints.length === 2) {
          const m = this.calculateMeasurement();
          const angle = m ? m.angle : 0;
          this.createPlanningMeasurement(this.planningPoints[0], this.planningPoints[1], angle);
          this.setPlanningMode('none');
          if (this.config.onPlanningObjectsChange) {
              this.config.onPlanningObjectsChange(this.planningObjects);
          }
          this.saveToLocalStorage();
      } else if (this.planningMode === 'curve' && this.planningPoints.length >= 2) {
          this.createPlanningCurve(this.planningPoints, options.curveThickness !== undefined ? options.curveThickness : 0.2);
          this.setPlanningMode('none');
          if (this.config.onPlanningObjectsChange) {
              this.config.onPlanningObjectsChange(this.planningObjects);
          }
          this.saveToLocalStorage();
      }
  }

  createPlanningPlane(p1: any, p2: any, p3: any, extWidth?: number, extLength?: number) {
      if (!window.THREE || !this.viewer || !this.viewer.viewer) return;
      const scene = this.viewer.viewer.scene || this.viewer.viewer.mainScene;
      if (!scene) return;

      const THREE = window.THREE;
      
      const center = new THREE.Vector3().addVectors(p1, p2).add(p3).divideScalar(3);
      const v1 = new THREE.Vector3().subVectors(p2, p1);
      const v2 = new THREE.Vector3().subVectors(p3, p1);
      const normal = new THREE.Vector3().crossVectors(v1, v2).normalize();
      
      // Calculate base dimensions from selected points
      const baseWidth = p1.distanceTo(p2);
      
      const lineDir = new THREE.Vector3().copy(v1).normalize();
      // Distance from p3 to line p1-p2
      const baseLength = new THREE.Vector3().crossVectors(new THREE.Vector3().subVectors(p3, p1), lineDir).length();

      const width = baseWidth + (extWidth !== undefined ? extWidth : 10);
      const height = baseLength + (extLength !== undefined ? extLength : 10);

      // thin BoxGeometry (default 0mm thickness)
      const thickness = 0.0;
      const geometry = new THREE.BoxGeometry(width, height, thickness);
      const material = new THREE.MeshBasicMaterial({ 
          color: 0x00ff00, 
          transparent: true, 
          opacity: 0.5,
          depthTest: false
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.renderOrder = 999;
      
      // Orient the plane
      const testNormal = new THREE.Vector3(0, 0, 1);
      const quaternion = new THREE.Quaternion().setFromUnitVectors(testNormal, normal);
      
      const yAxis = new THREE.Vector3().crossVectors(normal, lineDir).normalize();
      const basis = new THREE.Matrix4().makeBasis(lineDir, yAxis, normal);
      quaternion.setFromRotationMatrix(basis);

      mesh.quaternion.copy(quaternion);
      mesh.position.copy(center);

      // Add a wireframe outline to "illustrate planning"
      const edges = new THREE.EdgesGeometry(geometry);
      const lineMaterial = new THREE.LineBasicMaterial({ color: 0x00aa00, linewidth: 2, depthTest: false });
      const line = new THREE.LineSegments(edges, lineMaterial);
      mesh.add(line);

      scene.add(mesh);
      this.viewer.viewer.Render();

      const defaultIdAndName = `Plane_${this.nextPlanningObjectId++}`;
      this.planningObjects.push({
          id: defaultIdAndName,
          name: defaultIdAndName,
          type: 'plane',
          mesh,
          width,
          height,
          thickness,
          baseWidth,
          baseLength,
          extWidth: extWidth !== undefined ? extWidth : 10,
          extLength: extLength !== undefined ? extLength : 10,
          color: '#00ff00',
          p1: { x: p1.x, y: p1.y, z: p1.z },
          p2: { x: p2.x, y: p2.y, z: p2.z },
          p3: { x: p3.x, y: p3.y, z: p3.z }
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
          opacity: 0.5,
          depthTest: false
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.renderOrder = 999;

      const up = new THREE.Vector3(0, 1, 0);
      const quaternion = new THREE.Quaternion().setFromUnitVectors(up, direction);
      mesh.quaternion.copy(quaternion);
      mesh.position.copy(center);

      // Add a wireframe outline to "illustrate planning"
      const edges = new THREE.EdgesGeometry(geometry);
      const lineMaterial = new THREE.LineBasicMaterial({ color: 0x0000aa, linewidth: 2, depthTest: false });
      const line = new THREE.LineSegments(edges, lineMaterial);
      mesh.add(line);

      scene.add(mesh);
      this.viewer.viewer.Render();

      const defaultIdAndName = `Cylinder_${this.nextPlanningObjectId++}`;
      this.planningObjects.push({
          id: defaultIdAndName,
          name: defaultIdAndName,
          type: 'cylinder',
          mesh,
          radius,
          length,
          baseDistance: distance,
          color: '#0000ff',
          diameter: radius * 2,
          extension,
          p1: { x: p1.x, y: p1.y, z: p1.z },
          p2: { x: p2.x, y: p2.y, z: p2.z }
      });
  }

  createPlanningCurve(points: any[], thickness: number) {
      if (!window.THREE || !this.viewer || !this.viewer.viewer) return;
      const scene = this.viewer.viewer.scene || this.viewer.viewer.mainScene;
      if (!scene) return;

      const THREE = window.THREE;
      
      const curve = new THREE.CatmullRomCurve3(points);
      const radius = thickness / 2;
      const tubularSegments = Math.max(20, points.length * 10);
      const radialSegments = 8;
      const geometry = new THREE.TubeGeometry(curve, tubularSegments, radius, radialSegments, false);
      
      const material = new THREE.MeshBasicMaterial({ 
          color: 0xdb2777, // pink-600 to match lucide colors normally
          transparent: true, 
          opacity: 0.6,
          depthTest: false
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.renderOrder = 999;

      // Add a wireframe outline to "illustrate planning"
      const edges = new THREE.EdgesGeometry(geometry);
      const lineMaterial = new THREE.LineBasicMaterial({ color: 0x9d174d, linewidth: 2, depthTest: false });
      const line = new THREE.LineSegments(edges, lineMaterial);
      mesh.add(line);

      scene.add(mesh);
      this.viewer.viewer.Render();

      const defaultIdAndName = `Curve_${this.nextPlanningObjectId++}`;
      this.planningObjects.push({
          id: defaultIdAndName,
          name: defaultIdAndName,
          type: 'curve',
          mesh,
          thickness,
          baseDistance: curve.getLength(),
          curvePath: curve,
          pointsCount: points.length,
          color: '#db2777',
          points: points.map(p => ({ x: p.x, y: p.y, z: p.z }))
      });
  }

  projectToScreen(point: any) {
      if (!window.THREE || !this.viewer || !this.viewer.viewer || !this.viewer.viewer.camera) {
          return null;
      }
      const camera = this.viewer.viewer.camera;
      const canvas = this.container;
      if (!camera || !canvas) return null;

      const vector = point.clone();
      vector.project(camera);

      // Convert from normalized device coordinates (NDC) to pixel coordinates
      const rect = canvas.getBoundingClientRect();
      const x = (vector.x * .5 + .5) * rect.width;
      const y = (-(vector.y * .5) + .5) * rect.height;

      // Also return z so we can tell if it's behind the camera
      return { x, y, z: vector.z };
  }


  createPlanningMeasurement(p1: any, p2: any, angle: number) {
      if (!window.THREE || !this.viewer || !this.viewer.viewer) return;
      const scene = this.viewer.viewer.scene || this.viewer.viewer.mainScene;
      if (!scene) return;

      const THREE = window.THREE;

      const distance = p1.distanceTo(p2);
      const center = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
      const direction = new THREE.Vector3().subVectors(p2, p1).normalize();

      const radius = 0.05; // Sleek 0.1mm diameter tube
      const length = distance;

      // CylinderGeometry is along Y axis by default
      const geometry = new THREE.CylinderGeometry(radius, radius, length, 16);
      const material = new THREE.MeshBasicMaterial({ 
          color: 0x10b981, 
          transparent: true, 
          opacity: 0.8,
          depthTest: false
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.renderOrder = 999;

      const up = new THREE.Vector3(0, 1, 0);
      const quaternion = new THREE.Quaternion().setFromUnitVectors(up, direction);
      mesh.quaternion.copy(quaternion);
      mesh.position.copy(center);

      // Add a line outline too
      const edges = new THREE.EdgesGeometry(geometry);
      const lineMaterial = new THREE.LineBasicMaterial({ color: 0x059669, linewidth: 2, depthTest: false });
      const line = new THREE.LineSegments(edges, lineMaterial);
      mesh.add(line);

      // Commenting out creating physical THREE.Sprite label to avoid compatibility issues with o3dv render loop.
      // We will handle 2D labels in React.
      const labelDiv = document.createElement('div');
      labelDiv.className = 'absolute z-50 pointer-events-none font-mono text-[11px] font-bold text-white bg-slate-900 border border-emerald-500 rounded-full px-2 py-0.5 shadow transition-opacity whitespace-nowrap tracking-tight';
      labelDiv.innerText = `${distance.toFixed(2)} mm`;
      labelDiv.style.transform = 'translate(-50%, -50%)';
      labelDiv.style.opacity = '0';
      this.container.appendChild(labelDiv);
      const labelSprite = null;

      scene.add(mesh);
      this.viewer.viewer.Render();

      const defaultIdAndName = `Measurement_${this.nextPlanningObjectId++}`;
      this.planningObjects.push({
          id: defaultIdAndName,
          name: defaultIdAndName,
          type: 'measurement',
          mesh,
          labelSprite,
          p2, // Save the second point for 2D overlay use
          labelDiv,
          radius,
          length,
          baseDistance: distance,
          angle: angle,
          color: '#10b981',
          p1: { x: p1.x, y: p1.y, z: p1.z },
          p2Coord: { x: p2.x, y: p2.y, z: p2.z }
      });
  }

  createPlanningPoint(point: any, diameter: number) {
      if (!window.THREE || !this.viewer || !this.viewer.viewer) return;
      const scene = this.viewer.viewer.scene || this.viewer.viewer.mainScene;
      if (!scene) return;

      const THREE = window.THREE;
      const radius = diameter / 2;
      const geometry = new THREE.SphereGeometry(radius, 32, 32);
      const material = new THREE.MeshBasicMaterial({ 
          color: 0x9333ea, // Purple-600 feeling
          transparent: true, 
          opacity: 0.9,
          depthTest: false
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.renderOrder = 999;
      mesh.position.copy(point);

      // Outline
      const edges = new THREE.EdgesGeometry(geometry);
      const edgeMaterial = new THREE.LineBasicMaterial({ color: 0x7e22ce, linewidth: 2, depthTest: false });
      const line = new THREE.LineSegments(edges, edgeMaterial);
      mesh.add(line);

      scene.add(mesh);
      this.viewer.viewer.Render();

      const defaultIdAndName = `Point_${this.nextPlanningObjectId++}`;
      this.planningObjects.push({
          id: defaultIdAndName,
          name: defaultIdAndName,
          type: 'point',
          mesh: mesh,
          labelSprite: null,
          diameter: diameter,
          color: '#9333ea',
          points: [{ x: point.x, y: point.y, z: point.z }]
      });
  }

  createPlanningAngle(p1: any, p2: any, p3: any, angle: number) {
      if (!window.THREE || !this.viewer || !this.viewer.viewer) return;
      const scene = this.viewer.viewer.scene || this.viewer.viewer.mainScene;
      if (!scene) return;

      const THREE = window.THREE;
      const group = new THREE.Group();

      const createArm = (ptStart: any, ptEnd: any, colorHex: number) => {
          const dist = ptStart.distanceTo(ptEnd);
          const center = new THREE.Vector3().addVectors(ptStart, ptEnd).multiplyScalar(0.5);
          const direction = new THREE.Vector3().subVectors(ptEnd, ptStart).normalize();
          
          const radius = 0.05;
          const geometry = new THREE.CylinderGeometry(radius, radius, dist, 16);
          const material = new THREE.MeshBasicMaterial({
              color: colorHex,
              transparent: true,
              opacity: 0.8,
              depthTest: false
          });
          const armMesh = new THREE.Mesh(geometry, material);
          armMesh.renderOrder = 999;

          const up = new THREE.Vector3(0, 1, 0);
          const quaternion = new THREE.Quaternion().setFromUnitVectors(up, direction);
          armMesh.quaternion.copy(quaternion);
          armMesh.position.copy(center);

          const edges = new THREE.EdgesGeometry(geometry);
          const lineMaterial = new THREE.LineBasicMaterial({ color: 0xd97706, linewidth: 2, depthTest: false });
          const line = new THREE.LineSegments(edges, lineMaterial);
          armMesh.add(line);

          return armMesh;
      };

      const arm1 = createArm(p1, p2, 0xd97706);
      const arm2 = createArm(p3, p2, 0xd97706);
      group.add(arm1);
      group.add(arm2);

      const v1 = new THREE.Vector3().subVectors(p1, p2);
      const v2 = new THREE.Vector3().subVectors(p3, p2);
      const normal = new THREE.Vector3().crossVectors(v1, v2).normalize();

      const d1 = v1.clone().normalize();
      const d2 = v2.clone().normalize();
      
      const arcRadius = Math.min(v1.length(), v2.length()) * 0.15 || 5;
      const segmentsCount = 24;
      const arcPoints: any[] = [];
      
      for (let i = 0; i <= segmentsCount; i++) {
          const t = i / segmentsCount;
          const angleBetween = d1.angleTo(d2);
          const dir = d1.clone().applyAxisAngle(normal, angleBetween * t);
          arcPoints.push(new THREE.Vector3().copy(p2).add(dir.multiplyScalar(arcRadius)));
      }

      const curve = new THREE.CatmullRomCurve3(arcPoints);
      const tubeGeom = new THREE.TubeGeometry(curve, segmentsCount, 0.05, 8, false);
      const tubeMat = new THREE.MeshBasicMaterial({ color: 0xd97706, transparent: true, opacity: 0.9, depthTest: false });
      const tubeMesh = new THREE.Mesh(tubeGeom, tubeMat);
      tubeMesh.renderOrder = 999;
      group.add(tubeMesh);

      const labelDiv = document.createElement('div');
      labelDiv.className = 'absolute z-50 pointer-events-none font-mono text-[11px] font-bold text-white bg-slate-900 border border-amber-500 rounded-full px-2 py-0.5 shadow transition-opacity whitespace-nowrap tracking-tight';
      labelDiv.innerText = `${angle.toFixed(1)}°`;
      labelDiv.style.transform = 'translate(-50%, -50%)';
      labelDiv.style.opacity = '0';
      this.container.appendChild(labelDiv);
      const labelSprite = null;

      scene.add(group);
      this.viewer.viewer.Render();

      const defaultIdAndName = `Angle_${this.nextPlanningObjectId++}`;
      this.planningObjects.push({
          id: defaultIdAndName,
          name: defaultIdAndName,
          type: 'angle',
          mesh: group,
          labelSprite,
          p2: p2,
          labelDiv,
          p1: { x: p1.x, y: p1.y, z: p1.z },
          p2Coord: { x: p2.x, y: p2.y, z: p2.z },
          p3: { x: p3.x, y: p3.y, z: p3.z },
          angle: angle,
          color: '#d97706'
      });
  }

  updatePlanningObjectName(id: string, name: string) {
      const obj = this.planningObjects.find(o => o.id === id);
      if (!obj) return;
      obj.name = name;
      
      if (obj.labelDiv) {
          if (obj.type === 'angle') {
              const text = obj.name ? `${obj.name} (${obj.angle.toFixed(1)}°)` : `${obj.angle.toFixed(1)}°`;
              obj.labelDiv.innerText = text;
          } else if (obj.baseDistance !== undefined) {
              const text = obj.name ? `${obj.name} (${obj.baseDistance.toFixed(2)} mm)` : `${obj.baseDistance.toFixed(2)} mm`;
              obj.labelDiv.innerText = text;
          }
      }

      if (this.config.onPlanningObjectsChange) {
          this.config.onPlanningObjectsChange(this.planningObjects);
      }
      this.saveToLocalStorage();
  }

  updatePlanningObjectScale(id: string, updates: { scaleX?: number, scaleY?: number, scaleZ?: number }) {
      const obj = this.planningObjects.find(o => o.id === id);
      if (!obj) return;

      if (updates.scaleX !== undefined) {
          obj.scaleX = updates.scaleX;
          obj.mesh.scale.x = updates.scaleX;
      }
      if (updates.scaleY !== undefined) {
          obj.scaleY = updates.scaleY;
          obj.mesh.scale.y = updates.scaleY;
      }
      if (updates.scaleZ !== undefined) {
          obj.scaleZ = updates.scaleZ;
          obj.mesh.scale.z = updates.scaleZ;
      }

      if (this.viewer && this.viewer.viewer) {
          this.viewer.viewer.Render();
      }
      
      if (this.config.onPlanningObjectsChange) {
          this.config.onPlanningObjectsChange(this.planningObjects);
      }
      this.saveToLocalStorage();
  }

  updatePlaneGeometry(id: string, extSize: number, thickness: number) {
      const THREE = window.THREE;
      if (!THREE) return;
      const obj = this.planningObjects.find(o => o.id === id);
      if (!obj || obj.type !== 'plane' || obj.baseWidth === undefined || obj.baseLength === undefined) return;

      if (obj.mesh.geometry) obj.mesh.geometry.dispose();

      const width = obj.baseWidth + extSize;
      const height = obj.baseLength + extSize;
      const renderThickness = Math.abs(thickness);

      // Create geometry centered at (0, 0, 0)
      const newGeometry = new THREE.BoxGeometry(width, height, renderThickness);
      // Offset geometry locally by thickness/2 so it sits to one side or the other of the baseline/zero-plane
      newGeometry.translate(0, 0, thickness / 2);
      obj.mesh.geometry = newGeometry;

      // Update line segments (wireframe outline overlay)
      const toRemove = obj.mesh.children.filter((child: any) => child.isLineSegments || child.type === 'LineSegments');
      toRemove.forEach((child: any) => obj.mesh.remove(child));

      const edges = new THREE.EdgesGeometry(newGeometry);
      const lineMaterial = new THREE.LineBasicMaterial({ color: 0x00aa00, linewidth: 2, depthTest: false });
      const line = new THREE.LineSegments(edges, lineMaterial);
      obj.mesh.add(line);

      obj.extWidth = extSize;
      obj.extLength = extSize;
      obj.width = width;
      obj.height = height;
      obj.thickness = thickness;

      if (this.viewer && this.viewer.viewer) {
          this.viewer.viewer.Render();
      }

      if (this.config.onPlanningObjectsChange) {
          this.config.onPlanningObjectsChange(this.planningObjects);
      }
      this.saveToLocalStorage();
  }

  updateCylinderGeometry(id: string, diameter: number, extension: number) {
      const THREE = window.THREE;
      if (!THREE) return;
      const obj = this.planningObjects.find(o => o.id === id);
      if (!obj || obj.type !== 'cylinder' || obj.baseDistance === undefined) return;

      if (obj.mesh.geometry) obj.mesh.geometry.dispose();

      const radius = diameter / 2;
      const length = obj.baseDistance + (extension * 2);

      const newGeometry = new THREE.CylinderGeometry(radius, radius, length, 32);
      obj.mesh.geometry = newGeometry;

      // Update line segments (wireframe outline overlay)
      const toRemove = obj.mesh.children.filter((child: any) => child.isLineSegments || child.type === 'LineSegments');
      toRemove.forEach((child: any) => obj.mesh.remove(child));

      const edges = new THREE.EdgesGeometry(newGeometry);
      const lineMaterial = new THREE.LineBasicMaterial({ color: 0x0000aa, linewidth: 2, depthTest: false });
      const line = new THREE.LineSegments(edges, lineMaterial);
      obj.mesh.add(line);

      obj.radius = radius;
      obj.length = length;
      obj.diameter = diameter;
      obj.extension = extension;

      if (this.viewer && this.viewer.viewer) {
          this.viewer.viewer.Render();
      }

      if (this.config.onPlanningObjectsChange) {
          this.config.onPlanningObjectsChange(this.planningObjects);
      }
      this.saveToLocalStorage();
  }

  updatePlanningObjectCurveThickness(id: string, thickness: number) {
      const obj = this.planningObjects.find(o => o.id === id);
      if (!obj || obj.type !== 'curve' || !obj.curvePath) return;
      
      const THREE = window.THREE;
      if (!THREE) return;

      if (obj.mesh.geometry) obj.mesh.geometry.dispose();

      const radius = thickness / 2;
      const tubularSegments = Math.max(20, obj.pointsCount * 10);
      const radialSegments = 8;
      
      const newGeometry = new THREE.TubeGeometry(obj.curvePath, tubularSegments, radius, radialSegments, false);
      obj.mesh.geometry = newGeometry;
      
      const toRemove = obj.mesh.children.filter((child: any) => child.isLineSegments || child.type === 'LineSegments');
      toRemove.forEach((child: any) => obj.mesh.remove(child));

      const edges = new THREE.EdgesGeometry(newGeometry);
      const lineMaterial = new THREE.LineBasicMaterial({ color: 0x9d174d, linewidth: 2, depthTest: false });
      const line = new THREE.LineSegments(edges, lineMaterial);
      obj.mesh.add(line);

      obj.thickness = thickness;

      if (this.viewer && this.viewer.viewer) {
          this.viewer.viewer.Render();
      }
      
      if (this.config.onPlanningObjectsChange) {
          this.config.onPlanningObjectsChange(this.planningObjects);
      }
      this.saveToLocalStorage();
  }

  updatePlanningPointDiameter(id: string, diameter: number) {
      const obj = this.planningObjects.find(o => o.id === id);
      if (!obj || obj.type !== 'point') return;
      
      const THREE = window.THREE;
      if (!THREE) return;

      if (obj.mesh.geometry) obj.mesh.geometry.dispose();

      const radius = diameter / 2;
      const newGeometry = new THREE.SphereGeometry(radius, 32, 32);
      obj.mesh.geometry = newGeometry;
      
      // Update outline geometry
      const toRemove = obj.mesh.children.filter((child: any) => child.isLineSegments || child.type === 'LineSegments');
      toRemove.forEach((child: any) => obj.mesh.remove(child));

      const edges = new THREE.EdgesGeometry(newGeometry);
      const edgeMaterial = new THREE.LineBasicMaterial({ color: 0x7e22ce, linewidth: 2, depthTest: false });
      const line = new THREE.LineSegments(edges, edgeMaterial);
      obj.mesh.add(line);
      
      obj.diameter = diameter;
      
      if (this.viewer?.viewer) {
          try { this.viewer.viewer.Render(); } catch(e) {}
      }
      this.saveToLocalStorage();
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
      this.saveToLocalStorage();
  }

  removePlanningObject(id: string) {
      const idx = this.planningObjects.findIndex(o => o.id === id);
      if (idx > -1) {
          const obj = this.planningObjects[idx];
          if (this.viewer && this.viewer.viewer) {
             const scene = this.viewer.viewer.scene || this.viewer.viewer.mainScene;
             if (scene) {
                 scene.remove(obj.mesh);
                 obj.mesh.traverse((child: any) => {
                     if (child.geometry) child.geometry.dispose();
                     if (child.material) {
                         if (Array.isArray(child.material)) {
                             child.material.forEach((m: any) => m.dispose());
                         } else {
                             child.material.dispose();
                         }
                     }
                 });

                 if (obj.labelSprite) {
                     scene.remove(obj.labelSprite);
                     if (obj.labelSprite.material) {
                         if (obj.labelSprite.material.map) obj.labelSprite.material.map.dispose();
                         obj.labelSprite.material.dispose();
                     }
                 }

                 if (obj.labelDiv) {
                     if (obj.labelDiv.parentElement) {
                         obj.labelDiv.parentElement.removeChild(obj.labelDiv);
                     }
                 }

                 this.viewer.viewer.Render();
             }
          }
          this.planningObjects.splice(idx, 1);
          if (this.config.onPlanningObjectsChange) {
              this.config.onPlanningObjectsChange(this.planningObjects);
          }
          this.saveToLocalStorage();
      }
  }

  addPlanningGroup(name: string) {
    const id = `group_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    this.planningGroups.push({ id, name, visible: true, isCollapsed: false });
    this.notifyGroupsChanged();
    this.saveToLocalStorage();
    return id;
  }

  renamePlanningGroup(groupId: string, name: string) {
    const group = this.planningGroups.find(g => g.id === groupId);
    if (group) {
      group.name = name;
      this.notifyGroupsChanged();
      this.saveToLocalStorage();
    }
  }

  setPlanningGroupCollapsed(groupId: string, collapsed: boolean) {
    const group = this.planningGroups.find(g => g.id === groupId);
    if (group) {
      group.isCollapsed = collapsed;
      this.notifyGroupsChanged();
      this.saveToLocalStorage();
    }
  }

  removePlanningGroup(groupId: string, deleteAssociated: boolean = false) {
    const idx = this.planningGroups.findIndex(g => g.id === groupId);
    if (idx > -1) {
      this.planningGroups.splice(idx, 1);
      
      const objectsToHandle = this.planningObjects.filter(o => o.groupId === groupId);
      if (deleteAssociated) {
        // Delete each associated object
        objectsToHandle.forEach(o => this.removePlanningObject(o.id));
      } else {
        // Just move back to default group (unassigned)
        objectsToHandle.forEach(o => {
          o.groupId = undefined;
        });
      }
      
      this.notifyGroupsChanged();
      if (this.config.onPlanningObjectsChange) {
        this.config.onPlanningObjectsChange(this.planningObjects);
      }
      this.saveToLocalStorage();
    }
  }

  setPlanningGroupVisibility(groupId: string, visible: boolean) {
    const group = this.planningGroups.find(g => g.id === groupId);
    if (group) {
      group.visible = visible;
      
      // Affect all planning objects in this group
      this.planningObjects.forEach(o => {
        if (o.groupId === groupId) {
          o.visible = visible;
          if (o.mesh) {
            o.mesh.visible = visible;
          }
          if (o.labelDiv) {
            o.labelDiv.style.display = visible ? 'block' : 'none';
          }
        }
      });
      
      this.notifyGroupsChanged();
      if (this.viewer?.viewer) {
        try { this.viewer.viewer.Render(); } catch(e) {}
      }
      if (this.config.onPlanningObjectsChange) {
        this.config.onPlanningObjectsChange(this.planningObjects);
      }
      this.saveToLocalStorage();
    }
  }

  setPlanningObjectGroupId(id: string, groupId: string | undefined) {
    const obj = this.planningObjects.find(o => o.id === id);
    if (obj) {
      obj.groupId = groupId;
      this.saveToLocalStorage();
      if (this.config.onPlanningObjectsChange) {
        this.config.onPlanningObjectsChange(this.planningObjects);
      }
    }
  }

  togglePlanningObjectVisibility(id: string) {
    const obj = this.planningObjects.find(o => o.id === id);
    if (obj) {
      obj.visible = obj.visible !== undefined ? !obj.visible : false;
      if (obj.mesh) {
        obj.mesh.visible = obj.visible;
      }
      if (obj.labelDiv) {
        obj.labelDiv.style.display = obj.visible ? 'block' : 'none';
      }
      this.saveToLocalStorage();
      if (this.viewer?.viewer) {
        try { this.viewer.viewer.Render(); } catch(e) {}
      }
      if (this.config.onPlanningObjectsChange) {
        this.config.onPlanningObjectsChange(this.planningObjects);
      }
    }
  }

  notifyGroupsChanged() {
    if (this.config.onPlanningGroupsChange) {
      this.config.onPlanningGroupsChange([...this.planningGroups]);
    }
  }

  clearAllPlanningObjects() {
      if (this.viewer && this.viewer.viewer) {
          const scene = this.viewer.viewer.scene || this.viewer.viewer.mainScene;
          if (scene) {
              this.planningObjects.forEach(obj => {
                  scene.remove(obj.mesh);
                  if (obj.mesh.geometry) obj.mesh.geometry.dispose();
                  if (obj.mesh.material) obj.mesh.material.dispose();

                  if (obj.labelSprite) {
                      scene.remove(obj.labelSprite);
                      if (obj.labelSprite.material) {
                          if (obj.labelSprite.material.map) obj.labelSprite.material.map.dispose();
                          obj.labelSprite.material.dispose();
                      }
                  }

                  if (obj.labelDiv) {
                      if (obj.labelDiv.parentElement) {
                          obj.labelDiv.parentElement.removeChild(obj.labelDiv);
                      }
                  }
              });
              this.viewer.viewer.Render();
          }
      }
      this.planningObjects = [];
      if (this.config.onPlanningObjectsChange) {
          this.config.onPlanningObjectsChange(this.planningObjects);
      }
      this.saveToLocalStorage();
  }

  getModelRoot() {
      if (!window.THREE) return null;
      if (!this.currentMeshes || this.currentMeshes.length === 0) return null;
      
      const firstMesh = this.currentMeshes[0];
      const scene = this.viewer?.viewer?.scene || this.viewer?.viewer?.mainScene;
      if (!scene) return null;
      
      let current = firstMesh;
      let modelRoot = firstMesh;
      while (current.parent && current.parent !== scene) {
          modelRoot = current.parent;
          current = current.parent;
      }
      return modelRoot;
  }

  generateSTLString(obj: any, useModelCoordinates: boolean = true): string | null {
      if (obj.type === 'measurement' || obj.type === 'angle') return null;
      if (!window.THREE) return null;
      const THREE = window.THREE;
      const mesh = obj.mesh;
      const geometry = mesh?.geometry;
      if (!geometry || !geometry.isBufferGeometry) return null;
      
      const cloneGeo = geometry.clone();
      
      let transformMatrix = mesh.matrixWorld.clone();
      let isModelAligned = false;
      if (useModelCoordinates) {
          const modelRoot = this.getModelRoot();
          if (modelRoot) {
              const invModelMatrix = new THREE.Matrix4().copy(modelRoot.matrixWorld).invert();
              transformMatrix.premultiply(invModelMatrix);
              isModelAligned = true;
          }
      }
      cloneGeo.applyMatrix4(transformMatrix);

      // Coordinate System Metadata embedded in the STL solid description line
      const cleanName = (obj.name || obj.id).replace(/\s+/g, '_');
      const csLabel = isModelAligned ? "coordinate_system=Loaded_Model_Space" : "coordinate_system=Right-Handed_Cartesian";
      let stl = `solid ${cleanName} ${csLabel} units=millimeter origin=0,0,0\n`;

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
      
      stl += `endsolid ${cleanName}\n`;
      return stl;
  }

  duplicatePlanningObject(id: string) {
      const obj = this.planningObjects.find(o => o.id === id);
      if (!obj || !window.THREE) return;
      
      if (obj.type === 'plane') {
          this.createPlanningPlane(
              new window.THREE.Vector3(obj.p1.x, obj.p1.y, obj.p1.z),
              new window.THREE.Vector3(obj.p2.x, obj.p2.y, obj.p2.z),
              new window.THREE.Vector3(obj.p3.x, obj.p3.y, obj.p3.z),
              obj.extWidth,
              obj.extLength
          );
          if (this.planningObjects.length > 0) {
              const newObj = this.planningObjects[this.planningObjects.length - 1];
              this.updatePlaneGeometry(newObj.id, obj.extWidth || 0, obj.thickness || 0);
          }
      } else if (obj.type === 'cylinder') {
          this.createPlanningCylinder(
              new window.THREE.Vector3(obj.p1.x, obj.p1.y, obj.p1.z),
              new window.THREE.Vector3(obj.p2.x, obj.p2.y, obj.p2.z),
              obj.diameter / 2,
              obj.extension
          );
      } else if (obj.type === 'curve') {
          this.createPlanningCurve(
              obj.points.map((p: any) => new window.THREE.Vector3(p.x, p.y, p.z)),
              obj.thickness
          );
      } else if (obj.type === 'measurement') {
          this.createPlanningMeasurement(
              new window.THREE.Vector3(obj.p1.x, obj.p1.y, obj.p1.z),
              new window.THREE.Vector3(obj.p2Coord.x, obj.p2Coord.y, obj.p2Coord.z),
              obj.angle
          );
      } else if (obj.type === 'angle') {
          this.createPlanningAngle(
              new window.THREE.Vector3(obj.p1.x, obj.p1.y, obj.p1.z),
              new window.THREE.Vector3(obj.p2Coord.x, obj.p2Coord.y, obj.p2Coord.z),
              new window.THREE.Vector3(obj.p3.x, obj.p3.y, obj.p3.z),
              obj.angle
          );
      }

      if (this.planningObjects.length > 0) {
          const newObj = this.planningObjects[this.planningObjects.length - 1];
          newObj.name = `${obj.name} (Copy)`;
          newObj.groupId = obj.groupId;
          newObj.color = obj.color;
          if (newObj.mesh && newObj.mesh.material && window.THREE) {
              if (Array.isArray(newObj.mesh.material)) {
                  newObj.mesh.material.forEach((m: any) => m.color?.set(newObj.color));
              } else {
                  newObj.mesh.material.color?.set(newObj.color);
              }
          }
          if (obj.visible === false) {
             newObj.visible = false;
             if (newObj.mesh) newObj.mesh.visible = false;
          }
          if (this.config.onPlanningObjectsChange) {
              this.config.onPlanningObjectsChange(this.planningObjects);
          }
          this.saveToLocalStorage();
      }
  }

  exportPlanningObjectSTL(id: string) {
      const obj = this.planningObjects.find(o => o.id === id);
      if (!obj) return;
      const stl = this.generateSTLString(obj, true);
      if (!stl) return;

      const blob = new Blob([stl], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${obj.name || obj.id}.stl`;
      link.click();
      URL.revokeObjectURL(url);
  }

  async exportPlanningGroupZip(groupId: string) {
      const group = this.planningGroups.find(g => g.id === groupId);
      if (!group) return;

      const groupObjects = this.planningObjects.filter(obj => obj.groupId === groupId);
      if (groupObjects.length === 0) return;

      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      const metadataList: any[] = [];

      groupObjects.forEach(obj => {
          const stl = this.generateSTLString(obj, true);
          if (stl) {
              zip.file(`${obj.name || obj.id}.stl`, stl);
          }
          const serializableObj = { ...obj };
          delete serializableObj.mesh;
          delete serializableObj.labelSprite;
          delete serializableObj.labelDiv;
          delete serializableObj.curvePath;
          
          metadataList.push({
              id: obj.id,
              name: obj.name || obj.id,
              type: obj.type,
              color: obj.color,
              baseDistance: obj.baseDistance,
              angle: obj.angle,
              groupId: obj.groupId || null,
              groupName: group.name,
              ...serializableObj,
              coordinateSystem: {
                  systemType: "Loaded Model Local Coordinate Space",
                  units: "millimeters (mm)",
                  origin: "Aligned with loaded model origin (local space)"
              }
          });
      });

      const exportData = {
          coordinateSystem: {
              systemType: "Loaded Model Local Coordinate Space",
              units: "millimeters (mm)",
              origin: "Aligned with loaded model origin (local space)",
              note: "Planning objects coordinates have been exported relative to the same coordinate system as the loaded 3D model."
          },
          group: group.name,
          objects: metadataList
      };

      zip.file('metadata.json', JSON.stringify(exportData, null, 2));

      const readmeText = `COORDINATE SYSTEM DEFINITION & SPECIFICATION
---------------------------------------------
System Type: Loaded Model Local Coordinate Space
Units of Measurement: Millimeters (mm)

Geometry Details:
All exported 3D STL files are saved relative to the loaded model's own local coordinate system.
This compensates for any centering, scaling, or rotative transformations applied on-screen in the viewer canvas.
These files are ready to be aligned directly back into standard engineering and CAD tools in the model's native workspace coordinate framework.
`;
      zip.file('coordinate_system_info.txt', readmeText);

      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = url;
      const prefix = this.loadedFilename ? this.loadedFilename.split('.').slice(0, -1).join('.') : 'Model';
      link.download = `${prefix}_${group.name}_Planning.zip`;
      link.click();
      URL.revokeObjectURL(url);
  }

  async exportAllPlanningObjectsZip() {
      if (this.planningObjects.length === 0) return;
      
      // dynamically import jszip to avoid server crashing on load? It's client side so we can import JSZip
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      const metadataList: any[] = [];

      this.planningObjects.forEach(obj => {
          const stl = this.generateSTLString(obj, true);
          if (stl) {
              zip.file(`${obj.name || obj.id}.stl`, stl);
          }
          const serializableObj = { ...obj };
          delete serializableObj.mesh;
          delete serializableObj.labelSprite;
          delete serializableObj.labelDiv;
          delete serializableObj.curvePath;

          metadataList.push({
              id: obj.id,
              name: obj.name || obj.id,
              type: obj.type,
              color: obj.color,
              baseDistance: obj.baseDistance,
              angle: obj.angle,
              groupId: obj.groupId || null,
              groupName: obj.groupId ? (this.planningGroups.find(g => g.id === obj.groupId)?.name || '') : '',
              ...serializableObj,
              coordinateSystem: {
                  systemType: "Loaded Model Local Coordinate Space",
                  units: "millimeters (mm)",
                  origin: "Aligned with loaded model origin (local space)"
              }
          });
      });
      
      const exportData = {
          coordinateSystem: {
              systemType: "Loaded Model Local Coordinate Space",
              units: "millimeters (mm)",
              origin: "Aligned with loaded model origin (local space)",
              note: "Planning objects coordinates have been exported relative to the same coordinate system as the loaded 3D model."
          },
          objects: metadataList
      };

      zip.file('metadata.json', JSON.stringify(exportData, null, 2));

      // Separate explicit README for clarity on standard clinical and engineering coordinate alignment
      const readmeText = `COORDINATE SYSTEM DEFINITION & SPECIFICATION
---------------------------------------------
System Type: Loaded Model Local Coordinate Space
Units of Measurement: Millimeters (mm)

Geometry Details:
All exported 3D STL files are saved relative to the loaded model's own local coordinate system.
This compensates for any centering, scaling, or rotative transformations applied on-screen in the viewer canvas.
These files are ready to be aligned directly back into standard engineering and CAD tools in the model's native workspace coordinate framework.
`;

      zip.file('coordinate_system_info.txt', readmeText);

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const prefix = this.loadedFilename ? this.loadedFilename.split('.').slice(0, -1).join('.') : 'Model';
      link.download = `${prefix}_All_Planning.zip`;
      link.click();
      URL.revokeObjectURL(url);
  }

  async importPlanningObjectsZip(file: File) {
      if (!window.THREE) return;
      
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      try {
          const contents = await zip.loadAsync(file);
          if (!contents.files['metadata.json']) {
              console.warn("No metadata.json found in the zip file.");
              return;
          }
          
          const metadataStr = await contents.files['metadata.json'].async("string");
          const metadata = JSON.parse(metadataStr);
          const objectsToLoad = metadata.objects || [];
          
          let groupMap = new Map<string, string>(); // Maps old group ID or name to new group ID
          
          // First, create any new groups, resolving by name if possible
          if (metadata.group) {
             let existingGrp = this.planningGroups.find(g => g.name === metadata.group);
             if (!existingGrp) {
                 const newId = this.addPlanningGroup(metadata.group);
                 groupMap.set('export_group', newId);
             } else {
                 groupMap.set('export_group', existingGrp.id);
             }
          }
          
          for (const obj of objectsToLoad) {
               if (obj.groupName) {
                   let existingGrp = this.planningGroups.find(g => g.name === obj.groupName);
                   if (!existingGrp) {
                       const newId = this.addPlanningGroup(obj.groupName);
                       groupMap.set(obj.groupName, newId);
                   } else {
                       groupMap.set(obj.groupName, existingGrp.id);
                   }
               }
          }
          
          // Now recreate objects
          for (const obj of objectsToLoad) {
              // Try not to duplicate by name if they somehow match perfectly? Or just duplicate. 
              // Usually we just recreate.
              if (obj.type === 'plane' && obj.p1 && obj.p2 && obj.p3) {
                  this.createPlanningPlane(
                      new window.THREE.Vector3(obj.p1.x, obj.p1.y, obj.p1.z),
                      new window.THREE.Vector3(obj.p2.x, obj.p2.y, obj.p2.z),
                      new window.THREE.Vector3(obj.p3.x, obj.p3.y, obj.p3.z),
                      obj.extWidth,
                      obj.extLength
                  );
                  if (this.planningObjects.length > 0) {
                      const newObj = this.planningObjects[this.planningObjects.length - 1];
                      this.updatePlaneGeometry(newObj.id, obj.extWidth || 0, obj.thickness || 0);
                  }
              } else if (obj.type === 'cylinder' && obj.p1 && obj.p2) {
                  this.createPlanningCylinder(
                      new window.THREE.Vector3(obj.p1.x, obj.p1.y, obj.p1.z),
                      new window.THREE.Vector3(obj.p2.x, obj.p2.y, obj.p2.z),
                      (obj.diameter !== undefined ? obj.diameter : obj.radius * 2) / 2,
                      obj.extension
                  );
              } else if (obj.type === 'curve' && obj.points) {
                  this.createPlanningCurve(
                      obj.points.map((p: any) => new window.THREE.Vector3(p.x, p.y, p.z)),
                      obj.thickness
                  );
              } else if (obj.type === 'measurement' && obj.p1 && obj.p2Coord) {
                  this.createPlanningMeasurement(
                      new window.THREE.Vector3(obj.p1.x, obj.p1.y, obj.p1.z),
                      new window.THREE.Vector3(obj.p2Coord.x, obj.p2Coord.y, obj.p2Coord.z),
                      obj.angle || 0
                  );
              } else if (obj.type === 'angle' && obj.p1 && obj.p2Coord && obj.p3) {
                  this.createPlanningAngle(
                      new window.THREE.Vector3(obj.p1.x, obj.p1.y, obj.p1.z),
                      new window.THREE.Vector3(obj.p2Coord.x, obj.p2Coord.y, obj.p2Coord.z),
                      new window.THREE.Vector3(obj.p3.x, obj.p3.y, obj.p3.z),
                      obj.angle || 0
                  );
              } else if (obj.type === 'point' && obj.points && obj.points.length > 0) {
                  this.createPlanningPoint(
                      new window.THREE.Vector3(obj.points[0].x, obj.points[0].y, obj.points[0].z),
                      obj.diameter || 0.2
                  );
              } else {
                 console.warn("Unsupported or missing data for planning object:", obj);
                 continue;
              }
              
              if (this.planningObjects.length > 0) {
                  const newObj = this.planningObjects[this.planningObjects.length - 1];
                  newObj.name = obj.name;
                  if (obj.groupName) {
                      newObj.groupId = groupMap.get(obj.groupName);
                  } else if (metadata.group && groupMap.has('export_group')) {
                      newObj.groupId = groupMap.get('export_group');
                  }
                  newObj.color = obj.color;
                  if (newObj.mesh && newObj.mesh.material && window.THREE) {
                      if (Array.isArray(newObj.mesh.material)) {
                          newObj.mesh.material.forEach((m: any) => m.color?.set(newObj.color));
                      } else {
                          newObj.mesh.material.color?.set(newObj.color);
                      }
                  }
                  if (obj.visible === false) {
                      newObj.visible = false;
                      if (newObj.mesh) newObj.mesh.visible = false;
                  }
              }
          }
          
          if (this.config.onPlanningObjectsChange) {
              this.config.onPlanningObjectsChange(this.planningObjects);
          }
          this.saveToLocalStorage();
      } catch (e) {
          console.error("Failed to parse or load planning ZIP file", e);
      }
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
    this.lastPlanesState = planesState;
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

                const pointOnPlane = new window.THREE.Vector3();
                if (axis === 'x') pointOnPlane.x = pos;
                if (axis === 'y') pointOnPlane.y = pos;
                if (axis === 'z') pointOnPlane.z = pos;

                if (state.alignToCamera) {
                    if (this.viewer?.viewer?.navigation?.GetCamera) {
                        const cam = this.viewer.viewer.navigation.GetCamera();
                        if (cam && cam.eye && cam.center) {
                            normal.set(cam.center.x - cam.eye.x, cam.center.y - cam.eye.y, cam.center.z - cam.eye.z).normalize();
                        }
                    } else if (this.viewer?.viewer?.navigation?.camera) {
                        this.viewer.viewer.navigation.camera.getWorldDirection(normal);
                    }
                    
                    if (!this.modelBBox.isEmpty()) {
                        const bboxCenter = new window.THREE.Vector3();
                        this.modelBBox.getCenter(bboxCenter);
                        
                        const absNormal = new window.THREE.Vector3(Math.abs(normal.x), Math.abs(normal.y), Math.abs(normal.z));
                        const boxSize = new window.THREE.Vector3();
                        this.modelBBox.getSize(boxSize);
                        
                        const spanExtents = (boxSize.x * absNormal.x + boxSize.y * absNormal.y + boxSize.z * absNormal.z);
                        const scrubMin = -spanExtents / 2;
                        const scrubMax = spanExtents / 2;
                        
                        const scrubPos = scrubMin + (scrubMax - scrubMin) * (state.sliderVal / 100);
                        
                        pointOnPlane.copy(bboxCenter).add(normal.clone().multiplyScalar(scrubPos));
                    }
                }

                if (state.invert) normal.negate();

                state.plane.normal.copy(normal);
                state.plane.constant = -normal.dot(pointOnPlane);
                
                activePlanes.push(state.plane);
            }
        });

        this.currentMeshes.forEach(mesh => {
            if (mesh.material) {
                const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
                materials.forEach((mat: any) => {
                    let needsAssignment = false;
                    if (!mat.clippingPlanes || mat.clippingPlanes.length !== activePlanes.length) {
                        needsAssignment = true;
                    } else {
                        for (let i = 0; i < activePlanes.length; i++) {
                            if (mat.clippingPlanes[i] !== activePlanes[i]) {
                                needsAssignment = true; break;
                            }
                        }
                    }
                    if (needsAssignment) {
                        mat.clippingPlanes = activePlanes;
                        mat.clipShadows = true;
                        mat.side = window.THREE.DoubleSide;
                        mat.needsUpdate = true;
                    }
                });
            }
        });
    } else {
        this.currentMeshes.forEach(mesh => {
            if (mesh.material) {
                const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
                materials.forEach((mat: any) => {
                    if (mat.clippingPlanes !== null) {
                        mat.clippingPlanes = null;
                        mat.needsUpdate = true;
                    }
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


  setAutoRotate(val: boolean) {
      this.isAutoRotating = val;
  }

  // --- RULERS ---
  
  setRulersVisible(val: boolean) {
      this.rulersVisible = val;
      if (val) {
          this.resizeRulers();
          this.lastCameraState = '';
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

  domUpdateLoop = () => {
    try {
        if (this.lastPlanesState) {
            let needsUpdate = false;
            for (const axis of ['x', 'y', 'z']) {
               if (this.lastPlanesState[axis]?.active && this.lastPlanesState[axis]?.alignToCamera) {
                   needsUpdate = true;
                   break;
               }
            }
            if (needsUpdate) {
                this.updateClippingPlanes(this.lastPlanesState);
            }
        }
    
        if (this.viewer?.viewer?.navigation) {
            
            if (this.isAutoRotating && window.THREE) {
                const nav = this.viewer.viewer.navigation;
                let originalCam: any = null;
                if (typeof nav.GetCamera === 'function') {
                    originalCam = nav.GetCamera();
                } else if (nav.camera) {
                    const threeCam = nav.camera;
                    originalCam = new window.OV.Camera(
                        new window.OV.Coord3D(threeCam.position.x, threeCam.position.y, threeCam.position.z),
                        new window.OV.Coord3D(nav.controls?.target?.x || 0, nav.controls?.target?.y || 0, nav.controls?.target?.z || 0),
                        new window.OV.Coord3D(threeCam.up.x, threeCam.up.y, threeCam.up.z),
                        threeCam.fov || 45.0
                    );
                }
                
                if (originalCam && originalCam.eye && originalCam.center && originalCam.up) {
                    const eye = originalCam.eye;
                    const center = originalCam.center;
                    const up = originalCam.up;

                    const offset = new window.THREE.Vector3(eye.x - center.x, eye.y - center.y, eye.z - center.z);
                    const upVec = new window.THREE.Vector3(up.x, up.y, up.z).normalize();
                    const angleRad = 0.005; // Adjust speed as needed
                    offset.applyAxisAngle(upVec, angleRad);
                    
                    const newEye = new window.THREE.Vector3(center.x, center.y, center.z).add(offset);
                    
                    const tempCam = new window.OV.Camera(
                        new window.OV.Coord3D(newEye.x, newEye.y, newEye.z),
                        new window.OV.Coord3D(center.x, center.y, center.z),
                        new window.OV.Coord3D(up.x, up.y, up.z),
                        originalCam.fov || 45.0
                    );
                    nav.SetCamera(tempCam);
                    this.viewer.viewer.Render();
                }
            }

            // Update Planning Object Overlays
            if (this.planningObjects) {
                this.planningObjects.forEach(obj => {
                    if ((obj.type === 'measurement' || obj.type === 'angle') && obj.labelDiv && obj.p2) {
                        const screen = this.projectToScreen(obj.p2);
                        if (screen && screen.z < 1) { // z < 1 means in front of camera
                            obj.labelDiv.style.left = `${screen.x}px`;
                            obj.labelDiv.style.top = `${screen.y - 20}px`; // slightly above
                            obj.labelDiv.style.opacity = '1';
                        } else {
                            obj.labelDiv.style.opacity = '0';
                        }
                    }
                });
            }

            if (this.rulersVisible) {
                let cam: any = null;
                if (typeof this.viewer.viewer.navigation.GetCamera === 'function') {
                    cam = this.viewer.viewer.navigation.GetCamera();
                } else if (this.viewer.viewer.navigation.camera) {
                    const threeCam = this.viewer.viewer.navigation.camera;
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
            } // end rulersVisible
        } // end viewer?.viewer?.navigation
    } catch(e) {
        console.error("DOM update error:", e);
    }
    if (this.isDisposed) return;
    this.rulerAnimationFrame = requestAnimationFrame(this.domUpdateLoop);
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
      
      // Temporarily hide only draft temporary indicator points from the snapshot rendering
      const hiddenObjects: any[] = [];
      this.planningPointMarkers.forEach(marker => {
          if (marker.visible) {
              marker.visible = false;
              hiddenObjects.push(marker);
          }
      });

      try {
          renderer.render(v.scene, v.camera);
      } catch(e) {
          console.error(e);
      } finally {
          // Restore visibility immediately after rendering
          hiddenObjects.forEach(obj => {
              obj.visible = true;
          });
      }

      const masterCanvas = document.createElement('canvas');
      masterCanvas.width = width;
      masterCanvas.height = height;
      const ctx = masterCanvas.getContext('2d');
      if (!ctx) return null;
      
      ctx.drawImage(renderer.domElement, 0, 0, width, height);

      // Draw measurement annotations onto the 2D canvas of the snapshot
      const scaleFactor = Math.max(1, height / oldHeight);
      
      const projectToTargetSize = (point: any, w: number, h: number, camera: any) => {
          if (!window.THREE) return null;
          const vector = point.clone();
          vector.project(camera);
          const x = (vector.x * 0.5 + 0.5) * w;
          const y = (-(vector.y * 0.5) + 0.5) * h;
          return { x, y, z: vector.z };
      };

      this.planningObjects.forEach(obj => {
          if ((obj.type === 'measurement' || obj.type === 'angle') && obj.visible !== false && obj.p2) {
              const proj = projectToTargetSize(obj.p2, width, height, v.camera);
              if (proj && proj.z < 1) {
                  let text = '';
                  let borderColor = '#10b981';
                  if (obj.type === 'angle') {
                      text = obj.name ? `${obj.name} (${obj.angle.toFixed(1)}°)` : `${obj.angle.toFixed(1)}°`;
                      borderColor = '#d97706';
                  } else {
                      text = obj.name ? `${obj.name} (${obj.baseDistance.toFixed(2)} mm)` : `${obj.baseDistance.toFixed(2)} mm`;
                  }
                  
                  ctx.save();
                  ctx.font = `bold ${Math.round(11 * scaleFactor)}px monospace`;
                  
                  // Calculate text metric measurements
                  const textMetrics = ctx.measureText(text);
                  const textWidth = textMetrics.width;
                  const textHeight = 11 * scaleFactor;
                  
                  const padX = 8 * scaleFactor;
                  const padY = 4 * scaleFactor;
                  
                  const pillW = textWidth + padX * 2;
                  const pillH = textHeight + padY * 2;
                  
                  const pillX = proj.x - pillW / 2;
                  const pillY = proj.y - 12 * scaleFactor - pillH / 2; // Draw slightly above
                  
                  // Draw capsule background pill
                  ctx.fillStyle = 'rgba(15, 23, 42, 0.9)'; // Dark slate-900 background
                  ctx.strokeStyle = borderColor;
                  ctx.lineWidth = 1 * scaleFactor;
                  
                  ctx.beginPath();
                  const r = Math.min(pillW, pillH) / 2;
                  if (ctx.roundRect) {
                      ctx.roundRect(pillX, pillY, pillW, pillH, r);
                  } else {
                      ctx.rect(pillX, pillY, pillW, pillH);
                  }
                  ctx.fill();
                  ctx.stroke();
                  
                  // Center and paint text label
                  ctx.fillStyle = '#ffffff';
                  ctx.textAlign = 'center';
                  ctx.textBaseline = 'middle';
                  ctx.fillText(text, proj.x, proj.y - 12 * scaleFactor);
                  ctx.restore();
              }
          }
      });

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

  capture360Snapshots(width: number, height: number, isTransparent: boolean): { angle: number; dataUrl: string }[] {
      if (!this.viewer?.viewer?.navigation) return [];
      
      const v = this.viewer.viewer;
      const nav = v.navigation;
      
      let originalCam: any = null;
      if (typeof nav.GetCamera === 'function') {
          originalCam = nav.GetCamera();
      } else if (nav.camera) {
          const threeCam = nav.camera;
          originalCam = new window.OV.Camera(
              new window.OV.Coord3D(threeCam.position.x, threeCam.position.y, threeCam.position.z),
              new window.OV.Coord3D(nav.controls?.target?.x || 0, nav.controls?.target?.y || 0, nav.controls?.target?.z || 0),
              new window.OV.Coord3D(threeCam.up.x, threeCam.up.y, threeCam.up.z),
              threeCam.fov || 45.0
          );
      }
      
      if (!originalCam) return [];

      const results: { angle: number; dataUrl: string }[] = [];
      const eye = originalCam.eye;
      const center = originalCam.center;
      const up = originalCam.up;
      const fov = originalCam.fov || 45.0;

      if (!window.THREE) return [];

      try {
          for (let i = 0; i < 6; i++) {
              const angleDeg = i * 60;
              const angleRad = (angleDeg * Math.PI) / 180;

              // Calculate camera eye position rotated by angleRad around current up vector
              const offset = new window.THREE.Vector3(eye.x - center.x, eye.y - center.y, eye.z - center.z);
              const upVec = new window.THREE.Vector3(up.x, up.y, up.z).normalize();
              offset.applyAxisAngle(upVec, angleRad);

              const newEye = new window.THREE.Vector3(center.x, center.y, center.z).add(offset);

              const tempCam = new window.OV.Camera(
                  new window.OV.Coord3D(newEye.x, newEye.y, newEye.z),
                  new window.OV.Coord3D(center.x, center.y, center.z),
                  new window.OV.Coord3D(up.x, up.y, up.z),
                  fov
              );

              nav.SetCamera(tempCam);
              v.Render();

              const dataUrl = this.captureSnapshot(width, height, isTransparent);
              if (dataUrl) {
                  results.push({ angle: angleDeg, dataUrl });
              }
          }
      } catch (err) {
          console.error("Failed during 360 snapshots rotation", err);
      } finally {
          // Restore original camera orientation
          try {
              const eyeRestore = new window.OV.Coord3D(eye.x, eye.y, eye.z);
              const centerRestore = new window.OV.Coord3D(center.x, center.y, center.z);
              const upRestore = new window.OV.Coord3D(up.x, up.y, up.z);
              nav.SetCamera(new window.OV.Camera(eyeRestore, centerRestore, upRestore, fov));
              v.Render();
          } catch(e) {
              console.warn("Could not restore camera state:", e);
          }
      }

      return results;
  }
}
