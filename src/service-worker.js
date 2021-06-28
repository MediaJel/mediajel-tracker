// Don't put window before self or you'll screw this up

// eslint-disable-next-line no-restricted-globals
self.addEventListener("install", (e) => {
  console.log("Service worker installed", e);
});
// eslint-disable-next-line no-restricted-globals
self.addEventListener("activate", (e) => {
  console.log("Service worker activated", e);
});
