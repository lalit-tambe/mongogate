import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { mongogatePlugin } from "../../src/index.js";

// --- Schemas and Models ---
const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  age: Number,
  isActive: Boolean,
});
userSchema.plugin(mongogatePlugin);
const User = mongoose.model("User", userSchema);

// --- Test Suite ---
describe("Integration Tests: select()", () => {
  let mongoServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  // Seed the database with a user before each test
  beforeEach(async () => {
    await User.deleteMany({});
    await User.create({
      name: "Alice",
      email: "alice@example.com",
      age: 30,
      isActive: true,
    });
  });

  test("✔ should select only the specified fields (string)", async () => {
    const user = await User.mg().select("name email").first();

    // Mongoose always includes _id unless explicitly excluded
    expect(user).toHaveProperty("name", "Alice");
    expect(user).toHaveProperty("email", "alice@example.com");
    expect(user).toHaveProperty("_id");
    expect(user).not.toHaveProperty("age");
    expect(user).not.toHaveProperty("isActive");
  });

  test("✔ should select only the specified fields (array)", async () => {
    const user = await User.mg().select(["name", "age"]).first();

    expect(user).toHaveProperty("name", "Alice");
    expect(user).toHaveProperty("age", 30);
    expect(user).not.toHaveProperty("email");
    expect(user).not.toHaveProperty("isActive");
  });

  test("✔ should exclude the specified fields", async () => {
    const user = await User.mg().select("-age -isActive").first();

    expect(user).toHaveProperty("name", "Alice");
    expect(user).toHaveProperty("email", "alice@example.com");
    expect(user).not.toHaveProperty("age");
    expect(user).not.toHaveProperty("isActive");
  });

  test("✔ should exclude _id when specified", async () => {
    const user = await User.mg().select("name -_id").first();

    expect(user).toHaveProperty("name", "Alice");
    expect(user).not.toHaveProperty("_id");
    expect(user).not.toHaveProperty("email");
  });

  test("✔ should handle mixed inclusion and exclusion", async () => {
    // Note: MongoDB aggregation doesn't support mixing inclusion and exclusion in one $project stage,
    // except for excluding _id. Your builder correctly handles this.
    const user = await User.mg().select(["name", "age", "-_id"]).first();

    expect(user).toHaveProperty("name", "Alice");
    expect(user).toHaveProperty("age", 30);
    expect(user).not.toHaveProperty("_id");
    expect(user).not.toHaveProperty("email");
    expect(user).not.toHaveProperty("isActive");
  });
});
