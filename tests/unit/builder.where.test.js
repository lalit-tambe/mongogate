import { jest } from "@jest/globals";
import { MongogateBuilder } from "../../src/builder.js";

describe("MongogateBuilder.where()", () => {
  /** @type {{ aggregate: jest.Mock, schema: { path: jest.Mock } }} */
  let mockModel;

  beforeEach(() => {
    mockModel = {
      aggregate: jest.fn().mockResolvedValue([]),
      schema: { path: jest.fn() }, // not used by where(), but keeps shape consistent
      modelName: "X",
    };
  });

  test("where({ a:1, b:2 }) adds a single $match with both keys", () => {
    const qb = new MongogateBuilder(mockModel);
    qb.where({ a: 1, b: 2 });

    expect(qb.pipeline()).toEqual([{ $match: { a: 1, b: 2 } }]);
  });

  test('where("field", value) adds equality match', () => {
    const qb = new MongogateBuilder(mockModel);
    qb.where("age", 21);

    expect(qb.pipeline()).toEqual([{ $match: { age: 21 } }]);
  });

  test('where("field","=",value) uses $eq', () => {
    const qb = new MongogateBuilder(mockModel);
    qb.where("age", "=", 30);

    expect(qb.pipeline()).toEqual([{ $match: { age: { $eq: 30 } } }]);
  });

  test('where("field","==",value) uses $eq', () => {
    const qb = new MongogateBuilder(mockModel);
    qb.where("age", "==", 30);

    expect(qb.pipeline()).toEqual([{ $match: { age: { $eq: 30 } } }]);
  });

  test('where("field","!=",value) uses $ne', () => {
    const qb = new MongogateBuilder(mockModel);
    qb.where("status", "!=", "inactive");

    expect(qb.pipeline()).toEqual([
      { $match: { status: { $ne: "inactive" } } },
    ]);
  });

  test.each([
    [">", "$gt", 10],
    [">=", "$gte", 10],
    ["<", "$lt", 10],
    ["<=", "$lte", 10],
  ])('where("score","%s",10) maps to %s', (op, mongoOp, val) => {
    const qb = new MongogateBuilder(mockModel);
    qb.where("score", op, val);

    expect(qb.pipeline()).toEqual([{ $match: { score: { [mongoOp]: val } } }]);
  });

  test('where("name","regex",/abc/i) preserves RegExp', () => {
    const qb = new MongogateBuilder(mockModel);
    const re = /abc/i;
    qb.where("name", "regex", re);

    const pipe = qb.pipeline();
    expect(pipe).toHaveLength(1);
    expect(pipe[0].$match.name.$regex).toBeInstanceOf(RegExp);
    expect(pipe[0].$match.name.$regex).toBe(re);
  });

  test('where("name","regex","abc") creates case-insensitive RegExp', () => {
    const qb = new MongogateBuilder(mockModel);
    qb.where("name", "regex", "abc");

    const re = qb.pipeline()[0].$match.name.$regex;
    expect(re).toBeInstanceOf(RegExp);
    expect(re.source).toBe("abc");
    expect(re.flags).toContain("i");
    // sanity: should match mixed case
    expect(re.test("AbC")).toBe(true);
  });

  test("where() can be chained; stages accumulate in order", () => {
    const qb = new MongogateBuilder(mockModel);
    qb.where({ a: 1 }).where("b", ">", 5).where("c", "regex", "foo");

    const pipe = qb.pipeline();
    expect(pipe).toEqual([
      { $match: { a: 1 } },
      { $match: { b: { $gt: 5 } } },
      expect.objectContaining({
        $match: expect.objectContaining({
          c: expect.objectContaining({ $regex: expect.any(RegExp) }),
        }),
      }),
    ]);
  });

  test("where() throws on unsupported operator", () => {
    const qb = new MongogateBuilder(mockModel);
    expect(() => qb.where("age", "^", 10)).toThrow("Unsupported operator: ^");
  });
});
