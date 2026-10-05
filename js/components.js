/**
 * Bubu-Dudu Job Portal - Component Renderer Module
 * Generates cards, action badges, streamlined metrics, empty states, and dropdowns.
 */
(function(window) {
  'use strict';

  function renderMetrics(stats) {
    // 4 Clean Top Dashboard KPIs
    ['stat-active', 'stat-active-m'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = stats.active ?? 0;
    });
    ['stat-just-in', 'stat-just-in-m'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = stats.justIn ?? 0;
    });
    ['stat-favs', 'stat-favs-m'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = stats.favorites ?? 0;
    });
    ['stat-applied', 'stat-applied-m'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = stats.applied ?? 0;
    });

    // Sidebar & Navigation Badges
    const badgeMap = {
      'sidebar-active-badge': stats.active,
      'sidebar-justin-badge': stats.justIn,
      'sidebar-urgent-badge': stats.urgent3,
      'sidebar-fav-badge': stats.favorites,
      'sidebar-applied-badge': stats.applied,
      'sidebar-ignored-badge': stats.ignored,
      'sidebar-dudu-badge': stats.dudu,
      'sidebar-bubu-badge': stats.bubu,
      'sidebar-both-badge': stats.both
    };

    Object.entries(badgeMap).forEach(([id, val]) => {
      const el = document.getElementById(id);
      if (el && val !== undefined) el.textContent = val;
    });
  }

  function formatReportedDate(dStr) {
    if (!dStr) return '';
    try {
      const dObj = new Date(dStr + 'T00:00:00');
      return dObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    } catch (e) {
      return dStr;
    }
  }

  function renderJobCard(job, timelineInfo, userAppliedRecord) {
    const card = document.createElement('div');
    const favd = window.isFavorite ? window.isFavorite(job.id) : false;
    const view = window.state ? window.state.currentView : 'FEED';
    const isIgnoredView = (view === 'IGNORED');
    const isAppliedView = (view === 'APPLIED');

    card.className = 'job-card bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md flex flex-col justify-between overflow-hidden relative group w-full min-w-0' + (favd ? ' is-favorited' : '');

    // Candidate Match Tag
    let candTag = '';
    if (job.candidate_eligibility === 'DUDU') {
      candTag = '<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">💻 Dudu (CSE)</span>';
    } else if (job.candidate_eligibility === 'BUBU') {
      candTag = '<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal-50 text-teal-700 border border-teal-200">🌾 Bubu (Agri)</span>';
    } else {
      candTag = '<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">🤝 Both (Joint)</span>';
    }

    const deadlineBadge = window.renderDeadlineBadge(timelineInfo.daysLeft);
    const freshBadge = window.renderFreshnessBadge(timelineInfo.daysOld);

    // Applied Banner
    const appliedInfo = userAppliedRecord || job.application_record;
    let appliedBanner = '';
    if (appliedInfo) {
      appliedBanner = `
        <div class="bg-emerald-50 border-t border-emerald-100 px-3.5 py-2.5 flex items-center justify-between text-[11px] font-semibold text-emerald-900">
          <span class="flex items-center gap-1.5 truncate">
            <span class="text-sm">✅</span> Applied by <strong class="font-bold text-emerald-800">${appliedInfo.applied_by || 'Avishek'}</strong>
            ${appliedInfo.applicant_user_id ? `<span class="text-[10px] text-emerald-600 bg-white px-1.5 py-0.5 rounded border border-emerald-200 font-mono">ID: ${appliedInfo.applicant_user_id}</span>` : ''}
          </span>
          <span class="text-[10px] uppercase font-black tracking-wider px-2 py-0.5 rounded bg-emerald-200 text-emerald-900 shrink-0">
            ${appliedInfo.payment_status || 'PAID'}
          </span>
        </div>
      `;
    }

    // Top Post Badge
    let topPostBadge = '';
    if (job.grade <= 9 || job.designation_category === 'TOP_POSTS') {
      topPostBadge = '<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300 shadow-xs">👑 TOP POST (Gr-' + job.grade + ')</span>';
    }

    // Favorite button
    const favHeart = favd ? '❤️' : '🤍';
    const favClass = favd ? 'fav-btn is-fav' : 'fav-btn';
    const favTitle = favd ? 'Remove from favorites' : 'Add to favorites';

    // Top Right Action Buttons (Favorite + Ignore or Restore)
    let actionButtons = '';
    if (isIgnoredView) {
      actionButtons = `
        <button type="button" onclick="event.stopPropagation(); window.restoreJob('${job.id}')" title="Restore this job back to active radar" class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition active:scale-95">
          <span>↩️ Restore</span>
        </button>
      `;
    } else {
      actionButtons = `
        <button type="button" class="${favClass}" onclick="event.stopPropagation(); window.toggleFavorite('${job.id}')" title="${favTitle}" aria-label="${favTitle}">
          ${favHeart}
        </button>
        <button type="button" class="ignore-btn text-slate-400 hover:text-rose-600 p-1 rounded-full hover:bg-rose-50 transition active:scale-90" onclick="event.stopPropagation(); window.toggleIgnore('${job.id}')" title="Ignore / Hide from feed" aria-label="Ignore">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/></svg>
        </button>
      `;
    }

    card.innerHTML = `
      <div class="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3.5">
        <div>
          <div class="flex items-start justify-between gap-1.5 mb-2">
            <div class="flex flex-wrap items-center gap-1 min-w-0">
              <span class="text-[10px] font-extrabold tracking-wider px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 uppercase">
                Grade ${job.grade}
              </span>
              ${topPostBadge}
              ${freshBadge}
            </div>
            <div class="flex items-center gap-1.5 shrink-0">
              ${deadlineBadge}
              ${actionButtons}
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
          ${(job.published_date || job.publish_date) ? `
            <button type="button" onclick="window.setDateReportedFilter('${(job.published_date || job.publish_date).split('T')[0]}')" title="Click to filter circulars reported on ${(job.published_date || job.publish_date).split('T')[0]}" class="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 hover:text-emerald-700 bg-slate-100 hover:bg-emerald-50 px-2 py-0.5 rounded-md border border-slate-200 transition cursor-pointer active:scale-95">
              <span>📅 প্রকাশ:</span> <strong class="font-bold text-slate-800">${formatReportedDate(job.published_date || job.publish_date)}</strong>
            </button>
          ` : ''}
        </div>
      </div>

      <div class="px-4 pb-4 sm:px-5 sm:pb-5 pt-0 grid grid-cols-2 gap-2">
        <a href="${job.local_pdf_path || job.circular_url || job.pdf_url || '#'}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center justify-center gap-1 py-2 px-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition active:scale-95 truncate">
          ${job.local_pdf_path ? '📥 Verified PDF' : '📄 Circular PDF'}
        </a>
        <a href="${job.application_portal_url || job.apply_url || '#'}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center justify-center gap-1 py-2 px-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition shadow-sm shadow-emerald-600/20 active:scale-95 truncate">
          📝 ${isAppliedView ? 'Application Details' : 'Apply Online'} &rarr;
        </a>
      </div>

      ${appliedBanner}
    `;

    return card;
  }

  function renderEmptyState(message = 'No matching circulars found') {
    const view = window.state ? window.state.currentView : 'FEED';
    const container = document.createElement('div');
    container.className = 'col-span-full py-16 flex flex-col items-center justify-center bg-white rounded-2xl border border-slate-200 text-center space-y-3 p-6';

    if (view === 'APPLIED') {
      container.innerHTML = `
        <div class="text-5xl">📋</div>
        <h3 class="text-base font-bold text-slate-800">No Applications Logged Yet</h3>
        <p class="text-xs text-slate-500 max-w-sm">When you apply for a position, it will be automatically moved from your active feed to this Applied tracking section.</p>
        <button onclick="window.switchView('FEED')" class="mt-2 px-4 py-2 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition active:scale-95">
          Browse Active Radar
        </button>
      `;
    } else if (view === 'FAVORITES') {
      container.innerHTML = `
        <div class="text-5xl">❤️</div>
        <h3 class="text-base font-bold text-slate-800">No Favorites Saved Yet</h3>
        <p class="text-xs text-slate-500 max-w-sm">Click the ❤️ heart icon on any circular in your radar to bookmark it here for quick review.</p>
        <button onclick="window.switchView('FEED')" class="mt-2 px-4 py-2 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition active:scale-95">
          Explore All Circulars
        </button>
      `;
    } else if (view === 'IGNORED') {
      container.innerHTML = `
        <div class="text-5xl">👍</div>
        <h3 class="text-base font-bold text-slate-800">No Ignored Jobs</h3>
        <p class="text-xs text-slate-500 max-w-sm">When you click the 🚫 ignore button on any circular, it moves here to keep your main feed clean and clutter-free.</p>
        <button onclick="window.switchView('FEED')" class="mt-2 px-4 py-2 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition active:scale-95">
          Return to Active Feed
        </button>
      `;
    } else {
      container.innerHTML = `
        <div class="text-5xl">🔍</div>
        <h3 class="text-base font-bold text-slate-800">${message}</h3>
        <p class="text-xs text-slate-500 max-w-sm">No circulars match your current filter criteria. Try adjusting candidate or post filters.</p>
        <button onclick="window.resetAllFilters()" class="mt-2 px-4 py-2 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition active:scale-95">
          Reset All Filters
        </button>
      `;
    }
    return container;
  }

  function populateDateReportedOptions() {
    const select = document.getElementById('date-reported-select');
    if (!select || !window.state || !window.state.circulars) return;

    const currentVal = window.state.filters.dateReported || 'ALL';
    const refDate = window.state.referenceDate;
    const refDateIso = refDate.toISOString().split('T')[0];

    const dateCounts = {};
    window.state.circulars.forEach(job => {
      if (window.isPureOfficeJob && !window.isPureOfficeJob(job)) return;
      const pub = (job.published_date || job.publish_date || '').split('T')[0];
      if (pub) dateCounts[pub] = (dateCounts[pub] || 0) + 1;
    });

    const sortedDates = Object.keys(dateCounts).sort().reverse();

    let html = `
      <option value="ALL">📅 Date Reported (All)</option>
      <option value="TODAY">⚡ Today (${formatReportedDate(refDateIso)})</option>
      <option value="LAST_3_DAYS">✨ Last 3 Days</option>
      <option value="LAST_7_DAYS">📅 Last 7 Days</option>
      <option value="LAST_14_DAYS">📅 Last 14 Days</option>
    `;

    if (sortedDates.length > 0) {
      html += `<optgroup label="Specific Reported Dates">`;
      sortedDates.forEach(d => {
        const isToday = (d === refDateIso) ? ' (Today)' : '';
        html += `<option value="${d}">${formatReportedDate(d)}${isToday} (${dateCounts[d]})</option>`;
      });
      html += `</optgroup>`;
    }

    select.innerHTML = html;
    select.value = currentVal;
  }

  window.renderMetrics = renderMetrics;
  window.formatReportedDate = formatReportedDate;
  window.renderJobCard = renderJobCard;
  window.renderEmptyState = renderEmptyState;
  window.populateDateReportedOptions = populateDateReportedOptions;

})(window);
