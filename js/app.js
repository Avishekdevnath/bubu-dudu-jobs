/**
 * Bubu-Dudu Job Portal - Main Application Orchestrator
 * Connects State, Timeline Engine, Component Renderer, and PWA Subsystem.
 */

import { state, loadAppliedRecords, saveAppliedRecord, subscribe } from './state.js';
import { TIMELINE_TYPES, classifyJobTimeline, getDaysUntilDeadline, isPureOfficeJob } from './timeline.js';
import { renderJobCard, renderMetrics, renderEmptyState } from './components.js';
import { initPWA, installPWA, dismissMobileBanner } from './pwa.js';


// Additional UI State
let dayWindowFilter = 'ALL';

/**
 * Initialize Application
 */
async function init() {
  loadAppliedRecords();
  initPWA();
  setupEventListeners();
  parseURLParams();
  await loadCirculars();
  updateClockDisplay();
}

/**
 * Load circulars data from JSON
 */
async function loadCirculars() {
  const container = document.getElementById('jobs-grid');
  const countEl = document.getElementById('visible-count');
  if (countEl) countEl.textContent = 'Loading...';

  try {
    const res = await fetch(`./data/circulars.json?_t=${Date.now()}`);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const data = await res.json();
    state.circulars = Array.isArray(data) ? data : [];
    
    computeAndRenderMetrics();
    renderJobs();
  } catch (err) {
    console.error('Failed to load circulars:', err);
    if (container) {
      container.innerHTML = `
        <div class="col-span-full py-12 text-center bg-white rounded-2xl border border-red-200 p-6 space-y-3">
          <div class="text-4xl">⚠️</div>
          <h3 class="text-base font-bold text-red-700">Failed to Load Circulars</h3>
          <p class="text-xs text-slate-500">${err.message}</p>
          <button onclick="window.reloadCirculars()" class="px-4 py-2 text-xs font-bold text-white bg-red-600 rounded-xl hover:bg-red-700">
            Retry Loading
          </button>
        </div>
      `;
    }
  }
}

/**
 * Compute global metrics & timeline badges
 */
function computeAndRenderMetrics() {
  const refDate = state.referenceDate;
  let active = 0;
  let justIn = 0;
  let urgent3 = 0;
  let dudu = 0;
  let bubu = 0;
  let both = 0;

  state.circulars.forEach(job => {
    // STRICT RULE: Office Jobs Only!
    if (!isPureOfficeJob(job)) return;

    const info = classifyJobTimeline(job, refDate);
    // STRICT RULE: Only active circulars
    if (!info.isExpired && info.daysLeft >= 0) {
      active++;
      if (info.isJustIn5) justIn++;
      if (info.isClosingSoon3) urgent3++;

      if (job.candidate_eligibility === 'DUDU' || job.candidate_eligibility === 'BOTH') dudu++;
      if (job.candidate_eligibility === 'BUBU' || job.candidate_eligibility === 'BOTH') bubu++;
      if (job.candidate_eligibility === 'BOTH') both++;
    }
  });

  renderMetrics({ active, justIn, urgent3, dudu, bubu, both });
}

/**
 * Filter and render circular cards
 */
