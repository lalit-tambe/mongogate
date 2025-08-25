// src/__tests__/builder.test.js
import { jest } from "@jest/globals";
import { MongogateBuilder } from "../src/builder.js";

describe("MongogateBuilder", () => {
  let mockModel;

  beforeEach(() => {
    mockModel = {
      aggregate: jest.fn().mockResolvedValue([{ foo: "bar" }]),
      schema: {
        path: jest.fn(),
      },
    };
  });

  it("should build a simple match pipeline", () => {
    const qb = new MongogateBuilder(mockModel);
    const pipeline = qb.where("isActive", true).pipeline();

    expect(pipeline).toEqual([{ $match: { isActive: true } }]);
  });

  it("where({a:1}) adds $match", () => {
    const qb = new MongogateBuilder(mockModel);
    qb.where({ a: 1 });
    expect(qb.pipeline()).toEqual([{ $match: { a: 1 } }]);
  });

  it("where('a', 5) adds equality match", () => {
    const qb = new MongogateBuilder(mockModel);
    qb.where("a", 5);
    expect(qb.pipeline()).toEqual([{ $match: { a: 5 } }]);
  });

  it("where('a','>',10) adds operator match", () => {
    const qb = new MongogateBuilder(mockModel);
    qb.where("a", ">", 10);
    expect(qb.pipeline()).toEqual([{ $match: { a: { $gt: 10 } } }]);
  });

  it("select(['field1','field2']) adds $project", () => {
    const qb = new MongogateBuilder(mockModel);
    qb.select(["field1", "field2"]);
    expect(qb.pipeline()).toEqual([{ $project: { field1: 1, field2: 1 } }]);
  });

  it("orderBy() adds $sort", () => {
    const qb = new MongogateBuilder(mockModel);
    qb.orderBy("createdAt", "desc");
    expect(qb.pipeline()).toEqual([{ $sort: { createdAt: -1 } }]);
  });

  it("limit() and skip() are applied", () => {
    const qb = new MongogateBuilder(mockModel);
    qb.limit(5).skip(10);
    expect(qb.pipeline()).toEqual([{ $skip: 10 }, { $limit: 5 }]);
  });

  it("get() calls model.aggregate", async () => {
    const qb = new MongogateBuilder(mockModel);
    const res = await qb.get();
    expect(mockModel.aggregate).toHaveBeenCalled();
    expect(res).toEqual([{ foo: "bar" }]);
  });

  it("first() returns first element", async () => {
    mockModel.aggregate.mockResolvedValue([{ foo: 1 }, { foo: 2 }]);
    const qb = new MongogateBuilder(mockModel);
    const res = await qb.first();
    expect(res).toEqual({ foo: 1 });
  });

  it("paginate() returns structured result", async () => {
    mockModel.aggregate.mockResolvedValue([{ data: [{ foo: 1 }], total: 15 }]);
    const qb = new MongogateBuilder(mockModel);
    const res = await qb.paginate(2, 5);
    expect(res).toEqual({
      data: [{ foo: 1 }],
      page: 2,
      perPage: 5,
      total: 15,
      totalPages: 3,
    });
  });
});
