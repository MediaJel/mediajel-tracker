// eslint-disable-next-line no-restricted-globals
window.self.addEventListener("install", (e) => {
  console.log("Service worker installed", e);
});
// eslint-disable-next-line no-restricted-globals
window.self.addEventListener("activate", (e) => {
  console.log("Service worker activated", e);
});
