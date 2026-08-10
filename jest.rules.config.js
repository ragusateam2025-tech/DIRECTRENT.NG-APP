/**
 * Security-rules tests, which run in Node against the Firestore emulator.
 *
 * Kept apart from the main suite because they need a different world. The other
 * tests run under jest-expo, which builds a React Native environment; these need
 * plain Node, the Firebase web SDK, and a live emulator on port 8080.
 *
 * Written in CommonJS JavaScript rather than TypeScript on purpose: no
 * transform means no Babel configuration to keep in step with two environments
 * at once, and these tests assert on behaviour rather than types.
 *
 * Run them with `npm run test:rules`, which starts the emulator, runs this
 * config, and shuts the emulator down again.
 */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/__tests__/rules/**/*.test.js'],
  // Nothing to compile. Leaving the project's Babel config out of this avoids
  // dragging the React Native preset into a Node test run.
  transform: {},
  testTimeout: 20000,
};
