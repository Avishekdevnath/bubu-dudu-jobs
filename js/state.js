/**
 * Bubu-Dudu Job Portal - Reactive Application State
 */

import { TIMELINE_TYPES } from './timeline.js';

export const state = {
  circulars: [],
  referenceDate: new Date('2026-10-04T00:00:00'), // Synchronized reference date
  filters: {
    timeline: TIMELINE_TYPES.ALL_ACTIVE, // 'ALL_ACTIVE', 'JUST_IN_5', 'CLOSING_SOON_3', 'EXPIRED'
    candidate: 'ALL',                   // 'ALL', 'DUDU', 'BUBU', 'BOTH'
    grade: 'ALL',                       // 'ALL', 6, 9, 10, 13, 14, 16, 20
    postType: 'ALL',                    // 'ALL', 'TOP_POSTS', 'IT_OFFICER', 'AM_AD', 'COMP_OPERATOR', 'STENO_TYPIST', 'OFFICE_ASST', 'OFFICE_SOHAYOK', 'ACCOUNTS'
    sortBy: 'GRADE_ASC',                // 'GRADE_ASC', 'DEADLINE_ASC', 'GRADE_DESC', 'NEWEST'
    search: ''
  },
  appliedRecords: {} // Map of id -> { user_id, payment_status, applied_by }
};

// LocalStorage Key for Saved User Tracking IDs
const APPLIED_STORAGE_KEY = 'bubu_dudu_job_applications';

export function loadAppliedRecords() {
  try {
    const raw = localStorage.getItem(APPLIED_STORAGE_KEY);
    if (raw) {
      state.appliedRecords = JSON.parse(raw);
    }
  } catch (e) {
    state.appliedRecords = {};
  }
}

export function saveAppliedRecord(jobId, record) {
  state.appliedRecords[jobId] = record;
  try {
    localStorage.setItem(APPLIED_STORAGE_KEY, JSON.stringify(state.appliedRecords));
  } catch (e) {}
}

export function setTimelineFilter(type) {
  state.filters.timeline = type;
  notifyStateChange();
}

export function setCandidateFilter(candidate) {
  state.filters.candidate = candidate;
  notifyStateChange();
}

export function setGradeFilter(grade) {
  state.filters.grade = grade;
  notifyStateChange();
}

export function setSearchTerm(term) {
  state.filters.search = term;
  notifyStateChange();
}

export function setSortOrder(sortBy) {
  state.filters.sortBy = sortBy;
  notifyStateChange();
}

export function resetFilters() {
  state.filters.timeline = TIMELINE_TYPES.ALL_ACTIVE;
  state.filters.candidate = 'ALL';
  state.filters.grade = 'ALL';
  state.filters.postType = 'ALL';
  state.filters.sortBy = 'GRADE_ASC';
  state.filters.search = '';
  notifyStateChange();
}

// Simple Listener Subscription
const listeners = [];
export function subscribe(listener) {
  listeners.push(listener);
}

function notifyStateChange() {
  listeners.forEach(fn => fn(state));
}
