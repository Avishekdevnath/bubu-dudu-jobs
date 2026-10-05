/**
 * Bubu-Dudu Job Portal - Favorites & Bookmarking Subsystem
 * Persists bookmarked circulars to localStorage and provides filter toggling.
 */
(function(window) {
  'use strict';

  const FAVORITES_STORAGE_KEY = 'bubu_dudu_favorites';

  function loadFavorites() {
    try {
      const raw = localStorage.getItem(FAVORITES_STORAGE_KEY);
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) window.state.favorites = new Set(arr);
      }
    } catch (e) {
      window.state.favorites = new Set();
    }
  }

  function saveFavorites() {
    try {
      localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify([...window.state.favorites]));
    } catch (e) {}
  }

  function isFavorite(jobId) {
    return window.state.favorites.has(jobId);
  }

  function toggleFavorite(jobId) {
    if (window.state.favorites.has(jobId)) {
      window.state.favorites.delete(jobId);
    } else {
      window.state.favorites.add(jobId);
    }
    saveFavorites();
    updateFavoritesCount();
    if (window.renderJobs) window.renderJobs();
  }

  function getFavoritesCount() {
    const refDate = window.state.referenceDate;
    let count = 0;
    window.state.circulars.forEach(job => {
      if (!window.state.favorites.has(job.id)) return;
      if (window.isPureOfficeJob && !window.isPureOfficeJob(job)) return;
      if (window.classifyJobTimeline) {
        const info = window.classifyJobTimeline(job, refDate);
        if (!info.isExpired && info.daysLeft >= 0) count++;
      } else {
        count++;
      }
    });
    return count;
  }

  function updateFavoritesCount() {
    const count = getFavoritesCount();
    ['stat-favs', 'stat-favs-m', 'stat-favs-desktop', 'nav-fav-count'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = count;
    });
  }

  function toggleFavoritesFilter() {
    window.state.filters.showFavoritesOnly = !window.state.filters.showFavoritesOnly;
    updateFavoritesButtonUI(window.state.filters.showFavoritesOnly);
    if (window.renderJobs) window.renderJobs();
  }

  function updateFavoritesButtonUI(isActive) {
    ['header-fav-btn', 'fav-btn-m', 'nav-btn-favs'].forEach(id => {
      const btn = document.getElementById(id);
      if (!btn) return;
      if (isActive) {
        btn.classList.add('bg-rose-50', 'text-rose-700', 'border-rose-300', 'ring-2', 'ring-rose-400/30');
      } else {
        btn.classList.remove('bg-rose-50', 'text-rose-700', 'border-rose-300', 'ring-2', 'ring-rose-400/30');
      }
    });
  }

  // Export to window
  window.loadFavorites = loadFavorites;
  window.saveFavorites = saveFavorites;
  window.isFavorite = isFavorite;
  window.toggleFavorite = toggleFavorite;
  window.getFavoritesCount = getFavoritesCount;
  window.updateFavoritesCount = updateFavoritesCount;
  window.toggleFavoritesFilter = toggleFavoritesFilter;
  window.updateFavoritesButtonUI = updateFavoritesButtonUI;

})(window);
