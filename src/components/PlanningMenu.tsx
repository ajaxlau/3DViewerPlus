import { useViewer } from '../context/ViewerContext';
import { X, SlidersHorizontal, Download, Trash2, Crosshair, BoxSelect, Ruler, Compass, Plus, Spline, Eye, EyeOff, Folder, FolderPlus, ChevronDown, ChevronRight, FolderOpen, Copy, Upload, Save, GripHorizontal, Waypoints, MapPin, Palette, Droplets } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

export function PlanningMenu() {
  const { 
    activeModal, setActiveModal, 
    planningMode, setPlanningMode, 
    planningObjects, planningPointsPicked,
    viewerManager, measurement, planningGroups = []
  } = useViewer();

  // Settings
  const [planeExtWidth] = useState(10);
  const [planeExtLength] = useState(10);
  const [cylinderDiameter] = useState(1);
  const [cylinderExtension] = useState(20);
  const [curveThickness] = useState(0.2);

  const [newGroupName, setNewGroupName] = useState('');
  const [confirmDeleteGroupId, setConfirmDeleteGroupId] = useState<string | null>(null);
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const stlInputRef = useRef<HTMLInputElement>(null);
  
  const handleCreateGroup = () => {
    if (!viewerManager) return;
    const name = newGroupName.trim() || `Group ${viewerManager.planningGroups.length + 1}`;
    viewerManager.addPlanningGroup(name);
    setNewGroupName('');
  };

  const collapsed = activeModal !== 'planning';

  const handleConfirm = () => {
      viewerManager?.confirmPlanningObject({
          planeExtWidth: planeExtWidth,
          planeExtLength: planeExtLength,
          cylinderRadius: cylinderDiameter / 2,
          cylinderExtension: cylinderExtension,
          curveThickness: curveThickness
      });
  };

  const handleUndo = () => {
      viewerManager?.undoPlanningPoint();
  };

  const canConfirm = (planningMode === 'plane' && planningPointsPicked === 3) || (planningMode === 'cylinder' && planningPointsPicked === 2) || (planningMode === 'measure' && planningPointsPicked === 2) || (planningMode === 'curve' && planningPointsPicked >= 2) || (planningMode === 'angle' && planningPointsPicked === 3);

  return (
    <aside 
      className={`transition-all duration-300 bg-white dark:bg-zinc-900 flex-col overflow-y-auto overflow-x-hidden shrink-0 z-10 ${
        collapsed ? 'w-full md:w-0 h-0 md:h-auto opacity-0 border-none pointer-events-none' : 'w-full md:w-[320px] h-auto max-h-[50vh] md:max-h-none md:h-auto border-t md:border-t-0 md:border-l border-zinc-200 dark:border-zinc-800 flex'
      }`}
    >
      <div className="flex flex-col w-full min-h-min">
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 shrink-0">
          <h3 className="font-bold text-sm text-zinc-800 dark:text-zinc-100 uppercase tracking-widest flex items-center gap-2">
             Planning Tools
          </h3>
          <button className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200" onClick={() => setActiveModal(null)}>
            <X size={16} />
          </button>
        </div>

        <div className="p-4 flex flex-col gap-4 overflow-y-auto">
        <div className="grid grid-cols-2 gap-2">
            <div className={`flex flex-col rounded border transition-colors ${planningMode === 'measure' ? 'col-span-2 border-emerald-500 bg-emerald-50/5 dark:bg-emerald-950/5' : 'col-span-1 border-zinc-200 dark:border-zinc-700'}`}>
                <button 
                    onClick={() => { setPlanningMode(planningMode === 'measure' ? 'none' : 'measure'); }}
                    className={`flex items-center p-3 text-xs font-semibold uppercase tracking-wider transition-colors w-full text-left ${
                        planningMode === 'measure' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-t' : 'bg-transparent text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded'
                    }`}
                >
                    <Waypoints size={18} className="mr-3 shrink-0" />
                    <div className="flex flex-col">
                        <span>Measure Distance</span>
                        <span className="text-[10px] font-normal opacity-70 normal-case tracking-normal mt-0.5">2 Points</span>
                    </div>
                </button>
                {planningMode === 'measure' && (
                    <div className="p-3 border-t border-emerald-200 dark:border-emerald-800/30 bg-emerald-50/50 dark:bg-emerald-900/10 text-xs text-emerald-800 dark:text-emerald-300 flex flex-col gap-3 rounded-b">
                        <div className="text-center mb-1 leading-normal">
                            Click on the 3D model to select two points.<br/>
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400">Measurements are automatically saved as objects below.</span><br/>
                            Points picked: <strong>{planningPointsPicked}</strong> / 2
                        </div>
                        
                        {measurement && (
                            <div className="flex flex-col gap-2 border-t border-emerald-200 dark:border-emerald-800/30 pt-3 mb-1">
                                <div className="flex items-center justify-between font-mono py-1">
                                    <span className="uppercase text-[10px] font-bold text-zinc-400">Distance</span>
                                    <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{measurement.distance.toFixed(2)} mm</span>
                                </div>
                                <div className="flex items-center justify-between font-mono py-1">
                                    <span className="uppercase text-[10px] font-bold text-zinc-400">Normal Angle</span>
                                    <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{measurement.angle.toFixed(1)}°</span>
                                </div>
                            </div>
                        )}

                        <div className="flex gap-2 mt-2">
                            <button onClick={handleUndo} disabled={planningPointsPicked === 0} className="flex-1 px-2 py-1.5 rounded bg-emerald-200 dark:bg-emerald-800/50 text-emerald-800 dark:text-emerald-300 font-semibold transition hover:bg-emerald-300 dark:hover:bg-emerald-700/50 disabled:opacity-50 disabled:cursor-not-allowed text-center">
                                Undo Picked
                            </button>
                            <button onClick={() => setPlanningMode('none')} className="flex-1 px-2 py-1.5 rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-semibold transition hover:bg-zinc-300 dark:hover:bg-zinc-600 text-center">
                                Done Measuring
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <div className={`flex flex-col rounded border transition-colors ${planningMode === 'angle' ? 'col-span-2 border-amber-500 bg-amber-50/5 dark:bg-amber-950/5' : 'col-span-1 border-zinc-200 dark:border-zinc-700'}`}>
                <button 
                    onClick={() => { setPlanningMode(planningMode === 'angle' ? 'none' : 'angle'); }}
                    className={`flex items-center p-3 text-xs font-semibold uppercase tracking-wider transition-colors w-full text-left ${
                        planningMode === 'angle' ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-t' : 'bg-transparent text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded'
                    }`}
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-3 shrink-0">
                        <path d="M3 21h18" />
                        <path d="M3 21l18-18" />
                        <path d="M13 21a10 10 0 0 0-2.93-7.07" />
                    </svg>
                    <div className="flex flex-col">
                        <span>Measure Angle</span>
                        <span className="text-[10px] font-normal opacity-70 normal-case tracking-normal mt-0.5">3 Points</span>
                    </div>
                </button>
                {planningMode === 'angle' && (
                    <div className="p-3 border-t border-amber-200 dark:border-amber-800/30 bg-amber-50/50 dark:bg-amber-900/10 text-xs text-amber-800 dark:text-amber-300 flex flex-col gap-3 rounded-b">
                        <div className="text-center mb-1 leading-normal">
                            Click on the 3D model to select three points:<br/>
                            1. Start point, <strong>2. Vertex / Center point</strong>, 3. End point.<br/>
                            <span className="font-semibold text-amber-600 dark:text-amber-400">Angle is automatically measured and saved below.</span><br/>
                            Points picked: <strong>{planningPointsPicked}</strong> / 3
                        </div>

                        <div className="flex gap-2 mt-2">
                            <button onClick={handleUndo} disabled={planningPointsPicked === 0} className="flex-1 px-2 py-1.5 rounded bg-amber-200 dark:bg-amber-800/50 text-amber-800 dark:text-amber-300 font-semibold transition hover:bg-amber-300 dark:hover:bg-amber-700/50 disabled:opacity-50 disabled:cursor-not-allowed text-center">
                                Undo Picked
                            </button>
                            <button onClick={() => setPlanningMode('none')} className="flex-1 px-2 py-1.5 rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-semibold transition hover:bg-zinc-300 dark:hover:bg-zinc-600 text-center">
                                Done Measuring
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <div className={`flex flex-col rounded border transition-colors ${planningMode === 'plane' ? 'col-span-2 border-blue-500' : 'col-span-1 border-zinc-200 dark:border-zinc-700'}`}>
                <div className={`flex items-center w-full transition-colors ${
                    planningMode === 'plane' ? 'bg-blue-50 dark:bg-blue-900/20 rounded-t' : 'bg-transparent text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded'
                }`}>
                    <button 
                        onClick={() => { setPlanningMode(planningMode === 'plane' ? 'none' : 'plane'); }}
                        className={`flex-1 flex items-center p-3 text-xs font-semibold uppercase tracking-wider text-left ${planningMode === 'plane' ? 'text-blue-600 dark:text-blue-400' : ''}`}
                    >
                        <BoxSelect size={18} className="mr-3 shrink-0" />
                        <div className="flex flex-col">
                            <span>Mark Plane</span>
                            <span className="text-[10px] font-normal opacity-70 normal-case tracking-normal mt-0.5">3 Points</span>
                        </div>
                    </button>
                    {planningMode === 'plane' && (
                        <button
                            onClick={(e) => { e.stopPropagation(); setPlanningMode('plane'); }}
                            className="p-3 text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                            title="Start New Plane"
                        >
                            <Plus size={18} />
                        </button>
                    )}
                </div>
                {planningMode === 'plane' && (
                    <div className="p-3 border-t border-blue-200 dark:border-blue-800/30 bg-blue-50/50 dark:bg-blue-900/10 text-xs text-blue-800 dark:text-blue-300 flex flex-col gap-3 rounded-b">
                        <div className="text-center font-semibold mb-1">
                            Click on the 3D model to select points.<br/>
                            Points picked: <strong>{planningPointsPicked}</strong> / 3
                        </div>
                        
                        {/* Object dimensions are now adjusted via sliders in the created item */}

                        <div className="flex gap-2 mt-2">
                            <button onClick={handleUndo} disabled={planningPointsPicked === 0} className="flex-1 px-2 py-1.5 rounded bg-blue-200 dark:bg-blue-800/50 text-blue-800 dark:text-blue-300 font-bold transition hover:bg-blue-300 dark:hover:bg-blue-700/50 disabled:opacity-50 disabled:cursor-not-allowed">
                                Undo
                            </button>
                            <button onClick={handleConfirm} disabled={!canConfirm} className="flex-[2] flex items-center justify-center gap-1 px-2 py-1.5 rounded bg-blue-600 dark:bg-blue-500 text-white font-bold transition hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed">
                                Mark Plane
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <div className={`flex flex-col rounded border transition-colors ${planningMode === 'cylinder' ? 'col-span-2 border-indigo-500' : 'col-span-1 border-zinc-200 dark:border-zinc-700'}`}>
                <div className={`flex items-center w-full transition-colors ${
                    planningMode === 'cylinder' ? 'bg-indigo-50 dark:bg-indigo-900/20 rounded-t' : 'bg-transparent text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded'
                }`}>
                    <button 
                        onClick={() => { setPlanningMode(planningMode === 'cylinder' ? 'none' : 'cylinder'); }}
                        className={`flex-1 flex items-center p-3 text-xs font-semibold uppercase tracking-wider text-left ${planningMode === 'cylinder' ? 'text-indigo-600 dark:text-indigo-400' : ''}`}
                    >
                        <Crosshair size={18} className="mr-3 shrink-0" />
                        <div className="flex flex-col">
                            <span>Mark Cylinder</span>
                            <span className="text-[10px] font-normal opacity-70 normal-case tracking-normal mt-0.5">2 Points</span>
                        </div>
                    </button>
                    {planningMode === 'cylinder' && (
                        <button
                            onClick={(e) => { e.stopPropagation(); setPlanningMode('cylinder'); }}
                            className="p-3 text-amber-500 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300 transition-colors"
                            title="Start New Cylinder"
                        >
                            <Plus size={18} />
                        </button>
                    )}
                </div>
                {planningMode === 'cylinder' && (
                    <div className="p-3 border-t border-amber-200 dark:border-amber-800/30 bg-amber-50/50 dark:bg-amber-900/10 text-xs text-amber-800 dark:text-amber-300 flex flex-col gap-3 rounded-b">
                        <div className="text-center font-semibold mb-1">
                            Click on the 3D model to select points.<br/>
                            Points picked: <strong>{planningPointsPicked}</strong> / 2
                        </div>
                        
                        {/* Object dimensions are now adjusted via sliders in the created item */}

                        <div className="flex gap-2 mt-2">
                            <button onClick={handleUndo} disabled={planningPointsPicked === 0} className="flex-1 px-2 py-1.5 rounded bg-amber-200 dark:bg-amber-800/50 text-amber-800 dark:text-amber-300 font-bold transition hover:bg-amber-300 dark:hover:bg-amber-700/50 disabled:opacity-50 disabled:cursor-not-allowed">
                                Undo
                            </button>
                            <button onClick={handleConfirm} disabled={!canConfirm} className="flex-[2] flex items-center justify-center gap-1 px-2 py-1.5 rounded bg-amber-600 dark:bg-amber-500 text-white font-bold transition hover:bg-amber-700 dark:hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed">
                                Mark Cylinder
                            </button>
                        </div>
                    </div>
                )}
            </div>
            <div className={`flex flex-col rounded border transition-colors ${planningMode === 'curve' ? 'col-span-2 border-pink-500 bg-pink-50/5 dark:bg-pink-950/5' : 'col-span-1 border-zinc-200 dark:border-zinc-700'}`}>
                <div className={`flex items-center w-full transition-colors ${
                    planningMode === 'curve' ? 'bg-pink-50 dark:bg-pink-900/20 rounded-t' : 'bg-transparent text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded'
                }`}>
                    <button 
                        onClick={() => { setPlanningMode(planningMode === 'curve' ? 'none' : 'curve'); }}
                        className={`flex-1 flex items-center p-3 text-xs font-semibold uppercase tracking-wider text-left ${planningMode === 'curve' ? 'text-pink-600 dark:text-pink-400' : ''}`}
                    >
                        <Spline size={18} className="mr-3 shrink-0" />
                        <div className="flex flex-col">
                            <span>Mark Curve</span>
                            <span className="text-[10px] font-normal opacity-70 normal-case tracking-normal mt-0.5">2+ Points</span>
                        </div>
                    </button>
                    {planningMode === 'curve' && (
                        <button
                            onClick={(e) => { e.stopPropagation(); setPlanningMode('curve'); }}
                            className="p-3 text-pink-500 hover:text-pink-700 dark:text-pink-400 dark:hover:text-pink-300 transition-colors"
                            title="Start New Curve"
                        >
                            <Plus size={18} />
                        </button>
                    )}
                </div>
                {planningMode === 'curve' && (
                    <div className="p-3 border-t border-pink-200 dark:border-pink-800/30 bg-pink-50/50 dark:bg-pink-900/10 text-xs text-pink-800 dark:text-pink-300 flex flex-col gap-3 rounded-b">
                        <div className="text-center font-semibold mb-1">
                            Click on the 3D model to select curve points.<br/>
                            Points picked: <strong>{planningPointsPicked}</strong>
                        </div>
                        
                        {/* Object dimensions are now adjusted via sliders in the created item */}

                        <div className="flex gap-2 mt-2">
                            <button onClick={handleUndo} disabled={planningPointsPicked === 0} className="flex-1 px-2 py-1.5 rounded bg-pink-200 dark:bg-pink-800/50 text-pink-800 dark:text-pink-300 font-bold transition hover:bg-pink-300 dark:hover:bg-pink-700/50 disabled:opacity-50 disabled:cursor-not-allowed">
                                Undo
                            </button>
                            <button onClick={handleConfirm} disabled={!canConfirm} className="flex-[2] flex items-center justify-center gap-1 px-2 py-1.5 rounded bg-pink-600 dark:bg-pink-500 text-white font-bold transition hover:bg-pink-700 dark:hover:bg-pink-600 disabled:opacity-50 disabled:cursor-not-allowed">
                                Create Curve
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <div className={`flex flex-col rounded border transition-colors ${planningMode === 'point' ? 'col-span-2 border-purple-500 bg-purple-50/5 dark:bg-purple-950/5' : 'col-span-1 border-zinc-200 dark:border-zinc-700'}`}>
                <button 
                    onClick={() => { setPlanningMode(planningMode === 'point' ? 'none' : 'point'); }}
                    className={`flex items-center p-3 text-xs font-semibold uppercase tracking-wider transition-colors w-full text-left ${
                        planningMode === 'point' ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-t' : 'bg-transparent text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded'
                    }`}
                >
                    <MapPin size={18} className="mr-3 shrink-0" />
                    <div className="flex flex-col">
                        <span>Mark Point</span>
                        <span className="text-[10px] font-normal opacity-70 normal-case tracking-normal mt-0.5">1 Point</span>
                    </div>
                </button>
                {planningMode === 'point' && (
                    <div className="p-3 border-t border-purple-200 dark:border-purple-800/30 bg-purple-50/50 dark:bg-purple-900/10 text-xs text-purple-800 dark:text-purple-300 flex flex-col gap-3 rounded-b">
                        <div className="text-center mb-1 leading-normal">
                            Click anywhere on the model to place points.<br/>
                            <span className="font-semibold text-purple-600 dark:text-purple-400">Points are automatically saved below.</span>
                        </div>
                        <div className="flex mt-2">
                            <button onClick={() => setPlanningMode('none')} className="w-full px-2 py-1.5 rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-semibold transition hover:bg-zinc-300 dark:hover:bg-zinc-600 text-center">
                                Done Marking
                            </button>
                        </div>
                    </div>
                )}
            </div>

        </div>

        <div className="border-t border-zinc-200 dark:border-zinc-800 pt-4 mt-2">
            <div className="flex flex-col gap-2 mb-3">
                <div className="flex items-center justify-between">
                    <h4 className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">Project IO</h4>
                </div>
                <div className="flex items-center justify-between bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded p-1.5 px-3">
                    <div className="flex items-center gap-4">
                        {/* Open Button */}
                        <button 
                            onClick={() => fileInputRef.current?.click()} 
                            className="text-[10px] flex items-center gap-1.5 font-bold text-zinc-500 hover:text-blue-500 dark:text-zinc-400 dark:hover:text-blue-400 uppercase tracking-wider transition"
                            title="Open Project"
                        >
                            <FolderOpen size={13} />
                            <span>Open</span>
                        </button>
                        <input 
                            type="file" 
                            accept=".zip,.json,.mrk.json"
                            ref={fileInputRef}
                            className="hidden"
                            onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (file && viewerManager) {
                                    try {
                                        await viewerManager.importPlanningObjectsZip(file);
                                    } catch (err) {
                                        console.error("Error importing planning objects:", err);
                                    }
                                }
                                if (fileInputRef.current) fileInputRef.current.value = '';
                            }}
                        />

                        {/* Import STL Button */}
                        <button 
                            onClick={() => stlInputRef.current?.click()} 
                            className="text-[10px] flex items-center gap-1.5 font-bold text-zinc-500 hover:text-purple-500 dark:text-zinc-400 dark:hover:text-purple-400 uppercase tracking-wider transition"
                            title="Import Custom STL"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                            <span>STL</span>
                        </button>
                        <input 
                            type="file" 
                            accept=".stl"
                            ref={stlInputRef}
                            className="hidden"
                            onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (file && viewerManager) {
                                    try {
                                        await viewerManager.importCustomPlanningModel(file);
                                    } catch (err) {
                                        console.error("Error importing custom model STL:", err);
                                    }
                                }
                                if (stlInputRef.current) stlInputRef.current.value = '';
                            }}
                        />
                    </div>

                    {planningObjects.length > 0 && (
                        <div className="flex items-center gap-4">
                            {/* Reset Button */}
                            {confirmClearAll ? (
                                <div className="flex items-center gap-1 shrink-0 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 px-1 py-0.5 rounded text-[9px]">
                                    <span className="text-red-500 dark:text-red-400 font-bold mr-0.5 scale-90 uppercase tracking-wider">Reset All?</span>
                                    <button 
                                        onClick={() => {
                                            viewerManager?.clearAllPlanningObjects();
                                            setConfirmClearAll(false);
                                        }}
                                        className="p-0.5 text-white bg-red-500 hover:bg-red-600 rounded transition"
                                    >
                                        <X size={10} className="rotate-45" />
                                    </button>
                                    <button 
                                        onClick={() => setConfirmClearAll(false)}
                                        className="p-0.5 text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 bg-zinc-200 dark:bg-zinc-800 rounded transition"
                                    >
                                        <X size={10} />
                                    </button>
                                </div>
                            ) : (
                                <button 
                                    onClick={() => setConfirmClearAll(true)} 
                                    className="text-[10px] flex items-center gap-1.5 font-bold text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 uppercase tracking-wider transition"
                                    title="Clear all created objects"
                                >
                                    <Trash2 size={13} />
                                    Reset
                                </button>
                            )}

                            {/* Save Button */}
                            <button 
                                onClick={() => viewerManager?.exportAllPlanningObjectsZip()} 
                                className="text-[10px] flex items-center gap-1.5 font-bold text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 uppercase tracking-wider transition" 
                                title="Save Planning"
                            >
                                <Save size={13} />
                                Save
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Inline Group Creation Form */}
            <div className="flex gap-2 mb-4 bg-zinc-50 dark:bg-zinc-900/60 p-2 rounded border border-zinc-100 dark:border-zinc-800">
                <input 
                    type="text" 
                    placeholder="Create Object Group..." 
                    className="flex-1 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-[11px] rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 text-zinc-800 dark:text-zinc-100"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') handleCreateGroup();
                    }}
                />
                <button 
                    onClick={handleCreateGroup} 
                    className="px-2 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] flex items-center gap-1 transition shadow-sm shrink-0"
                    title="Create Group"
                >
                    <FolderPlus size={12} />
                    <span>Group</span>
                </button>
            </div>
            
            <div className="flex items-center justify-between mb-3 mt-4">
                <h4 className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">Object List</h4>
            </div>

            {planningObjects.length === 0 && (
                <div className="text-center text-xs text-zinc-500 py-4 opacity-70">
                    No objects created yet.
                </div>
            )}

            {planningObjects.length > 0 && (
                <div className="flex flex-col gap-3">
                    {/* Render custom groups */}
                    {planningGroups.map(group => {
                        const groupObjects = planningObjects.filter(obj => obj.groupId === group.id);
                        return (
                            <div 
                                key={group.id} 
                                className="border border-zinc-200 dark:border-zinc-800 rounded mb-2 overflow-hidden bg-white dark:bg-zinc-900 shadow-sm"
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    const draggedId = e.dataTransfer.getData('text/plain');
                                    if (draggedId && viewerManager) {
                                        viewerManager.setPlanningObjectGroupId(draggedId, group.id);
                                    }
                                }}
                            >
                                <div className="flex items-center gap-1 bg-zinc-100/50 dark:bg-zinc-800/60 px-2 py-1.5 border-b border-zinc-200 dark:border-zinc-800 justify-between">
                                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                        <button 
                                            onClick={() => viewerManager?.setPlanningGroupCollapsed(group.id, !group.isCollapsed)} 
                                            className="p-1 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition shrink-0"
                                        >
                                            {group.isCollapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
                                        </button>
                                        <Folder size={13} className="text-blue-500 dark:text-blue-400 shrink-0" />
                                        
                                        <input 
                                            type="text" 
                                            className="text-[11px] font-bold bg-transparent border-none text-zinc-800 dark:text-zinc-100 focus:bg-white dark:focus:bg-zinc-950 focus:ring-1 focus:ring-blue-500 rounded px-1.5 py-0.5 w-full flex-1 min-w-0"
                                            value={group.name}
                                            onChange={(e) => viewerManager?.renamePlanningGroup(group.id, e.target.value)}
                                            placeholder="Edit group name..."
                                        />
                                        
                                        <span className="text-[9px] font-mono text-zinc-400 shrink-0">({groupObjects.length})</span>
                                    </div>
                                    
                                    <div className="flex items-center gap-0.5 shrink-0">
                                        <button 
                                            onClick={() => viewerManager?.setPlanningGroupVisibility(group.id, group.visible === false)} 
                                            className="p-1 text-zinc-400 hover:text-blue-500 dark:text-zinc-500 dark:hover:text-blue-400 transition"
                                            title={group.visible === false ? "Show Group" : "Hide Group"}
                                        >
                                            {group.visible === false ? <EyeOff size={13} /> : <Eye size={13} />}
                                        </button>
                                        <button 
                                            onClick={() => viewerManager?.duplicatePlanningGroup(group.id)} 
                                            className="p-1 text-zinc-400 hover:text-indigo-500 dark:text-zinc-500 dark:hover:text-indigo-400 transition"
                                            title="Duplicate Group"
                                        >
                                            <Copy size={13} />
                                        </button>
                                        {confirmDeleteGroupId === group.id ? (
                                            <div className="flex items-center gap-1 shrink-0 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 px-1 py-0.5 rounded text-[9px]">
                                                <span className="text-red-600 dark:text-red-400 font-bold mr-0.5 scale-90">Delete?</span>
                                                <button 
                                                    onClick={() => {
                                                        viewerManager?.removePlanningGroup(group.id, true);
                                                        setConfirmDeleteGroupId(null);
                                                    }} 
                                                    className="bg-red-600 text-white font-bold px-1 rounded hover:bg-red-700 transition"
                                                >
                                                    Yes
                                                </button>
                                                <button 
                                                    onClick={() => setConfirmDeleteGroupId(null)} 
                                                    className="bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-1 rounded hover:bg-zinc-300 dark:hover:bg-zinc-700 transition"
                                                >
                                                    No
                                                </button>
                                            </div>
                                        ) : (
                                            <button 
                                                onClick={() => setConfirmDeleteGroupId(group.id)} 
                                                className="p-1 text-zinc-400 hover:text-red-500 transition"
                                                title="Delete Group"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                                
                                {!group.isCollapsed && (
                                    <div className="p-2 flex flex-col gap-2 bg-zinc-50/20 dark:bg-zinc-950/20">
                                        {groupObjects.length === 0 ? (
                                            <div className="text-center text-[10px] text-zinc-400 p-2 italic bg-white/40 dark:bg-black/10 rounded border border-dashed border-zinc-100 dark:border-zinc-800">
                                                No objects in group. Drag or assign inside options drawer.
                                            </div>
                                        ) : (
                                            groupObjects.map((obj) => (
                                                <PlanningObjectItem key={obj.id} obj={obj} viewerManager={viewerManager} />
                                            ))
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {/* General / Unassigned Objects */}
                    {(() => {
                        const unassignedObjects = planningObjects.filter(obj => !obj.groupId || !planningGroups.some(g => g.id === obj.groupId));
                        if (unassignedObjects.length === 0) return null;
                        
                        // Only wrap under general collapsible header if there is at least one custom group
                        if (planningGroups.length === 0) {
                            return unassignedObjects.map((obj) => (
                                <PlanningObjectItem key={obj.id} obj={obj} viewerManager={viewerManager} />
                            ));
                        }
                        
                        return (
                            <div 
                                className="border border-dashed border-zinc-300 dark:border-zinc-800 rounded mb-2 overflow-hidden bg-white/50 dark:bg-zinc-900/40"
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    const draggedId = e.dataTransfer.getData('text/plain');
                                    if (draggedId && viewerManager) {
                                        viewerManager.setPlanningObjectGroupId(draggedId, undefined);
                                    }
                                }}
                            >
                                <div className="flex items-center gap-2 px-3 py-2 bg-zinc-50/50 dark:bg-zinc-950/10 border-b border-dashed border-zinc-200 dark:border-zinc-800 shadow-xs">
                                    <FolderOpen size={13} className="text-zinc-400 shrink-0" />
                                    <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider flex-1">
                                        General / Unassigned
                                    </div>
                                    <span className="text-[9px] font-mono text-zinc-400 shrink-0">({unassignedObjects.length})</span>
                                </div>
                                <div className="p-2 flex flex-col gap-2">
                                    {unassignedObjects.map((obj) => (
                                        <PlanningObjectItem key={obj.id} obj={obj} viewerManager={viewerManager} />
                                    ))}
                                </div>
                            </div>
                        );
                    })()}
                </div>
            )}
        </div>
      </div>
      </div>
    </aside>
  );
}

function PlanningObjectItem({ obj, viewerManager }: { obj: any, viewerManager: any, key?: any }) {
  const { planningGroups = [] } = useViewer();
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const [isOpacitySliderOpen, setIsOpacitySliderOpen] = useState(false);
  const [draggable, setDraggable] = useState(false);
  const [isDraggingThis, setIsDraggingThis] = useState(false);
  const itemRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isColorPickerOpen && !isOpacitySliderOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsColorPickerOpen(false);
        setIsOpacitySliderOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isColorPickerOpen, isOpacitySliderOpen]);

  const [localPos, setLocalPos] = useState({ x: obj.posX, y: obj.posY, z: obj.posZ });

  // Sync with prop when obj ref changes unexpectedly
  useEffect(() => {
     setLocalPos({ x: obj.posX, y: obj.posY, z: obj.posZ });
  }, [obj.posX, obj.posY, obj.posZ]);

  // Hook into viewerManager to listen for transform changes directly
  useEffect(() => {
    if (!viewerManager || !viewerManager.transformControl) return;
    
    const handleTransformChange = () => {
       if (viewerManager.transformControl.object === obj.mesh) {
           const mesh = obj.mesh;
           
           let outPos = { x: mesh.position.x, y: mesh.position.y, z: mesh.position.z };
           const THREE = (window as any).THREE;
           if (THREE) {
               const modelRoot = viewerManager.getModelRoot();
               let m = mesh.matrixWorld.clone();
               if (modelRoot) {
                   modelRoot.updateMatrixWorld(true);
                   const invMain = modelRoot.matrixWorld.clone().invert();
                   m.premultiply(invMain);
               }
               const pos = new THREE.Vector3();
               const quat = new THREE.Quaternion();
               const scale = new THREE.Vector3();
               m.decompose(pos, quat, scale);
               outPos = { x: pos.x, y: pos.y, z: pos.z };
           }
           
           setLocalPos({
              x: outPos.x,
              y: outPos.y,
              z: outPos.z
           });
       }
    };

    viewerManager.transformControl.addEventListener('change', handleTransformChange);
    return () => {
       viewerManager.transformControl.removeEventListener('change', handleTransformChange);
    };
  }, [viewerManager, obj.mesh]);

  return (
      <div
        ref={itemRef}
        onClick={(e) => {
            const target = e.target as HTMLElement;
            if (target.closest('button, input')) return;
            if (viewerManager && typeof viewerManager.highlightPlanningMesh === 'function') {
                viewerManager.highlightPlanningMesh(viewerManager.highlightedPlanningObj?.id === obj.id ? null : obj);
            }
        }}
        draggable={draggable}
        onDragStart={(e) => {
            e.dataTransfer.setData('text/plain', obj.id);
            e.dataTransfer.effectAllowed = 'move';
            setIsDraggingThis(true);
        }}
        onDragEnd={() => {
            setDraggable(false);
            setIsDraggingThis(false);
        }}
        className={`border rounded overflow-hidden group/item transition-all duration-200 ${
            isDraggingThis
                 ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/25 ring-2 ring-blue-500/30'
                 : viewerManager?.highlightedPlanningObj?.id === obj.id
                     ? 'border-blue-400 bg-blue-50/20 dark:bg-blue-900/10 ring-1 ring-blue-400/50'
                     : 'border-zinc-200 dark:border-zinc-800'
        }`}
      >
          <div className="bg-zinc-50 dark:bg-zinc-800 flex flex-col p-2 gap-1.5 relative">
              <div 
                  className="absolute top-1 right-1 text-zinc-300 dark:text-zinc-600 opacity-50 group-hover/item:opacity-100 transition-opacity cursor-grab active:cursor-grabbing p-1 hover:text-blue-500 dark:hover:text-blue-400"
                  title="Drag to rearrange"
                  onPointerDown={() => setDraggable(true)}
                  onPointerUp={() => setDraggable(false)}
              >
                  <GripHorizontal size={14} />
              </div>
              <div className="flex flex-col gap-0 w-full min-w-0 pr-4">
                  <input
                      type="text"
                      className="text-[12px] font-bold bg-transparent border-none focus:bg-white dark:focus:bg-zinc-950 focus:ring-1 focus:ring-blue-500 rounded px-1.5 py-0.5 w-full flex-1 min-w-0 placeholder-zinc-400"
                      style={{ color: obj.color, textShadow: '0 0 1px rgba(0,0,0,0.1)' }}
                      placeholder="Edit object name..."
                      value={obj.name ?? obj.id}
                      onChange={(e) => viewerManager.updatePlanningObjectName(obj.id, e.target.value)}
                  />
                  <div className="px-1.5 leading-tight mt-0.5 text-zinc-800 dark:text-zinc-300 flex items-center gap-1 overflow-x-auto scrollbar-none">
                  {obj.type === 'cylinder' && obj.radius !== undefined && (
                      <span className="text-[11px] font-mono leading-tight whitespace-nowrap tracking-tight">
                          Dia: {(obj.radius * 2).toFixed(1)} mm | Len: {obj.length.toFixed(1)} mm
                          {localPos.x !== undefined && <span className="ml-2 text-[9px] text-zinc-400 dark:text-zinc-500">Pos: {localPos.x.toFixed(1)}, {localPos.y?.toFixed(1)}, {localPos.z?.toFixed(1)}</span>}
                      </span>
                  )}
                  {obj.type === 'plane' && obj.width !== undefined && (
                      <span className="text-[11px] font-mono leading-tight whitespace-nowrap tracking-tight">
                          Size: {obj.width.toFixed(1)} × {obj.height.toFixed(1)} mm | Thk: {obj.thickness.toFixed(1)} mm
                          {localPos.x !== undefined && <span className="ml-2 text-[9px] text-zinc-400 dark:text-zinc-500">Pos: {localPos.x.toFixed(1)}, {localPos.y?.toFixed(1)}, {localPos.z?.toFixed(1)}</span>}
                      </span>
                  )}
                  {obj.type === 'curve' && obj.thickness !== undefined && (
                      <span className="text-[11px] font-mono leading-tight whitespace-nowrap tracking-tight">
                          Len: {(obj.baseDistance || 0).toFixed(1)} mm | Dia: {(obj.thickness ?? 0.2).toFixed(1)} mm
                      </span>
                  )}
                  {obj.type === 'measurement' && obj.baseDistance !== undefined && (
                      <span className="text-[11px] font-mono leading-tight whitespace-nowrap tracking-tight">
                          Dist: {obj.baseDistance.toFixed(2)} mm | Ang: {(obj.angle || 0).toFixed(1)}°
                      </span>
                  )}
                  {obj.type === 'angle' && obj.angle !== undefined && (
                      <span className="text-[11px] font-mono leading-tight whitespace-nowrap tracking-tight text-amber-500 font-bold">
                          Angle: {obj.angle.toFixed(1)}°
                      </span>
                  )}
                  {obj.type === 'point' && obj.diameter !== undefined && (
                      <span className="text-[11px] font-mono leading-tight whitespace-nowrap tracking-tight text-purple-600 dark:text-purple-400 font-bold">
                          D: {(obj.diameter ?? 0.2).toFixed(1)} mm
                          {localPos.x !== undefined && <span className="ml-2 text-[9px] text-zinc-400 dark:text-zinc-500 font-normal">Pos: {localPos.x.toFixed(1)}, {localPos.y?.toFixed(1)}, {localPos.z?.toFixed(1)}</span>}
                      </span>
                  )}
                  </div>
              </div>
              <div className="flex items-center gap-0.5 shrink-0 self-end w-full px-1 justify-end">
                  {obj.type === 'custom_model' && (
                      <span className="text-[11px] font-mono leading-tight whitespace-nowrap tracking-tight">
                          {localPos.x !== undefined && <span className="ml-2 text-[9px] text-zinc-400 dark:text-zinc-500 font-normal">Pos: {localPos.x.toFixed(1)}, {localPos.y?.toFixed(1)}, {localPos.z?.toFixed(1)}</span>}
                      </span>
                  )}
                  {obj.type === 'custom_model' && (
                      <div ref={popoverRef} className="flex items-center gap-0.5">
                          <div className="relative flex">
                              <button onClick={() => { setIsColorPickerOpen(!isColorPickerOpen); setIsOpacitySliderOpen(false); }} className="p-1.5 text-zinc-500 hover:text-blue-500 dark:text-zinc-400 dark:hover:text-blue-400 rounded hover:bg-white dark:hover:bg-zinc-800 transition" title="Change Color">
                                  <Palette size={14} />
                              </button>
                              {isColorPickerOpen && (
                                  <div className="absolute right-0 bottom-full mb-1 z-50 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-xl rounded-md p-2.5 flex flex-col gap-2.5 w-40 animate-in fade-in zoom-in-95 duration-200">
                                      <div className="flex justify-between items-center">
                                          <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Color</div>
                                          <button onClick={() => setIsColorPickerOpen(false)} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200">
                                              <X size={12} />
                                          </button>
                                      </div>
                                      <div className="flex gap-1.5 flex-wrap items-center">
                                          {['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#64748b', '#ffffff', '#000000'].map(c => (
                                              <button key={c} onClick={() => {
                                                  if (viewerManager && typeof viewerManager.updatePlanningObjectColorAndOpacity === 'function') {
                                                      viewerManager.updatePlanningObjectColorAndOpacity(obj.id, c, obj.opacity !== undefined ? obj.opacity : 1.0);
                                                  }
                                              }} className={`w-5 h-5 rounded-full border border-zinc-300 dark:border-zinc-600 ${obj.color === c ? 'ring-2 ring-blue-500 ring-offset-1 dark:ring-offset-zinc-800' : ''}`} style={{ backgroundColor: c }} />
                                          ))}
                                          <input type="color" value={obj.color || '#3b82f6'} onChange={(e) => {
                                              if (viewerManager && typeof viewerManager.updatePlanningObjectColorAndOpacity === 'function') {
                                                  viewerManager.updatePlanningObjectColorAndOpacity(obj.id, e.target.value, obj.opacity !== undefined ? obj.opacity : 1.0);
                                              }
                                          }} className="w-5 h-5 p-0 border-0 rounded overflow-hidden cursor-pointer bg-transparent" />
                                      </div>
                                  </div>
                              )}
                          </div>
                          <div className="relative flex">
                              <button onClick={() => { setIsOpacitySliderOpen(!isOpacitySliderOpen); setIsColorPickerOpen(false); }} className="p-1.5 text-zinc-500 hover:text-blue-500 dark:text-zinc-400 dark:hover:text-blue-400 rounded hover:bg-white dark:hover:bg-zinc-800 transition" title="Change Opacity">
                                  <Droplets size={14} />
                              </button>
                              {isOpacitySliderOpen && (
                                  <div className="absolute right-0 bottom-full mb-1 z-50 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-xl rounded-md p-2.5 flex flex-col gap-2 w-32 animate-in fade-in zoom-in-95 duration-200">
                                      <div className="flex justify-between items-center mb-1">
                                          <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Opacity</div>
                                          <button onClick={() => setIsOpacitySliderOpen(false)} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200">
                                              <X size={12} />
                                          </button>
                                      </div>
                                      <div className="flex flex-col gap-1">
                                          <div className="flex justify-between items-center">
                                              <span className="text-[10px] text-zinc-400 font-mono">
                                                  {Math.round((obj.opacity !== undefined ? obj.opacity : 1.0) * 100)}%
                                              </span>
                                          </div>
                                          <input type="range" min="0.1" max="1.0" step="0.05" value={obj.opacity !== undefined ? obj.opacity : 1.0} onChange={(e) => {
                                              if (viewerManager && typeof viewerManager.updatePlanningObjectColorAndOpacity === 'function') {
                                                  viewerManager.updatePlanningObjectColorAndOpacity(obj.id, obj.color || '#3b82f6', parseFloat(e.target.value));
                                              }
                                          }} className="w-full h-1 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer" />
                                      </div>
                                  </div>
                              )}
                          </div>
                      </div>
                  )}
                  {(obj.type !== 'measurement' && obj.type !== 'angle') && (
                      <button onClick={() => viewerManager.duplicatePlanningObject(obj.id)} className="p-1.5 text-zinc-500 hover:text-blue-500 dark:text-zinc-400 dark:hover:text-blue-400 rounded hover:bg-white dark:hover:bg-zinc-800 transition" title="Duplicate Object">
                          <Copy size={14} />
                      </button>
                  )}
                  <button onClick={() => viewerManager.togglePlanningObjectVisibility(obj.id)} className="p-1.5 text-zinc-500 hover:text-blue-500 dark:text-zinc-400 dark:hover:text-blue-400 rounded hover:bg-white dark:hover:bg-zinc-800 transition" title={obj.visible === false ? "Show Object" : "Hide Object"}>
                      {obj.visible === false ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                  {(obj.type !== 'measurement' && obj.type !== 'angle') && (
                      <button onClick={() => viewerManager.exportPlanningObjectSTL(obj.id)} className="p-1.5 text-zinc-500 hover:text-blue-500 dark:text-zinc-400 dark:hover:text-blue-400 rounded hover:bg-white dark:hover:bg-zinc-800 transition" title="Download STL">
                          <Download size={14} />
                      </button>
                  )}
                  <button onClick={() => viewerManager.removePlanningObject(obj.id)} className="p-1.5 text-zinc-500 hover:text-red-500 dark:text-zinc-400 dark:hover:text-red-400 rounded hover:bg-white dark:hover:bg-zinc-800 transition" title="Delete">
                      <Trash2 size={14} />
                  </button>
              </div>
          </div>
      </div>
  );
}

