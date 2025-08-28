export default {
  testEnvironment: "node",
  transform: {}, // no Babel/ts-jest, just native Node ESM
  moduleFileExtensions: ["js", "json"],
  roots: ["<rootDir>/tests/unit", "<rootDir>/tests/integration"],
  moduleNameMapper: {
    "^mongogate$": "<rootDir>/src/index.js",
  },
};