function renderJobs() {
  const container = document.getElementById('jobs-grid');
  const countEl = document.getElementById('visible-count');
  if (!container) return;

  const refDate = state.referenceDate;
  const { timeline, candidate, grade, search } = state.filters;

  const filtered = state.circulars.filter(job => {
    // STRICT RULE: Office Jobs Only!
    if (!isPureOfficeJob(job)) return false;

    const info = classifyJobTimeline(job, refDate);

    // STRICT RULE: NEVER SHOW EXPIRED CIRCULARS ON FRONTEND PAGE!
    if (info.isExpired || info.daysLeft < 0) return false;


    // 1. Timeline Category Filter (Active Only)
    if (timeline === TIMELINE_TYPES.JUST_IN_5) {
      if (!info.isJustIn5) return false;
    } else if (timeline === TIMELINE_TYPES.CLOSING_SOON_3) {
      if (!info.isClosingSoon3) return false;
    }

    // 2. Candidate Filter
    if (candidate === 'DUDU' && job.candidate_eligibility !== 'DUDU' && job.candidate_eligibility !== 'BOTH') return false;
    if (candidate === 'BUBU' && job.candidate_eligibility !== 'BUBU' && job.candidate_eligibility !== 'BOTH') return false;
    if (candidate === 'BOTH' && job.candidate_eligibility !== 'BOTH') return false;

    // 3. Day Window Filter (<= N days left)
    if (dayWindowFilter !== 'ALL') {
      const maxDays = parseInt(dayWindowFilter, 10);
      if (info.isExpired || info.daysLeft > maxDays) return false;
    }

    // 4. Grade Filter (Integer comparison)
    if (grade !== 'ALL') {
      const gNum = parseInt(String(job.grade).replace(/\D+/g, ''), 10);
      if (grade === '14-16') {
        if (![14, 15, 16].includes(gNum)) return false;
      } else {
        if (gNum !== parseInt(grade, 10)) return false;
      }
    }

    // 5. Post Type / Designation Filter
    const pt = state.filters.postType || 'ALL';
    if (pt !== 'ALL') {
      const titleLower = (job.title || '').toLowerCase();
      const cat = job.designation_category || '';
      const gNum = parseInt(String(job.grade).replace(/\D+/g, ''), 10);

      if (pt === 'TOP_POSTS') {
        const isTop = cat === 'TOP_POSTS' || gNum <= 9 || /assistant programmer|সহকারী প্রোগ্রামার|assistant maintenance|রক্ষণাবেক্ষণ|assistant director|সহকারী পরিচালক|assistant manager|সহকারী ব্যবস্থাপক|programmer|প্রোগ্রামার|junior officer|কনিষ্ঠ কর্মকর্তা|sub-assistant engineer/i.test(titleLower);
        if (!isTop) return false;
      } else if (pt === 'IT_OFFICER') {
        const isIt = cat === 'IT_OFFICER' || /programmer|প্রোগ্রামার|maintenance engineer|রক্ষণাবেক্ষণ|system analyst|কম্পিউটার প্রকৌশলী|আইটি/i.test(titleLower);
        if (!isIt) return false;
      } else if (pt === 'AM_AD') {
        const isAmAd = /assistant manager|সহকারী ব্যবস্থাপক|assistant director|সহকারী পরিচালক/i.test(titleLower);
        if (!isAmAd) return false;
      } else if (pt === 'COMP_OPERATOR') {
        if (cat !== 'COMP_OPERATOR' && !/computer operator|কম্পিউটার অপারেটর/i.test(titleLower)) return false;
      } else if (pt === 'STENO_TYPIST') {
        if (cat !== 'STENO_TYPIST' && !/steno|সাঁট|typist|মুদ্রাক্ষরিক/i.test(titleLower)) return false;
      } else if (pt === 'OFFICE_SOHAYOK') {
        if (cat !== 'OFFICE_SOHAYOK' && !/সহায়ক|সহায়ক|sohayok|shohayok|support staff/i.test(titleLower)) return false;
      } else if (pt === 'ACCOUNTS') {
        if (cat !== 'ACCOUNTS' && !/account|হিসাব|cashier|ক্যাশিয়ার|auditor/i.test(titleLower)) return false;
      } else if (pt === 'OFFICE_ASST') {
        if (cat !== 'OFFICE_ASST' && !/office assistant|অফিস সহকারী|upper division|উচ্চমান সহকারী|head assistant/i.test(titleLower)) return false;
      }
    }

    // 6. Search Text Filter with Smart Abbreviation Aliases
    if (search && search.trim() !== '') {
      const q = search.trim().toLowerCase();
      const titleLower = (job.title || '').toLowerCase();
      const orgLower = (job.organization || '').toLowerCase();
      const reqLower = (job.education_requirements || job.min_education || '').toLowerCase();
      const candLower = (job.candidate_eligibility || '').toLowerCase();

      // Smart Designation Abbreviation Matching
      if (q === 'ap') {
        if (!titleLower.includes('assistant programmer') && !titleLower.includes('সহকারী প্রোগ্রামার')) return false;
      } else if (q === 'ame') {
        if (!titleLower.includes('maintenance engineer') && !titleLower.includes('রক্ষণাবেক্ষণ প্রকৌশলী')) return false;
      } else if (q === 'ad') {
        if (!titleLower.includes('assistant director') && !titleLower.includes('সহকারী পরিচালক')) return false;
      } else if (q === 'am') {
        if (!titleLower.includes('assistant manager') && !titleLower.includes('সহকারী ব্যবস্থাপক')) return false;
      } else {
        const matchTitle = titleLower.includes(q);
        const matchOrg = orgLower.includes(q);
        const matchReq = reqLower.includes(q);
        const matchCand = candLower.includes(q);
        if (!matchTitle && !matchOrg && !matchReq && !matchCand) return false;
      }
    }

    return true;
  });

  // Sort: Active jobs sorted by deadline ascending; Expired sorted by deadline descending
  filtered.sort((a, b) => {
    const da = getDaysUntilDeadline(a.deadline_date, refDate);
    const db = getDaysUntilDeadline(b.deadline_date, refDate);
    if (da < 0 && db < 0) return db - da; // most recently expired first
    return da - db; // earliest deadline first
  });

  // Update counter
  if (countEl) countEl.textContent = `${filtered.length} Circular${filtered.length === 1 ? '' : 's'}`;

  const statusEl = document.getElementById('filter-status-text');
  if (statusEl) {
    let tLabel = 'All Active Circulars';
    if (timeline === TIMELINE_TYPES.JUST_IN_5) tLabel = '✨ Just In (0–5 Days)';
    else if (timeline === TIMELINE_TYPES.CLOSING_SOON_3) tLabel = '🚨 Closing in ≤ 3 Days';
    else if (timeline === TIMELINE_TYPES.EXPIRED) tLabel = '📦 Expired / Archived Circulars';

    let cLabel = '';
    if (candidate === 'DUDU') cLabel = ' • Dudu (CSE)';
    else if (candidate === 'BUBU') cLabel = ' • Bubu (Agri)';
    else if (candidate === 'BOTH') cLabel = ' • Both (Joint)';

    let ptLabel = '';
    if (pt === 'TOP_POSTS') ptLabel = ' • 👑 Top Posts';
    else if (pt === 'IT_OFFICER') ptLabel = ' • 💻 IT Officers';
    else if (pt === 'AM_AD') ptLabel = ' • 🎯 AM & AD';
    else if (pt === 'COMP_OPERATOR') ptLabel = ' • 🖥️ Computer Op';
    else if (pt === 'OFFICE_SOHAYOK') ptLabel = ' • 🏢 Office Sohayok';
    else if (pt === 'ACCOUNTS') ptLabel = ' • 💰 Accounts';

    let gLabel = grade !== 'ALL' ? ` • Grade ${grade}` : '';
    let dLabel = dayWindowFilter !== 'ALL' ? ` • ≤ ${dayWindowFilter}d Left` : '';

    statusEl.textContent = `Showing: ${tLabel}${cLabel}${ptLabel}${gLabel}${dLabel}`;
  }

  // Clear & render
  container.innerHTML = '';
  if (filtered.length === 0) {
    container.appendChild(renderEmptyState());
  } else {
    filtered.forEach(job => {
      const info = classifyJobTimeline(job, refDate);
      const userAppliedRecord = state.appliedRecords[job.id];
      container.appendChild(renderJobCard(job, info, userAppliedRecord));
    });
  }

  updateTabStyles();
}

