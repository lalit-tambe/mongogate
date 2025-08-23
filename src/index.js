import { MongogateBuilder } from "./builder.js";

/**
 * Mongoose plugin that adds an easy aggregation builder:
 *
 *   Model.mg() // mg = mongogate
 *     .where("isActive", true)
 *     .with("role")
 *     .with("subscriptions.plan")
 *     .select(["email", "role.name", "subscriptions.plan.title"])
 *     .orderBy("createdAt", "desc")
 *     .paginate(1, 10) // -> { data, page, perPage, total, totalPages }
 */
export default function mongogatePlugin(schema, pluginOptions = {}) {
  schema.statics.mg = function mg() {
    return new MongogateBuilder(this, pluginOptions);
  };
}
