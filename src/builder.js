export class MongogateBuilder {
  constructor(model, options = {}) {
    this._pipeline = [];
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
}
