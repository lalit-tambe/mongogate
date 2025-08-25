export default {
  testEnvironment: "node",
  transform: {},
  moduleFileExtensions: ["js", "cjs", "json"],
  roots: ["<rootDir>/tests"],
  moduleNameMapper: {
    // resolve package entry points to dist builds
    "^mongogate$": "<rootDir>/dist/index.js", // ESM entry
  },
};
