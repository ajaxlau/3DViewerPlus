import { useEffect, useRef, useState } from 'react';
import { useViewer } from '../context/ViewerContext';
import { BoxSelect, Camera, Share2 } from 'lucide-react';

export function ViewerCanvas() {
  const { setContainerRef, setRulerRefs, isEmpty, rulersVisible, viewerManager, filename, setActiveModal } = useViewer();
  const [isDragging, setIsDragging] = useState(false);
  
  const handleOpenFiles = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.onchange = (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (files && files.length > 0 && window._viewerManagerInstance) {
        window._viewerManagerInstance.loadFiles(files);
      }
    };
    input.click();
  };

  useEffect(() => {
    const handleDragEnter = (e: DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); };
    const handleDragOver = (e: DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); };
    const handleDragLeave = (e: DragEvent) => { 
      e.preventDefault(); e.stopPropagation(); 
      if (e.relatedTarget === null || (e.relatedTarget as Node).nodeName === 'HTML') setIsDragging(false); 
    };
    const handleDrop = (e: DragEvent) => { 
      e.preventDefault(); e.stopPropagation(); 
      setIsDragging(false); 
      if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
        if (window._viewerManagerInstance) window._viewerManagerInstance.loadFiles(e.dataTransfer.files);
      }
    };

    document.body.addEventListener('dragenter', handleDragEnter);
    document.body.addEventListener('dragover', handleDragOver);
    document.body.addEventListener('dragleave', handleDragLeave);
    document.body.addEventListener('drop', handleDrop);

    return () => {
      document.body.removeEventListener('dragenter', handleDragEnter);
      document.body.removeEventListener('dragover', handleDragOver);
      document.body.removeEventListener('dragleave', handleDragLeave);
      document.body.removeEventListener('drop', handleDrop);
    };
  }, []);

  const handleQuickSnapshotShare = async () => {
    if (!viewerManager) return;
    try {
      const dataUrl = viewerManager.captureSnapshot(1920, 1080, false);
      if (dataUrl) {
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        const dlName = filename || 'snapshot';
        const file = new File([blob], `${dlName.replace(/\.[^/.]+$/, "")}_snapshot.png`, { type: 'image/png' });
        
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file]
          });
        } else {
           setActiveModal('snapshot');
        }
      }
    } catch (e) {
      console.warn("Failed to share quick snapshot", e);
    }
  };

  return (
    <main className="flex-1 w-full h-full relative bg-white dark:bg-slate-950 flex items-center justify-center overflow-hidden">
      {/* 3D Canvas Container */}
      <div 
        ref={(el) => setContainerRef(el)}
        className="w-full h-full outline-none absolute inset-0 mix-blend-normal"
        id="viewer-container"
      />
      
      {/* Floating Action Buttons */}
      {!isEmpty && (
        <button
          onClick={handleQuickSnapshotShare}
          className="absolute bottom-6 right-6 z-20 w-11 h-11 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shadow-lg transition-all hover:scale-105 active:scale-95 group focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          title="Share Snapshot"
        >
          <div className="relative text-white z-10 flex items-center justify-center">
            <Camera size={18} className="transition-transform group-hover:-rotate-3" />
            <Share2 size={12} className="absolute -bottom-1 -right-2 transition-transform group-hover:rotate-6 text-blue-200" />
          </div>
        </button>
      )}
      
      {/* Rulers Overlay Layer */}
      <div className={`absolute inset-0 z-10 pointer-events-none transition-opacity duration-300 ${rulersVisible ? 'opacity-100' : 'opacity-0'}`}>
        <div className="absolute top-0 left-0 w-6 h-6 bg-slate-50 dark:bg-slate-900 border-r border-b border-slate-200 dark:border-slate-800 flex items-center justify-center text-[9px] font-bold text-slate-500 z-20 box-border">
          mm
        </div>
        <canvas ref={(el) => { if(el) setTimeout(() => setRulerRefs(el), 0) }} id="ruler-top" className="absolute top-0 left-6 right-0 h-6 w-[calc(100%-24px)] z-10 block" />
        <canvas ref={(el) => { if(el) setTimeout(() => setRulerRefs(undefined, el), 0) }} id="ruler-left" className="absolute top-6 left-0 bottom-0 w-6 h-[calc(100%-24px)] z-10 block" />
      </div>

      {/* Empty State */}
      {isEmpty && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none z-15 bg-white dark:bg-slate-950">
          <BoxSelect size={48} className="text-slate-300 dark:text-slate-700 mb-5" />
          <h2 className="text-lg mb-2 text-slate-800 dark:text-slate-200 font-bold tracking-tight">DROP 3D MODELS TO BEGIN</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-8 font-mono uppercase tracking-widest">Supports OBJ, STL, GLTF, GLB, PLY</p>
          <button 
            onClick={handleOpenFiles}
            className="pointer-events-auto bg-blue-600 hover:bg-blue-700 text-white border-none py-2.5 px-8 rounded-sm text-xs font-bold uppercase tracking-widest transition-colors shadow-sm"
          >
            Browse Files
          </button>
        </div>
      )}

      {/* Drag & Drop Target Overlay */}
      {isDragging && (
        <div className="absolute inset-0 bg-blue-500/10 border-[3px] border-dashed border-blue-500 z-[100] flex items-center justify-center text-2xl font-bold text-blue-600 pointer-events-none">
          Drop files to load model
        </div>
      )}
    </main>
  );
}
