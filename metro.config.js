const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// This machine will not let Node terminate Metro's worker processes: after the
// bundle is written, jest-worker's forceExit throws `kill EPERM` (errno -4048)
// and takes the process down with exit code 7. Gradle sees a failed
// createBundleReleaseJsAndAssets task, and the asset copy is left half-done —
// the JS bundle lands but the images never do.
//
// A single worker keeps the transform in-band, so there is no child process to
// kill and nothing to fail on shutdown. Bundling is slower as a result.
config.maxWorkers = 1;

module.exports = config;
