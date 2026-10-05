/**
 * Bubu-Dudu Job Portal - State Management Module
 * Holds centralized reactive application state, view routing, and application tracking.
 */
(function(window) {
  'use strict';

  const state = {
    circulars: [],
    referenceDate: (() => {
      const now = new Date();
      if (now.getFullYear() >= 2026) {
        return new Date(now.getFullYear(), now.getMonth(), now.getDate());
      }
      return new Date(2026, 9, 5); // 2026-10-05 fallback
    })(),
    currentView: 'FEED', // 'FEED', 'FAVORITES', 'APPLIED', 'IGNORED'
    filters: {
      timeline: 'ALL_ACTIVE',
      candidate: 'ALL',
      grade: 'ALL',
      postType: 'ALL',
      dateReported: 'ALL',
      sortBy: 'GRADE_ASC',
      search: '',
      showFavoritesOnly: false
    },
    appliedRecords: {},
    favorites: new Set(),
    ignored: new Set()
  };

  const APPLIED_STORAGE_KEY = 'bubu_dudu_job_applications';

  function loadAppliedRecords() {
    try {
      const raw = localStorage.getItem(APPLIED_STORAGE_KEY);
      if (raw) state.appliedRecords = JSON.parse(raw);
    } catch (e) {
      state.appliedRecords = {};
    }
  }

  function saveAppliedRecord(jobId, record) {
    state.appliedRecords[jobId] = record;
    try {
      localStorage.setItem(APPLIED_STORAGE_KEY, JSON.stringify(state.appliedRecords));
    } catch (e) {}
    updateAppliedCount();
  }

  function isJobApplied(job) {
    if (!job) return false;
    return !!(job.application_record || state.appliedRecords[job.id]);
  }

  function getAppliedCount() {
    let count = 0;
    state.circulars.forEach(job => {
      if (isJobApplied(job)) count++;
    });
    return count;
  }

  function updateAppliedCount() {
    const count = getAppliedCount();
    ['stat-applied', 'stat-applied-m', 'sidebar-applied-badge', 'nav-applied-count'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = count;
    });
  }

  window.state = state;
  window.loadAppliedRecords = loadAppliedRecords;
  window.saveAppliedRecord = saveAppliedRecord;
  window.isJobApplied = isJobApplied;
  window.getAppliedCount = getAppliedCount;
  window.updateAppliedCount = updateAppliedCount;

})(window);
