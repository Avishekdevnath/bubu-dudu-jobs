/**
 * Bubu-Dudu Job Portal - PWA Module
 * Handles Service Worker registration, Install Prompts, and Offline indicators.
 */

let deferredPrompt = null;

export function initPWA() {
  // 1. Service Worker Registration
  if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js')
        .then(registration => {
          console.log('✅ PWA ServiceWorker registered with scope:', registration.scope);
          registration.update().catch(() => {});
          if (registration.waiting) {
            registration.waiting.postMessage({ action: 'skipWaiting' });
          }
        })
        .catch(err => {
          console.warn('⚠️ PWA ServiceWorker registration failed:', err);
        });

      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          refreshing = true;
          console.log('🔄 New Service Worker controller active - reloading UI');
          window.location.reload();
        }
      });
    });
  }

  // 2. Before Install Prompt (Android / Chrome / Edge)
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    
    // Show install buttons
    const headerBtn = document.getElementById('pwa-install-btn');
    const mobileBanner = document.getElementById('mobile-pwa-banner');
    const bottomNavInstall = document.getElementById('nav-install-btn');

    if (headerBtn) headerBtn.classList.remove('hidden');
    if (bottomNavInstall) bottomNavInstall.classList.remove('hidden');
    if (mobileBanner && !sessionStorage.getItem('mobile_pwa_dismissed')) {
      mobileBanner.classList.remove('hidden');
    }
  });

  // 3. Track App Installed
  window.addEventListener('appinstalled', () => {
    console.log('🎉 Bubu-Dudu Job Portal installed successfully!');
    deferredPrompt = null;
    document.getElementById('pwa-install-btn')?.classList.add('hidden');
    document.getElementById('mobile-pwa-banner')?.classList.add('hidden');
    document.getElementById('nav-install-btn')?.classList.add('hidden');
  });

  // 4. Online/Offline Network Status
  window.addEventListener('online', () => {
    showNetworkToast('🟢 You are back online. Live radar active.', 'bg-emerald-600');
  });
  window.addEventListener('offline', () => {
    showNetworkToast('📦 You are offline. Showing cached circulars.', 'bg-amber-600');
  });
}

export async function installPWA() {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log('User response to PWA prompt:', outcome);
    deferredPrompt = null;
    document.getElementById('pwa-install-btn')?.classList.add('hidden');
    document.getElementById('mobile-pwa-banner')?.classList.add('hidden');
    document.getElementById('nav-install-btn')?.classList.add('hidden');
  } else {
    // Helpful guidance for iOS Safari or desktop browser
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    if (isIOS) {
      alert("📱 To install on iPhone/iPad:\n1. Tap the Share button at bottom center (square with arrow up)\n2. Tap 'Add to Home Screen'\n3. Tap 'Add' at top right!");
    } else {
      alert("💡 To install this app:\nUse Chrome, Edge, or Brave and click 'Install Job Portal' in your browser URL bar or settings menu.");
    }
  }
}

export function dismissMobileBanner() {
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

  setTimeout(() => {
    toast.style.opacity = '0';
  }, 4000);
}
