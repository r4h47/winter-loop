export const offlineReady = import.meta.env.PROD && 'serviceWorker' in navigator

if (offlineReady) {
  addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {
      // The site still works online without it.
    })
  })
}
