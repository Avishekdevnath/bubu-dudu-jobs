/**
 * Bubu-Dudu Job Portal - Sidebar & Dashboard Navigation Module
 * Controls the left sidebar, drawer open/close, active view switching, and badges.
 */
(function(window) {
  'use strict';

  function initSidebar() {
    const backdrop = document.getElementById('sidebar-backdrop');
    if (backdrop) {
      backdrop.addEventListener('click', closeMobileSidebar);
    }
  }

  function toggleSidebar() {
    const sidebar = document.getElementById('app-sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');
    if (!sidebar) return;

    // Mobile drawer toggle
    if (window.innerWidth < 1024) {
      const isClosed = sidebar.classList.contains('-translate-x-full');
      if (isClosed) {
        openMobileSidebar();
      } else {
        closeMobileSidebar();
      }
    } else {
      // Desktop collapse toggle
      sidebar.classList.toggle('desktop-collapsed');
    }
  }

  function openMobileSidebar() {
    const sidebar = document.getElementById('app-sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');
    if (sidebar) sidebar.classList.remove('-translate-x-full');
    if (backdrop) backdrop.classList.remove('hidden');
    document.body.classList.add('overflow-hidden');
  }

  function closeMobileSidebar() {
    const sidebar = document.getElementById('app-sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');
    if (sidebar) sidebar.classList.add('-translate-x-full');
    if (backdrop) backdrop.classList.add('hidden');
    document.body.classList.remove('overflow-hidden');
  }

  function switchView(viewName) {
    if (!window.state) return;
    window.state.currentView = viewName;

    // Close mobile drawer on navigation
    if (window.innerWidth < 1024) closeMobileSidebar();

    // Update active nav styling
    const navItems = document.querySelectorAll('[data-view-target]');
    navItems.forEach(el => {
      const target = el.getAttribute('data-view-target');
      if (target === viewName) {
        el.classList.add('bg-emerald-50', 'text-emerald-700', 'font-bold', 'border-l-4', 'border-emerald-600');
        el.classList.remove('text-slate-600', 'hover:bg-slate-50');
      } else {
        el.classList.remove('bg-emerald-50', 'text-emerald-700', 'font-bold', 'border-l-4', 'border-emerald-600');
        el.classList.add('text-slate-600', 'hover:bg-slate-50');
      }
    });

    // Update main section title and breadcrumb
    const titleEl = document.getElementById('view-title-text');
    const descEl = document.getElementById('view-desc-text');
    const breadcrumbEl = document.getElementById('breadcrumb-view-name');

    if (viewName === 'FEED') {
      if (titleEl) titleEl.textContent = '⚡ Active Job Radar';
      if (descEl) descEl.textContent = 'Verified office positions ready to apply. Expired, applied, and ignored jobs are auto-filtered.';
      if (breadcrumbEl) breadcrumbEl.textContent = 'Active Radar';
    } else if (viewName === 'FAVORITES') {
      if (titleEl) titleEl.textContent = '❤️ Saved / Favorite Circulars';
      if (descEl) descEl.textContent = 'Your bookmarked positions for quick access and tracking.';
      if (breadcrumbEl) breadcrumbEl.textContent = 'Saved Favorites';
    } else if (viewName === 'APPLIED') {
      if (titleEl) titleEl.textContent = '✅ Applied Jobs & Tracking';
      if (descEl) descEl.textContent = 'Archived record of jobs you have already submitted applications and fees for.';
      if (breadcrumbEl) breadcrumbEl.textContent = 'Applied Jobs';
    } else if (viewName === 'IGNORED') {
      if (titleEl) titleEl.textContent = '🚫 Ignored / Hidden Circulars';
      if (descEl) descEl.textContent = 'Positions you passed on. You can restore any job back to your active radar at any time.';
      if (breadcrumbEl) breadcrumbEl.textContent = 'Ignored Jobs';
    }

    if (window.renderJobs) window.renderJobs();
    const mainScroll = document.getElementById('main-content-scroll') || document.querySelector('main');
    if (mainScroll && typeof mainScroll.scrollTo === 'function') {
      mainScroll.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  window.initSidebar = initSidebar;
  window.toggleSidebar = toggleSidebar;
  window.openMobileSidebar = openMobileSidebar;
  window.closeMobileSidebar = closeMobileSidebar;
  window.switchView = switchView;

})(window);
