import { MongogateBuilder } from "../../src/builder.js";

describe("MongogateBuilder.select()", () => {
  let builder;

  beforeEach(() => {
    builder = new MongogateBuilder({});
  });

  test("✔ Single field", () => {
    builder.select("name");
    expect(builder._project).toEqual({ name: 1 });
  });

  test("✔ Multiple fields (string)", () => {
    builder.select("name age email");
    expect(builder._project).toEqual({ name: 1, age: 1, email: 1 });
  });

  test("✔ Excluding fields (string)", () => {
    builder.select("-password -token");
    expect(builder._project).toEqual({ password: 0, token: 0 });
  });

  test("✔ Array input (mixed include & exclude)", () => {
    builder.select(["name", "-email"]);
    expect(builder._project).toEqual({ name: 1, email: 0 });
  });

  test("✔ Invalid input (number)", () => {
    expect(() => builder.select(123)).toThrow(
      "select() expects a string or an array of field paths"
    );
  });

  test("✔ Invalid input (array with non-string)", () => {
    expect(() => builder.select(["name", 123])).toThrow(
      "select() expects fields as strings"
    );
  });

  test("✔ Multiple calls overwrite", () => {
    builder.select("name age");
    builder.select("email"); // should overwrite previous
    expect(builder._project).toEqual({ email: 1 });
  });
});
