/**
 * Integration tests for authentication operations.
 * 
 * Tests login, logout, and authentication state management against a real backend.
 */

import { describe, test, expect } from "vitest";
import { ModelHealthService } from "../src/index";
import { TestConfig } from "./config";

describe("Authentication Integration Tests", () => {
  test("login with valid credentials returns ok", async () => {
    const service = new ModelHealthService({ autoInit: false });
    await service.init();

    const result = await service.login(
      TestConfig.credentials.username,
      TestConfig.credentials.password
    );

    // Should be "ok" since test account is trusted
    expect(result).toBe("ok");

    // Verify we're authenticated
    const isAuthenticated = await service.isAuthenticated();
    expect(isAuthenticated).toBe(true);
  });

  test("isAuthenticated returns false before login", async () => {
    const service = new ModelHealthService({ autoInit: false });
    await service.init();

    const isAuthenticated = await service.isAuthenticated();
    expect(isAuthenticated).toBe(false);
  });

  test("isAuthenticated returns true after successful login", async () => {
    const service = new ModelHealthService({ autoInit: false });
    await service.init();

    // Login
    await service.login(
      TestConfig.credentials.username,
      TestConfig.credentials.password
    );

    // Check authentication state
    const isAuthenticated = await service.isAuthenticated();
    expect(isAuthenticated).toBe(true);
  });

  test("logout clears authentication state", async () => {
    const service = new ModelHealthService({ autoInit: false });
    await service.init();

    // Login first
    await service.login(
      TestConfig.credentials.username,
      TestConfig.credentials.password
    );

    // Verify authenticated
    let isAuthenticated = await service.isAuthenticated();
    expect(isAuthenticated).toBe(true);

    // Logout
    await service.logout();

    // Verify no longer authenticated
    isAuthenticated = await service.isAuthenticated();
    expect(isAuthenticated).toBe(false);
  });

  test("can login again after logout", async () => {
    const service = new ModelHealthService({ autoInit: false });
    await service.init();

    // First login
    await service.login(
      TestConfig.credentials.username,
      TestConfig.credentials.password
    );

    // Logout
    await service.logout();

    // Login again
    const result = await service.login(
      TestConfig.credentials.username,
      TestConfig.credentials.password
    );

    expect(result).toBe("ok");

    const isAuthenticated = await service.isAuthenticated();
    expect(isAuthenticated).toBe(true);
  });
});
