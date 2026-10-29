import { beforeAll, describe, expect, it, vi } from "vitest";

beforeAll(() => {
  vi.stubGlobal("location", new URL("https://forgejo.example.com/owner/repo"));
});

async function getToRequestUrl() {
  const { toRequestUrl } = await import("../source/forgejo-helpers/api.js");
  return toRequestUrl;
}

describe("toRequestUrl", () => {
  it("resolves paths against the current Forgejo origin", async () => {
    const toRequestUrl = await getToRequestUrl();
    expect(toRequestUrl("users/alice")).toBe("https://forgejo.example.com/api/v1/users/alice");
    expect(toRequestUrl("/notifications?q=unread")).toBe("https://forgejo.example.com/notifications?q=unread");
    expect(toRequestUrl("https://forgejo.example.com/owner/repo/issues/labels"))
      .toBe("https://forgejo.example.com/owner/repo/issues/labels");
  });

  it("refuses to send a request, and with it the token, to any other origin", async () => {
    const toRequestUrl = await getToRequestUrl();
    expect(() => toRequestUrl("https://evil.example/collect")).toThrow("off-site");
    expect(() => toRequestUrl("//evil.example/collect")).toThrow("off-site");
    expect(() => toRequestUrl("http://forgejo.example.com/api/v1/user")).toThrow("off-site");
  });
});
