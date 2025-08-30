import { jest } from "@jest/globals";
import { MongogateBuilder } from "../../src/builder.js";

describe("MongogateBuilder.paginate()", () => {
  let mockModel;
  let qb;

  beforeEach(() => {
    // Mock the Mongoose model's aggregate function
    mockModel = {
      aggregate: jest.fn(),
    };
    qb = new MongogateBuilder(mockModel);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("✔ paginate() returns the correct structure and data on success", async () => {
    const mockData = [{ name: "Test1" }, { name: "Test2" }];
    const mockTotal = 27;

    // Mock the expected return from a $facet pipeline
    const mockAggregateResult = [
      {
        data: mockData,
        total: mockTotal,
      },
    ];
    mockModel.aggregate.mockResolvedValue(mockAggregateResult);

    const result = await qb.where({ active: true }).paginate(2, 10);

    // 1. Check if the aggregate function was called
    expect(mockModel.aggregate).toHaveBeenCalledTimes(1);

    // 2. Check the structure of the pipeline sent to aggregate()
    const calledPipeline = mockModel.aggregate.mock.calls[0][0];

    // Check the 'data' pipeline
    expect(calledPipeline[0].$facet.data[0]).toEqual({
      $match: { active: true },
    });
    expect(calledPipeline[0].$facet.data[1]).toEqual({ $skip: 10 });
    expect(calledPipeline[0].$facet.data[2]).toEqual({ $limit: 10 });

    // Check the 'total' pipeline
    expect(calledPipeline[0].$facet.total).toEqual([
      { $match: { active: true } },
      { $count: "count" },
    ]);

    // 3. Check the returned pagination object
    expect(result).toEqual({
      data: mockData,
      page: 2,
      perPage: 10,
      total: mockTotal,
      totalPages: 3,
    });
  });

  test("✔ paginate() handles the first page correctly", async () => {
    mockModel.aggregate.mockResolvedValue([{ data: [], total: 0 }]);

    await qb.paginate(1, 5);

    const calledPipeline = mockModel.aggregate.mock.calls[0][0];
    const dataPipeline = calledPipeline[0].$facet.data;

    // Corrected assertion: Check for the property's existence
    expect(dataPipeline.find((stage) => stage.hasOwnProperty("$skip"))).toEqual(
      { $skip: 0 }
    );
    expect(
      dataPipeline.find((stage) => stage.hasOwnProperty("$limit"))
    ).toEqual({ $limit: 5 });
  });

  test("✔ paginate() handles zero results correctly", async () => {
    // Mock an empty result set
    const mockAggregateResult = [{ data: [], total: 0 }];
    mockModel.aggregate.mockResolvedValue(mockAggregateResult);

    const result = await qb.paginate(1, 10);

    expect(result).toEqual({
      data: [],
      page: 1,
      perPage: 10,
      total: 0,
      totalPages: 1,
    });
  });

  test("✔ paginate() coerces page and perPage to numbers", async () => {
    mockModel.aggregate.mockResolvedValue([{ data: [], total: 0 }]);

    await qb.paginate("3", "7");

    const calledPipeline = mockModel.aggregate.mock.calls[0][0];
    const dataPipeline = calledPipeline[0].$facet.data;

    expect(dataPipeline.find((stage) => stage.hasOwnProperty("$skip"))).toEqual(
      { $skip: 14 }
    ); // (3 - 1) * 7
    expect(
      dataPipeline.find((stage) => stage.hasOwnProperty("$limit"))
    ).toEqual({ $limit: 7 });
  });
});
