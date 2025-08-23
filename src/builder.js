import mongoose from "mongoose";

/**
 * Operators map
 */
const OP = {
  "=": "$eq",
  "==": "$eq",
  "!=": "$ne",
  ">": "$gt",
  ">=": "$gte",
  "<": "$lt",
  "<=": "$lte",
  in: "$in",
  nin: "$nin",
  regex: "$regex", // value must be /pattern/ or string (we'll turn to RegExp)
};
export class MongogateBuilder {
  constructor(model, options = {}) {
    this.model = model; // Mongoose model (root)
    this.options = { maxWithDepth: 2, ...options };
    this._pipeline = [];
    this._project = null;
    this._skip = null;
    this._limit = null;
    this._withPaths = new Set();
  }

  // ---------- EXECUTION ----------
  async get() {
    const finalPipe = this.#finalizePipeline({
      skip: this._skip,
      limit: this._limit,
    });
    return this.model.aggregate(finalPipe);
  }

  async first() {
    const finalPipe = this.#finalizePipeline({ limit: 1 });
    const out = await this.model.aggregate(finalPipe);
    return out[0] || null;
  }

  // ---------- PAGINATION (with totals) ----------
  // Returns { data, page, perPage, total, totalPages }
  async paginate(page = 1, perPage = 10) {
    page = Math.max(1, Number(page));
    perPage = Math.max(1, Number(perPage));
    const skip = (page - 1) * perPage;

    // finalize pipeline (joins + projection + sort + skip/limit)
    const finalPipe = this.#finalizePipeline({ skip, limit: perPage });

    const result = await this.model.aggregate([
      {
        $facet: {
          data: finalPipe,
          total: [{ $count: "count" }],
        },
      },
      {
        $project: {
          data: 1,
          total: { $ifNull: [{ $arrayElemAt: ["$total.count", 0] }, 0] },
        },
      },
    ]);

    const row = result[0] || { data: [], total: 0 };
    const totalPages = Math.max(1, Math.ceil(row.total / perPage));

    return {
      data: row.data,
      page,
      perPage,
      total: row.total,
      totalPages,
    };
  }

  // For debugging / tests
  pipeline() {
    return this.#finalizePipeline({
      skip: this._skip,
      limit: this._limit,
    });
  }

  // ---------- WHERE ----------
  // Adds conditions to the pipeline for `$match`
  // .where({ a:1, b:2 }) | .where("field", value) | .where("field","op",value)
  where(fieldOrObj, opOrVal, maybeVal) {
    let cond = {};

    // Consider the user provided condition object
    if (typeof fieldOrObj === "object" && fieldOrObj !== null) {
      cond = fieldOrObj;
    } else if (maybeVal === undefined) {
      // Add key value pair
      cond = { [fieldOrObj]: opOrVal };
    } else {
      // Add condition with operator
      const mongoOp = OP[opOrVal];
      if (!mongoOp) throw new Error(`Unsupported operator: ${opOrVal}`);
      if (mongoOp === "$regex") {
        const val =
          maybeVal instanceof RegExp
            ? maybeVal
            : new RegExp(String(maybeVal), "i");
        cond = { [fieldOrObj]: { $regex: val } };
      } else {
        cond = { [fieldOrObj]: { [mongoOp]: maybeVal } };
      }
    }

    this._pipeline.push({ $match: cond });
    return this;
  }

  // ---------- SELECT ----------
  // Add only selected fields in the output,works for `$project`
  // .select(["email","role.name","subscriptions.plan.title"])
  select(fields = []) {
    if (!Array.isArray(fields))
      throw new Error("select() expects an array of field paths");
    this._project = this._project || {};
    for (const f of fields) this._project[f] = 1;
    return this;
  }

  // ---------- SORT / LIMIT / SKIP ----------
  orderBy(field, dir = "asc") {
    this._pipeline.push({ $sort: { [field]: dir === "desc" ? -1 : 1 } });
    return this;
  }

  limit(n) {
    this._limit = Number(n);
    return this;
  }

  skip(n) {
    this._skip = Number(n);
    return this;
  }

  // ---------- WITH (joins) ----------
  // Supports "a" or "a.b" (two levels). Extendable later.
  with(path) {
    if (typeof path !== "string" || !path)
      throw new Error("with() expects a non-empty string path");
    if (this._withPaths.has(path)) return this; // idempotent
    this._withPaths.add(path);

    const parts = path.split(".");
    if (parts.length > this.options.maxWithDepth) {
      throw new Error(
        `with(): supports up to ${this.options.maxWithDepth} levels (configure 'maxWithDepth' to increase).`
      );
    }

    if (parts.length === 1) {
      this.#lookupTopLevel(parts[0]);
    } else if (parts.length === 2) {
      this.#lookupNested(parts[0], parts[1]);
    } else {
      // For >2 levels, you can implement recursion similar to #lookupNested
      throw new Error("with(): nested depth > 2 not implemented in MVP.");
    }

    return this;
  }

  // ---------- INTERNALS ----------

  #finalizePipeline({ skip = null, limit = null } = {}) {
    const pipe = [...this._pipeline];

    // Note: WITH stages are already pushed during .with() calls.

    if (this._project) pipe.push({ $project: this._project });
    if (typeof skip === "number" && !Number.isNaN(skip))
      pipe.push({ $skip: skip });
    if (typeof limit === "number" && !Number.isNaN(limit))
      pipe.push({ $limit: limit });

    return pipe;
  }

  #getSchemaPathInfo(model, path) {
    const p = model.schema.path(path);
    if (!p)
      throw new Error(`Path '${path}' not found on ${model.modelName} schema`);
    // Single ref
    if (p.options && p.options.ref) {
      return { refModelName: p.options.ref, isArray: false };
    }
    // Array of refs
    if (p.caster && p.caster.options && p.caster.options.ref) {
      return { refModelName: p.caster.options.ref, isArray: true };
    }
    throw new Error(`Path '${path}' is not a ref on ${model.modelName}`);
  }

  #lookupTopLevel(field) {
    const { refModelName, isArray } = this.#getSchemaPathInfo(
      this.model,
      field
    );
    const refModel = mongoose.model(refModelName);

    this._pipeline.push({
      $lookup: {
        from: refModel.collection.name,
        localField: field,
        foreignField: "_id",
        as: field,
      },
    });

    if (!isArray) {
      this._pipeline.push({
        $unwind: { path: `$${field}`, preserveNullAndEmptyArrays: true },
      });
    }
  }

  #lookupNested(parentField, childField) {
    // Ensure parent joined first
    const { refModelName, isArray: parentIsArray } = this.#getSchemaPathInfo(
      this.model,
      parentField
    );
    const parentModel = mongoose.model(refModelName);
    this.#lookupTopLevel(parentField);

    // Determine child on parent model
    const childInfo = this.#getSchemaPathInfo(parentModel, childField);
    const childModel = mongoose.model(childInfo.refModelName);

    const tempAs = `${parentField}_${childField}__mg`;

    // Lookup all child docs for referenced IDs
    this._pipeline.push({
      $lookup: {
        from: childModel.collection.name,
        localField: `${parentField}.${childField}`,
        foreignField: "_id",
        as: tempAs,
      },
    });

    if (parentIsArray) {
      // Map child back into each parent array element
      this._pipeline.push({
        $set: {
          [parentField]: {
            $map: {
              input: `$${parentField}`,
              as: "elem",
              in: {
                $mergeObjects: [
                  "$$elem",
                  {
                    [childField]: {
                      $first: {
                        $filter: {
                          input: `$${tempAs}`,
                          as: "c",
                          cond: { $eq: ["$$c._id", `$$elem.${childField}`] },
                        },
                      },
                    },
                  },
                ],
              },
            },
          },
        },
      });
    } else {
      // Parent is object; merge child into parent.child
      this._pipeline.push({
        $set: {
          [parentField]: {
            $mergeObjects: [
              `$${parentField}`,
              { [childField]: { $first: `$${tempAs}` } },
            ],
          },
        },
      });
    }

    this._pipeline.push({ $unset: tempAs });
  }
}
