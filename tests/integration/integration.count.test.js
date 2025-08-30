import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { mongogatePlugin } from "../../src/index.js";

const productSchema = new mongoose.Schema({
  name: String,
  category: String,
});
productSchema.plugin(mongogatePlugin);
const Product = mongoose.model("Product", productSchema);

describe("Integration Tests: count()", () => {
  let mongoServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await Product.deleteMany({});
    await Product.create([
      { name: "Laptop", category: "electronics" },
      { name: "Mouse", category: "electronics" },
      { name: "Keyboard", category: "electronics" },
      { name: "Book", category: "books" },
    ]);
  });

  test("✔ should return the correct number of matching documents", async () => {
    const electronicsCount = await Product.mg()
      .where("category", "electronics")
      .count();

    expect(electronicsCount).toBe(3);
  });

  test("✔ should return 0 for a query with no matches", async () => {
    const hardwareCount = await Product.mg()
      .where("category", "hardware")
      .count();

    expect(hardwareCount).toBe(0);
  });
});
