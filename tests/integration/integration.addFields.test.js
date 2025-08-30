import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { mongogatePlugin } from "../../src/index.js";

const productSchema = new mongoose.Schema({
  name: String,
  price: Number,
  stock: Number,
});
productSchema.plugin(mongogatePlugin);
const Product = mongoose.model("Product", productSchema);

describe("Integration Tests: addFields()", () => {
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
      { name: "Laptop", price: 1200, stock: 10 },
      { name: "Mouse", price: 25, stock: 100 },
    ]);
  });

  test("✔ should add a new calculated field to documents", async () => {
    const products = await Product.mg()
      .addFields({
        inventoryValue: { $multiply: ["$price", "$stock"] },
      })
      .orderBy("name")
      .get();

    const laptop = products.find((p) => p.name === "Laptop");
    expect(laptop.inventoryValue).toBe(12000); // 1200 * 10
  });

  test("✔ should be able to filter based on a newly added field", async () => {
    const highValueProducts = await Product.mg()
      .addFields({
        inventoryValue: { $multiply: ["$price", "$stock"] },
      })
      .where("inventoryValue", ">", 10000)
      .get();

    expect(highValueProducts).toHaveLength(1);
    expect(highValueProducts[0].name).toBe("Laptop");
  });
});
