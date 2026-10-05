/**
 * Bubu-Dudu Job Portal - PWA Module
 * Handles Service Worker registration, auto-update detection, and Install Prompts.
 */
(function(window) {
  'use strict';

  let deferredPrompt = null;

  function initPWA() {
    if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
          .then(reg => {
            console.log('✅ PWA ServiceWorker Registered:', reg.scope);
            reg.update().catch(() => {});
            if (reg.waiting) {
              reg.waiting.postMessage({ action: 'skipWaiting' });
            }
          })
          .catch(err => console.warn('PWA ServiceWorker Notice:', err));

        let isRefreshing = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          if (!isRefreshing) {
            isRefreshing = true;
            console.log('🔄 New Service Worker controller active - reloading UI');
            window.location.reload();
          }
        });
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

    window.addEventListener('appinstalled', () => {
      deferredPrompt = null;
      document.getElementById('pwa-install-btn')?.classList.add('hidden');
      document.getElementById('mobile-pwa-banner')?.classList.add('hidden');
      document.getElementById('nav-install-btn')?.classList.add('hidden');
    });

    window.addEventListener('online', () => {
      showNetworkToast('🟢 You are back online. Live radar active.', 'bg-emerald-600');
    });
    window.addEventListener('offline', () => {
      showNetworkToast('📦 You are offline. Showing cached circulars.', 'bg-amber-600');
    });
  }

  async function installPWA() {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      deferredPrompt = null;
      document.getElementById('pwa-install-btn')?.classList.add('hidden');
      document.getElementById('mobile-pwa-banner')?.classList.add('hidden');
      document.getElementById('nav-install-btn')?.classList.add('hidden');
    } else {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
      if (isIOS) {
        alert("📱 To install on iPhone/iPad:\n1. Tap Share (square with arrow up)\n2. Tap 'Add to Home Screen'\n3. Tap 'Add'!");
      } else {
        alert("💡 To install this app:\nOpen in Chrome or Edge and click 'Install Job Portal' in your browser URL bar or settings.");
      }
    }
  }

  function dismissMobileBanner() {
    const banner = document.getElementById('mobile-pwa-banner');
    if (banner) banner.classList.add('hidden');
    sessionStorage.setItem('mobile_pwa_dismissed', 'true');
  }

  function showNetworkToast(message, bgColor) {
    let toast = document.getElementById('network-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'network-toast';
      toast.className = `fixed bottom-20 left-1/2 -translate-x-1/2 z-50 text-white text-xs font-semibold px-4 py-2 rounded-full shadow-lg transition-opacity duration-300 pointer-events-none ${bgColor}`;
      document.body.appendChild(toast);
    } else {
      toast.className = `fixed bottom-20 left-1/2 -translate-x-1/2 z-50 text-white text-xs font-semibold px-4 py-2 rounded-full shadow-lg transition-opacity duration-300 pointer-events-none ${bgColor}`;
    }
    toast.textContent = message;
    toast.style.opacity = '1';
    setTimeout(() => { toast.style.opacity = '0'; }, 4000);
  }

  window.initPWA = initPWA;
  window.installPWA = installPWA;
  window.dismissMobileBanner = dismissMobileBanner;
  window.showNetworkToast = showNetworkToast;

})(window);
