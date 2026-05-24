import { useState, useEffect } from 'react';
import { useViewer } from '../context/ViewerContext';

export function Modals() {
  const { activeModal, setActiveModal, filename, loadedUrl, isEmpty } = useViewer();

  // URL Modal state
  const [urlInput, setUrlInput] = useState('');

  // Share & Embed states based on preview mode (blob) vs deployed
  const [shareVal, setShareVal] = useState('');
  const [embedVal, setEmbedVal] = useState('');
  const [isSandbox, setIsSandbox] = useState(false);

  // Snapshot modal states
  const [snapRes, setSnapRes] = useState('medium');
  const [snapW, setSnapW] = useState(1000);
  const [snapH, setSnapH] = useState(1000);
  const [snapTrans, setSnapTrans] = useState(false);
  const [previewSrc, setPreviewSrc] = useState('');

  useEffect(() => {
    if (activeModal === 'share' || activeModal === 'embed') {
      let baseUrl = window.location.href.split('#')[0].split('?')[0];
      const isSandboxUrl = baseUrl.startsWith('blob:') || baseUrl.includes('.webcomponent.local') || window.location.hostname === 'localhost' || window.location.hostname.includes('.run.app');
      setIsSandbox(isSandboxUrl);
      
      if (!isEmpty && loadedUrl) {
         if (isSandboxUrl) {
           setShareVal(`https://ajaxlau.github.io/3DViewerWebApp/#model=${encodeURIComponent(loadedUrl)}`);
           setEmbedVal(`<iframe width="640" height="480" style="border:1px solid #eeeeee;" src="https://ajaxlau.github.io/3DViewerWebApp/#model=${encodeURIComponent(loadedUrl)}$backgroundcolor=240,240,240,255$defaultcolor=200,200,200$edgesettings=off,0,0,0,1"></iframe>`);
         } else {
           setShareVal(`${baseUrl}#model=${encodeURIComponent(loadedUrl)}`);
           setEmbedVal(`<iframe width="640" height="480" style="border:1px solid #eeeeee;" src="${baseUrl}#model=${encodeURIComponent(loadedUrl)}$backgroundcolor=240,240,240,255$defaultcolor=200,200,200$edgesettings=off,0,0,0,1"></iframe>`);
         }
      } else {
         setShareVal('');
         setEmbedVal('');
      }
    }
    
    if (activeModal === 'snapshot' && window._viewerManagerInstance && !isEmpty) {
      // Create a quick preview render
      const container = document.getElementById('viewer-container');
      if (container) {
          const cw = container.clientWidth;
          const ch = container.clientHeight;
          const dataUrl = window._viewerManagerInstance.captureSnapshot(cw, ch, false);
          if (dataUrl) setPreviewSrc(dataUrl);
      }
    }
  }, [activeModal, loadedUrl, isEmpty]);

  const handleLoadUrl = () => {
    if (urlInput.trim() && window._viewerManagerInstance) {
      window._viewerManagerInstance.loadUrl(urlInput.trim());
      setUrlInput('');
      setActiveModal(null);
    }
  };

  const [copied, setCopied] = useState(false);

  const copyToClipboard = async (text: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } else {
        throw new Error("Clipboard API not available");
      }
    } catch (err) {
      // Fallback
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.top = '-999999px';
      textArea.style.left = '-999999px';
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (e) {
        console.warn("Failed to copy", e);
      }
      document.body.removeChild(textArea);
    }
  };

  const dataURIToBlob = (dataURI: string) => {
    const splitDataURI = dataURI.split(',');
    const byteString = splitDataURI[0].indexOf('base64') >= 0 ? atob(splitDataURI[1]) : decodeURI(splitDataURI[1]);
    const mimeString = splitDataURI[0].split(':')[1].split(';')[0];
    const ia = new Uint8Array(byteString.length);
    for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ia], { type: mimeString });
  };

  const handleShareWhatsApp = async () => {
    if (!window._viewerManagerInstance) return;
    let targetW = 1920, targetH = 1080;
    if (snapRes === 'small') { targetW = 1280; targetH = 720; }
    else if (snapRes === 'large') { targetW = 2560; targetH = 1440; }
    else if (snapRes === 'custom') { targetW = snapW; targetH = snapH; }
    
    const dataUrl = window._viewerManagerInstance.captureSnapshot(targetW, targetH, snapTrans);
    if (!dataUrl) return;

    try {
      const blob = dataURIToBlob(dataUrl);
      const dlName = filename || 'snapshot';
      const file = new File([blob], `${dlName.replace(/\.[^/.]+$/, "")}_snapshot.png`, { type: 'image/png' });
      
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: '3D Model Snapshot',
          text: 'Check out this 3D model snapshot!'
        });
      } else {
        // Fallback for desktops: download the image and redirect to WhatsApp Web
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = file.name;
        link.click();
        
        const url = `https://wa.me/?text=${encodeURIComponent('Here is my 3D model snapshot! (The image has been downloaded locally)')}`;
        window.open(url, '_blank');
      }
    } catch (e) {
      console.warn('Error sharing to WhatsApp', e);
    }
    setActiveModal(null);
  };

  const handleCreateSnapshot = () => {
    if (!window._viewerManagerInstance) return;
    let targetW = 1920, targetH = 1080;
    if (snapRes === 'small') { targetW = 1280; targetH = 720; }
    else if (snapRes === 'large') { targetW = 2560; targetH = 1440; }
    else if (snapRes === 'custom') { targetW = snapW; targetH = snapH; }
    
    const dataUrl = window._viewerManagerInstance.captureSnapshot(targetW, targetH, snapTrans);
    if (dataUrl) {
        const link = document.createElement('a');
        link.href = dataUrl;
        const dlName = filename || 'snapshot';
        link.download = `${dlName.replace(/\\.[^/.]+$/, "")}_snapshot.png`;
        link.click();
    }
    setActiveModal(null);
  };

  if (!activeModal || activeModal === 'planning') return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 z-[1000] flex items-center justify-center fade-in p-4">
      <div className="bg-white dark:bg-slate-900 p-8 rounded-sm shadow-xl outline-none border border-slate-200 dark:border-slate-800" 
           style={{ width: activeModal === 'snapshot' ? '750px' : '450px', maxWidth: '100%' }}>
        
        {/* -- URL MODAL -- */}
        {activeModal === 'url' && (
          <>
            <h3 className="text-[11px] uppercase tracking-widest font-bold mb-3 text-slate-800 dark:text-slate-200">Load from URL</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-5 font-mono">Input the URL of a 3D model (CORS Support Required):</p>
            <input 
              type="text" 
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              className="w-full p-3 mb-6 border border-slate-300 dark:border-slate-700 rounded-sm bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 outline-none focus:border-blue-500 font-mono text-sm" 
              placeholder="https://raw.githubusercontent.com/.../model.gltf"
              onKeyDown={(e) => e.key === 'Enter' && handleLoadUrl()}
            />
            <div className="flex justify-end gap-3">
              <button className="px-5 py-2.5 rounded-sm text-xs font-bold uppercase tracking-widest border border-slate-300 dark:border-slate-700 bg-transparent text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800" onClick={() => setActiveModal(null)}>Cancel</button>
              <button className="px-5 py-2.5 rounded-sm text-xs font-bold uppercase tracking-widest bg-blue-600 text-white hover:bg-blue-700 border-none" onClick={handleLoadUrl}>Load</button>
            </div>
          </>
        )}

        {/* -- SHARE & EMBED MODALS -- */}
        {(activeModal === 'share' || activeModal === 'embed') && (
           <>
            <h3 className="text-[11px] uppercase tracking-widest font-bold mb-3 text-slate-800 dark:text-slate-200">{activeModal === 'share' ? 'Share Model' : 'Embed Model HTML'}</h3>
            {!loadedUrl ? (
                <p className="text-sm text-red-500 mb-5 font-mono">Please load a model from a URL first before {activeModal === 'share' ? 'sharing' : 'embedding'}. Local files cannot be {activeModal === 'share' ? 'shared via link' : 'embedded'}.</p>
            ) : (
                <>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-5 font-mono">
                  {isSandbox && <><strong className="text-red-500">Preview Mode:</strong> You are in a temporary sandbox. Once deployed, it will look like this:<br/><br/></>}
                  {activeModal === 'share' ? 'Copy the link below to share this model:' : 'Copy the HTML code below to embed this model on your website:'}
                </p>
                {activeModal === 'share' ? (
                  <input readOnly value={shareVal} className="w-full p-3 mb-6 border border-slate-300 dark:border-slate-700 rounded-sm bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-mono text-sm outline-none" />
                ) : (
                  <textarea readOnly value={embedVal} className="w-full p-3 mb-6 border border-slate-300 dark:border-slate-700 rounded-sm bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-mono text-xs h-[100px] resize-none outline-none" />
                )}
                </>
            )}
            <div className="flex justify-end items-center gap-3 mt-6 w-full">
              <button 
                className="flex-1 max-w-[120px] h-10 px-3 rounded-sm text-xs font-bold uppercase tracking-widest border border-slate-300 dark:border-slate-700 bg-transparent text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-center text-center font-bold" 
                onClick={() => setActiveModal(null)}
              >
                Close
              </button>
              {loadedUrl && (
                <>
                  {activeModal === 'share' && (
                      <button 
                        className="flex-1 max-w-[130px] h-10 px-3 rounded-sm text-xs font-bold uppercase tracking-widest bg-green-600 text-white hover:bg-green-700 border-none shadow-sm transition-colors flex items-center justify-center gap-1.5 text-center font-bold" 
                        onClick={async () => {
                            let sharedOk = false;
                            const shareText = 'Check out this 3D model: ' + shareVal;
                            if (window._viewerManagerInstance) {
                                try {
                                    const dataUrl = window._viewerManagerInstance.captureSnapshot(1920, 1080, false);
                                    if (dataUrl && navigator.canShare) {
                                        const blob = dataURIToBlob(dataUrl);
                                        const dlName = filename || 'snapshot';
                                        const file = new File([blob], `${dlName.replace(/\\.[^/.]+$/, "")}_snapshot.png`, { type: 'image/png' });
                                        if (navigator.canShare({ files: [file] })) {
                                            await navigator.share({
                                                title: '3D Model',
                                                text: shareText,
                                                files: [file]
                                            });
                                            sharedOk = true;
                                        }
                                    }
                                } catch (e) {
                                    console.warn('Share with image failed', e);
                                }
                            }
                            if (!sharedOk) {
                                const url = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
                                window.open(url, '_blank');
                            }
                        }}
                      >
                        <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                        <span className="truncate">WhatsApp</span>
                      </button>
                  )}
                  <button 
                    className="flex-1 max-w-[130px] h-10 px-3 rounded-sm text-xs font-bold uppercase tracking-widest bg-blue-600 text-white hover:bg-blue-700 border-none shadow-sm transition-colors flex items-center justify-center text-center font-bold" 
                    onClick={() => copyToClipboard(activeModal === 'share' ? shareVal : embedVal)}
                  >
                    <span className="truncate">{copied ? "Copied!" : `Copy ${activeModal === 'share' ? 'Link' : 'Code'}`}</span>
                  </button>
                </>
              )}
            </div>
           </>
        )}

        {/* -- SNAPSHOT MODAL -- */}
        {activeModal === 'snapshot' && (
          <>
            <h3 className="text-[11px] uppercase tracking-widest font-bold mb-3 text-slate-800 dark:text-slate-200">Create Snapshot</h3>
            {isEmpty ? (
              <p className="text-sm text-red-500 mb-5 font-mono">Please load a model first.</p>
            ) : (
              <div className="flex flex-wrap gap-6 mt-5 mb-7">
                <div className="flex-1 min-w-[250px] bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-sm flex items-center justify-center overflow-hidden h-[250px] shadow-inner">
                    {previewSrc ? (
                        <img src={previewSrc} className="max-w-[100%] max-h-[100%] object-contain" alt="Preview"/>
                    ) : null}
                </div>
                <div className="w-[250px] flex flex-col gap-3 text-slate-700 dark:text-slate-300 text-sm">
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input type="radio" name="res" value="small" checked={snapRes === 'small'} onChange={() => setSnapRes('small')} className="accent-blue-600 w-4 h-4" /> Small <span className="font-mono text-xs text-slate-400 ml-auto">(1280x720)</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input type="radio" name="res" value="medium" checked={snapRes === 'medium'} onChange={() => setSnapRes('medium')} className="accent-blue-600 w-4 h-4" /> Medium <span className="font-mono text-xs text-slate-400 ml-auto">(1920x1080)</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input type="radio" name="res" value="large" checked={snapRes === 'large'} onChange={() => setSnapRes('large')} className="accent-blue-600 w-4 h-4" /> Large <span className="font-mono text-xs text-slate-400 ml-auto">(2560x1440)</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input type="radio" name="res" value="custom" checked={snapRes === 'custom'} onChange={() => setSnapRes('custom')} className="accent-blue-600 w-4 h-4" /> Custom
                    </label>
                    
                    <div className={`ml-7 pl-3 border-l-2 border-slate-200 dark:border-slate-700 flex flex-col gap-2 transition-opacity ${snapRes === 'custom' ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                        <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wide text-slate-500">
                            <span>Width</span>
                            <input type="number" disabled={snapRes !== 'custom'} value={snapW} onChange={e => setSnapW(parseInt(e.target.value)||1)} className="w-20 p-1.5 border border-slate-300 dark:border-slate-700 rounded-sm bg-white dark:bg-slate-900 outline-none font-mono text-slate-800 dark:text-slate-200" />
                        </div>
                        <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wide text-slate-500">
                            <span>Height</span>
                            <input type="number" disabled={snapRes !== 'custom'} value={snapH} onChange={e => setSnapH(parseInt(e.target.value)||1)} className="w-20 p-1.5 border border-slate-300 dark:border-slate-700 rounded-sm bg-white dark:bg-slate-900 outline-none font-mono text-slate-800 dark:text-slate-200" />
                        </div>
                    </div>
                    
                    <hr className="border-t border-slate-200 dark:border-slate-800 my-2"/>
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" checked={snapTrans} onChange={(e) => setSnapTrans(e.target.checked)} className="accent-blue-600 w-4 h-4" /> Transparent background
                    </label>
                </div>
              </div>
            )}
            <div className="flex justify-between items-center border-t border-slate-200 dark:border-slate-800 pt-5 mt-5">
              <button 
                className="h-10 px-5 rounded-sm text-xs font-bold uppercase tracking-widest border border-slate-300 dark:border-slate-700 bg-transparent text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors font-bold flex items-center justify-center" 
                onClick={() => setActiveModal(null)}
              >
                Cancel
              </button>
              {!isEmpty && (
                <div className="flex items-center gap-3">
                  <button 
                      className="h-10 px-5 rounded-sm text-xs font-bold uppercase tracking-widest bg-green-600 text-white hover:bg-green-700 border-none shadow-sm transition-colors flex items-center justify-center gap-2" 
                      onClick={handleShareWhatsApp}
                    >
                      <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                      <span>WhatsApp</span>
                  </button>
                  <button 
                    className="h-10 px-6 rounded-sm text-xs font-bold uppercase tracking-widest bg-blue-600 text-white hover:bg-blue-700 border-none shadow-sm transition-colors font-bold flex items-center justify-center" 
                    onClick={handleCreateSnapshot}
                  >
                    Save Image
                  </button>
                </div>
              )}
            </div>
          </>
        )}

      </div>
    </div>
  );
}
