/**
 * Bubu-Dudu Job Portal - Ignored / Rejected Jobs Subsystem
 * Persists rejected jobs to localStorage and handles hiding/restoring them.
 */
(function(window) {
  'use strict';

  const IGNORED_STORAGE_KEY = 'bubu_dudu_ignored_jobs';

  function loadIgnored() {
    try {
      const raw = localStorage.getItem(IGNORED_STORAGE_KEY);
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) window.state.ignored = new Set(arr);
      }
    } catch (e) {
      window.state.ignored = new Set();
    }
  }

  function saveIgnored() {
    try {
      localStorage.setItem(IGNORED_STORAGE_KEY, JSON.stringify([...window.state.ignored]));
    } catch (e) {}
  }

  function isIgnored(jobId) {
    return window.state && window.state.ignored ? window.state.ignored.has(jobId) : false;
  }

  function toggleIgnore(jobId) {
    if (window.state.ignored.has(jobId)) {
      window.state.ignored.delete(jobId);
    } else {
      window.state.ignored.add(jobId);
    }
    saveIgnored();
    updateIgnoredCount();
    if (window.computeAndRenderMetrics) window.computeAndRenderMetrics();
    if (window.renderJobs) window.renderJobs();
  }

  function restoreJob(jobId) {
    if (window.state.ignored.has(jobId)) {
      window.state.ignored.delete(jobId);
      saveIgnored();
      updateIgnoredCount();
      if (window.computeAndRenderMetrics) window.computeAndRenderMetrics();
      if (window.renderJobs) window.renderJobs();
    }
  }

  function getIgnoredCount() {
    if (!window.state || !window.state.ignored) return 0;
    return window.state.ignored.size;
  }

  function updateIgnoredCount() {
    const count = getIgnoredCount();
    ['stat-ignored-count', 'sidebar-ignored-badge', 'nav-ignored-count'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = count;
    });
  }

  function clearAllIgnored() {
    if (!window.state) return;
    window.state.ignored.clear();
    saveIgnored();
    updateIgnoredCount();
    if (window.computeAndRenderMetrics) window.computeAndRenderMetrics();
    if (window.renderJobs) window.renderJobs();
  }

  window.loadIgnored = loadIgnored;
  window.saveIgnored = saveIgnored;
  window.isIgnored = isIgnored;
  window.toggleIgnore = toggleIgnore;
  window.restoreJob = restoreJob;
  window.getIgnoredCount = getIgnoredCount;
  window.updateIgnoredCount = updateIgnoredCount;
  window.clearAllIgnored = clearAllIgnored;

})(window);
