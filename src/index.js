import { MongogateBuilder } from "./builder.js";

/**
 * Mongoose plugin that adds an easy aggregation builder:
 *
 * Example:
 * ```js
 * import mongoose from "mongoose";
 * import { mongogatePlugin } from "mongogate";
 *
 * const userSchema = new mongoose.Schema({ ... });
 * userSchema.plugin(mongogatePlugin);
 *
 * const User = mongoose.model("User", userSchema);
 *
 * const results = await User.mg()
 *   .where("isActive", true)
 *   .orderBy("createdAt", "desc")
 *   .paginate(1, 10);
 * ```
 *
 * @param {import("mongoose").Schema} schema - The Mongoose schema.
 * @param {{ maxWithDepth?: number }} [options] - Plugin options.
 */
export function mongogatePlugin(schema, pluginOptions = {}) {
  schema.statics.mg = function mg() {
    return new MongogateBuilder(this, pluginOptions);
  };
}

// ✅ Named exports for TS + consumers
export { MongogateBuilder };

// ✅ Default export kept for convenience
export default mongogatePlugin;
