import { useState } from 'react';
import { useViewer } from '../context/ViewerContext';
import { ChevronDown, Loader2, Eye, EyeOff, Droplets, Camera, X } from 'lucide-react';

export function Sidebar({ collapsed, onClose }: { collapsed: boolean, onClose?: () => void }) {
  const { 
    status, filename, meshes, globalOpacity, setGlobalOpacity, 
    toggleMeshVisibility, setMeshOpacity, highlightMesh, highlightedMeshId,
    isClipping, setIsClipping, clipPlanes, updateClipPlane,
    explodeValue, setExplodeValue, isEmpty, isAutoRotating, setIsAutoRotating,
    backgroundImage, setBackgroundImage, backgroundOpacity, setBackgroundOpacity
  } = useViewer();

  const [meshVisOpen, setMeshVisOpen] = useState(true);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  return (
    <aside className={`transition-all duration-300 bg-slate-50 dark:bg-slate-900 flex-col overflow-y-auto overflow-x-hidden shrink-0 ${collapsed ? 'w-full md:w-0 h-0 md:h-auto opacity-0 border-none pointer-events-none' : 'w-full md:w-[280px] h-auto max-h-[50vh] md:max-h-none md:h-auto border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800 flex'}`}>
      <div className="flex flex-col w-full min-h-min pb-5">
        
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 shrink-0">
          <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 uppercase tracking-widest flex items-center gap-2">
            Visualization Tools
          </h3>
          {onClose && (
            <button className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200" onClick={onClose}>
              <X size={16} />
            </button>
          )}
        </div>
        {/* System Status Box */}
        {(!isEmpty && !status.includes('Loading') && !status.includes('Parsing') && !status.includes('Error')) ? null : (
          <div className="p-6">
            <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded p-4 text-[13px] text-slate-600 dark:text-slate-400 text-center shadow-sm">
              <div className="flex items-center gap-1.5 mb-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 font-mono justify-center">
                <span className="relative flex h-2 w-2">
                  {(status.includes('Loading') || status.includes('Parsing')) && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  )}
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${
                    status.includes('Error') ? 'bg-red-500' :
                    (status.includes('Loading') || status.includes('Parsing')) ? 'bg-blue-500' : 'bg-slate-400'
                  }`}></span>
                </span>
                <span>System Status</span>
              </div>
              <div className="text-slate-700 dark:text-slate-300">
                {status.includes('Loading') || status.includes('Parsing') ? (
                  <div className="flex flex-col items-center justify-center text-blue-600 dark:text-blue-500">
                    <Loader2 className="animate-spin mb-2" size={24} />
                    <span className="text-slate-800 dark:text-slate-200 whitespace-pre-line text-xs font-semibold">{status.replace(/\*\*/g, '')}</span>
                  </div>
                ) : (
                  <span className="whitespace-pre-line text-sm" dangerouslySetInnerHTML={{ __html: status.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                )}
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-between items-center cursor-pointer px-6 py-4 text-[11px] font-bold uppercase tracking-[0.05em] text-slate-400 border-t border-b border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => setMeshVisOpen(!meshVisOpen)}>
          <span>Mesh Visibility</span>
          <ChevronDown size={14} className={`transition-transform duration-200 text-slate-400 ${meshVisOpen ? 'rotate-180' : ''}`} />
        </div>
        
        {meshVisOpen && (
          <div className="px-6 py-4">
            <div className="border-l-2 border-slate-900 dark:border-slate-100 pl-3 mb-6">
              <label className="block text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 font-semibold">Global Opacity</label>
              <div className="flex items-center gap-2.5">
                <input 
                  type="range" 
                  min="0" max="1" step="0.05" 
                  value={globalOpacity} 
                  onChange={(e) => setGlobalOpacity(parseFloat(e.target.value))}
                  className="flex-1 cursor-pointer" 
                />
                <span className="w-10 text-right text-slate-800 dark:text-slate-200 font-mono text-sm font-semibold">{Math.round(globalOpacity * 100)}%</span>
              </div>
            </div>
            
            <div className="flex flex-col">
              {meshes.length === 0 ? (
                <div className="text-[13px] text-slate-500 dark:text-slate-400 py-2">
                  No sub-models found.
                </div>
              ) : (
                meshes.map((mesh) => (
                  <div 
                    key={mesh.id}
                    className={`border-b border-slate-100 dark:border-slate-800/50 py-3 text-[13px] cursor-pointer transition-all duration-200 ${highlightedMeshId === mesh.id ? 'text-blue-600 dark:text-blue-400 font-semibold bg-slate-100/50 dark:bg-slate-800/30' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/20'}`}
                    onMouseEnter={() => {
                      highlightMesh(mesh.id);
                    }}
                    onMouseLeave={() => {
                      highlightMesh(null);
                    }}
                    onClick={(e) => {
                      if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('input')) return;
                      highlightMesh(highlightedMeshId === mesh.id ? null : mesh.id);
                    }}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="whitespace-nowrap overflow-hidden text-ellipsis max-w-[170px]" title={mesh.name}>{mesh.name}</span>
                      <button 
                        className="bg-transparent border-none cursor-pointer text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center justify-center p-1"
                        onClick={() => toggleMeshVisibility(mesh.id)}
                        title="Toggle Visibility"
                      >
                        {mesh.visible ? <Eye size={14} /> : <EyeOff size={14} />}
                      </button>
                    </div>
                    <div className="flex items-center gap-2.5 opacity-80" onClick={e => e.stopPropagation()}>
                      <Droplets size={12} className="text-slate-400" title="Opacity" />
                      <input 
                        type="range" 
                        min="0" max="1" step="0.05" 
                        value={mesh.opacity} 
                        onChange={(e) => setMeshOpacity(mesh.id, parseFloat(e.target.value))}
                        className="flex-1 cursor-pointer" 
                      />
                      <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 w-8 text-right">{Math.round(mesh.opacity * 100)}%</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        <div className="flex justify-between items-center cursor-pointer px-6 py-4 text-[11px] font-bold uppercase tracking-[0.05em] text-slate-400 border-t border-b border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => setAdvancedOpen(!advancedOpen)}>
          <span>Advanced Visual Tools</span>
          <ChevronDown size={14} className={`transition-transform duration-200 text-slate-400 ${advancedOpen ? 'rotate-180' : ''}`} />
        </div>

        {advancedOpen && (
          <div className="px-6 py-4 flex flex-col gap-6">
            <div className="border-l-2 border-slate-900 dark:border-slate-100 pl-3">
              <div className="flex justify-between items-center mb-3">
                <label className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-widest font-semibold cursor-pointer" onClick={() => setIsClipping(!isClipping)}>Clipping</label>
                <label className="switch mb-0">
                  <input type="checkbox" checked={isClipping} onChange={(e) => setIsClipping(e.target.checked)} />
                  <span className="slider"></span>
                </label>
              </div>
              
              {isClipping && (
                <div className="flex flex-col gap-3 mt-1">
                  <ClipControl axis="x" label="L" title="Left / Right (X Axis)" config={clipPlanes.x} onChange={updateClipPlane} />
                  <ClipControl axis="y" label="P" title="Anterior / Posterior (Y Axis)" config={clipPlanes.y} onChange={updateClipPlane} />
                  <ClipControl axis="z" label="S" title="Superior / Inferior (Z Axis)" config={clipPlanes.z} onChange={updateClipPlane} />
                </div>
              )}
            </div>

            <div className="border-l-2 border-slate-900 dark:border-slate-100 pl-3">
              <label className="block text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-widest font-semibold mb-3">Exploded View</label>
              <input 
                type="range" 
                min="0" max="1" step="0.01" 
                value={explodeValue} 
                onChange={(e) => setExplodeValue(parseFloat(e.target.value))}
                className="w-full cursor-pointer" 
              />
            </div>
            
            <div className="border-l-2 border-emerald-500 pl-3">
              <div className="flex justify-between items-center">
                <label className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-widest font-semibold cursor-pointer" onClick={() => setIsAutoRotating(!isAutoRotating)}>Auto-Rotate</label>
                <label className="switch mb-0">
                  <input type="checkbox" checked={isAutoRotating} onChange={(e) => setIsAutoRotating(e.target.checked)} />
                  <span className="slider"></span>
                </label>
              </div>
            </div>

            <div className="border-l-2 border-indigo-500 pl-3">
              <div className="flex justify-between items-center mb-2">
                <label className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-widest font-semibold">Background Picture</label>
                {backgroundImage && (
                  <button onClick={() => setBackgroundImage(null)} className="text-[9px] text-red-500 uppercase tracking-wider font-bold">Clear</button>
                )}
              </div>
              {!backgroundImage ? (
                <div 
                  className="w-full border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg p-4 text-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors"
                  onClick={() => {
                    document.getElementById('bg-paste-capture')?.focus();
                  }}
                >
                  <input type="text" id="bg-paste-capture" className="absolute opacity-0 w-0 h-0" onPaste={(e) => {
                    const items = e.clipboardData.items;
                    for (let i = 0; i < items.length; i++) {
                      if (items[i].type.indexOf('image') !== -1) {
                        const blob = items[i].getAsFile();
                        if (blob) {
                          const url = URL.createObjectURL(blob);
                          setBackgroundImage(url);
                        }
                      }
                    }
                  }} />
                  <span className="text-[10px] text-slate-400 font-medium select-none pointer-events-none">Click & Ctrl+V to paste</span>
                </div>
              ) : (
                <div className="flex flex-col gap-2 mt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Opacity</span>
                    <span className="text-[10px] font-mono text-slate-500">{Math.round(backgroundOpacity * 100)}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" max="1" step="0.01" 
                    value={backgroundOpacity} 
                    onChange={(e) => setBackgroundOpacity(parseFloat(e.target.value))}
                    className="w-full cursor-pointer" 
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}

function ClipControl({ 
  axis, 
  label, 
  title, 
  config, 
  onChange 
}: { 
  axis: 'x'|'y'|'z', 
  label: string, 
  title: string, 
  config: any, 
  onChange: any 
}) {
  return (
    <div className="flex items-center gap-2">
      <button 
        className={`w-[24px] h-[24px] flex items-center justify-center text-[10px] font-bold rounded-sm border transition-colors ${config.active ? 'bg-blue-600 text-white border-blue-600' : 'bg-transparent text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
        onClick={() => onChange(axis, { active: !config.active })}
        title={title}
      >
        {label}
      </button>
      <input 
        type="range" 
        min="0" max="100" step="1" 
        value={config.sliderVal} 
        onChange={(e) => onChange(axis, { sliderVal: parseFloat(e.target.value) })}
        className="flex-1 cursor-pointer w-16" 
      />
      <button 
        className={`px-1.5 h-[24px] flex items-center justify-center rounded border transition-colors ${config.alignToCamera ? 'bg-blue-600 text-white border-blue-600' : 'bg-transparent text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
        onClick={() => onChange(axis, { alignToCamera: !config.alignToCamera })}
        title="Align to Camera View"
      >
        <Camera size={13} />
      </button>
      <button 
        className="px-2 h-[24px] flex items-center justify-center text-[10px] font-semibold uppercase tracking-wider rounded border border-slate-300 dark:border-slate-600 bg-transparent text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        onClick={() => onChange(axis, { invert: !config.invert })}
        title="Flip Normal"
      >
        Flip
      </button>
    </div>
  );
}
