import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { mongogatePlugin } from "../../src/index.js";

// --- Schemas and Models ---
const userSchema = new mongoose.Schema({
  name: String,
  age: Number,
});
userSchema.plugin(mongogatePlugin);
const User = mongoose.model("User", userSchema);

// --- Test Suite ---
describe("Integration Tests: paginate()", () => {
  let mongoServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  // Seed the database with a consistent set of users
  beforeEach(async () => {
    await User.deleteMany({});
    await User.create([
      { name: "User 1", age: 10 },
      { name: "User 2", age: 20 },
      { name: "User 3", age: 30 },
      { name: "User 4", age: 40 },
      { name: "User 5", age: 50 },
    ]);
  });

  test("✔ should return the first page of results correctly", async () => {
    const result = await User.mg().orderBy("age").paginate(1, 2);

    expect(result.data).toHaveLength(2);
    expect(result.data[0].name).toBe("User 1");
    expect(result.data[1].name).toBe("User 2");
    expect(result.page).toBe(1);
    expect(result.perPage).toBe(2);
    expect(result.total).toBe(5);
    expect(result.totalPages).toBe(3);
  });

  test("✔ should return the second page of results correctly", async () => {
    const result = await User.mg().orderBy("age").paginate(2, 2);

    expect(result.data).toHaveLength(2);
    expect(result.data[0].name).toBe("User 3");
    expect(result.data[1].name).toBe("User 4");
    expect(result.page).toBe(2);
    expect(result.total).toBe(5);
    expect(result.totalPages).toBe(3);
  });

  test("✔ should handle the last page correctly, even if it's not full", async () => {
    const result = await User.mg().orderBy("age").paginate(3, 2);

    expect(result.data).toHaveLength(1);
    expect(result.data[0].name).toBe("User 5");
    expect(result.page).toBe(3);
    expect(result.total).toBe(5);
    expect(result.totalPages).toBe(3);
  });

  test("✔ should handle a filter before pagination", async () => {
    const result = await User.mg()
      .where("age", ">", 25)
      .orderBy("age")
      .paginate(1, 2);

    expect(result.data).toHaveLength(2);
    expect(result.data[0].name).toBe("User 3");
    expect(result.data[1].name).toBe("User 4");
    expect(result.total).toBe(3);
    expect(result.totalPages).toBe(2);
  });
});
