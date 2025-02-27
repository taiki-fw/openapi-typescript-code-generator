import * as fs from "fs";

import * as Utils from "../../utils";

describe("Typedef with template", () => {
  test("api.test.domain", () => {
    const generateCode = fs.readFileSync("test/code/functional/typedef-with-template/api.test.domain.ts", { encoding: "utf-8" });
    const text = Utils.replaceVersionInfo(generateCode);
    expect(text).toMatchSnapshot();
  });
  test("api.v2.domain", () => {
    const generateCode = fs.readFileSync("test/code/functional/typedef-with-template/api.v2.domain.ts", { encoding: "utf-8" });
    const text = Utils.replaceVersionInfo(generateCode);
    expect(text).toMatchSnapshot();
  });
  test("async-api.test.domain", () => {
    const generateCode = fs.readFileSync("test/code/functional/typedef-with-template/sync-api.test.domain.ts", {
      encoding: "utf-8",
    });
    const text = Utils.replaceVersionInfo(generateCode);
    expect(text).toMatchSnapshot();
  });
  test("infer.domain", () => {
    const generateCode = fs.readFileSync("test/code/functional/typedef-with-template/infer.domain.ts", { encoding: "utf-8" });
    const text = Utils.replaceVersionInfo(generateCode);
    expect(text).toMatchSnapshot();
  });
  test("ref-access", () => {
    const generateCode = fs.readFileSync("test/code/functional/typedef-with-template/ref-access.ts", { encoding: "utf-8" });
    const text = Utils.replaceVersionInfo(generateCode);
    expect(text).toMatchSnapshot();
  });
  test("remote-ref-access", () => {
    const generateCode = fs.readFileSync("test/code/functional/typedef-with-template/remote-ref-access.ts", { encoding: "utf-8" });
    const text = Utils.replaceVersionInfo(generateCode);
    expect(text).toMatchSnapshot();
  });
});
