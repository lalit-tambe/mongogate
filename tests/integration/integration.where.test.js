import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { mongogatePlugin } from "../../src/index.js";

// --- Schemas and Models ---
const userSchema = new mongoose.Schema({
  name: String,
  age: Number,
  isActive: Boolean,
  tags: [String],
});
userSchema.plugin(mongogatePlugin);
const User = mongoose.model("User", userSchema);

// --- Test Suite ---
describe("Integration Tests: where()", () => {
  let mongoServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  // Seed the database with fresh data before each test
  beforeEach(async () => {
    await User.deleteMany({});
    await User.create([
      { name: "Alice", age: 30, isActive: true, tags: ["dev", "lead"] },
      { name: "Bob", age: 25, isActive: false, tags: ["qa"] },
      { name: "Charlie", age: 35, isActive: true, tags: ["dev", "manager"] },
      { name: "Diana", age: 40, isActive: true, tags: ["qa", "lead"] },
    ]);
  });

  test("✔ should filter with a single key-value condition", async () => {
    const users = await User.mg().where("name", "Alice").get();
    expect(users).toHaveLength(1);
    expect(users[0].name).toBe("Alice");
  });

  test("✔ should filter with an object condition", async () => {
    const users = await User.mg().where({ isActive: true, age: 35 }).get();
    expect(users).toHaveLength(1);
    expect(users[0].name).toBe("Charlie");
  });

  test("✔ should filter with a '>' operator", async () => {
    const users = await User.mg().where("age", ">", 35).get();
    expect(users).toHaveLength(1);
    expect(users[0].name).toBe("Diana");
  });

  test("✔ should filter with the 'in' operator", async () => {
    const users = await User.mg().where("name", "in", ["Bob", "Diana"]).get();
    expect(users).toHaveLength(2);
    const names = users.map((u) => u.name).sort();
    expect(names).toEqual(["Bob", "Diana"]);
  });

  test("✔ should filter with the 'nin' (not in) operator for array field", async () => {
    // Find users who are NOT leads
    const users = await User.mg().where("tags", "nin", ["lead"]).get();
    expect(users).toHaveLength(2);
    const names = users.map((u) => u.name).sort();
    expect(names).toEqual(["Bob", "Charlie"]);
  });

  test("✔ should filter with a case-insensitive regex", async () => {
    const users = await User.mg().where("name", "regex", "alice").get();
    expect(users).toHaveLength(1);
    expect(users[0].name).toBe("Alice");
  });

  test("✔ should chain multiple where clauses", async () => {
    const users = await User.mg()
      .where("isActive", true)
      .where("tags", "in", ["lead"])
      .get();

    expect(users).toHaveLength(2);
    const names = users.map((u) => u.name).sort();
    expect(names).toEqual(["Alice", "Diana"]);
  });
});
