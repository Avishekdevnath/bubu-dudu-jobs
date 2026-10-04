/**
 * Bubu-Dudu Job Portal - Universal Production Bundle
 * Supports BOTH:
 *  1. Direct file:/// double-click in any browser (Zero CORS issues via window.BUBU_DUDU_CIRCULARS)
 *  2. HTTP / HTTPS / PWA environments (Live fetch & Service Worker caching)
 */
(function() {
  'use strict';

  // ==========================================
  // 1. TIMELINE & CLASSIFIER MODULE
  // ==========================================
  const TIMELINE_TYPES = {
    ALL_ACTIVE: 'ALL_ACTIVE',
    JUST_IN_5: 'JUST_IN_5',           // Published in last 0-5 days
    CLOSING_SOON_3: 'CLOSING_SOON_3', // 3 days or less remaining
    EXPIRED: 'EXPIRED',               // Deadline passed
    ALL: 'ALL'
  };

  const NON_OFFICE_PATTERNS = [
    /driver|চালক|ড্রাইভার|টিলার|tractor|bulldozer|truck/i,
    /cook|বাবুর্চি/i,
    /attendant|এটেনডেন্ট|বেয়ারার|bearer|peon|পিয়ন|খালাসী|khalasi/i,
    /plumber|প্লাম্বার|পাইপ/i,
    /electrician|ইলেকট্রিশিয়ান|কারিগর|lineman|লাইনম্যান/i,
    /meson|ম্যাশন|মেসন|রাজমিস্ত্রি/i,
    /painter|পেইন্টার|রংমিস্ত্রি/i,
    /hammerman|হ্যামারম্যান|হাতুড়ে/i,
    /pump operator|পাম্প অপারেটর|বয়লার|boiler/i,
    /cleaner|পরিচ্ছন্নতাকর্মী|ঝাড়ুদার|সুইপার|sweeper|মালী|mali|gardener/i,
    /guard|প্রহরী|দারোয়ান|চৌকিদার|আনসার|ansar|security/i,
    /groundsman|গ্রাউন্ডসম্যান|ground service/i,
    /fire safety|ফায়ার সেফটি/i,
    /mate|মেট|লেবার|labour|কুলি|porter|হেলপার|helper/i,
    /representative|প্রতিনিধি|বিক্রয়|sales/i,
    /mechanic|মেকানিক|ফিটার|fitter|মিস্ত্রি|foreman|ফোরম্যান|workshop/i,
    /chainman|চেইনম্যান/i,
    /preparer|প্রিপেয়ারার|photocopy|ফটোকপি|printing assistant|প্রিন্টিং/i,
    /health assistant|স্বাস্থ্য সহকারী/i,
    /cold chain|কোল্ড চেইন/i,
    /medical technologist|মেডিকেল টেকনোলজিস্ট|pharmacist|ফার্মাসিস্ট|মেডিকেল অফিসার|medical officer/i
  ];

  function isPureOfficeJob(job) {
    const text = `${job.title || ''} ${job.min_education || job.education_requirements || ''}`.toLowerCase();
    for (const pat of NON_OFFICE_PATTERNS) {
      if (pat.test(text)) return false;
    }
    return true;
  }

  function getDaysUntilDeadline(deadlineStr, referenceDate) {
    const deadline = new Date(deadlineStr + 'T23:59:59');
    const diff = deadline - referenceDate;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  function getDaysSincePublish(publishStr, referenceDate) {
    if (!publishStr) return 999;
    const published = new Date(publishStr + 'T00:00:00');
    const diff = referenceDate - published;
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  function classifyJobTimeline(job, referenceDate) {
    const daysLeft = getDaysUntilDeadline(job.deadline_date, referenceDate);
    const daysOld = getDaysSincePublish(job.published_date || job.publish_date, referenceDate);

    if (daysLeft < 0) {
      return {
        category: TIMELINE_TYPES.EXPIRED,
        daysLeft,
        daysOld,
        isExpired: true,
        isClosingSoon3: false,
        isJustIn5: false
      };
    }

    const isClosingSoon3 = daysLeft <= 3;
    const isJustIn5 = daysOld >= 0 && daysOld <= 5;

    let primaryCategory = TIMELINE_TYPES.ALL_ACTIVE;
    if (isClosingSoon3) {
      primaryCategory = TIMELINE_TYPES.CLOSING_SOON_3;
    } else if (isJustIn5) {
      primaryCategory = TIMELINE_TYPES.JUST_IN_5;
    }

    return {
      category: primaryCategory,
      daysLeft,
      daysOld,
      isExpired: false,
      isClosingSoon3,
      isJustIn5
    };
  }

  function renderDeadlineBadge(daysLeft) {
    if (daysLeft < 0) {
      return `<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
        📦 Expired (${Math.abs(daysLeft)}d ago)
      </span>`;
    }
    if (daysLeft === 0) {
      return `<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-rose-600 text-white animate-pulse glow-urgent">
        🔥 Last Day Today!
      </span>`;
    }
    if (daysLeft === 1) {
      return `<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-rose-600 text-white glow-urgent">
        ⚡ Closes Tomorrow!
      </span>`;
    }
    if (daysLeft <= 3) {
      return `<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-rose-100 text-rose-700 border border-rose-300 glow-urgent">
        🚨 ${daysLeft} Days Left
      </span>`;
    }
    if (daysLeft <= 7) {
      return `<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
        ⏳ ${daysLeft} Days Left
      </span>`;
    }
    return `<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
      🟢 ${daysLeft} Days Left
    </span>`;
  }

  function renderFreshnessBadge(daysOld) {
    if (daysOld === 0) {
      return `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300 glow-just-in">
        ✨ Just Dropped Today!
      </span>`;
    }
    if (daysOld <= 2) {
      return `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
        ✨ New (${daysOld}d ago)
      </span>`;
    }
    if (daysOld <= 5) {
      return `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 text-slate-700">
        🆕 ${daysOld}d ago
      </span>`;
    }
    return '';
  }

  // ==========================================
  // 2. STATE MODULE
  // ==========================================
  const state = {
    circulars: [],
    referenceDate: new Date('2026-10-04T00:00:00'),
    filters: {
      timeline: TIMELINE_TYPES.ALL_ACTIVE,
      candidate: 'ALL',
      grade: 'ALL',
      postType: 'ALL', // 'ALL', 'TOP_POSTS', 'IT_OFFICER', 'AM_AD', 'COMP_OPERATOR', 'STENO_TYPIST', 'OFFICE_ASST', 'OFFICE_SOHAYOK', 'ACCOUNTS'
      search: ''
    },
    appliedRecords: {}
  };

  let dayWindowFilter = 'ALL';
  const APPLIED_STORAGE_KEY = 'bubu_dudu_job_applications';

  function loadAppliedRecords() {
    try {
      const raw = localStorage.getItem(APPLIED_STORAGE_KEY);
      if (raw) state.appliedRecords = JSON.parse(raw);
    } catch (e) {
      state.appliedRecords = {};
    }
  }

  // ==========================================
  // 3. COMPONENT RENDERER MODULE
  // ==========================================
  function renderMetrics(stats) {
    ['stat-active', 'stat-active-m'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = stats.active ?? 0;
    });
    ['stat-just-in', 'stat-just-in-m'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = stats.justIn ?? 0;
    });
    ['stat-urgent-3', 'stat-urgent-3-m'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = stats.urgent3 ?? 0;
    });
    ['stat-dudu', 'stat-dudu-m'].forEach(id => {
      const el = document.getElementById(id);
      if (el && stats.dudu !== undefined) el.textContent = stats.dudu;
    });
    ['stat-bubu', 'stat-bubu-m'].forEach(id => {
      const el = document.getElementById(id);
      if (el && stats.bubu !== undefined) el.textContent = stats.bubu;
    });
    ['stat-both', 'stat-both-m'].forEach(id => {
      const el = document.getElementById(id);
      if (el && stats.both !== undefined) el.textContent = stats.both;
    });
  }

  function renderJobCard(job, timelineInfo, userAppliedRecord) {
    const card = document.createElement('div');
    card.className = 'job-card bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md flex flex-col justify-between overflow-hidden relative group w-full min-w-0';

    let candTag = '';
    if (job.candidate_eligibility === 'DUDU') {
      candTag = '<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">💻 Dudu (CSE)</span>';
    } else if (job.candidate_eligibility === 'BUBU') {
      candTag = '<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal-50 text-teal-700 border border-teal-200">🌾 Bubu (Agri)</span>';
    } else {
      candTag = '<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">🤝 Both (Joint)</span>';
    }

    const deadlineBadge = renderDeadlineBadge(timelineInfo.daysLeft);
    const freshBadge = renderFreshnessBadge(timelineInfo.daysOld);

    const appliedInfo = userAppliedRecord || job.application_record;
    let appliedBanner = '';
    if (appliedInfo) {
      appliedBanner = `
        <div class="bg-emerald-50 border-t border-emerald-100 px-3.5 py-2 flex items-center justify-between text-[11px] font-semibold text-emerald-800">
          <span class="flex items-center gap-1.5 truncate">
            <span class="text-sm">✅</span> Applied by <strong>${appliedInfo.applied_by || 'Applicant'}</strong>
          </span>
          <span class="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-200 text-emerald-900 shrink-0">
            ${appliedInfo.payment_status || 'PAID'}
          </span>
        </div>
      `;
    }

    // Top Post / Officer Badge
    let topPostBadge = '';
    if (job.grade <= 9 || job.designation_category === 'TOP_POSTS') {
      topPostBadge = '<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300 shadow-xs">👑 TOP POST (Gr-' + job.grade + ')</span>';
    }

    card.innerHTML = `
      <div class="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3.5">
        <div>
          <div class="flex flex-wrap items-center justify-between gap-1.5 mb-2">
            <div class="flex flex-wrap items-center gap-1">
              <span class="text-[10px] font-extrabold tracking-wider px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 uppercase">
                Grade ${job.grade}
              </span>
              ${topPostBadge}
              ${freshBadge}
            </div>
            <div>
              ${deadlineBadge}
            </div>
          </div>

          <h4 class="text-sm sm:text-base font-bold text-slate-900 group-hover:text-emerald-700 transition leading-snug">
            ${job.title}
          </h4>

          <p class="text-xs text-slate-600 font-medium mt-1.5 flex items-center gap-1.5">
            <span class="text-slate-400">🏛️</span> ${job.organization}
          </p>

          <div class="flex flex-wrap items-center gap-2 mt-2.5">
            ${candTag}
            ${(job.vacancy_count || job.vacancies) > 0 ? `<span class="text-[11px] text-slate-500 font-semibold">• ${job.vacancy_count || job.vacancies} Vacanc${(job.vacancy_count || job.vacancies) === 1 ? 'y' : 'ies'}</span>` : ''}
          </div>
        </div>

        <div class="bg-slate-50 p-2.5 sm:p-3 rounded-xl border border-slate-100 text-xs text-slate-600 leading-relaxed">
          <span class="font-bold text-slate-800">শিক্ষাগত যোগ্যতা: </span>
          ${(job.min_education || job.education_requirements) ? ((job.min_education || job.education_requirements).length > 110 ? (job.min_education || job.education_requirements).slice(0, 110) + '...' : (job.min_education || job.education_requirements)) : 'বিস্তারিত মূল বিজ্ঞপ্তিতে দেখুন'}
        </div>

        <div class="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
          <span>📅 শেষ সময়: <strong class="text-slate-800 font-bold">${job.deadline_date}</strong></span>
          ${(job.published_date || job.publish_date) ? `<span class="text-[11px] text-slate-400">প্রকাশ: ${job.published_date || job.publish_date}</span>` : ''}
        </div>
      </div>

      <div class="px-4 pb-4 sm:px-5 sm:pb-5 pt-0 grid grid-cols-2 gap-2">
        <a href="${job.local_pdf_path || job.circular_url || job.pdf_url || '#'}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center justify-center gap-1 py-2 px-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition active:scale-95 truncate">
          ${job.local_pdf_path ? '📥 Verified PDF' : '📄 Circular PDF'}
        </a>
        <a href="${job.application_portal_url || job.apply_url || '#'}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center justify-center gap-1 py-2 px-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition shadow-sm shadow-emerald-600/20 active:scale-95 truncate">
          📝 Apply<span class="hidden sm:inline">&nbsp;Online</span> &rarr;
        </a>
      </div>

      ${appliedBanner}
    `;

    return card;
  }

  function renderEmptyState(message = 'No matching circulars found') {
    const container = document.createElement('div');
    container.className = 'col-span-full py-16 flex flex-col items-center justify-center bg-white rounded-2xl border border-slate-200 text-center space-y-3 p-6';
    container.innerHTML = `
      <div class="text-5xl">🔍</div>
      <h3 class="text-base font-bold text-slate-800">${message}</h3>
      <p class="text-xs text-slate-500 max-w-sm">No circulars match your active filters. Try switching to "All Active" or reset candidate filters.</p>
      <button onclick="window.resetAllFilters()" class="mt-2 px-4 py-2 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition active:scale-95">
        Reset All Filters
      </button>
    `;
    return container;
  }

  // ==========================================
  // 4. DATA LOADING (HYBRID FILE & HTTP)
  // ==========================================
  async function loadCirculars() {
    const container = document.getElementById('jobs-grid');
    const countEl = document.getElementById('visible-count');
    if (countEl) countEl.textContent = 'Loading...';

    let loadedData = null;

    // 1. First check if window.BUBU_DUDU_CIRCULARS is already present (instant, zero CORS, file:// compatible)
    if (window.BUBU_DUDU_CIRCULARS && Array.isArray(window.BUBU_DUDU_CIRCULARS) && window.BUBU_DUDU_CIRCULARS.length > 0) {
      loadedData = window.BUBU_DUDU_CIRCULARS;
      console.log('✅ Loaded', loadedData.length, 'circulars via window.BUBU_DUDU_CIRCULARS');
    }

    // 2. If running over http/https, attempt fetch for freshest data
    if (window.location.protocol.startsWith('http')) {
      try {
        const res = await fetch(`./data/circulars.json?_t=${Date.now()}`);
        if (res.ok) {
          const freshData = await res.json();
          if (Array.isArray(freshData) && freshData.length > 0) {
            loadedData = freshData;
            console.log('✅ Loaded fresh circulars via fetch API');
          }
        }
      } catch (e) {
        console.warn('Network fetch skipped or failed; using preloaded data:', e);
      }
    }

    if (loadedData) {
      state.circulars = loadedData;
      computeAndRenderMetrics();
      renderJobs();
    } else {
      console.error('No circulars data available');
      if (container) {
        container.innerHTML = `
          <div class="col-span-full py-12 text-center bg-white rounded-2xl border border-red-200 p-6 space-y-3">
            <div class="text-4xl">⚠️</div>
            <h3 class="text-base font-bold text-red-700">Data File Not Loaded</h3>
            <p class="text-xs text-slate-500">Ensure data/circulars.js or data/circulars.json is present in the job-portal directory.</p>
            <button onclick="window.reloadCirculars()" class="px-4 py-2 text-xs font-bold text-white bg-red-600 rounded-xl hover:bg-red-700">
              Retry Loading
            </button>
          </div>
        `;
      }
    }
  }

  // ==========================================
  // 5. METRICS & RENDERING (ACTIVE ONLY)
  // ==========================================
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
      // STRICT RULE: Only count active circulars on frontend page
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

  function renderJobs() {
    const container = document.getElementById('jobs-grid');
    const countEl = document.getElementById('visible-count');
    const statusEl = document.getElementById('filter-status-text');
    if (!container) return;

    const refDate = state.referenceDate;
    const { timeline, candidate, grade, search, postType } = state.filters;
    const pt = postType || 'ALL';

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

      // 3. Day Window Filter
      if (dayWindowFilter !== 'ALL') {
        const maxDays = parseInt(dayWindowFilter, 10);
        if (info.daysLeft > maxDays) return false;
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

    // Sort: Active by deadline ascending
    filtered.sort((a, b) => {
      const da = getDaysUntilDeadline(a.deadline_date, refDate);
      const db = getDaysUntilDeadline(b.deadline_date, refDate);
      return da - db;
    });

    // Update Counter & Status text
    if (countEl) countEl.textContent = `${filtered.length} Active Circular${filtered.length === 1 ? '' : 's'}`;

    if (statusEl) {
      let tLabel = 'All Active Open Circulars';
      if (timeline === TIMELINE_TYPES.JUST_IN_5) tLabel = '✨ Just In (0–5 Days)';
      else if (timeline === TIMELINE_TYPES.CLOSING_SOON_3) tLabel = '🚨 Closing in ≤ 3 Days';

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

  function updateTabStyles() {
    const { timeline, candidate, postType } = state.filters;

    ['all', 'dudu', 'bubu', 'both'].forEach(c => {
      const btn = document.getElementById(`tab-cand-${c}`);
      if (btn) {
        if (candidate.toLowerCase() === c) {
          btn.className = 'w-full py-2 px-1 text-center rounded-lg text-[11px] sm:text-xs font-bold bg-white text-slate-900 shadow-sm transition truncate';
        } else {
          btn.className = 'w-full py-2 px-1 text-center rounded-lg text-[11px] sm:text-xs font-bold text-slate-600 hover:text-slate-900 transition truncate';
        }
      }
    });

    const tabActive = document.getElementById('tab-urg-active');
    const tabJustIn = document.getElementById('tab-urg-justin');
    const tabUrgent3 = document.getElementById('tab-urg-urgent');

    if (tabActive) {
      tabActive.className = timeline === TIMELINE_TYPES.ALL_ACTIVE
        ? 'w-full py-2 px-1 text-center rounded-lg text-[11px] sm:text-xs font-bold bg-white text-slate-900 shadow-sm transition truncate'
        : 'w-full py-2 px-1 text-center rounded-lg text-[11px] sm:text-xs font-bold text-slate-600 hover:text-slate-900 transition truncate';
    }

    if (tabJustIn) {
      tabJustIn.className = timeline === TIMELINE_TYPES.JUST_IN_5
        ? 'w-full py-2 px-1 text-center rounded-lg text-[11px] sm:text-xs font-bold bg-emerald-600 text-white shadow-sm transition flex items-center justify-center gap-1 truncate'
        : 'w-full py-2 px-1 text-center rounded-lg text-[11px] sm:text-xs font-bold text-emerald-700 hover:bg-emerald-100 transition flex items-center justify-center gap-1 truncate';
    }

    if (tabUrgent3) {
      tabUrgent3.className = timeline === TIMELINE_TYPES.CLOSING_SOON_3
        ? 'w-full py-2 px-1 text-center rounded-lg text-[11px] sm:text-xs font-bold bg-rose-600 text-white shadow-sm transition flex items-center justify-center gap-1 truncate'
        : 'w-full py-2 px-1 text-center rounded-lg text-[11px] sm:text-xs font-bold text-rose-700 hover:bg-rose-100 transition flex items-center justify-center gap-1 truncate';
    }

    const postSelect = document.getElementById('post-type-select');
    if (postSelect && postSelect.value !== (postType || 'ALL')) {
      postSelect.value = postType || 'ALL';
    }

    ['active', 'justin', 'urgent'].forEach(navId => {
      const navBtn = document.getElementById(`nav-btn-${navId}`);
      if (!navBtn) return;
      let isActive = false;
      if (navId === 'active' && timeline === TIMELINE_TYPES.ALL_ACTIVE) isActive = true;
      if (navId === 'justin' && timeline === TIMELINE_TYPES.JUST_IN_5) isActive = true;
      if (navId === 'urgent' && timeline === TIMELINE_TYPES.CLOSING_SOON_3) isActive = true;

      if (isActive) {
        navBtn.classList.add('text-emerald-600', 'font-bold');
        navBtn.classList.remove('text-slate-500', 'font-medium');
      } else {
        navBtn.classList.remove('text-emerald-600', 'font-bold');
        navBtn.classList.add('text-slate-500', 'font-medium');
      }
    });

    const navBoth = document.getElementById('nav-btn-both');
    if (navBoth) {
      if (candidate === 'BOTH') {
        navBoth.classList.add('text-purple-600', 'font-bold');
        navBoth.classList.remove('text-slate-500', 'font-medium');
      } else {
        navBoth.classList.remove('text-purple-600', 'font-bold');
        navBoth.classList.add('text-slate-500', 'font-medium');
      }
    }
  }

  function updateClockDisplay() {
    const display = document.getElementById('current-date-display');
    if (display) {
      const today = state.referenceDate;
      display.textContent = `Today: ${today.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;
    }
  }

  // ==========================================
  // 6. PWA & LIFECYCLE
  // ==========================================
  let deferredPrompt = null;

  function initPWA() {
    if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
          .then(reg => console.log('✅ PWA ServiceWorker Registered:', reg.scope))
          .catch(err => console.warn('PWA ServiceWorker Registration Notice:', err));
      });
    }

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      const headerBtn = document.getElementById('pwa-install-btn');
      const mobileBanner = document.getElementById('mobile-pwa-banner');
      const bottomNavInstall = document.getElementById('nav-install-btn');

      if (headerBtn) headerBtn.classList.remove('hidden');
      if (bottomNavInstall) bottomNavInstall.classList.remove('hidden');
      if (mobileBanner && !sessionStorage.getItem('mobile_pwa_dismissed')) {
        mobileBanner.classList.remove('hidden');
      }
    });
  }

  async function installPWA() {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log('PWA install outcome:', outcome);
      deferredPrompt = null;
      document.getElementById('pwa-install-btn')?.classList.add('hidden');
      document.getElementById('mobile-pwa-banner')?.classList.add('hidden');
      document.getElementById('nav-install-btn')?.classList.add('hidden');
    } else {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
      if (isIOS) {
        alert("📱 To install on iPhone/iPad:\n1. Tap the Share button at bottom center (square with arrow up)\n2. Tap 'Add to Home Screen'\n3. Tap 'Add' at top right!");
      } else {
        alert("💡 To install this app:\nOpen in Chrome or Edge and click 'Install Job Portal' in your browser URL bar or settings menu.");
      }
    }
  }

  function dismissMobileBanner() {
    const banner = document.getElementById('mobile-pwa-banner');
    if (banner) banner.classList.add('hidden');
    sessionStorage.setItem('mobile_pwa_dismissed', 'true');
  }

  // ==========================================
  // 7. GLOBAL WINDOW EXPOSURES (FOR HTML ONCLICK)
  // ==========================================
  window.setCandidateFilter = function(cand) {
    state.filters.candidate = cand;
    renderJobs();
  };

  window.setUrgencyFilter = function(filterType) {
    if (filterType === 'JUST_IN_5' || filterType === 'JUSTIN') state.filters.timeline = TIMELINE_TYPES.JUST_IN_5;
    else if (filterType === 'URGENT_3' || filterType === 'URGENT_5' || filterType === 'URGENT') state.filters.timeline = TIMELINE_TYPES.CLOSING_SOON_3;
    else state.filters.timeline = TIMELINE_TYPES.ALL_ACTIVE;

    renderJobs();
  };

  window.handleDayWindowChange = function(val) {
    dayWindowFilter = val;
    renderJobs();
  };

  window.handleGradeChange = function(val) {
    state.filters.grade = val;
    renderJobs();
  };

  let searchTimeout = null;
  window.handleSearch = function(val) {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      state.filters.search = val;
      renderJobs();
    }, 150);
  };

  window.setPostTypeFilter = function(pt) {
    state.filters.postType = pt;
    const s = document.getElementById('post-type-select');
    if (s) s.value = pt;
    renderJobs();
  };

  window.handlePostTypeChange = function(val) {
    state.filters.postType = val;
    renderJobs();
  };

  window.resetAllFilters = function() {
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
  window.reloadCirculars = loadCirculars;
  window.installPWA = installPWA;
  window.dismissMobileBanner = dismissMobileBanner;

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
      }
    }
  }

  // ==========================================
  // 8. BOOTSTRAP
  // ==========================================
  function boot() {
    loadAppliedRecords();
    initPWA();
    parseURLParams();
    updateClockDisplay();
    loadCirculars();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

})();
