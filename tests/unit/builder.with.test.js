import { jest } from "@jest/globals";
import { MongogateBuilder } from "../../src/builder.js";

describe("MongogateBuilder.with()", () => {
  let mockUserModel, mockRoleModel, mockPostModel, mockCategoryModel;

  beforeEach(() => {
    // --- Mock Models and Schemas ---

    mockRoleModel = {
      modelName: "Role",
      collection: { name: "roles" },
      schema: {
        path: jest.fn().mockImplementation((p) => {
          if (p === "permissions") {
            return { caster: { options: { ref: "Permission" } } };
          }
          return null;
        }),
      },
    };

    mockCategoryModel = {
      modelName: "Category",
      collection: { name: "categories" },
      schema: {
        path: jest.fn(),
      },
    };

    mockPostModel = {
      modelName: "Post",
      collection: { name: "posts" },
      schema: {
        path: jest.fn().mockImplementation((p) => {
          if (p === "category") {
            return { options: { ref: "Category" } };
          }
          return null;
        }),
      },
    };

    // The mock model now needs a `db` property that has its own `model` function.
    // This function will return the correct mock model based on the name.
    const mockDb = {
      model: jest.fn((modelName) => {
        if (modelName === "Role") return mockRoleModel;
        if (modelName === "Post") return mockPostModel;
        if (modelName === "Category") return mockCategoryModel;
        if (modelName === "User") return mockUserModel;
        throw new Error(`Mock for model "${modelName}" not found in db mock`);
      }),
    };

    mockUserModel = {
      modelName: "User",
      collection: { name: "users" },
      schema: {
        path: jest.fn().mockImplementation((p) => {
          if (p === "role") {
            // Single ref
            return { options: { ref: "Role" } };
          }
          if (p === "posts") {
            // Array of refs
            return { caster: { options: { ref: "Post" } } };
          }
          return null; // Path not found
        }),
      },
      db: mockDb,
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("✔ with(string) handles top-level population (single ref)", () => {
    const qb = new MongogateBuilder(mockUserModel);
    qb.with("role");

    const pipeline = qb.pipeline();
    expect(pipeline).toHaveLength(2);
    expect(pipeline[0]).toEqual({
      $lookup: {
        from: "roles",
        localField: "role",
        foreignField: "_id",
        as: "role",
      },
    });
    expect(pipeline[1]).toEqual({
      $unwind: { path: "$role", preserveNullAndEmptyArrays: true },
    });
  });

  test("✔ with(string) handles top-level population (array of refs)", () => {
    const qb = new MongogateBuilder(mockUserModel);
    qb.with("posts");

    const pipeline = qb.pipeline();
    expect(pipeline).toHaveLength(1); // Should NOT have $unwind
    expect(pipeline[0]).toEqual({
      $lookup: {
        from: "posts",
        localField: "posts",
        foreignField: "_id",
        as: "posts",
      },
    });
  });

  test("✔ with(string) handles nested population", () => {
    const qb = new MongogateBuilder(mockUserModel);
    qb.with("posts.category");

    const pipeline = qb.pipeline();
    // This is complex, so we'll check for key stages
    expect(pipeline.some((p) => p.$lookup && p.$lookup.from === "posts")).toBe(
      true
    );
    expect(
      pipeline.some((p) => p.$lookup && p.$lookup.from === "categories")
    ).toBe(true);
    expect(pipeline.some((p) => p.$set && p.$set.posts)).toBe(true); // check for the mapping stage
    expect(
      pipeline.some((p) => p.$unset && p.$unset === "posts_category__mg")
    ).toBe(true);
  });

  test("✔ Multiple calls to with() are idempotent", () => {
    const qb = new MongogateBuilder(mockUserModel);
    qb.with("role").with("role");

    const pipeline = qb.pipeline();
    expect(pipeline).toHaveLength(2); // Should not duplicate stages
  });

  test("✔ throws error for non-string path", () => {
    const qb = new MongogateBuilder(mockUserModel);
    expect(() => qb.with(123)).toThrow(
      "with() expects a non-empty string path"
    );
  });

  test("✔ throws error for empty string path", () => {
    const qb = new MongogateBuilder(mockUserModel);
    expect(() => qb.with("")).toThrow("with() expects a non-empty string path");
  });

  test("✔ throws error for path not found in schema", () => {
    const qb = new MongogateBuilder(mockUserModel);
    expect(() => qb.with("nonexistent")).toThrow(
      "Path 'nonexistent' not found on User schema"
    );
  });

  test("✔ throws error for path that is not a ref", () => {
    const qb = new MongogateBuilder(mockUserModel);
    // Let's pretend 'name' exists but isn't a ref
    mockUserModel.schema.path.mockImplementation((p) =>
      p === "name" ? {} : null
    );
    expect(() => qb.with("name")).toThrow("Path 'name' is not a ref on User");
  });

  test("✔ throws error for exceeding max depth", () => {
    const qb = new MongogateBuilder(mockUserModel, { maxWithDepth: 2 });
    expect(() => qb.with("a.b.c")).toThrow("with(): supports up to 2 levels");
  });
});
