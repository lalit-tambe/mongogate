export default {
  testEnvironment: "node",
  transform: {}, // no Babel/ts-jest, just native Node ESM
  moduleFileExtensions: ["js", "json"],
  roots: ["<rootDir>/tests/unit", "<rootDir>/tests/integration"],
  moduleNameMapper: {
    "^mongo-aggregate$": "<rootDir>/src/index.js",
  },
};
