/**
 * Bubu-Dudu Job Portal - Main Orchestrator Module
 * Connects Timeline, State, Favorites, Components, and PWA into a cohesive application.
 */
(function(window) {
  'use strict';

  let dayWindowFilter = 'ALL';
  let searchTimeout = null;

  async function loadCirculars() {
    const container = document.getElementById('jobs-grid');
    const countEl = document.getElementById('visible-count');
    if (countEl) countEl.textContent = 'Loading...';

    let loadedData = null;

    // 1. Instant file:/// and offline support
    const preloaded = window.BUBU_DUDU_CIRCULARS || window.CIRCULARS_DATA;
    if (preloaded && Array.isArray(preloaded) && preloaded.length > 0) {
      loadedData = preloaded;
    }

    // 2. Fetch fresh JSON over HTTP/HTTPS
    if (window.location.protocol.startsWith('http')) {
      try {
        const res = await fetch(`./data/circulars.json?_t=${Date.now()}`);
        if (res.ok) {
          const fresh = await res.json();
          if (Array.isArray(fresh) && fresh.length > 0) loadedData = fresh;
        }
      } catch (e) {
        console.warn('Network fetch skipped, using preloaded data:', e);
      }
    }

    if (loadedData) {
      window.state.circulars = loadedData;
      if (window.populateDateReportedOptions) window.populateDateReportedOptions();
      computeAndRenderMetrics();
      if (window.updateFavoritesCount) window.updateFavoritesCount();
      renderJobs();
    } else {
      if (container) {
        container.innerHTML = `
          <div class="col-span-full py-12 text-center bg-white rounded-2xl border border-red-200 p-6 space-y-3">
            <div class="text-4xl">⚠️</div>
            <h3 class="text-base font-bold text-red-700">Data File Not Loaded</h3>
            <p class="text-xs text-slate-500">Ensure data/circulars.js or data/circulars.json is present.</p>
            <button onclick="window.reloadCirculars()" class="px-4 py-2 text-xs font-bold text-white bg-red-600 rounded-xl hover:bg-red-700">
              Retry Loading
            </button>
          </div>
        `;
      }
    }
  }

  function computeAndRenderMetrics() {
    const refDate = window.state.referenceDate;
    let active = 0, justIn = 0, urgent3 = 0, dudu = 0, bubu = 0, both = 0;

    window.state.circulars.forEach(job => {
      if (!window.isPureOfficeJob(job)) return;
      const info = window.classifyJobTimeline(job, refDate);
      if (!info.isExpired && info.daysLeft >= 0) {
        active++;
        if (info.isJustIn5) justIn++;
        if (info.isClosingSoon3) urgent3++;
        if (job.candidate_eligibility === 'DUDU' || job.candidate_eligibility === 'BOTH') dudu++;
        if (job.candidate_eligibility === 'BUBU' || job.candidate_eligibility === 'BOTH') bubu++;
        if (job.candidate_eligibility === 'BOTH') both++;
      }
    });

    if (window.renderMetrics) {
      window.renderMetrics({ active, justIn, urgent3, dudu, bubu, both });
    }
  }

  function renderJobs() {
    const container = document.getElementById('jobs-grid');
    const countEl = document.getElementById('visible-count');
    const statusEl = document.getElementById('filter-status-text');
    if (!container) return;

    const refDate = window.state.referenceDate;
    const { timeline, candidate, grade, search, postType, dateReported, showFavoritesOnly, sortBy } = window.state.filters;
    const pt = postType || 'ALL';

    const filtered = window.state.circulars.filter(job => {
      if (!window.isPureOfficeJob(job)) return false;

      const info = window.classifyJobTimeline(job, refDate);
      if (info.isExpired || info.daysLeft < 0) return false;

      // 0. Favorites Filter
      if (showFavoritesOnly && window.isFavorite && !window.isFavorite(job.id)) return false;

      // 1. Timeline Category Filter
      if (timeline === window.TIMELINE_TYPES.JUST_IN_5 && !info.isJustIn5) return false;
      if (timeline === window.TIMELINE_TYPES.CLOSING_SOON_3 && !info.isClosingSoon3) return false;

      // 2. Candidate Filter
      if (candidate === 'DUDU' && job.candidate_eligibility !== 'DUDU' && job.candidate_eligibility !== 'BOTH') return false;
      if (candidate === 'BUBU' && job.candidate_eligibility !== 'BUBU' && job.candidate_eligibility !== 'BOTH') return false;
      if (candidate === 'BOTH' && job.candidate_eligibility !== 'BOTH') return false;

      // 3. Day Window Filter
      if (dayWindowFilter !== 'ALL') {
        const maxDays = parseInt(dayWindowFilter, 10);
        if (info.daysLeft > maxDays) return false;
      }

      // 4. Grade Filter
      if (grade !== 'ALL') {
        const gNum = parseInt(String(job.grade).replace(/\D+/g, ''), 10);
        if (gNum !== parseInt(grade, 10)) return false;
      }

      // 5. Post Type / Designation Category Filter
      if (pt !== 'ALL') {
        if (pt === 'TOP_POSTS') {
          if (job.grade > 9 && job.designation_category !== 'TOP_POSTS') return false;
        } else if (job.designation_category !== pt) {
          return false;
        }
      }

      // 6. Search Term Filter
      if (search && search.trim() !== '') {
        const q = search.trim().toLowerCase();
        const titleLower = `${job.title || ''} ${job.title_en || ''} ${job.title_bn || ''}`.toLowerCase();
        const orgLower = `${job.organization || ''} ${job.org_code || ''}`.toLowerCase();
        const reqLower = `${job.min_education || job.education_requirements || ''}`.toLowerCase();
        const candLower = `${job.candidate_eligibility || ''}`.toLowerCase();

        if (q === 'ap') {
          if (!titleLower.includes('assistant programmer') && !titleLower.includes('সহকারী প্রোগ্রামার')) return false;
        } else if (q === 'ame') {
          if (!titleLower.includes('maintenance engineer') && !titleLower.includes('রক্ষণাবেক্ষণ প্রকৌশলী')) return false;
        } else if (q === 'ad') {
          if (!titleLower.includes('assistant director') && !titleLower.includes('সহকারী পরিচালক')) return false;
        } else if (q === 'am') {
          if (!titleLower.includes('assistant manager') && !titleLower.includes('সহকারী ব্যবস্থাপক')) return false;
        } else {
          if (!titleLower.includes(q) && !orgLower.includes(q) && !reqLower.includes(q) && !candLower.includes(q)) return false;
        }
      }

      // 7. Date Reported / Published Filter
      const dr = dateReported || 'ALL';
      if (dr !== 'ALL') {
        const pubStr = (job.published_date || job.publish_date || '').split('T')[0];
        if (!pubStr) return false;
        const refDateIso = refDate.toISOString().split('T')[0];
        if (dr === 'TODAY') {
          if (pubStr !== refDateIso) return false;
        } else if (dr === 'LAST_3_DAYS') {
          if (info.daysOld > 3) return false;
        } else if (dr === 'LAST_7_DAYS') {
          if (info.daysOld > 7) return false;
        } else if (dr === 'LAST_14_DAYS') {
          if (info.daysOld > 14) return false;
        } else {
          if (pubStr !== dr) return false;
        }
      }

      return true;
    });

    // Sorting
    const activeSort = sortBy || 'GRADE_ASC';
    filtered.sort((a, b) => {
      const da = window.getDaysUntilDeadline(a.deadline_date, refDate);
      const db = window.getDaysUntilDeadline(b.deadline_date, refDate);
      const ga = parseInt(String(a.grade || 99).replace(/\D+/g, ''), 10) || 99;
      const gb = parseInt(String(b.grade || 99).replace(/\D+/g, ''), 10) || 99;

      if (activeSort === 'GRADE_ASC') {
        if (ga !== gb) return ga - gb;
        return da - db;
      } else if (activeSort === 'GRADE_DESC') {
        if (ga !== gb) return gb - ga;
        return da - db;
      } else if (activeSort === 'REPORTED_DESC' || activeSort === 'NEWEST') {
        const pa = new Date(a.published_date || a.publish_date || '2026-01-01').getTime();
        const pb = new Date(b.published_date || b.publish_date || '2026-01-01').getTime();
        if (pa !== pb) return pb - pa;
        return ga - gb;
      } else if (activeSort === 'REPORTED_ASC') {
        const pa = new Date(a.published_date || a.publish_date || '2026-01-01').getTime();
        const pb = new Date(b.published_date || b.publish_date || '2026-01-01').getTime();
        if (pa !== pb) return pa - pb;
        return ga - gb;
      } else if (activeSort === 'DEADLINE_DESC') {
        return db - da;
      } else { // DEADLINE_ASC
        if (da !== db) return da - db;
        return ga - gb;
      }
    });

    if (countEl) countEl.textContent = `${filtered.length} Active Circular${filtered.length === 1 ? '' : 's'}`;

    if (statusEl) {
      let tLabel = 'All Active Circulars';
      if (timeline === window.TIMELINE_TYPES.JUST_IN_5) tLabel = '✨ Just In (0–5 Days)';
      else if (timeline === window.TIMELINE_TYPES.CLOSING_SOON_3) tLabel = '🚨 Closing in ≤ 3 Days';

      let cLabel = '';
      if (candidate === 'DUDU') cLabel = ' • Dudu (CSE)';
      else if (candidate === 'BUBU') cLabel = ' • Bubu (Agri)';
      else if (candidate === 'BOTH') cLabel = ' • Both (Joint)';

      let favLabel = showFavoritesOnly ? ' • ❤️ Favorites Only' : '';
      statusEl.textContent = `Showing: ${tLabel}${cLabel}${favLabel}`;
    }

    container.innerHTML = '';
    if (filtered.length === 0) {
      container.appendChild(window.renderEmptyState());
    } else {
      filtered.forEach(job => {
        const info = window.classifyJobTimeline(job, refDate);
        const userAppliedRecord = window.state.appliedRecords[job.id];
        container.appendChild(window.renderJobCard(job, info, userAppliedRecord));
      });
    }
  }

  // Window Event Handlers
  window.setCandidateFilter = function(cand) {
    window.state.filters.candidate = cand;
    renderJobs();
  };

  window.setUrgencyFilter = function(filterType) {
    if (filterType === 'JUST_IN_5' || filterType === 'JUSTIN') {
      window.state.filters.timeline = window.TIMELINE_TYPES.JUST_IN_5;
    } else if (filterType === 'URGENT_3' || filterType === 'URGENT') {
      window.state.filters.timeline = window.TIMELINE_TYPES.CLOSING_SOON_3;
    } else {
      window.state.filters.timeline = window.TIMELINE_TYPES.ALL_ACTIVE;
    }
    renderJobs();
  };

  window.handleDayWindowChange = function(val) {
    dayWindowFilter = val;
    renderJobs();
  };

  window.handleGradeChange = function(val) {
    window.state.filters.grade = val;
    renderJobs();
  };

  window.handleSortChange = function(val) {
    window.state.filters.sortBy = val;
    renderJobs();
  };

  window.handleSearch = function(val) {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      window.state.filters.search = val;
      renderJobs();
    }, 150);
  };

  window.handlePostTypeChange = function(val) {
    window.state.filters.postType = val;
    renderJobs();
  };

  window.handleDateReportedChange = function(val) {
    window.state.filters.dateReported = val;
    renderJobs();
  };

  window.setDateReportedFilter = function(dateStr) {
    window.state.filters.dateReported = dateStr;
    const sel = document.getElementById('date-reported-select');
    if (sel) sel.value = dateStr;
    renderJobs();
    document.getElementById('jobs-grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  window.resetAllFilters = function() {
    window.state.filters.timeline = window.TIMELINE_TYPES.ALL_ACTIVE;
    window.state.filters.candidate = 'ALL';
    window.state.filters.grade = 'ALL';
    window.state.filters.postType = 'ALL';
    window.state.filters.dateReported = 'ALL';
    window.state.filters.sortBy = 'GRADE_ASC';
    window.state.filters.search = '';
    window.state.filters.showFavoritesOnly = false;
    dayWindowFilter = 'ALL';

    const searchInput = document.getElementById('search-input');
    const daySelect = document.getElementById('day-window-select');
    const gradeSelect = document.getElementById('grade-select');
    const postSelect = document.getElementById('post-type-select');
    const dateRepSelect = document.getElementById('date-reported-select');
    const sortSelect = document.getElementById('sort-select');

    if (searchInput) searchInput.value = '';
    if (daySelect) daySelect.value = 'ALL';
    if (gradeSelect) gradeSelect.value = 'ALL';
    if (postSelect) postSelect.value = 'ALL';
    if (dateRepSelect) dateRepSelect.value = 'ALL';
    if (sortSelect) sortSelect.value = 'GRADE_ASC';

    if (window.updateFavoritesButtonUI) window.updateFavoritesButtonUI(false);
    renderJobs();
  };

  window.reloadCirculars = async function() {
    if ('caches' in window) {
      try {
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k)));
      } catch (e) {}
    }
    if (window.location.protocol.startsWith('http')) {
      window.location.reload();
    } else {
      loadCirculars();
    }
  };

  function parseURLParams() {
    const params = new URLSearchParams(window.location.search);
    const cand = params.get('cand');
    const filter = params.get('filter');
    const sort = params.get('sort');
    const reported = params.get('reported') || params.get('date');
    const favs = params.get('favs');

    if (cand && ['DUDU', 'BUBU', 'BOTH', 'ALL'].includes(cand.toUpperCase())) {
      window.state.filters.candidate = cand.toUpperCase();
    }
    if (filter) {
      const lf = filter.toLowerCase();
      if (['just_in', 'justin', 'fresh'].includes(lf)) {
        window.state.filters.timeline = window.TIMELINE_TYPES.JUST_IN_5;
      } else if (['urgent', 'urgent_3'].includes(lf)) {
        window.state.filters.timeline = window.TIMELINE_TYPES.CLOSING_SOON_3;
      }
    }
    if (reported) {
      window.state.filters.dateReported = reported;
      const sel = document.getElementById('date-reported-select');
      if (sel) sel.value = reported;
    }
    if (sort) {
      window.state.filters.sortBy = sort.toUpperCase();
    }
    if (favs === '1' || favs === 'true') {
      window.state.filters.showFavoritesOnly = true;
      if (window.updateFavoritesButtonUI) window.updateFavoritesButtonUI(true);
    }
  }

  function updateClockDisplay() {
    const el = document.getElementById('current-date-display');
    if (!el) return;
    const now = new Date();
    const opts = { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' };
    el.textContent = `Today: ${now.toLocaleDateString('en-GB', opts)}`;
  }

  function boot() {
    if (window.loadAppliedRecords) window.loadAppliedRecords();
    if (window.loadFavorites) window.loadFavorites();
    if (window.initPWA) window.initPWA();
    parseURLParams();
    updateClockDisplay();
    loadCirculars();
  }

  window.renderJobs = renderJobs;
  window.computeAndRenderMetrics = computeAndRenderMetrics;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

})(window);
