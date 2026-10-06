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

  function getAppliedRecord(job) {
    if (!job) return null;
    if (job.application_record) return job.application_record;
    if (state.appliedRecords[job.id]) return state.appliedRecords[job.id];

    // Department Single-Application Rule:
    // If a candidate already applied to another post in this department,
    // this post is mutually fulfilled/locked out under the 1-post limit.
    const orgCode = (job.org_code || '').toUpperCase();
    const orgName = (job.organization || '').toLowerCase();
    const jobCand = (job.candidate_eligibility || 'BOTH').toUpperCase();

    if (Array.isArray(state.circulars)) {
      for (let i = 0; i < state.circulars.length; i++) {
        const other = state.circulars[i];
        if (other.id === job.id) continue;
        const rec = other.application_record || state.appliedRecords[other.id];
        if (!rec) continue;

        const otherCode = (other.org_code || '').toUpperCase();
        const otherName = (other.organization || '').toLowerCase();

        const sameOrg = (orgCode && otherCode && orgCode === otherCode) ||
                        (orgName.includes('parjatan') && otherName.includes('parjatan')) ||
                        (orgName.length > 5 && otherName.length > 5 && (orgName.includes(otherName) || otherName.includes(orgName)));

        if (sameOrg) {
          const appCand = (rec.candidate || '').toUpperCase();
          if (jobCand === 'BOTH' || appCand === jobCand || !appCand) {
            return {
              ...rec,
              is_dept_mutual: true,
              parent_applied_title: other.title || other.title_en || 'Applied Post in Department'
            };
          }
        }
      }
    }
    return null;
  }

  function isJobApplied(job) {
    if (!job) return false;
    return !!getAppliedRecord(job);
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
  window.getAppliedRecord = getAppliedRecord;
  window.getAppliedCount = getAppliedCount;
  window.updateAppliedCount = updateAppliedCount;

})(window);
