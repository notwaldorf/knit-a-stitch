// From https://gist.github.com/kosamari/7c5d1e8449b2fbc97d372675f16b566e

var APP_PREFIX = 'KNIT_A_STITCH_';     // Identifier for this app (this needs to be consistent across every cache update)
var VERSION = '0.0.1';                    // Version of the off-line cache (change this value everytime you want to update cache)
var CACHE_NAME = APP_PREFIX + VERSION;
var URLS = [                            // Add URL you want to cache in this list.
  '/knit-a-stitch/',
  '/knit-a-stitch/index.html',
  '/knit-a-stitch/style.css',
  '/knit-a-stitch/app.js',
  '/knit-a-stitch/manifest.json'
]

// Respond with cached resources
self.addEventListener('fetch', function (e) {
  //console.log('fetch request : ' + e.request.url)
  e.respondWith(
    caches.match(e.request).then(function (request) {
      return request || fetch(e.request)
    })
  )
})

// Cache resources
self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      //console.log('installing cache : ' + CACHE_NAME)
      return cache.addAll(URLS)
    })
  )
})

// Delete outdated caches
self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keyList) {
      // `keyList` contains all cache names under your username.github.io
      // filter out ones that has this app prefix to create white list
      var cacheWhitelist = keyList.filter(function (key) {
        return key.indexOf(APP_PREFIX)
      })
      // add current cache name to white list
      cacheWhitelist.push(CACHE_NAME)

      return Promise.all(keyList.map(function (key, i) {
        if (cacheWhitelist.indexOf(key) === -1) {
          //console.log('deleting cache : ' + keyList[i] )
          return caches.delete(keyList[i])
        }
      }))
    })
  )
})
