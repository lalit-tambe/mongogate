export class MongogateBuilder {
  constructor(model, options = {}) {
    this._pipeline = [];
  }

  // Adds conditions to the pipeline for $match
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
}
