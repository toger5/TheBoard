import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests of the board as an MSC4412 widget inside the matrix-widget-tools widget-host,
 * in its DevBackend mode (in-memory rooms, no homeserver). See e2e/board.ts.
 *
 * BOARD_HOST_URL: the widget-host to load (default: the hosted dev site). To test against a local
 * host, run `npm run dev` in matrix-widget-tools-sdk and set BOARD_HOST_URL=http://localhost:5173/.
 */
export default defineConfig({
    testDir: "e2e",
    testMatch: "**/*.spec.ts",
    outputDir: "test-results",
    fullyParallel: false,
    workers: process.env.CI ? 1 : 2,
    retries: process.env.CI ? 1 : 0,
    timeout: 60_000,
    expect: { timeout: 10_000 },
    reporter: [["list"]],
    use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 800 },
        trace: "retain-on-failure",
        launchOptions: {
            // The hosted host is a public https page framing the board on http://localhost: allow
            // Chrome's local network access without the permission prompt.
            args: ["--disable-features=LocalNetworkAccessChecks,PrivateNetworkAccessSendPreflights,PrivateNetworkAccessRespectPreflightResults,BlockInsecurePrivateNetworkRequests"],
        },
    },
    webServer: {
        command: "yarn start",
        url: "http://localhost:8081",
        reuseExistingServer: true,
        timeout: 120_000,
    },
});
