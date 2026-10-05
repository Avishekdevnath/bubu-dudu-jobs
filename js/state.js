/**
 * Bubu-Dudu Job Portal - State Management Module
 * Holds centralized reactive application state and application tracking persistence.
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
    favorites: new Set()
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
  }

  window.state = state;
  window.loadAppliedRecords = loadAppliedRecords;
  window.saveAppliedRecord = saveAppliedRecord;

})(window);
