const CHANNEL_NAME = 'jh-storefront';
const STORAGE_KEY = 'jh-storefront:updated';

/** Tells other open storefront tabs that products or hero content changed. */
export function broadcastStorefrontUpdate() {
  const detail = { at: Date.now() };

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(detail));
  } catch {
    // Storage may be unavailable in private browsing; BroadcastChannel may still work.
  }

  try {
    if (typeof BroadcastChannel === 'undefined') return;
    const channel = new BroadcastChannel(CHANNEL_NAME);
    channel.postMessage(detail);
    channel.close();
  } catch {
    // Realtime refresh is best-effort; the next page load still fetches fresh data.
  }
}

/** Subscribes to storefront refresh events in other tabs. Returns an unsubscribe. */
export function subscribeStorefrontUpdates(listener) {
  const onStorage = (event) => {
    if (event.key !== STORAGE_KEY) return;
    listener();
  };

  let channel = null;
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      channel = new BroadcastChannel(CHANNEL_NAME);
      channel.onmessage = () => listener();
    }
  } catch {
    channel = null;
  }

  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener('storage', onStorage);
    channel?.close();
  };
}
