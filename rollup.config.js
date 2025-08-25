// rollup.config.js
import json from "@rollup/plugin-json";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";

// mark peer deps (and any runtime deps you don't want bundled) as external
const external = ["mongoose"];

export default {
  input: "src/index.js",
  external, // <- do not bundle mongoose
  output: [
    {
      file: "dist/index.js",
      format: "es",
      sourcemap: true,
    },
    {
      file: "dist/index.cjs",
      format: "cjs",
      exports: "named", // so named exports work in CJS
      sourcemap: true,
    },
  ],
  // order matters: json -> resolve -> commonjs
  plugins: [json(), nodeResolve({ preferBuiltins: true }), commonjs()],
};
