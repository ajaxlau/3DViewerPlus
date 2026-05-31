import { Menu, Link, Share2, Code, Camera, Ruler, Moon, Sun, PenTool } from 'lucide-react';
import { useViewer } from '../context/ViewerContext';

export function Header({ toggleSidebar }: { toggleSidebar: () => void }) {
  const { theme, setTheme, activeModal, setActiveModal, toggleRulers, rulersVisible, viewerManager, isEmpty } = useViewer();

  // Create a hidden file input programmatically to trigger load
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

  return (
    <header className="h-[64px] bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 z-10 shrink-0 md:h-[64px] h-auto py-2 md:py-0 flex-col md:flex-row gap-3 md:gap-0">
      <div className="flex items-center gap-3 font-bold text-[14px] text-slate-800 dark:text-slate-100 tracking-[0.1em] uppercase">
        <img 
          src="./3DPO_Small_Logo.png" 
          alt="3DPO Logo" 
          className="h-6 w-auto max-w-[150px] object-contain mix-blend-multiply dark:mix-blend-screen dark:invert dark:hue-rotate-180" 
        />
        <span className="whitespace-nowrap md:text-[14px] text-xs truncate max-w-[200px] md:max-w-none">
          NTEC 3DPO - 3D Viewer<sup>+</sup>
        </span>
      </div>
      
      <div className="flex items-center gap-1.5 flex-wrap w-full md:w-auto justify-start md:justify-end text-slate-500 dark:text-slate-400">
        <button className="w-8 h-8 rounded shrink-0 flex items-center justify-center transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-blue-600 dark:hover:text-blue-400" onClick={toggleSidebar} title="Toggle Sidebar">
          <Menu size={18} />
        </button>
        
        <button className="w-8 h-8 rounded shrink-0 flex items-center justify-center transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-blue-600 dark:hover:text-blue-400" onClick={() => setActiveModal('url')} title="Load from URL">
          <Link size={18} />
        </button>
        <button className="w-8 h-8 rounded shrink-0 flex items-center justify-center transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-blue-600 dark:hover:text-blue-400" onClick={() => setActiveModal('share')} title="Share Model">
          <Share2 size={18} />
        </button>
        <button className="w-8 h-8 rounded shrink-0 flex items-center justify-center transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-blue-600 dark:hover:text-blue-400" onClick={() => setActiveModal('embed')} title="Embed HTML">
          <Code size={18} />
        </button>
        <button 
          className={`w-8 h-8 rounded shrink-0 flex items-center justify-center transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-blue-600 dark:hover:text-blue-400 ${rulersVisible ? 'text-blue-600 dark:text-blue-400 bg-slate-100 dark:bg-slate-800' : ''}`} 
          onClick={toggleRulers} 
          title="Toggle Rulers"
        >
          <Ruler size={18} />
        </button>
        <button className="w-8 h-8 rounded shrink-0 flex items-center justify-center transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-blue-600 dark:hover:text-blue-400" onClick={() => setActiveModal('snapshot')} title="Create Snapshot">
          <Camera size={18} />
        </button>
        <button className="w-8 h-8 rounded shrink-0 flex items-center justify-center transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-blue-600 dark:hover:text-blue-400" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} title="Toggle Dark Mode">
          {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
        </button>

        <button 
          className={`hidden sm:flex w-8 h-8 rounded shrink-0 items-center justify-center transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-blue-600 dark:hover:text-blue-400 ${activeModal === 'planning' ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30' : ''}`} 
          onClick={() => setActiveModal(activeModal === 'planning' ? null : 'planning')} 
          title="3D Interaction Planning Tools"
        >
          <PenTool size={18} />
        </button>
      </div>
    </header>
  );
}
