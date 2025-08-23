export class MongogateBuilder {
  constructor(model, options = {}) {
    this.model = model; // Mongoose model (root)
    this._pipeline = [];
    this._project = null;
    this._skip = null;
    this._limit = null;
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
}
