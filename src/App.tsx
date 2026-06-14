import { useState, useEffect } from 'react';
import { ViewerProvider, useViewer } from './context/ViewerContext';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { ViewerCanvas } from './components/ViewerCanvas';
import { Modals } from './components/Modals';
import { PlanningMenu } from './components/PlanningMenu';

// Add the global reference for easy hacky access in simple DOM events (like file inputs)
declare global {
  interface Window {
    _viewerManagerInstance: any;
  }
}

function MainLayout() {
  const { viewerManager, activeModal } = useViewer();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    window.innerWidth <= 900 || typeof navigator !== 'undefined' && /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
  );

  useEffect(() => {
    let timer1 = setTimeout(() => {
      if (viewerManager && viewerManager.viewer) viewerManager.viewer.Resize();
      if (viewerManager && viewerManager.rulersVisible) viewerManager.resizeRulers();
    }, 10);
    let timer2 = setTimeout(() => {
      if (viewerManager && viewerManager.viewer) viewerManager.viewer.Resize();
      if (viewerManager && viewerManager.rulersVisible) viewerManager.resizeRulers();
    }, 300);
    return () => { clearTimeout(timer1); clearTimeout(timer2); };
  }, [viewerManager, activeModal]);

  useEffect(() => {
    if (viewerManager) {
      window._viewerManagerInstance = viewerManager;
      
      // Auto-load logic from URL attributes when viewer settles
      const hash = window.location.hash;
      let modelUrl = null;
      let pendingCamera = undefined;
      
      if (hash && hash.startsWith('#model=')) {
          try {
              const hashParams = hash.substring(7).split('$');
              modelUrl = decodeURIComponent(hashParams[0]);
              const camParam = hashParams.find((p: string) => p.startsWith('camera='));
              if (camParam) {
                  pendingCamera = camParam.substring(7).split(',').map(Number);
              }
          } catch (e) { console.warn("Could not decode hash parameter", e); }
      }
      if (!modelUrl) {
          try { const urlParams = new URLSearchParams(window.location.search); modelUrl = urlParams.get('url'); } 
          catch (e) { console.warn("Could not decode query parameter", e); }
      }

      let timer3: any;
      if (modelUrl) {
          timer3 = setTimeout(() => { viewerManager.loadUrl(modelUrl, pendingCamera); }, 100);
      }
      return () => { if (timer3) clearTimeout(timer3); };
    }
  }, [viewerManager]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input or textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      if (viewerManager) {
        if (e.key.toLowerCase() === 'r') {
          viewerManager.resetCamera();
        } else if (e.key === '1') {
          viewerManager.setView('front');
        } else if (e.key === '2') {
          viewerManager.setView('back');
        } else if (e.key === '3') {
          viewerManager.setView('left');
        } else if (e.key === '4') {
          viewerManager.setView('right');
        } else if (e.key === '5') {
          viewerManager.setView('top');
        } else if (e.key === '6') {
          viewerManager.setView('bottom');
        }
      }
      
      if (e.key.toLowerCase() === 'f') {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {});
        } else {
          document.exitFullscreen().catch(() => {});
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewerManager]);

  return (
    <div className="flex flex-col h-dvh w-dvw overflow-hidden bg-slate-100 dark:bg-slate-950 sm:p-4 text-slate-900 dark:text-slate-200 transition-colors">
      <div className="flex flex-col flex-1 overflow-hidden sm:border sm:border-slate-300 dark:sm:border-slate-700 bg-white dark:bg-slate-900 shadow-sm rounded-sm">
        <Header toggleSidebar={() => {
          setSidebarCollapsed(!sidebarCollapsed);
          setTimeout(() => {
            if (viewerManager && viewerManager.viewer) viewerManager.viewer.Resize();
            if (viewerManager && viewerManager.rulersVisible) viewerManager.resizeRulers();
          }, 300);
        }} />
        <div className="flex flex-1 min-h-0 relative flex-col md:flex-row">
          <Sidebar collapsed={sidebarCollapsed} onClose={() => {
            setSidebarCollapsed(true);
            setTimeout(() => {
              if (viewerManager && viewerManager.viewer) viewerManager.viewer.Resize();
              if (viewerManager && viewerManager.rulersVisible) viewerManager.resizeRulers();
            }, 300);
          }} />
          <ViewerCanvas />
          <PlanningMenu />
        </div>
      </div>
      <Modals />
    </div>
  );
}

export default function App() {
  return (
    <ViewerProvider>
      <MainLayout />
    </ViewerProvider>
  );
}
