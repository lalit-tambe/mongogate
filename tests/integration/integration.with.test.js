import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { mongogatePlugin } from "../../src/index.js";

// --- Schemas and Models ---

// Role: A simple document that a User can have.
const roleSchema = new mongoose.Schema({ name: String });
const Role = mongoose.model("Role", roleSchema);

// Post: A document that a User can have many of.
const postSchema = new mongoose.Schema({ title: String });
const Post = mongoose.model("Post", postSchema);

// User: The main document with relationships.
const userSchema = new mongoose.Schema({
  name: String,
  role: { type: mongoose.Schema.Types.ObjectId, ref: "Role" }, // Single reference
  posts: [{ type: mongoose.Schema.Types.ObjectId, ref: "Post" }], // Array of references
});
userSchema.plugin(mongogatePlugin);
const User = mongoose.model("User", userSchema);

// --- Test Suite ---
describe("Integration Tests: with()", () => {
  let mongoServer;
  let adminRole, userRole, post1, post2, post3;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  // Seed the database with related data
  beforeEach(async () => {
    // Clear all collections
    await Promise.all([
      User.deleteMany({}),
      Role.deleteMany({}),
      Post.deleteMany({}),
    ]);

    // Create related documents
    [adminRole, userRole] = await Role.create([
      { name: "Admin" },
      { name: "User" },
    ]);

    [post1, post2, post3] = await Post.create([
      { title: "First Post" },
      { title: "Second Post" },
      { title: "Third Post" },
    ]);

    // Create users with links to the other documents
    await User.create([
      { name: "Alice", role: adminRole._id, posts: [post1._id, post2._id] },
      { name: "Bob", role: userRole._id, posts: [post3._id] },
      { name: "Charlie", role: userRole._id, posts: [] }, // No posts
      { name: "David" }, // No role or posts
    ]);
  });

  test("✔ should populate a single top-level reference", async () => {
    const alice = await User.mg().where("name", "Alice").with("role").first();

    expect(alice.role).toBeInstanceOf(Object);
    expect(alice.role.name).toBe("Admin");
    // Ensure the ID matches, proving it's the correct document
    expect(alice.role._id.equals(adminRole._id)).toBe(true);
  });

  test("✔ should return null for a missing single reference", async () => {
    const david = await User.mg().where("name", "David").with("role").first();

    // In an aggregation, a missing $unwind results in the field being absent or null.
    // Your builder preserves the document, so we check for a nullish value.
    expect(david.role).toBeFalsy();
  });

  test("✔ should populate an array of references", async () => {
    const alice = await User.mg().where("name", "Alice").with("posts").first();

    expect(alice.posts).toBeInstanceOf(Array);
    expect(alice.posts).toHaveLength(2);
    const titles = alice.posts.map((p) => p.title).sort();
    expect(titles).toEqual(["First Post", "Second Post"]);
  });

  test("✔ should handle an empty array of references", async () => {
    const charlie = await User.mg()
      .where("name", "Charlie")
      .with("posts")
      .first();

    expect(charlie.posts).toBeInstanceOf(Array);
    expect(charlie.posts).toHaveLength(0);
  });

  // This test requires a nested relationship, which is an advanced feature.
  // We'll add it here to showcase the full capability.
  test("✔ should populate a nested reference", async () => {
    // Let's add a "category" to our posts
    const categorySchema = new mongoose.Schema({ name: String });
    const Category = mongoose.model("Category", categorySchema);
    const techCategory = await Category.create({ name: "Tech" });

    // Add the ref to the Post schema
    postSchema.add({
      category: { type: mongoose.Schema.Types.ObjectId, ref: "Category" },
    });

    // Update a post to include the category
    await Post.updateOne({ _id: post1._id }, { category: techCategory._id });

    // The actual test
    const alice = await User.mg()
      .where({ name: "Alice" })
      .with("posts.category") // The nested population
      .first();

    expect(alice.posts).toHaveLength(2);
    const postWithCategory = alice.posts.find((p) => p.title === "First Post");
    const postWithoutCategory = alice.posts.find(
      (p) => p.title === "Second Post"
    );

    expect(postWithCategory.category).toBeInstanceOf(Object);
    expect(postWithCategory.category.name).toBe("Tech");
    expect(postWithoutCategory.category).toBeFalsy();

    // Clean up our temporary model to avoid polluting other tests
    delete mongoose.models.Category;
  });

  test("✔ should handle multiple with() calls", async () => {
    // Let's add a "category" to our posts
    const categorySchema = new mongoose.Schema({ name: String });
    const Category = mongoose.model("Category", categorySchema);
    const techCategory = await Category.create({ name: "Tech" });

    // Add the ref to the Post schema
    postSchema.add({
      category: { type: mongoose.Schema.Types.ObjectId, ref: "Category" },
    });

    // Update a post to include the category
    await Post.updateOne({ _id: post1._id }, { category: techCategory._id });
    const user = await User.mg()
      .where("name", "Alice")
      .with("role")
      .with("posts.category")
      .first();

    // Check role
    expect(user.role).toBeInstanceOf(Object);
    expect(user.role).toHaveProperty("name", "Admin");

    // Check posts and nested category
    expect(user.posts).toHaveLength(2);
    expect(user.posts[0].category).toBeInstanceOf(Object);
    expect(user.posts[0].category).toHaveProperty("name", "Tech");
  });
});
