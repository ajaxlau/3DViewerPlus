import { createContext, useContext, useState, useRef, useEffect, ReactNode } from 'react';
import { ViewerManager } from '../lib/ViewerManager';

export interface MeshInfo {
  id: number;
  name: string;
  visible: boolean;
  opacity: number;
}

interface CameraState {
  eye: number[];
  center: number[];
  up: number[];
}

interface ViewerContextState {
  viewerManager: ViewerManager | null;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  status: string;
  isEmpty: boolean;
  meshes: MeshInfo[];
  filename: string | null;
  loadedUrl: string | null;
  
  globalOpacity: number;
  setGlobalOpacity: (op: number) => void;
  
  isClipping: boolean;
  setIsClipping: (val: boolean) => void;
  clipPlanes: Record<'x'|'y'|'z', { active: boolean, invert: boolean, sliderVal: number }>;
  updateClipPlane: (axis: 'x'|'y'|'z', updates: Partial<{ active: boolean, invert: boolean, sliderVal: number }>) => void;
  
  explodeValue: number;
  setExplodeValue: (val: number) => void;
  
  toggleMeshVisibility: (id: number) => void;
  setMeshOpacity: (id: number, opacity: number) => void;
  highlightMesh: (id: number | null) => void;
  highlightedMeshId: number | null;
  
  rulersVisible: boolean;
  toggleRulers: () => void;
  
  // Modals state
  activeModal: 'url' | 'share' | 'embed' | 'snapshot' | 'planning' | null;
  setActiveModal: (modal: 'url' | 'share' | 'embed' | 'snapshot' | 'planning' | null) => void;

  // Planning Tools
  planningMode: 'none' | 'plane' | 'cylinder';
  setPlanningMode: (mode: 'none' | 'plane' | 'cylinder') => void;
  planningObjects: any[];
  setPlanningObjects: (objects: any[]) => void;
  planningPointsPicked: number;

  setContainerRef: (ref: HTMLElement | null) => void;
  setRulerRefs: (topRef?: HTMLCanvasElement | null, leftRef?: HTMLCanvasElement | null) => void;
}

const ViewerContext = createContext<ViewerContextState | null>(null);

