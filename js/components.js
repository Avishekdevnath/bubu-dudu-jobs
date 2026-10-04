/**
 * Bubu-Dudu Job Portal - Component Renderer Module
 * Generates cards, badges, statistics counters, and interactive modals.
 */

import { renderDeadlineBadge, renderFreshnessBadge } from './timeline.js';
import { saveAppliedRecord } from './state.js';

export function renderMetrics(stats) {
  const elActive = document.getElementById('stat-active');
  const elJustIn = document.getElementById('stat-just-in');
  const elUrgent3 = document.getElementById('stat-urgent-3');
  const elDudu = document.getElementById('stat-dudu');
  const elBubu = document.getElementById('stat-bubu');
  const elBoth = document.getElementById('stat-both');

  if (elActive) elActive.textContent = stats.active ?? 0;
  if (elJustIn) elJustIn.textContent = stats.justIn ?? 0;
  if (elUrgent3) elUrgent3.textContent = stats.urgent3 ?? 0;
  if (elDudu && stats.dudu !== undefined) elDudu.textContent = stats.dudu;
  if (elBubu && stats.bubu !== undefined) elBubu.textContent = stats.bubu;
  if (elBoth && stats.both !== undefined) elBoth.textContent = stats.both;
}

export function renderJobCard(job, timelineInfo, userAppliedRecord) {
  const card = document.createElement('div');
  card.className = 'job-card bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md flex flex-col justify-between overflow-hidden relative group';

  // Candidate Match Tag
  let candTag = '';
  if (job.candidate_eligibility === 'DUDU') {
    candTag = '<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">💻 Dudu (CSE)</span>';
  } else if (job.candidate_eligibility === 'BUBU') {
    candTag = '<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-teal-50 text-teal-700 border border-teal-200">🌾 Bubu (Agri)</span>';
  } else {
    candTag = '<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">🤝 Both (Joint)</span>';
  }

  // Badges
  const deadlineBadge = renderDeadlineBadge(timelineInfo.daysLeft);
  const freshBadge = renderFreshnessBadge(timelineInfo.daysOld);

  // Check if job is applied in DB or localStorage
  const appliedInfo = userAppliedRecord || job.application_record;
  let appliedBanner = '';
  if (appliedInfo) {
    appliedBanner = `
      <div class="bg-emerald-50 border-t border-emerald-100 px-4 py-2.5 flex items-center justify-between text-[11px] font-semibold text-emerald-800">
        <span class="flex items-center gap-1.5">
          <span class="text-base">✅</span> Applied by <strong>${appliedInfo.applied_by || 'Applicant'}</strong> (ID: <code>${appliedInfo.user_id}</code>)
        </span>
        <span class="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-200 text-emerald-900">
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
    <div class="p-5 flex-1 flex flex-col justify-between space-y-4">
      <div>
        <!-- Top Metadata Row -->
        <div class="flex flex-wrap items-center justify-between gap-2 mb-2">
          <div class="flex items-center gap-1.5">
            <span class="text-[10px] font-extrabold tracking-wider px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 uppercase">
              Grade ${job.grade}
            </span>
            ${topPostBadge}
            ${freshBadge}
          </div>
          <div>
            ${deadlineBadge}
          </div>
        </div>

        <!-- Post Title -->
        <h4 class="text-base font-bold text-slate-900 group-hover:text-emerald-700 transition leading-snug">
          ${job.title}
        </h4>

        <!-- Organization -->
        <p class="text-xs text-slate-600 font-medium mt-1.5 flex items-center gap-1.5">
          <span class="text-slate-400">🏛️</span> ${job.organization}
        </p>

        <!-- Eligibility and Vacancies -->
        <div class="flex items-center gap-2 mt-3">
          ${candTag}
          ${(job.vacancy_count || job.vacancies) > 0 ? `<span class="text-xs text-slate-500 font-semibold">• ${job.vacancy_count || job.vacancies} Vacanc${(job.vacancy_count || job.vacancies) === 1 ? 'y' : 'ies'}</span>` : ''}
        </div>
      </div>

      <!-- Qualifications Snippet -->
      <div class="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs text-slate-600 leading-relaxed">
        <span class="font-bold text-slate-800">শিক্ষাগত যোগ্যতা: </span>
        ${(job.min_education || job.education_requirements) ? ((job.min_education || job.education_requirements).length > 120 ? (job.min_education || job.education_requirements).slice(0, 120) + '...' : (job.min_education || job.education_requirements)) : 'বিস্তারিত মূল বিজ্ঞপ্তিতে দেখুন'}
      </div>

      <!-- Dates & Deadline Info -->
      <div class="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
        <span>📅 শেষ সময়: <strong class="text-slate-800 font-bold">${job.deadline_date}</strong></span>
        ${(job.published_date || job.publish_date) ? `<span class="text-[11px] text-slate-400">প্রকাশ: ${job.published_date || job.publish_date}</span>` : ''}
      </div>
    </div>

    <!-- Action Buttons -->
    <div class="px-5 pb-5 pt-0 grid grid-cols-2 gap-2">
      <a href="${job.local_pdf_path || job.circular_url || job.pdf_url || '#'}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition active:scale-95">
        ${job.local_pdf_path ? '📥 Verified PDF' : '📄 Circular PDF'}
      </a>
      <a href="${job.application_portal_url || job.apply_url || '#'}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition shadow-sm shadow-emerald-600/20 active:scale-95">
        📝 Apply on Teletalk &rarr;
      </a>
    </div>

    ${appliedBanner}
  `;

  return card;
}

export function renderEmptyState(message = 'No matching circulars found') {
  const container = document.createElement('div');
  container.className = 'col-span-full py-16 flex flex-col items-center justify-center bg-white rounded-2xl border border-slate-200 text-center space-y-3 p-6';
  container.innerHTML = `
    <div class="text-5xl">🔍</div>
    <h3 class="text-base font-bold text-slate-800">${message}</h3>
    <p class="text-xs text-slate-500 max-w-sm">No circulars match your active filters. Try switching to "All Active" or reset candidate filters.</p>
    <button onclick="window.resetFiltersHandler()" class="mt-2 px-4 py-2 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition active:scale-95">
      Reset All Filters
    </button>
  `;
  return container;
}
