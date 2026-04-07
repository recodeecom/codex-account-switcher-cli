import { beforeEach, describe, expect, it } from "vitest";

import { ApiError } from "@/lib/api-client";
import {
  callApiKeysResolvedPath,
  callApiKeysWithFallback,
  resetApiKeysResolvedPathForTests,
} from "@/features/api-keys/api-paths";

function notFoundError() {
  return new ApiError({
    status: 404,
    code: "not_found",
    message: "Not Found",
  });
}

describe("api path resolver", () => {
  beforeEach(() => {
    resetApiKeysResolvedPathForTests();
  });

  it("falls back to legacy path when primary path returns not found", async () => {
    const calls: string[] = [];

    const result = await callApiKeysWithFallback(async (basePath) => {
      calls.push(basePath);
      if (basePath === "/api/api-keys") {
        throw notFoundError();
      }
      return basePath;
    });

    expect(result).toBe("/api/keys");
    expect(calls).toEqual(["/api/api-keys", "/api/keys"]);

    const followUpCalls: string[] = [];
    const followUpResult = await callApiKeysResolvedPath(async (basePath) => {
      followUpCalls.push(basePath);
      return basePath;
    });

    expect(followUpResult).toBe("/api/keys");
    expect(followUpCalls).toEqual(["/api/keys"]);
  });

  it("does not retry against fallback path after the endpoint was resolved", async () => {
    await callApiKeysWithFallback(async (basePath) => basePath);

    const calls: string[] = [];
    await expect(
      callApiKeysResolvedPath(async (basePath) => {
        calls.push(basePath);
        throw notFoundError();
      }),
    ).rejects.toMatchObject({ status: 404 });

    expect(calls).toEqual(["/api/api-keys"]);
  });
});
