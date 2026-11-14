import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import test from "node:test";
import ts from "typescript";

const exports = {};
runInNewContext(ts.transpileModule(readFileSync(new URL("../lib/auth-navigation.ts", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { exports });
const { safeReturnTo, authHref } = exports;

test("auth return targets allow only app destinations and cannot cause open redirects or actions", () => {
  for (const path of ["/", "/watchlist", "/news", "/stocks/AAPL", "/stocks/BRK.B"]) {
    assert.equal(safeReturnTo(path), path);
    for (const auth of ["/sign-in", "/sign-up", "/verify-email", "/forgot-password"]) {
      const link = new URL(authHref(auth, path), "https://stocks.example");
      assert.equal(link.pathname, auth);
      assert.equal(safeReturnTo(link.searchParams.get("returnTo")), path);
    }
  }
  for (const path of [undefined, null, [], ["/news"], 123, "https://evil.example", "//evil.example", "/\\evil.example", "/stocks/..", "/stocks/AAPL/extra", "/stocks/AAPL?follow=1", "/news#fragment", "/%2f%2fevil.example", "/stocks/AAPL\n", "/sign-in"]) {
    assert.equal(safeReturnTo(path), "/");
    assert.equal(authHref("/sign-in", path), "/sign-in");
  }
});
