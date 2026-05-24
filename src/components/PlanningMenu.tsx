import { useViewer } from '../context/ViewerContext';
import { X, SlidersHorizontal, Download, Trash2, Crosshair, BoxSelect } from 'lucide-react';
import { useState } from 'react';

export function PlanningMenu() {
  const { 
    activeModal, setActiveModal, 
    planningMode, setPlanningMode, 
    planningObjects, planningPointsPicked,
    viewerManager
  } = useViewer();

  // Settings
  const [planeExtWidth, setPlaneExtWidth] = useState(10);
  const [planeExtLength, setPlaneExtLength] = useState(10);
  const [cylinderDiameter, setCylinderDiameter] = useState(1);
  const [cylinderExtension, setCylinderExtension] = useState(20);

  if (activeModal !== 'planning') return null;

  const handleConfirm = () => {
      viewerManager?.confirmPlanningObject({
          planeExtWidth: planeExtWidth,
          planeExtLength: planeExtLength,
          cylinderRadius: cylinderDiameter / 2,
          cylinderExtension: cylinderExtension
      });
  };

  const handleUndo = () => {
      viewerManager?.undoPlanningPoint();
  };

  const canConfirm = (planningMode === 'plane' && planningPointsPicked === 3) || (planningMode === 'cylinder' && planningPointsPicked === 2);

  return (
    <div className="absolute right-6 top-[80px] w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl flex flex-col z-50 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
        <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 uppercase tracking-widest flex items-center gap-2">
           Planning Tools
        </h3>
        <button className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200" onClick={() => setActiveModal(null)}>
          <X size={16} />
        </button>
      </div>

      <div className="p-4 flex flex-col gap-4 max-h-[70vh] overflow-y-auto">
        <div className="flex flex-col gap-2">
            <div className={`flex flex-col rounded border transition-colors ${planningMode === 'plane' ? 'border-blue-500' : 'border-slate-200 dark:border-slate-700'}`}>
                <button 
                    onClick={() => setPlanningMode(planningMode === 'plane' ? 'none' : 'plane')}
                    className={`flex items-center p-3 text-xs font-semibold uppercase tracking-wider transition-colors w-full text-left ${
                        planningMode === 'plane' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-t' : 'bg-transparent text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded'
                    }`}
                >
                    <BoxSelect size={18} className="mr-3 shrink-0" />
                    <div className="flex flex-col">
                        <span>Add Plane</span>
                        <span className="text-[10px] font-normal opacity-70 normal-case tracking-normal mt-0.5">3 Points</span>
                    </div>
                </button>
                {planningMode === 'plane' && (
                    <div className="p-3 border-t border-blue-200 dark:border-blue-800/30 bg-blue-50/50 dark:bg-blue-900/10 text-xs text-blue-800 dark:text-blue-300 flex flex-col gap-3 rounded-b">
                        <div className="text-center font-semibold mb-1">
                            Click on the 3D model to select points.<br/>
                            Points picked: <strong>{planningPointsPicked}</strong> / 3
                        </div>
                        
                        <div className="flex flex-col gap-2 border-t border-blue-200 dark:border-blue-800/30 pt-3">
                            <label className="flex items-center justify-between text-[10px] uppercase font-bold tracking-wider">
                                Ext. Width (mm)
                                <input type="number" min="0" value={planeExtWidth} onChange={e => setPlaneExtWidth(parseFloat(e.target.value) || 0)} className="w-16 p-1 rounded text-center border border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-900" />
                            </label>
                            <label className="flex items-center justify-between text-[10px] uppercase font-bold tracking-wider">
                                Ext. Length (mm)
                                <input type="number" min="0" value={planeExtLength} onChange={e => setPlaneExtLength(parseFloat(e.target.value) || 0)} className="w-16 p-1 rounded text-center border border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-900" />
                            </label>
                        </div>

                        <div className="flex gap-2 mt-2">
                            <button onClick={handleUndo} disabled={planningPointsPicked === 0} className="flex-1 px-2 py-1.5 rounded bg-blue-200 dark:bg-blue-800/50 text-blue-800 dark:text-blue-300 font-bold transition hover:bg-blue-300 dark:hover:bg-blue-700/50 disabled:opacity-50 disabled:cursor-not-allowed">
                                Undo
                            </button>
                            <button onClick={handleConfirm} disabled={!canConfirm} className="flex-[2] flex items-center justify-center gap-1 px-2 py-1.5 rounded bg-blue-600 text-white font-bold transition hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
                                Add Plane
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <div className={`flex flex-col rounded border transition-colors ${planningMode === 'cylinder' ? 'border-amber-500' : 'border-slate-200 dark:border-slate-700'}`}>
                <button 
                    onClick={() => setPlanningMode(planningMode === 'cylinder' ? 'none' : 'cylinder')}
                    className={`flex items-center p-3 text-xs font-semibold uppercase tracking-wider transition-colors w-full text-left ${
                        planningMode === 'cylinder' ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-t' : 'bg-transparent text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded'
                    }`}
                >
                    <Crosshair size={18} className="mr-3 shrink-0" />
                    <div className="flex flex-col">
                        <span>Add Cylinder</span>
                        <span className="text-[10px] font-normal opacity-70 normal-case tracking-normal mt-0.5">2 Points</span>
                    </div>
                </button>
                {planningMode === 'cylinder' && (
                    <div className="p-3 border-t border-amber-200 dark:border-amber-800/30 bg-amber-50/50 dark:bg-amber-900/10 text-xs text-amber-800 dark:text-amber-300 flex flex-col gap-3 rounded-b">
                        <div className="text-center font-semibold mb-1">
                            Click on the 3D model to select points.<br/>
                            Points picked: <strong>{planningPointsPicked}</strong> / 2
                        </div>
                        
                        <div className="flex flex-col gap-2 border-t border-amber-200 dark:border-amber-800/30 pt-3">
                            <label className="flex items-center justify-between text-[10px] uppercase font-bold tracking-wider">
                                Diameter (mm)
                                <input type="number" min="0.1" step="0.1" value={cylinderDiameter} onChange={e => setCylinderDiameter(parseFloat(e.target.value) || 1)} className="w-16 p-1 rounded text-center border border-amber-200 dark:border-amber-800 bg-white dark:bg-slate-900" />
                            </label>
                            <label className="flex items-center justify-between text-[10px] uppercase font-bold tracking-wider">
                                Ext. Length (mm)
                                <input type="number" min="0" value={cylinderExtension} onChange={e => setCylinderExtension(parseFloat(e.target.value) || 0)} className="w-16 p-1 rounded text-center border border-amber-200 dark:border-amber-800 bg-white dark:bg-slate-900" />
                            </label>
                        </div>

                        <div className="flex gap-2 mt-2">
                            <button onClick={handleUndo} disabled={planningPointsPicked === 0} className="flex-1 px-2 py-1.5 rounded bg-amber-200 dark:bg-amber-800/50 text-amber-800 dark:text-amber-300 font-bold transition hover:bg-amber-300 dark:hover:bg-amber-700/50 disabled:opacity-50 disabled:cursor-not-allowed">
                                Undo
                            </button>
                            <button onClick={handleConfirm} disabled={!canConfirm} className="flex-[2] flex items-center justify-center gap-1 px-2 py-1.5 rounded bg-amber-600 dark:bg-amber-500 text-white font-bold transition hover:bg-amber-700 dark:hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed">
                                Add Cylinder
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>

        <div className="border-t border-slate-200 dark:border-slate-800 pt-4 mt-2">
            <div className="flex items-center justify-between mb-3">
                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Created Objects</h4>
                {planningObjects.length > 0 && (
                    <button onClick={() => viewerManager?.exportAllPlanningObjectsZip()} className="text-[10px] flex items-center gap-1 font-bold text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 uppercase tracking-wider transition">
                        <Download size={12} />
                        Zip All
                    </button>
                )}
            </div>
            
            {planningObjects.length === 0 && (
                <div className="text-center text-xs text-slate-500 py-4 opacity-70">
                    No objects created yet.
                </div>
            )}

            <div className="flex flex-col gap-3">
                {planningObjects.map((obj, i) => (
                    <PlanningObjectItem key={obj.id} obj={obj} viewerManager={viewerManager} index={i} />
                ))}
            </div>
        </div>
      </div>
    </div>
  );
}

function PlanningObjectItem({ obj, viewerManager, index }: { obj: any, viewerManager: any, index: number, key?: any }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ 
    x: obj.mesh.position.x, 
    y: obj.mesh.position.y, 
    z: obj.mesh.position.z 
  });
  const [rot, setRot] = useState({ 
    x: obj.mesh.rotation.x * 180 / Math.PI, 
    y: obj.mesh.rotation.y * 180 / Math.PI, 
    z: obj.mesh.rotation.z * 180 / Math.PI 
  });

  const updateTransform = (updates: any) => {
      viewerManager.updatePlanningObjectTransform(obj.id, updates);
      if (updates.posX !== undefined) setPos(p => ({ ...p, x: updates.posX }));
      if (updates.posY !== undefined) setPos(p => ({ ...p, y: updates.posY }));
      if (updates.posZ !== undefined) setPos(p => ({ ...p, z: updates.posZ }));

      if (updates.rotX !== undefined) setRot(r => ({ ...r, x: updates.rotX }));
      if (updates.rotY !== undefined) setRot(r => ({ ...r, y: updates.rotY }));
      if (updates.rotZ !== undefined) setRot(r => ({ ...r, z: updates.rotZ }));
  };

  return (
      <div className="border border-slate-200 dark:border-slate-800 rounded overflow-hidden">
          <div className="bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between p-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: obj.color }}></div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      {obj.type.charAt(0).toUpperCase() + obj.type.slice(1)} {index + 1}
                  </span>
                  {obj.type === 'cylinder' && obj.baseDistance !== undefined && (
                      <span className="text-[9px] text-slate-500 font-mono">Distance: {obj.baseDistance.toFixed(2)} mm</span>
                  )}
                  {obj.type === 'plane' && obj.width !== undefined && obj.height !== undefined && (
                      <span className="text-[9px] text-slate-500 font-mono">{obj.width.toFixed(1)} × {obj.height.toFixed(1)} mm</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                  <button onClick={() => viewerManager.exportPlanningObjectSTL(obj.id)} className="p-1.5 text-slate-500 hover:text-blue-500 rounded hover:bg-white dark:hover:bg-slate-700 transition" title="Export STL">
                      <Download size={14} />
                  </button>
                  <button onClick={() => setOpen(!open)} className={`p-1.5 rounded transition ${open ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400' : 'text-slate-500 hover:bg-white dark:hover:bg-slate-700'}`} title="Adjust Transform">
                      <SlidersHorizontal size={14} />
                  </button>
                  <button onClick={() => viewerManager.removePlanningObject(obj.id)} className="p-1.5 text-slate-500 hover:text-red-500 rounded hover:bg-white dark:hover:bg-slate-700 transition" title="Delete">
                      <Trash2 size={14} />
                  </button>
              </div>
          </div>

          {open && (
              <div className="p-3 bg-white dark:bg-slate-900 flex flex-col gap-3 border-t border-slate-200 dark:border-slate-800">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Translation</div>
                  <div className="flex flex-col gap-2">
                      <SliderRow label="X" value={pos.x} min={-1000} max={1000} onChange={v => updateTransform({ posX: v })}/>
                      <SliderRow label="Y" value={pos.y} min={-1000} max={1000} onChange={v => updateTransform({ posY: v })}/>
                      <SliderRow label="Z" value={pos.z} min={-1000} max={1000} onChange={v => updateTransform({ posZ: v })}/>
                  </div>

                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-2">Rotation (Deg)</div>
                  <div className="flex flex-col gap-2">
                      <SliderRow label="X" value={rot.x} min={-180} max={180} onChange={v => updateTransform({ rotX: v })}/>
                      <SliderRow label="Y" value={rot.y} min={-180} max={180} onChange={v => updateTransform({ rotY: v })}/>
                      <SliderRow label="Z" value={rot.z} min={-180} max={180} onChange={v => updateTransform({ rotZ: v })}/>
                  </div>
              </div>
          )}
      </div>
  );
}

function SliderRow({ label, value, min, max, onChange }: { label: string, value: number, min: number, max: number, onChange: (v: number) => void }) {
    return (
        <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-slate-500 w-3">{label}</span>
            <input 
                type="range" 
                min={min} max={max} step={1}
                value={value} 
                onChange={e => onChange(parseFloat(e.target.value))}
                className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer"
            />
            <input 
                type="number" 
                className="w-14 text-xs bg-slate-100 dark:bg-slate-800 border-none rounded p-1 text-right text-slate-700 dark:text-slate-300 font-mono" 
                value={Math.round(value)}
                onChange={e => onChange(parseFloat(e.target.value) || 0)}
            />
        </div>
    );
}

