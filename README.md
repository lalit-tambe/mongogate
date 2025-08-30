# Mongogate

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
npm install mongogate mongoose
```

---

## Getting Started

First, attach the `mongogatePlugin` to your Mongoose schema. This will add the static `mg()` method to your model, which is the entry point for the query builder.

```javascript
import mongoose from "mongoose";
import { mongogatePlugin } from "mongogate";

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
