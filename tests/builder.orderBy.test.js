// tests/builder.orderBy.test.js
import { MongogateBuilder } from "../src/builder.js";

describe("MongogateBuilder.orderBy()", () => {
  let qb;

  beforeEach(() => {
    qb = new MongogateBuilder({}); // model not used by orderBy()
  });

  test("single field with dir arg (desc)", () => {
    qb.orderBy("createdAt", "desc");
    expect(qb.pipeline()).toEqual([{ $sort: { createdAt: -1 } }]);
  });

  test("single field default asc", () => {
    qb.orderBy("name");
    expect(qb.pipeline()).toEqual([{ $sort: { name: 1 } }]);
  });

  test("hyphen shorthand for desc", () => {
    qb.orderBy("-age");
    expect(qb.pipeline()).toEqual([{ $sort: { age: -1 } }]);
  });

  test("multiple fields (space-separated string)", () => {
    qb.orderBy("name -age email");
    expect(qb.pipeline()).toEqual([{ $sort: { name: 1, age: -1, email: 1 } }]);
  });

  test("multiple fields (array)", () => {
    qb.orderBy(["name", "-age", "email"]);
    expect(qb.pipeline()).toEqual([{ $sort: { name: 1, age: -1, email: 1 } }]);
  });

  test("object input (numeric)", () => {
    qb.orderBy({ score: -1, rank: 1 });
    expect(qb.pipeline()).toEqual([{ $sort: { score: -1, rank: 1 } }]);
  });

  test("object input (string dir)", () => {
    qb.orderBy({ createdAt: "desc", name: "asc" });
    expect(qb.pipeline()).toEqual([{ $sort: { createdAt: -1, name: 1 } }]);
  });

  test("merges when last stage is $sort (single $sort remains)", () => {
    qb.orderBy("name").orderBy("-age");
    expect(qb.pipeline()).toEqual([{ $sort: { name: 1, age: -1 } }]);
  });

  test("pushes new $sort when last stage is NOT $sort (preserve ordering)", () => {
    qb.orderBy("name");
    qb.where({ isActive: true }); // adds $match after $sort
    qb.orderBy("-age"); // should NOT merge into earlier $sort
    expect(qb.pipeline()).toEqual([
      { $sort: { name: 1 } },
      { $match: { isActive: true } },
      { $sort: { age: -1 } },
    ]);
  });

  test("throws on invalid object values", () => {
    expect(() => qb.orderBy({ age: 2 })).toThrow(
      "orderBy() object values must be 1, -1, 'asc', or 'desc'"
    );
  });

  test("throws on invalid array element", () => {
    expect(() => qb.orderBy(["name", 123])).toThrow(
      "orderBy() array values must be strings"
    );
  });

  test("throws on unsupported type", () => {
    expect(() => qb.orderBy(42)).toThrow(
      "orderBy() expects string, array, or object"
    );
  });

  test("throws if called with nothing", () => {
    // @ts-ignore — intentional misuse
    expect(() => qb.orderBy()).toThrow("orderBy() requires at least one field");
  });
});
