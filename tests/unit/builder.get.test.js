import { jest } from "@jest/globals";
import { MongogateBuilder } from "../../src/builder.js";

describe("MongogateBuilder.get() and .first()", () => {
  let mockModel;
  let qb;

  beforeEach(() => {
    // Mock the Mongoose model's aggregate function
    mockModel = {
      aggregate: jest.fn().mockResolvedValue([]), // Default to empty array
    };
    qb = new MongogateBuilder(mockModel);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ---------- GET() ----------

  test("✔ get() calls model.aggregate with the finalized pipeline", async () => {
    const expectedPipeline = [
      { $match: { status: "active" } },
      { $sort: { createdAt: -1 } },
      { $skip: 10 },
      { $limit: 5 },
    ];

    await qb
      .where({ status: "active" })
      .orderBy("createdAt", "desc")
      .limit(5)
      .skip(10)
      .get();

    expect(mockModel.aggregate).toHaveBeenCalledTimes(1);
    expect(mockModel.aggregate).toHaveBeenCalledWith(expectedPipeline);
  });

  test("✔ get() returns the result from model.aggregate", async () => {
    const mockData = [{ _id: "1", name: "Test" }];
    mockModel.aggregate.mockResolvedValue(mockData);

    const result = await qb.get();

    expect(result).toBe(mockData);
  });

  // ---------- FIRST() ----------

  test("✔ first() calls model.aggregate with a limit of 1", async () => {
    await qb.where({ a: 1 }).first();

    const calledPipeline = mockModel.aggregate.mock.calls[0][0];
    expect(calledPipeline).toEqual([{ $match: { a: 1 } }, { $limit: 1 }]);
  });

  test("✔ first() overwrites any previous limit with 1", async () => {
    await qb.limit(100).first();

    const calledPipeline = mockModel.aggregate.mock.calls[0][0];
    expect(calledPipeline).toEqual([{ $limit: 1 }]);
  });

  test("✔ first() returns the first document from the result array", async () => {
    const mockData = [{ name: "First" }, { name: "Second" }];
    mockModel.aggregate.mockResolvedValue(mockData);

    const result = await qb.first();

    expect(result).toBe(mockData[0]);
  });

  test("✔ first() returns null if aggregate returns an empty array", async () => {
    mockModel.aggregate.mockResolvedValue([]); // The default, but explicit here

    const result = await qb.first();

    expect(result).toBeNull();
  });
});
