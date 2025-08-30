// tests/unit/builder.count.test.js
import { jest } from "@jest/globals";
import { MongogateBuilder } from "../../src/builder.js";

describe("MongogateBuilder.count()", () => {
  let mockModel;
  let qb;

  beforeEach(() => {
    mockModel = {
      aggregate: jest.fn().mockResolvedValue([]),
    };
    qb = new MongogateBuilder(mockModel);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("✔ should call aggregate with a $count stage", async () => {
    mockModel.aggregate.mockResolvedValue([{ total: 5 }]);

    await qb.where({ isActive: true }).count();

    const calledPipeline = mockModel.aggregate.mock.calls[0][0];
    expect(calledPipeline).toEqual([
      { $match: { isActive: true } },
      { $count: "total" },
    ]);
  });

  test("✔ should return the numeric count from the result", async () => {
    mockModel.aggregate.mockResolvedValue([{ total: 10 }]);

    const count = await qb.count();

    expect(count).toBe(10);
  });

  test("✔ should return 0 if no documents are found", async () => {
    mockModel.aggregate.mockResolvedValue([]);

    const count = await qb.count();

    expect(count).toBe(0);
  });
});
