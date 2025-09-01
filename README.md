# Mongo-aggregate

An elegant, Laravel Eloquent-style query builder that compiles to a MongoDB aggregation pipeline. Designed as a Mongoose plugin to be intuitive and powerful.

## Table of Contents

- [Install](#install)
- [Getting Started](#getting-started)
- [API Reference](#api-reference)
  - [Querying](#querying)
    - [`where()`](#where)
    - [`select()`](#select)
    - [`orderBy()`](#orderby)
    - [`limit()` & `skip()`](#limit--skip)
    - [`with()`](#with)
    - [`addFields()`](#addfields)
  - [Executing the Query](#executing-the-query)
    - [`get()`](#get)
    - [`first()`](#first)
    - [`count()`](#count)
    - [`paginate()`](#paginate)
- [Advanced Examples](#advanced-examples)
  - [Complex User Query](#complex-user-query)
  - [Products with Calculated Fields](#products-with-calculated-fields)

---

## Install

Since this is a Mongoose plugin, you will need `mongoose` installed as well.

```bash
npm install mongo-aggregate mongoose
```

---

## Getting Started

First, attach the `mongogatePlugin` to your Mongoose schema. This will add the static `mg()` method to your model, which is the entry point for the query builder.

```javascript
import mongoose from "mongoose";
import { mongogatePlugin } from "mongo-aggregate";

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  age: Number,
  isActive: { type: Boolean, default: true },
  role: { type: mongoose.Schema.Types.ObjectId, ref: "Role" },
});

// Apply the plugin
userSchema.plugin(mongogatePlugin);

const User = mongoose.model("User", userSchema);
```

**A Note on Mongoose `refs`:**
While Mongoose allows you to pass a model object directly to `ref`, the best practice is to always use the string name of the model (e.g., `ref: 'Role'`). This prevents potential circular dependency errors in Node.js when you have models that need to reference each other.

Now you can use the `mg()` method to start building queries:

```javascript
const activeUsers = await User.mg()
  .where("isActive", true)
  .orderBy("age", "desc")
  .get();
```

---

## API Reference

### Querying

#### `where()`

Adds a `$match` condition to the pipeline. It can be called multiple times to chain multiple `where` clauses, which is equivalent to an `AND` condition.

**1. Object-based Condition:**

- **`where(condition)`**
  - **`condition`**: `Object` - An object where keys are field names and values are the values to match for equality.
  - **Returns**: `MongogateBuilder` - The builder instance for chaining.

**2. Key-Value Condition:**

- **`where(field, value)`**
  - **`field`**: `String` - The name of the document field to query.
  - **`value`**: `any` - The value to match for equality.
  - **Returns**: `MongogateBuilder` - The builder instance for chaining.

**3. Operator-based Condition:**

- **`where(field, operator, value)`**
  - **`field`**: `String` - The name of the document field to query.
  - **`operator`**: `String` - The comparison operator. Supported operators: `'='`, `'=='`, `'!='`, `'>'`, `'>='`, `'<'`, `'<='`, `'in'`, `'nin'`, `'regex'`.
  - **`value`**: `any` - The value to compare against.
  - **Returns**: `MongogateBuilder` - The builder instance for chaining.

**Examples:**

```javascript
// Find users where isActive is true AND age is 30
await User.mg().where({ isActive: true, age: 30 }).get();

// Find users where the name is 'Alice'
await User.mg().where("name", "Alice").get();

// Find users older than 25
await User.mg().where("age", ">", 25).get();

// Find users who are developers or qa
await User.mg().where("tags", "in", ["dev", "qa"]).get();
```

#### `select()`

Adds a `$project` stage to include or exclude fields from the final output. Subsequent calls to `select()` will overwrite any previous selection.

- **`select(fields)`**
  - **`fields`**: `String | String[]` - The fields to select. This can be a space-separated string or an array of strings. To exclude a field, prefix its name with a hyphen (`-`).
  - **Returns**: `MongogateBuilder` - The builder instance for chaining.

**Note:** In MongoDB, you cannot mix inclusion and exclusion in the same projection, with the exception of the `_id` field.

**Examples:**

```javascript
// Include only the name and email fields
await User.mg().select("name email").get();

// Include name and email using an array
await User.mg().select(["name", "email"]).get();

// Exclude the password field
await User.mg().select("-password").get();

// Include name but exclude the _id field
await User.mg().select("name -_id").get();
```

#### `orderBy()`

Adds a `$sort` stage to the pipeline.

- **`orderBy(fields, direction)`**

  - **`fields`**: `String | Array<String> | Object` - A single field, a space-separated string, an array of fields, or an object. Prefix with - for descending in string/array format.

  - **`direction`**: `String` (Optional) - 'asc' or 'desc'. Only used when the first argument is a single string field.

  - **Returns:** `MongogateBuilder` (for chaining).

**Examples:**

```javascript
// Single field
builder.orderBy("createdAt", "desc");

// Multiple fields as a string
builder.orderBy("age -createdAt");

// Multiple fields as an object
builder.orderBy({ age: 1, createdAt: -1 });
```

#### `limit()` & `skip()`

Adds `$limit` and `$skip` stages for basic pagination.

- **`limit(count)`**

  - **`count`**: `Number` - The maximum number of documents to return.
  - **Returns:** `MongogateBuilder` (for chaining).

- **`skip(count)`**
  - **`count`**: `Number` - The number of documents to skip.
  - **Returns:** `MongogateBuilder` (for chaining).

**Example:**

```javascript
// Get 10 users, but skip the first 20
builder.skip(20).limit(10);
```

#### `with()`

Populates relations using `$lookup`. Supports one or two levels of depth.

- **`with(path)`**
  - **`path`**: `String` - The path to the related model, e.g., `"role"` or `"posts.category"`.
  - **Returns:** `MongogateBuilder` (for chaining).

**Example:**

```javascript
// Populate a user's role
builder.with("role");

// Populate a user's posts and the category of each post
builder.with("posts.category");
```

#### `addFields()`

Adds a `$addFields` stage, useful for adding computed fields to documents.

- **`addFields(fields)`**
  - **`fields`**: `Object` - An object where keys are the new field names and values are MongoDB aggregation expressions.
  - **Returns:** `MongogateBuilder` (for chaining).

**Example:**

```javascript
// Add a new `inventoryValue` field
builder.addFields({
  inventoryValue: { $multiply: ["$price", "$stock"] },
});
```

### Executing the Query

Execution methods terminate the builder chain, run the aggregation pipeline against the database, and return the results.

#### `get()`

Executes the pipeline and returns all matching documents.

- **`get()`**
  - **Returns:** `Promise<Array>` - A promise that resolves to an array of the resulting documents.

**Example:**

```javascript
// Get all active users
const allActiveUsers = await User.mg().where("isActive", true).get();
```

#### `first()`

Executes the pipeline and returns the first matching document.

- **`first()`**
  - **Returns:** `Promise<Object|null>` - A promise that resolves to the first matching document, or `null` if no documents are found.

**Example:**

```javascript
// Get the oldest user
const oldestUser = await User.mg().orderBy("age", "desc").first();
```

#### `count()`

Executes a count of the documents matching the query and returns the total.

- **`count()`**
  - **Returns:** `Promise<Number>` - A promise that resolves to the total number of matching documents.

**Example:**

```javascript
// Count how many users are over 30
const userCount = await User.mg().where("age", ">", 30).count();
```

#### `paginate()`

Executes the pipeline and returns a paginated result object.

- **`paginate(page, perPage)`**
  - **`page`**: `Number` - The current page number (1-based).
  - **`perPage`**: `Number` - The number of documents to return per page.
  - **Returns:** `Promise<Object>` - A promise that resolves to a pagination object.

**Example:**

```javascript
const results = await User.mg().where("isActive", true).paginate(2, 15);
```

**Pagination Object Structure:**

```javascript
{
  data: [ ... ],       // Array of documents for the current page
  page: 2,             // The current page number
  perPage: 15,         // The number of items per page
  total: 100,          // Total documents matching the query
  totalPages: 7        // Total number of pages
}
```

## Advanced Examples

This section showcases how to combine multiple builder methods to solve more complex, real-world problems.

**Complex User Query:**

Find the 10 most recently active admins who are over 30, populate their roles, and select only their name and email.

```javascript
const admins = await User.mg()
  .where("isActive", true)
  .where("age", ">", 30)
  .with("role") // Assumes role.name exists for the next filter
  .where("role.name", "Admin")
  .orderBy("last_login_at", "desc")
  .limit(10)
  .select("name email role")
  .get();
```

**Products with Calculated Fields:**

Find all products with an inventory value greater than $10,000 and return the results paginated.

```javascript
const valuableProducts = await Product.mg()
  .addFields({
    inventoryValue: { $multiply: ["$price", "$stock"] },
  })
  .where("inventoryValue", ">", 10000)
  .orderBy("inventoryValue", "desc")
  .paginate(1, 20);
```
