import { networkInterfaces } from "node:os";

/** Home-network ranges, best first; 10.255.255.254 is WSL's own loopback in mirrored mode, never reachable. */
const PREFERRED = [/^192\.168\./, /^10\.(?!255\.255\.254$)/, /^172\.(1[6-9]|2\d|3[01])\./];

/** This machine's address on the home network, so a TV opened on localhost still prints a QR a phone can follow. */
export function lanAddress(): string | null {
  const addresses = Object.values(networkInterfaces())
    .flat()
    .flatMap((info) => (info && info.family === "IPv4" && !info.internal ? [info.address] : []));
  for (const pattern of PREFERRED) {
    const found = addresses.find((address) => pattern.test(address));
    if (found) return found;
  }
  return null;
}

/** `http://<lan ip>:<port>` for the page at `host` (the request's Host header), or null without a home network. */
export function lanOrigin(host: string | null): string | null {
  const address = lanAddress();
  if (!address) return null;
  const port = host?.match(/:(\d+)$/)?.[1];
  return `http://${address}${port ? `:${port}` : ""}`;
}
