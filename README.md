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
