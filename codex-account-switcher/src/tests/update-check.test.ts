import test from "node:test";
import assert from "node:assert/strict";

import { isVersionNewer, parseVersionTriplet } from "../lib/update-check";

test("parseVersionTriplet parses standard semver triplets", () => {
  assert.deepEqual(parseVersionTriplet("0.1.9"), [0, 1, 9]);
  assert.deepEqual(parseVersionTriplet("v1.20.3"), [1, 20, 3]);
});

test("parseVersionTriplet supports pre-release/build suffixes", () => {
  assert.deepEqual(parseVersionTriplet("1.2.3-beta.1"), [1, 2, 3]);
  assert.deepEqual(parseVersionTriplet("1.2.3+build"), [1, 2, 3]);
});

test("parseVersionTriplet rejects non-triplet versions", () => {
  assert.equal(parseVersionTriplet("1.2"), null);
  assert.equal(parseVersionTriplet("latest"), null);
});

test("isVersionNewer compares semver triplets correctly", () => {
  assert.equal(isVersionNewer("0.1.8", "0.1.9"), true);
  assert.equal(isVersionNewer("0.1.9", "0.1.9"), false);
  assert.equal(isVersionNewer("0.2.0", "0.1.9"), false);
});

test("isVersionNewer returns false when either version is invalid", () => {
  assert.equal(isVersionNewer("latest", "0.1.9"), false);
  assert.equal(isVersionNewer("0.1.8", "nightly"), false);
});
