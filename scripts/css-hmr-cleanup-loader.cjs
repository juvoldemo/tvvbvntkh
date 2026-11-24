// Keep Next 14's CSS HMR cleanup safe when the old stylesheet was already
// detached by React or another overlapping CSS update. Only used in development.
module.exports = function cssHmrCleanupLoader(source) {
  return source.replaceAll("e.parentNode.removeChild(e)", "e.remove()");
};