export function ViewerProvider({ children }: { children: ReactNode }) {
  const [viewerManager, setViewerManager] = useState<ViewerManager | null>(null);
  const [theme, setThemeState] = useState<'light'|'dark'>('light');
  const [status, setStatus] = useState<string>('No model loaded.\nPlease open a file.');
  const [isEmpty, setIsEmpty] = useState(true);
  const [meshes, setMeshes] = useState<MeshInfo[]>([]);
  const [filename, setFilename] = useState<string | null>(null);
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null);
  
  const [globalOpacity, setGlobalOpacityState] = useState(1);
  const [isClipping, setIsClippingState] = useState(false);
  const [clipPlanes, setClipPlanes] = useState({
    x: { active: true, invert: false, sliderVal: 50 },
    y: { active: false, invert: false, sliderVal: 50 },
    z: { active: false, invert: false, sliderVal: 50 }
  });
  const [explodeValue, setExplodeValueState] = useState(0);
  const [highlightedMeshId, setHighlightedMeshId] = useState<number | null>(null);
  const [rulersVisible, setRulersVisible] = useState(false);
  
  const [activeModal, setActiveModal] = useState<ViewerContextState['activeModal']>(null);
  
  // Planning Tools state
  const [planningMode, setPlanningModeState] = useState<'none' | 'plane' | 'cylinder'>('none');
  const [planningObjects, setPlanningObjects] = useState<any[]>([]);
  const [planningPointsPicked, setPlanningPointsPicked] = useState(0);

  const setPlanningMode = (mode: 'none' | 'plane' | 'cylinder') => {
    setPlanningModeState(mode);
    if (viewerManager) {
      viewerManager.setPlanningMode(mode);
    }
  };

  const containerRef = useRef<HTMLElement | null>(null);
  const topRulerRef = useRef<HTMLCanvasElement | null>(null);
  const leftRulerRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    // Check initial dark mode from OS or classes
    const isDark = document.documentElement.classList.contains('dark') || 
                  (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (isDark) {
      setTheme('dark');
    }
  }, []);

  const setTheme = (newTheme: 'light' | 'dark') => {
    setThemeState(newTheme);
    if (newTheme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    
    if (viewerManager) {
      viewerManager.setTheme(newTheme);
    }
  };

  const initManagerIfReady = () => {
    if (containerRef.current && !viewerManager) {
      const manager = new ViewerManager(containerRef.current, {
        onStatusChange: (newStatus, empty, name, url) => {
          setStatus(newStatus);
          setIsEmpty(empty);
          if (name !== undefined) setFilename(name);
          if (url !== undefined) setLoadedUrl(url);
        },
        onMeshesChange: (newMeshes) => setMeshes(newMeshes),
        onMeshHighlighted: (id) => setHighlightedMeshId(id),
        onPlanningObjectsChange: (objects) => setPlanningObjects([...objects]),
        onPlanningPointsChange: (count) => setPlanningPointsPicked(count)
      });
      const isDark = document.documentElement.classList.contains('dark') || 
                    (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
      manager.setTheme(isDark ? 'dark' : 'light');
      if (topRulerRef.current && leftRulerRef.current) {
        manager.setRulerCanvases(topRulerRef.current, leftRulerRef.current);
      }
      setViewerManager(manager);
      (window as any)._viewerManagerInstance = manager;
      
      // Delay resize to ensure the layout has fully resolved
      setTimeout(() => {
        if (manager && manager.viewer) {
          manager.viewer.Resize();
        }
      }, 50);
    }
  };

  const setContainerRef = (ref: HTMLElement | null) => {
    containerRef.current = ref;
    initManagerIfReady();
  };

  const setRulerRefs = (topRef?: HTMLCanvasElement | null, leftRef?: HTMLCanvasElement | null) => {
    if (topRef !== undefined) topRulerRef.current = topRef;
    if (leftRef !== undefined) leftRulerRef.current = leftRef;
    if (viewerManager && topRulerRef.current && leftRulerRef.current) {
      viewerManager.setRulerCanvases(topRulerRef.current, leftRulerRef.current);
    }
  };

  const setGlobalOpacity = (val: number) => {
    setGlobalOpacityState(val);
    if (viewerManager) viewerManager.setGlobalOpacity(val);
    setMeshes(prev => prev.map(m => ({ ...m, opacity: val })));
  };

  const setIsClipping = (val: boolean) => {
    setIsClippingState(val);
    if (viewerManager) viewerManager.setClippingActive(val, clipPlanes);
  };

  const updateClipPlane = (axis: 'x'|'y'|'z', updates: Partial<{ active: boolean, invert: boolean, sliderVal: number }>) => {
    setClipPlanes(prev => {
      const newPlanes = { ...prev, [axis]: { ...prev[axis], ...updates } };
      if (viewerManager && isClipping) viewerManager.updateClippingPlanes(newPlanes);
      return newPlanes;
    });
  };

  const setExplodeValue = (val: number) => {
    setExplodeValueState(val);
    if (viewerManager) viewerManager.setExplode(val);
  };

  const toggleMeshVisibility = (id: number) => {
    if (viewerManager) viewerManager.toggleMeshVisibility(id);
    setMeshes(prev => prev.map(m => m.id === id ? { ...m, visible: !m.visible } : m));
  };

  const setMeshOpacity = (id: number, opacity: number) => {
    if (viewerManager) viewerManager.setMeshOpacity(id, opacity);
    setMeshes(prev => prev.map(m => m.id === id ? { ...m, opacity } : m));
  };

  const highlightMesh = (id: number | null) => {
    if (viewerManager) viewerManager.highlightMesh(id);
    setHighlightedMeshId(id);
  };

  const toggleRulers = () => {
    const val = !rulersVisible;
    setRulersVisible(val);
    if (viewerManager) viewerManager.setRulersVisible(val);
  };

  return (
    <ViewerContext.Provider value={{
      viewerManager, theme, setTheme, status, isEmpty, meshes, filename, loadedUrl,
      globalOpacity, setGlobalOpacity, isClipping, setIsClipping,
      clipPlanes, updateClipPlane, explodeValue, setExplodeValue,
      toggleMeshVisibility, setMeshOpacity, highlightMesh, highlightedMeshId,
      rulersVisible, toggleRulers, activeModal, setActiveModal,
      planningMode, setPlanningMode, planningObjects, setPlanningObjects, planningPointsPicked,
      setContainerRef, setRulerRefs
    }}>
      {children}
    </ViewerContext.Provider>
  );
}

export const useViewer = () => {
  const ctx = useContext(ViewerContext);
  if (!ctx) throw new Error('useViewer must be used within a ViewerProvider');
  return ctx;
};
