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
