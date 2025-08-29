// tests/integration/builder.sorting.test.js
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
describe("Integration Tests: orderBy(), limit(), skip()", () => {
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
      { name: "Charlie", age: 35 },
      { name: "Alice", age: 30 },
      { name: "Diana", age: 40 },
      { name: "Bob", age: 25 },
    ]);
  });

  test("✔ orderBy() should sort results in ascending order", async () => {
    const users = await User.mg().orderBy("age", "asc").get();
    const ages = users.map((u) => u.age);
    expect(ages).toEqual([25, 30, 35, 40]);
    expect(users[0].name).toBe("Bob");
  });

  test("✔ orderBy() should sort results in descending order", async () => {
    const users = await User.mg().orderBy("name", "desc").get();
    const names = users.map((u) => u.name);
    expect(names).toEqual(["Diana", "Charlie", "Bob", "Alice"]);
  });

  test("✔ orderBy() should handle multi-field sorting string", async () => {
    // Add a user with the same age to test secondary sort
    await User.create({ name: "Eve", age: 30 });
    const users = await User.mg().orderBy("age -name").get(); // age ASC, name DESC

    const names = users.map((u) => u.name);
    expect(names).toEqual(["Bob", "Eve", "Alice", "Charlie", "Diana"]);
  });

  test("✔ limit() should restrict the number of results", async () => {
    const users = await User.mg().orderBy("age").limit(2).get();
    expect(users).toHaveLength(2);
    expect(users[0].name).toBe("Bob");
    expect(users[1].name).toBe("Alice");
  });

  test("✔ skip() should offset the results", async () => {
    const users = await User.mg().orderBy("age").skip(2).get();
    expect(users).toHaveLength(2);
    expect(users[0].name).toBe("Charlie");
    expect(users[1].name).toBe("Diana");
  });

  test("✔ should chain orderBy(), skip(), and limit() correctly", async () => {
    // Get the second "page" of users when sorted by name
    const users = await User.mg()
      .orderBy("name") // Alice, Bob, Charlie, Diana
      .skip(1)
      .limit(2)
      .get();

    expect(users).toHaveLength(2);
    expect(users[0].name).toBe("Bob");
    expect(users[1].name).toBe("Charlie");
  });
});
