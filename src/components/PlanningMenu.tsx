import { useViewer } from '../context/ViewerContext';
import { X, SlidersHorizontal, Download, Trash2, Crosshair, BoxSelect, Ruler, Plus, Spline, Eye, EyeOff, Folder, FolderPlus, ChevronDown, ChevronRight, FolderOpen, Copy, Upload, Save, GripHorizontal } from 'lucide-react';
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

  const canConfirm = (planningMode === 'plane' && planningPointsPicked === 3) || (planningMode === 'cylinder' && planningPointsPicked === 2) || (planningMode === 'measure' && planningPointsPicked === 2) || (planningMode === 'curve' && planningPointsPicked >= 2);

  return (
    <aside 
      className={`transition-all duration-300 bg-white dark:bg-slate-900 flex-col overflow-y-auto overflow-x-hidden shrink-0 z-10 ${
        collapsed ? 'w-full md:w-0 h-0 md:h-auto opacity-0 border-none pointer-events-none' : 'w-full md:w-[320px] h-auto max-h-[50vh] md:max-h-none md:h-auto border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-800 flex'
      }`}
    >
      <div className="flex flex-col w-full min-h-min">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 shrink-0">
          <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 uppercase tracking-widest flex items-center gap-2">
             Planning Tools
          </h3>
          <button className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200" onClick={() => setActiveModal(null)}>
            <X size={16} />
          </button>
        </div>

        <div className="p-4 flex flex-col gap-4 overflow-y-auto">
        <div className="flex flex-col gap-2">
            <div className={`flex flex-col rounded border transition-colors ${planningMode === 'measure' ? 'border-emerald-500 bg-emerald-50/5 dark:bg-emerald-950/5' : 'border-slate-200 dark:border-slate-700'}`}>
                <button 
                    onClick={() => { setPlanningMode(planningMode === 'measure' ? 'none' : 'measure'); }}
                    className={`flex items-center p-3 text-xs font-semibold uppercase tracking-wider transition-colors w-full text-left ${
                        planningMode === 'measure' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-t' : 'bg-transparent text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded'
                    }`}
                >
                    <Ruler size={18} className="mr-3 shrink-0" />
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
                                    <span className="uppercase text-[10px] font-bold text-slate-400">Distance</span>
                                    <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{measurement.distance.toFixed(2)} mm</span>
                                </div>
                                <div className="flex items-center justify-between font-mono py-1">
                                    <span className="uppercase text-[10px] font-bold text-slate-400">Normal Angle</span>
                                    <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{measurement.angle.toFixed(1)}°</span>
                                </div>
                            </div>
                        )}

                        <div className="flex gap-2 mt-2">
                            <button onClick={handleUndo} disabled={planningPointsPicked === 0} className="flex-1 px-2 py-1.5 rounded bg-emerald-200 dark:bg-emerald-800/50 text-emerald-800 dark:text-emerald-300 font-semibold transition hover:bg-emerald-300 dark:hover:bg-emerald-700/50 disabled:opacity-50 disabled:cursor-not-allowed text-center">
                                Undo Picked
                            </button>
                            <button onClick={() => setPlanningMode('none')} className="flex-1 px-2 py-1.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold transition hover:bg-slate-300 dark:hover:bg-slate-600 text-center">
                                Done Measuring
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <div className={`flex flex-col rounded border transition-colors ${planningMode === 'plane' ? 'border-blue-500' : 'border-slate-200 dark:border-slate-700'}`}>
                <div className={`flex items-center w-full transition-colors ${
                    planningMode === 'plane' ? 'bg-blue-50 dark:bg-blue-900/20 rounded-t' : 'bg-transparent text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded'
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

            <div className={`flex flex-col rounded border transition-colors ${planningMode === 'cylinder' ? 'border-amber-500' : 'border-slate-200 dark:border-slate-700'}`}>
                <div className={`flex items-center w-full transition-colors ${
                    planningMode === 'cylinder' ? 'bg-amber-50 dark:bg-amber-900/20 rounded-t' : 'bg-transparent text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded'
                }`}>
                    <button 
                        onClick={() => { setPlanningMode(planningMode === 'cylinder' ? 'none' : 'cylinder'); }}
                        className={`flex-1 flex items-center p-3 text-xs font-semibold uppercase tracking-wider text-left ${planningMode === 'cylinder' ? 'text-amber-600 dark:text-amber-400' : ''}`}
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
            <div className={`flex flex-col rounded border transition-colors ${planningMode === 'curve' ? 'border-pink-500 bg-pink-50/5 dark:bg-pink-950/5' : 'border-slate-200 dark:border-slate-700'}`}>
                <div className={`flex items-center w-full transition-colors ${
                    planningMode === 'curve' ? 'bg-pink-50 dark:bg-pink-900/20 rounded-t' : 'bg-transparent text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded'
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

        </div>

        <div className="border-t border-slate-200 dark:border-slate-800 pt-4 mt-2">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Created Objects</h4>
                    <button 
                        onClick={() => fileInputRef.current?.click()} 
                        className="p-1 text-slate-400 hover:text-blue-500 transition"
                        title="Open Project"
                    >
                        <FolderOpen size={13} />
                    </button>
                    <input 
                        type="file" 
                        accept=".zip"
                        ref={fileInputRef}
                        className="hidden"
                        onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                                viewerManager?.importPlanningObjectsZip(file);
                            }
                            // Reset input
                            if (fileInputRef.current) fileInputRef.current.value = '';
                        }}
                    />
                </div>
                {planningObjects.length > 0 && (
                    <div className="flex items-center gap-3">
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
                                    className="p-0.5 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 bg-slate-200 dark:bg-slate-800 rounded transition"
                                >
                                    <X size={10} />
                                </button>
                            </div>
                        ) : (
                            <button 
                                onClick={() => setConfirmClearAll(true)} 
                                className="text-[10px] flex items-center gap-1 font-bold text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 uppercase tracking-wider transition"
                                title="Clear all created objects"
                            >
                                <Trash2 size={12} />
                                Reset
                            </button>
                        )}
                        <button onClick={() => viewerManager?.exportAllPlanningObjectsZip()} className="text-[10px] flex items-center gap-1 font-bold text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 uppercase tracking-wider transition" title="Save Planning">
                            <Save size={12} />
                            Save
                        </button>
                    </div>
                )}
            </div>

            {/* Inline Group Creation Form */}
            <div className="flex gap-2 mb-4 bg-slate-50 dark:bg-slate-900/60 p-2 rounded border border-slate-100 dark:border-slate-800">
                <input 
                    type="text" 
                    placeholder="Create Object Group..." 
                    className="flex-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-[11px] rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 dark:text-slate-100"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') handleCreateGroup();
                    }}
                />
                <button 
                    onClick={handleCreateGroup} 
                    className="px-2 py-1 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] flex items-center gap-1 transition shadow-sm shrink-0"
                    title="Create Group"
                >
                    <FolderPlus size={12} />
                    <span>Group</span>
                </button>
            </div>
            
            {planningObjects.length === 0 && (
                <div className="text-center text-xs text-slate-500 py-4 opacity-70">
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
                                className="border border-slate-250 dark:border-slate-800 rounded mb-2 overflow-hidden bg-white dark:bg-slate-900 shadow-sm"
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    const draggedId = e.dataTransfer.getData('text/plain');
                                    if (draggedId && viewerManager) {
                                        viewerManager.setPlanningObjectGroupId(draggedId, group.id);
                                    }
                                }}
                            >
                                <div className="flex items-center gap-1 bg-slate-100/50 dark:bg-slate-800/60 px-2 py-1.5 border-b border-slate-200 dark:border-slate-800 justify-between">
                                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                        <button 
                                            onClick={() => viewerManager?.setPlanningGroupCollapsed(group.id, !group.isCollapsed)} 
                                            className="p-1 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition shrink-0"
                                        >
                                            {group.isCollapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
                                        </button>
                                        <Folder size={13} className="text-blue-500 dark:text-blue-400 shrink-0" />
                                        
                                        <input 
                                            type="text" 
                                            className="text-[11px] font-bold bg-transparent border-none text-slate-850 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-950 focus:ring-1 focus:ring-blue-500 rounded px-1.5 py-0.5 w-full flex-1 min-w-0"
                                            value={group.name}
                                            onChange={(e) => viewerManager?.renamePlanningGroup(group.id, e.target.value)}
                                            placeholder="Edit group name..."
                                        />
                                        
                                        <span className="text-[9px] font-mono text-slate-400 shrink-0">({groupObjects.length})</span>
                                    </div>
                                    
                                    <div className="flex items-center gap-0.5 shrink-0">
                                        <button 
                                            onClick={() => viewerManager?.exportPlanningGroupZip(group.id)} 
                                            className="p-1 text-slate-400 hover:text-emerald-500 dark:text-slate-500 dark:hover:text-emerald-400 transition"
                                            title="Save Planning"
                                        >
                                            <Save size={13} />
                                        </button>
                                        <button 
                                            onClick={() => viewerManager?.setPlanningGroupVisibility(group.id, group.visible === false)} 
                                            className="p-1 text-slate-400 hover:text-blue-500 dark:text-slate-500 dark:hover:text-blue-400 transition"
                                            title={group.visible === false ? "Show Group" : "Hide Group"}
                                        >
                                            {group.visible === false ? <EyeOff size={13} /> : <Eye size={13} />}
                                        </button>
                                        {confirmDeleteGroupId === group.id ? (
                                            <div className="flex items-center gap-1 shrink-0 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 px-1 py-0.5 rounded text-[9px]">
                                                <span className="text-red-650 dark:text-red-400 font-bold mr-0.5 scale-90">Delete?</span>
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
                                                    className="bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-1 rounded hover:bg-slate-300 dark:hover:bg-slate-705 transition"
                                                >
                                                    No
                                                </button>
                                            </div>
                                        ) : (
                                            <button 
                                                onClick={() => setConfirmDeleteGroupId(group.id)} 
                                                className="p-1 text-slate-400 hover:text-red-500 transition"
                                                title="Delete Group"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                                
                                {!group.isCollapsed && (
                                    <div className="p-2 flex flex-col gap-2 bg-slate-50/20 dark:bg-slate-950/20">
                                        {groupObjects.length === 0 ? (
                                            <div className="text-center text-[10px] text-slate-400 p-2 italic bg-white/40 dark:bg-black/10 rounded border border-dashed border-slate-100 dark:border-slate-800">
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
                                className="border border-dashed border-slate-300 dark:border-slate-800 rounded mb-2 overflow-hidden bg-white/50 dark:bg-slate-900/40"
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    const draggedId = e.dataTransfer.getData('text/plain');
                                    if (draggedId && viewerManager) {
                                        viewerManager.setPlanningObjectGroupId(draggedId, undefined);
                                    }
                                }}
                            >
                                <div className="flex items-center gap-2 px-3 py-2 bg-slate-50/50 dark:bg-slate-950/10 border-b border-dashed border-slate-200 dark:border-slate-800 shadow-xs">
                                    <FolderOpen size={13} className="text-slate-400 shrink-0" />
                                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex-1">
                                        General / Unassigned
                                    </div>
                                    <span className="text-[9px] font-mono text-slate-400 shrink-0">({unassignedObjects.length})</span>
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

function ScaleSliderRow({ label, value, min, max, step, onChange, isMm = false }: { label: string, value: number, min: number, max: number, step: number, onChange: (v: number) => void, isMm?: boolean }) {
    return (
        <div className="flex flex-col gap-1 my-1">
            <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <span>{label}</span>
                <span className="font-mono text-blue-600 dark:text-blue-400">
                    {isMm ? `${value.toFixed(1)} mm` : `${(value * 100).toFixed(0)}%`}
                </span>
            </div>
            <input 
                type="range" 
                min={min} max={max} step={step}
                value={value} 
                onChange={e => onChange(parseFloat(e.target.value))}
                className="w-full h-1 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500 dark:accent-blue-400 focus:outline-none"
            />
        </div>
    );
}

function PlanningObjectItem({ obj, viewerManager }: { obj: any, viewerManager: any, key?: any }) {
  const { planningGroups = [] } = useViewer();
  const [open, setOpen] = useState(false);
  const itemRef = useRef<HTMLDivElement>(null);

  const [planeExtSize, setPlaneExtSize] = useState(obj.extWidth !== undefined ? obj.extWidth : 10);
  const [planeThickness, setPlaneThickness] = useState(obj.thickness !== undefined ? obj.thickness : 0.0);
  
  const [cylinderDiameter, setCylinderDiameter] = useState(obj.diameter !== undefined ? obj.diameter : 1.0);
  const [cylinderExtension, setCylinderExtension] = useState(obj.extension !== undefined ? obj.extension : 20);
  
  const [curveDiameter, setCurveDiameter] = useState(obj.thickness !== undefined ? obj.thickness : 0.2);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (itemRef.current && !itemRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside, { passive: true });
    }, 50);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [open]);

  const handlePlaneChange = (extSize?: number, thk?: number) => {
      const nextExt = extSize !== undefined ? extSize : planeExtSize;
      const nextThk = thk !== undefined ? thk : planeThickness;
      viewerManager.updatePlaneGeometry(obj.id, nextExt, nextThk);
      if (extSize !== undefined) setPlaneExtSize(extSize);
      if (thk !== undefined) setPlaneThickness(thk);
  };

  const handleCylinderChange = (dia?: number, ext?: number) => {
      const nextDia = dia !== undefined ? dia : cylinderDiameter;
      const nextExt = ext !== undefined ? ext : cylinderExtension;
      viewerManager.updateCylinderGeometry(obj.id, nextDia, nextExt);
      if (dia !== undefined) setCylinderDiameter(dia);
      if (ext !== undefined) setCylinderExtension(ext);
  };

  const updateCurveDiameter = (val: number) => {
      viewerManager.updatePlanningObjectCurveThickness(obj.id, val);
      setCurveDiameter(val);
  };

  return (
      <div 
        ref={itemRef} 
        draggable
        onDragStart={(e) => {
            e.dataTransfer.setData('text/plain', obj.id);
            e.dataTransfer.effectAllowed = 'move';
        }}
        className="border border-slate-200 dark:border-slate-800 rounded overflow-hidden cursor-grab active:cursor-grabbing group/item"
      >
          <div className="bg-slate-50 dark:bg-slate-800 flex flex-col p-2 gap-1.5 relative">
              <div 
                  className="absolute top-1 right-1 text-slate-300 dark:text-slate-600 opacity-50 group-hover/item:opacity-100 transition-opacity"
                  title="Drag to rearrange"
              >
                  <GripHorizontal size={14} />
              </div>
              <div className="flex flex-col gap-0 w-full min-w-0 pr-4">
                  <input
                      type="text"
                      className="text-[12px] font-bold bg-transparent border-none focus:bg-white dark:focus:bg-slate-950 focus:ring-1 focus:ring-blue-500 rounded px-1.5 py-0.5 w-full flex-1 min-w-0 placeholder-slate-400"
                      style={{ color: obj.color, textShadow: '0 0 1px rgba(0,0,0,0.1)' }}
                      placeholder="Edit object name..."
                      value={obj.name || obj.id}
                      onChange={(e) => viewerManager.updatePlanningObjectName(obj.id, e.target.value)}
                  />
                  <div className="px-1.5 leading-tight mt-0.5 text-slate-800 dark:text-slate-300">
                  {obj.type === 'cylinder' && obj.radius !== undefined && (
                      <span className="text-[11px] font-mono leading-tight">
                          Dia: {(obj.radius * 2).toFixed(1)} mm | Len: {obj.length.toFixed(1)} mm
                      </span>
                  )}
                  {obj.type === 'plane' && obj.width !== undefined && (
                      <span className="text-[11px] font-mono leading-tight">
                          Size: {obj.width.toFixed(1)} × {obj.height.toFixed(1)} mm | Thk: {obj.thickness.toFixed(1)} mm
                      </span>
                  )}
                  {obj.type === 'curve' && obj.thickness !== undefined && (
                      <span className="text-[11px] font-mono leading-tight">
                          Len: {(obj.baseDistance || 0).toFixed(1)} mm | Dia: {curveDiameter.toFixed(1)} mm
                      </span>
                  )}
                  {obj.type === 'measurement' && obj.baseDistance !== undefined && (
                      <span className="text-[11px] font-mono leading-tight">
                          Dist: {obj.baseDistance.toFixed(2)} mm | Angle: {(obj.angle || 0).toFixed(1)}°
                      </span>
                  )}
                  </div>
              </div>
              <div className="flex items-center gap-0.5 shrink-0 self-end w-full px-1 justify-end">
                  <button onClick={() => setOpen(!open)} className={`p-1.5 rounded transition ${open ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400' : 'text-slate-500 hover:bg-white dark:hover:bg-slate-800'}`} title="Adjust Dimensions">
                      <SlidersHorizontal size={14} />
                  </button>
                  <button onClick={() => viewerManager.duplicatePlanningObject(obj.id)} className="p-1.5 text-slate-500 hover:text-blue-500 dark:text-slate-400 dark:hover:text-blue-400 rounded hover:bg-white dark:hover:bg-slate-800 transition" title="Duplicate Object">
                      <Copy size={14} />
                  </button>
                  <button onClick={() => viewerManager.togglePlanningObjectVisibility(obj.id)} className="p-1.5 text-slate-500 hover:text-blue-500 dark:text-slate-400 dark:hover:text-blue-400 rounded hover:bg-white dark:hover:bg-slate-800 transition" title={obj.visible === false ? "Show Object" : "Hide Object"}>
                      {obj.visible === false ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                  <button onClick={() => viewerManager.exportPlanningObjectSTL(obj.id)} className="p-1.5 text-slate-500 hover:text-blue-500 dark:text-slate-400 dark:hover:text-blue-400 rounded hover:bg-white dark:hover:bg-slate-800 transition" title="Download STL">
                      <Download size={14} />
                  </button>
                  <button onClick={() => viewerManager.removePlanningObject(obj.id)} className="p-1.5 text-slate-500 hover:text-red-500 dark:text-slate-400 dark:hover:text-red-400 rounded hover:bg-white dark:hover:bg-slate-800 transition" title="Delete">
                      <Trash2 size={14} />
                  </button>
              </div>
          </div>

          {open && (
              <div className="p-3 bg-white dark:bg-slate-900 flex flex-col gap-4 border-t border-slate-200 dark:border-slate-800">

                  {/* Dynamic absolute mm Sliders section */}
                  {obj.type === 'plane' && (
                      <div className="flex flex-col gap-2">
                          <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Plane Geometry</div>
                          <ScaleSliderRow 
                              label="Width & Length Extension" 
                              value={planeExtSize} 
                              min={0} 
                              max={100} 
                              step={5}
                              onChange={v => handlePlaneChange(v, undefined)} 
                              isMm={true}
                          />
                          <ScaleSliderRow 
                              label="Thickness" 
                              value={planeThickness} 
                              min={0.0} 
                              max={1.0} 
                              step={0.1}
                              onChange={v => handlePlaneChange(undefined, v)} 
                              isMm={true}
                          />
                      </div>
                  )}

                  {obj.type === 'cylinder' && (
                      <div className="flex flex-col gap-2">
                          <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Cylinder Geometry</div>
                          <ScaleSliderRow 
                              label="Diameter" 
                              value={cylinderDiameter} 
                              min={0.1} 
                              max={10.0} 
                              step={0.1}
                              onChange={v => handleCylinderChange(v, undefined)} 
                              isMm={true}
                          />
                          <ScaleSliderRow 
                              label="Extended Length" 
                              value={cylinderExtension} 
                              min={0} 
                              max={100} 
                              step={5}
                              onChange={v => handleCylinderChange(undefined, v)} 
                              isMm={true}
                          />
                      </div>
                  )}

                  {obj.type === 'curve' && (
                      <div className="flex flex-col gap-2">
                          <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Curve Geometry</div>
                          <ScaleSliderRow 
                              label="Curve Diameter" 
                              value={curveDiameter} 
                              min={0.1} 
                              max={2.0} 
                              step={0.1}
                              onChange={v => updateCurveDiameter(v)} 
                              isMm={true}
                          />
                      </div>
                  )}
              </div>
          )}
      </div>
  );
}