/**
 * Update active styles on tabs and buttons
 */
function updateTabStyles() {
  const { timeline, candidate, postType } = state.filters;

  // Candidate tabs
  ['all', 'dudu', 'bubu', 'both'].forEach(c => {
    const btn = document.getElementById(`tab-cand-${c}`);
    if (btn) {
      if (candidate.toLowerCase() === c) {
        btn.className = 'px-3.5 py-1.5 rounded-lg text-xs font-bold bg-white text-slate-900 shadow-sm transition';
      } else {
        btn.className = 'px-3.5 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:text-slate-900 transition';
      }
    }
  });

  // Urgency tabs
  const tabActive = document.getElementById('tab-urg-active');
  const tabJustIn = document.getElementById('tab-urg-justin');
  const tabUrgent3 = document.getElementById('tab-urg-urgent');
  const tabArchived = document.getElementById('tab-urg-archived');

  if (tabActive) {
    tabActive.className = timeline === TIMELINE_TYPES.ALL_ACTIVE
      ? 'px-3 py-1.5 rounded-lg text-xs font-bold bg-white text-slate-900 shadow-sm transition'
      : 'px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:text-slate-900 transition';
  }

  if (tabJustIn) {
    tabJustIn.className = timeline === TIMELINE_TYPES.JUST_IN_5
      ? 'px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 text-white shadow-sm transition flex items-center gap-1'
      : 'px-3 py-1.5 rounded-lg text-xs font-bold text-emerald-700 hover:bg-emerald-100 transition flex items-center gap-1';
  }

  if (tabUrgent3) {
    tabUrgent3.className = timeline === TIMELINE_TYPES.CLOSING_SOON_3
      ? 'px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-600 text-white shadow-sm transition flex items-center gap-1'
      : 'px-3 py-1.5 rounded-lg text-xs font-bold text-rose-700 hover:bg-rose-100 transition flex items-center gap-1';
  }

  if (tabArchived) {
    tabArchived.className = timeline === TIMELINE_TYPES.EXPIRED
      ? 'px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-700 text-white shadow-sm transition'
      : 'px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:text-slate-900 transition';
  }

  // Quick chip active styling
  const chips = [
    { id: 'chip-top', val: 'TOP_POSTS', activeCls: 'bg-amber-600 text-white ring-2 ring-amber-400 font-bold', inactiveCls: 'bg-amber-50 text-amber-800 border border-amber-200/80 font-bold hover:bg-amber-100' },
    { id: 'chip-it', val: 'IT_OFFICER', activeCls: 'bg-blue-600 text-white ring-2 ring-blue-400 font-bold', inactiveCls: 'bg-blue-50 text-blue-800 border border-blue-200/80 font-bold hover:bg-blue-100' },
    { id: 'chip-amad', val: 'AM_AD', activeCls: 'bg-indigo-600 text-white ring-2 ring-indigo-400 font-bold', inactiveCls: 'bg-indigo-50 text-indigo-800 border border-indigo-200/80 font-bold hover:bg-indigo-100' },
    { id: 'chip-co', val: 'COMP_OPERATOR', activeCls: 'bg-slate-700 text-white ring-2 ring-slate-400 font-bold', inactiveCls: 'bg-slate-100 text-slate-800 border border-slate-200 font-semibold hover:bg-slate-200' },
    { id: 'chip-os', val: 'OFFICE_SOHAYOK', activeCls: 'bg-emerald-700 text-white ring-2 ring-emerald-400 font-bold', inactiveCls: 'bg-emerald-50 text-emerald-800 border border-emerald-200/80 font-semibold hover:bg-emerald-100' },
    { id: 'chip-acc', val: 'ACCOUNTS', activeCls: 'bg-teal-700 text-white ring-2 ring-teal-400 font-bold', inactiveCls: 'bg-teal-50 text-teal-800 border border-teal-200/80 font-semibold hover:bg-teal-100' },
    { id: 'chip-steno', val: 'STENO_TYPIST', activeCls: 'bg-slate-700 text-white ring-2 ring-slate-400 font-bold', inactiveCls: 'bg-slate-100 text-slate-800 border border-slate-200 font-semibold hover:bg-slate-200' },
  ];

  chips.forEach(c => {
    const el = document.getElementById(c.id);
    if (el) {
      if (postType === c.val) {
        el.className = `px-2.5 py-1 rounded-lg ${c.activeCls} transition whitespace-nowrap active:scale-95 flex items-center gap-1 shadow-sm`;
      } else {
        el.className = `px-2.5 py-1 rounded-lg ${c.inactiveCls} transition whitespace-nowrap active:scale-95 flex items-center gap-1`;
      }
    }
  });

  const postSelect = document.getElementById('post-type-select');
  if (postSelect && postSelect.value !== (postType || 'ALL')) {
    postSelect.value = postType || 'ALL';
  }

  // Mobile Bottom Navigation active states
  ['active', 'justin', 'urgent', 'archived'].forEach(navId => {
    const navBtn = document.getElementById(`nav-btn-${navId}`);
    if (!navBtn) return;
    let isActive = false;
    if (navId === 'active' && timeline === TIMELINE_TYPES.ALL_ACTIVE) isActive = true;
    if (navId === 'justin' && timeline === TIMELINE_TYPES.JUST_IN_5) isActive = true;
    if (navId === 'urgent' && timeline === TIMELINE_TYPES.CLOSING_SOON_3) isActive = true;
    if (navId === 'archived' && timeline === TIMELINE_TYPES.EXPIRED) isActive = true;

    if (isActive) {
      navBtn.classList.add('text-emerald-600', 'font-bold');
      navBtn.classList.remove('text-slate-500', 'font-medium');
    } else {
      navBtn.classList.remove('text-emerald-600', 'font-bold');
      navBtn.classList.add('text-slate-500', 'font-medium');
    }
  });
}

