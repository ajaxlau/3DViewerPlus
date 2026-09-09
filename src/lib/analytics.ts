/**
 * Google Analytics 4 (GA4) Integration & Event Tracking
 * Measurement ID: G-PMRERS84H9
 */

declare global {
  interface Window {
    dataLayer?: any[];
    gtag?: (...args: any[]) => void;
  }
}

/**
 * Safely send custom event data to Google Analytics 4
 */
export function trackEvent(eventName: string, params?: Record<string, any>): void {
  try {
    if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
      window.gtag('event', eventName, params);
    }
  } catch (err) {
    // Non-blocking: fail silently if adblocker or network issues occur
    console.debug('[Analytics] Failed to send event:', eventName, err);
  }
}

/**
 * Convenience helper for tracking 3D model loads
 */
export function trackModelLoad(source: 'file' | 'url' | 'drop' | 'sample', format?: string, count: number = 1): void {
  trackEvent('model_loaded', {
    event_category: '3d_viewer',
    source,
    format: format?.toLowerCase() || 'unknown',
    file_count: count
  });
}

/**
 * Convenience helper for Virtual Surgical Planning (miniVSP) actions
 */
export function trackPlanningAction(action: string, objectType?: string, extra?: Record<string, any>): void {
  trackEvent('vsp_action', {
    event_category: 'surgical_planning',
    planning_action: action,
    object_type: objectType || 'general',
    ...extra
  });
}

/**
 * Convenience helper for export actions (STL, ZIP, Snapshot, Slicer JSON)
 */
export function trackExport(format: 'stl' | 'zip' | 'snapshot' | 'slicer_json', extra?: Record<string, any>): void {
  trackEvent('export_data', {
    event_category: 'data_export',
    export_format: format,
    ...extra
  });
}
