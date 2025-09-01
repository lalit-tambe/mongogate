export default {
  testEnvironment: "node",
  transform: {},
  moduleFileExtensions: ["js", "cjs", "json"],
  roots: ["<rootDir>/tests/unit", "<rootDir>/tests/integration"],
  moduleNameMapper: {
    // resolve package entry points to dist builds
    "^mongo-aggregate$": "<rootDir>/dist/index.js", // ESM entry
  },
};
