import { describe, expect, it, vi } from "vitest";

vi.mock("node:os", () => ({
  networkInterfaces: () => ({
    lo: [{ family: "IPv4", address: "127.0.0.1", internal: true }],
    loopback0: [{ family: "IPv4", address: "10.255.255.254", internal: false }],
    docker0: [{ family: "IPv4", address: "172.17.0.1", internal: false }],
    wifi: [{ family: "IPv4", address: "192.168.3.6", internal: false }],
  }),
}));

const { lanOrigin } = await import("./lanOrigin");

describe("lanOrigin", () => {
  it("prefers the home Wi-Fi address and keeps the page's port", () => {
    expect(lanOrigin("localhost:3001")).toBe("http://192.168.3.6:3001");
  });

  it("drops the port when the page has none", () => {
    expect(lanOrigin("localhost")).toBe("http://192.168.3.6");
  });
});
