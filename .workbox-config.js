module.exports = {
  importScripts: ['./src/service-worker.js'],
  globDirectory: "./dist",
  globPatterns: [
    "**/*.{css,html,js,webp,woff,woff2,otf,eot,webmanifest,manifest}"
  ],
  runtimeCaching: [
    {
      urlPattern: new RegExp("^https:\/\/firebasestorage\\.googleapis\\.com\/.*", "gi"),
      handler: "CacheFirst",
      options: {
        cacheableResponse: {
          statuses: [0, 200]
        },
        cacheName: "cache"
      }
    }
  ],
  offlineGoogleAnalytics: true
};