/**
 * System clock display
 */
function updateClockDisplay() {
  const display = document.getElementById('current-date-display');
  if (display) {
    const today = state.referenceDate;
    display.textContent = `Today: ${today.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;
  }
}

/**
 * Setup event listeners & register global handlers
 */
function setupEventListeners() {
  // Global handlers for inline HTML event attributes
  window.setCandidateFilter = (candidate) => {
    state.filters.candidate = candidate;
    renderJobs();
  };

  window.setUrgencyFilter = (filterType) => {
    if (filterType === 'ACTIVE') state.filters.timeline = TIMELINE_TYPES.ALL_ACTIVE;
    else if (filterType === 'JUST_IN_5' || filterType === 'JUSTIN') state.filters.timeline = TIMELINE_TYPES.JUST_IN_5;
    else if (filterType === 'URGENT_3' || filterType === 'URGENT_5' || filterType === 'URGENT') state.filters.timeline = TIMELINE_TYPES.CLOSING_SOON_3;
    else if (filterType === 'ARCHIVED' || filterType === 'EXPIRED') state.filters.timeline = TIMELINE_TYPES.EXPIRED;
    else state.filters.timeline = TIMELINE_TYPES.ALL;

    renderJobs();
  };

  window.handleDayWindowChange = (val) => {
    dayWindowFilter = val;
    renderJobs();
  };

  window.handleGradeChange = (val) => {
    state.filters.grade = val;
    renderJobs();
  };

  let searchTimeout = null;
  window.handleSearch = (val) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      state.filters.search = val;
      renderJobs();
    }, 150);
  };

  window.setPostTypeFilter = (pt) => {
    state.filters.postType = pt;
    const s = document.getElementById('post-type-select');
    if (s) s.value = pt;
    renderJobs();
  };

  window.handlePostTypeChange = (val) => {
    state.filters.postType = val;
    renderJobs();
  };

  window.resetAllFilters = () => {
    state.filters.timeline = TIMELINE_TYPES.ALL_ACTIVE;
    state.filters.candidate = 'ALL';
    state.filters.grade = 'ALL';
    state.filters.postType = 'ALL';
    state.filters.search = '';
    dayWindowFilter = 'ALL';

    const searchInput = document.getElementById('search-input');
    const daySelect = document.getElementById('day-window-select');
    const gradeSelect = document.getElementById('grade-select');
    const postSelect = document.getElementById('post-type-select');

    if (searchInput) searchInput.value = '';
    if (daySelect) daySelect.value = 'ALL';
    if (gradeSelect) gradeSelect.value = 'ALL';
    if (postSelect) postSelect.value = 'ALL';

    renderJobs();
  };

  window.resetFiltersHandler = window.resetAllFilters;

  window.reloadCirculars = () => {
    loadCirculars();
  };

  window.installPWA = installPWA;
  window.dismissMobileBanner = dismissMobileBanner;
}

/**
 * Parse URL query parameters
 */
function parseURLParams() {
  const params = new URLSearchParams(window.location.search);
  const cand = params.get('cand');
  const filter = params.get('filter');

  if (cand) {
    const uc = cand.toUpperCase();
    if (['DUDU', 'BUBU', 'BOTH', 'ALL'].includes(uc)) {
      state.filters.candidate = uc;
    }
  }

  if (filter) {
    const lf = filter.toLowerCase();
    if (lf === 'just_in' || lf === 'justin' || lf === 'fresh') {
      state.filters.timeline = TIMELINE_TYPES.JUST_IN_5;
    } else if (lf === 'urgent' || lf === 'urgent_3') {
      state.filters.timeline = TIMELINE_TYPES.CLOSING_SOON_3;
    } else if (lf === 'archived' || lf === 'expired') {
      state.filters.timeline = TIMELINE_TYPES.EXPIRED;
    }
  }
}

// Subscribe reactive state listener
subscribe(() => {
  renderJobs();
});

// Start on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
