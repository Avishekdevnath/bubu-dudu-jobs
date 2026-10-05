/**
 * Bubu-Dudu Job Portal - Timeline & Urgency Classifier Module
 * Date math, Grade thresholds, Dhaka-only filters, and freshness/deadline badges.
 */
(function(window) {
  'use strict';

  const TIMELINE_TYPES = {
    ALL_ACTIVE: 'ALL_ACTIVE',
    JUST_IN_5: 'JUST_IN_5',           // Published 0-5 days ago
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
    /statistic|পরিসংখ্যান|পরিসংখ্যানবিদ/i,
    /library|গ্রন্থাগার|লাইব্রেরি/i,
    /surveyor|সার্ভেয়ার/i,
    /draftsman|ড্রাফটসম্যান/i,
    /estimator|এস্টিমেটর/i,
    /avionics|এভিওনিক্স|aerospace|অ্যারোস্পেস|hangar|হ্যাঙ্গার/i,
    /store\s*keeper|ভান্ডার\s*রক্ষক|স্টোর\s*কিপার|storekeeper|স্টোরকিপার|store\s*assistant|স্টোর\s*সহকারী/i,
    /bench\s*assistant|বেঞ্চ\s*সহকারী/i,
    /cashier|ক্যাশিয়ার|নাজির\s*কাম-ক্যাশিয়ার|nazir\s*cum-cashier/i,
    /diploma|ডিপ্লোমা|scientific\s*assistant|বৈজ্ঞানিক\s*সহকারী|sub-?\s*assistant|উপ-?\s*সহকারী/i,
    /accountant|হিসাবরক্ষক|হিসাব\s*রক্ষক|হিসাব\s*সহকারী|accounts\s*assistant|office\s*assistant-cum-accountant|বাণিজ্য/i,
    /mechanical|মেকানিক্যাল|civil\s*eng|সিভিল\s*ইঞ্জিনিয়ার|chemical\s*eng|কেমিক্যাল|petroleum|পেট্রোলিয়াম|junior\s*officer\s*\(operations\)|কনিষ্ঠ\s*কর্মকর্তা\s*\(পরিচালন\)/i
  ];

  const EXCLUDE_AREA_ORGS = [
    /rajshahi\s*development|rdarajshahi|\brda\b|রাজশাহী\s*উন্ন[য়য]ন/i,
    /khulna\s*development|\bkda\b|খুলনা\s*উন্ন[য়য]ন/i,
    /chittagong\s*development|\bcda\b|চট্টগ্রাম\s*উন্ন[য়য]ন/i,
    /cox'?s\s*bazar\s*development|কক্সবাজার\s*উন্ন[য়য]ন/i,
    /eastern\s*lubricants|elbl|ইস্টার্ন\s*লুব্রিকেন্টস/i,
    /civil\s*surgeon|সিভিল\s*সার্জন|\bcs[a-z]+/i,
    /dc\s*office|জেলা\s*প্রশাসক|\bdc(?!dhaka\b)[a-z]+/i
  ];

  function isAreaDeptOutsideDhaka(job) {
    const orgText = `${job.organization || ''} ${job.org_code || ''}`.toLowerCase();
    if (orgText.includes('dcdhaka') || (orgText.includes('dc office') && orgText.includes('dhaka') && !orgText.includes('outside'))) {
      return false;
    }
    for (const pat of EXCLUDE_AREA_ORGS) {
      if (pat.test(orgText)) return true;
    }
    return false;
  }

  function isPureOfficeJob(job) {
    if (isAreaDeptOutsideDhaka(job)) return false;
    const g = parseInt(String(job.grade || 99).replace(/\D+/g, ''), 10) || 99;
    if (g < 9) return false; // Exclude senior posts above Grade 9 in rank (Gr 1-8 require experience)
    const text = `${job.title || ''} ${job.title_en || ''} ${job.min_education || job.education_requirements || ''}`.toLowerCase();
    for (const pat of NON_OFFICE_PATTERNS) {
      if (pat.test(text)) return false;
    }
    return true;
  }

  function getDaysUntilDeadline(deadlineStr, referenceDate = new Date()) {
    const deadline = new Date(deadlineStr + 'T23:59:59');
    const diff = deadline - referenceDate;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  function getDaysSincePublish(publishStr, referenceDate = new Date()) {
    if (!publishStr) return 999;
    const published = new Date(publishStr + 'T00:00:00');
    const diff = referenceDate - published;
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  function classifyJobTimeline(job, referenceDate = new Date()) {
    const daysLeft = getDaysUntilDeadline(job.deadline_date, referenceDate);
    const pubDate = job.published_date || job.publish_date;
    const daysOld = pubDate ? getDaysSincePublish(pubDate, referenceDate) : 999;

    return {
      daysLeft,
      daysOld,
      isExpired: daysLeft < 0,
      isClosingSoon3: daysLeft >= 0 && daysLeft <= 3,
      isJustIn5: daysOld >= 0 && daysOld <= 5
    };
  }

  function renderDeadlineBadge(daysLeft) {
    if (daysLeft < 0) {
      return '<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-500">Expired</span>';
    }
    if (daysLeft === 0) {
      return '<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-rose-600 text-white animate-pulse shadow-sm shadow-rose-600/30">🚨 Today Last Day!</span>';
    }
    if (daysLeft <= 3) {
      return `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-rose-100 text-rose-700 border border-rose-300">⏳ ${daysLeft}d left</span>`;
    }
    if (daysLeft <= 7) {
      return `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">📅 ${daysLeft}d left</span>`;
    }
    return `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">🟢 ${daysLeft}d left</span>`;
  }

  function renderFreshnessBadge(daysOld) {
    if (daysOld >= 0 && daysOld <= 5) {
      return `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-xs">
        🆕 ${daysOld === 0 ? 'Today' : daysOld + 'd ago'}
      </span>`;
    }
    return '';
  }

  // Export to window
  window.TIMELINE_TYPES = TIMELINE_TYPES;
  window.isPureOfficeJob = isPureOfficeJob;
  window.getDaysUntilDeadline = getDaysUntilDeadline;
  window.getDaysSincePublish = getDaysSincePublish;
  window.classifyJobTimeline = classifyJobTimeline;
  window.renderDeadlineBadge = renderDeadlineBadge;
  window.renderFreshnessBadge = renderFreshnessBadge;

})(window);
