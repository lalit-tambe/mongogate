import { MongogateBuilder } from "../../src/builder.js";

describe("MongogateBuilder.addFields()", () => {
  let qb;

  beforeEach(() => {
    qb = new MongogateBuilder({});
  });

  test("✔ should add a valid $addFields stage", () => {
    const newFields = {
      fullName: { $concat: ["$firstName", " ", "$lastName"] },
    };
    qb.addFields(newFields);

    expect(qb.pipeline()).toEqual([{ $addFields: newFields }]);
  });

  test("✔ should throw an error if input is not an object", () => {
    expect(() => qb.addFields("not an object")).toThrow(
      "addFields() expects a non-null object."
    );
    expect(() => qb.addFields(null)).toThrow(
      "addFields() expects a non-null object."
    );
    expect(() => qb.addFields(["array"])).toThrow(
      "addFields() expects a non-null object."
    );
  });
});
