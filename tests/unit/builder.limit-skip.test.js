import { MongogateBuilder } from "../../src/builder.js";

describe("MongogateBuilder.limit() and .skip()", () => {
  let qb;

  beforeEach(() => {
    // model is not used by limit() or skip()
    qb = new MongogateBuilder({});
  });

  // ---------- LIMIT ----------
  test("limit(n) adds a $limit stage", () => {
    qb.limit(10);
    expect(qb.pipeline()).toEqual([{ $limit: 10 }]);
  });

  test("limit(n) overwrites previous limit value", () => {
    qb.limit(10).limit(20);
    expect(qb.pipeline()).toEqual([{ $limit: 20 }]);
  });

  test("limit(n) coerces value to a number", () => {
    qb.limit("50");
    expect(qb.pipeline()).toEqual([{ $limit: 50 }]);
  });

  // ---------- SKIP ----------
  test("skip(n) adds a $skip stage", () => {
    qb.skip(5);
    expect(qb.pipeline()).toEqual([{ $skip: 5 }]);
  });

  test("skip(n) overwrites previous skip value", () => {
    qb.skip(10).skip(20);
    expect(qb.pipeline()).toEqual([{ $skip: 20 }]);
  });

  test("skip(n) coerces value to a number", () => {
    qb.skip("15");
    expect(qb.pipeline()).toEqual([{ $skip: 15 }]);
  });

  // ---------- COMBINED ----------
  test("limit() and skip() can be used together", () => {
    qb.limit(10).skip(20);
    // The order of stages in the final pipeline is what matters for MongoDB.
    // finalizePipeline() in builder.js adds them in the correct order.
    expect(qb.pipeline()).toEqual([{ $skip: 20 }, { $limit: 10 }]);
  });

  test("Chaining with other builders preserves limit and skip", () => {
    qb.where({ a: 1 }).limit(5).orderBy("name").skip(10);
    expect(qb.pipeline()).toEqual([
      { $match: { a: 1 } },
      { $sort: { name: 1 } },
      { $skip: 10 },
      { $limit: 5 },
    ]);
  });
});
