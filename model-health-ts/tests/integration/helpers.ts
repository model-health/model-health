/**
 * Shared utilities and helpers for integration tests
 */

import { expect } from "vitest";
import { ModelHealthService } from "../src/index";
import type { Session, Subject, Activity } from "../src/types";
import { TestConfig } from "./config";

/**
 * Custom error types for test suite
 */
export class TestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TestError";
  }
}

export class VerificationRequiredError extends TestError {
  constructor(message: string) {
    super(message);
    this.name = "VerificationRequiredError";
  }
}

export class DataNotFoundError extends TestError {
  constructor(message: string) {
    super(message);
    this.name = "DataNotFoundError";
  }
}

/**
 * Creates and authenticates a ModelHealthService instance for testing
 */
export async function createAuthenticatedService(): Promise<ModelHealthService> {
  const service = new ModelHealthService({ autoInit: false });
  await service.init();

  const loginResult = await service.login(
    TestConfig.credentials.username,
    TestConfig.credentials.password
  );

  // Handle verification if required
  if (loginResult === "verification_required") {
    throw new VerificationRequiredError(
      "Test account requires email verification. " +
      "Please verify the test account or use a trusted device."
    );
  }

  // Verify we're actually authenticated
  const isAuthenticated = await service.isAuthenticated();
  expect(isAuthenticated).toBe(true);

  return service;
}

/**
 * Validates that a Session matches expected test data
 */
export function validateSession(session: Session): void {
  const expected = TestConfig.expectedSession;

  expect(session.id).toBe(expected.id);
  expect(session.user).toBe(expected.user);
  expect(session.public).toBe(expected.public);
  expect(session.name).toBe(expected.name);
  expect(session.session_name).toBe(expected.session_name);
  expect(session.subject).toBe(expected.subject);
  expect(session.activities_count).toBe(expected.activities_count);
}

/**
 * Validates that a Subject matches expected test data
 */
export function validateSubject(subject: Subject): void {
  const expected = TestConfig.expectedSubject;

  expect(subject.id).toBe(expected.id);
  expect(subject.name).toBe(expected.name);
  expect(subject.weight).toBe(expected.weight);
  expect(subject.height).toBe(expected.height);
  expect(subject.age).toBe(expected.age);
  expect(subject.birth_year).toBe(expected.birth_year);
  expect(subject.gender).toBe(expected.gender);
  expect(subject.sex_at_birth).toBe(expected.sex_at_birth);
  expect(subject.characteristics).toBe(expected.characteristics);
  expect(subject.subject_tags).toEqual(expected.subject_tags);
}

/**
 * Validates that an Activity matches expected test data
 */
export function validateActivity(activity: Activity): void {
  const expected = TestConfig.expectedActivity;

  expect(activity.id).toBe(expected.id);
  expect(activity.session).toBe(expected.session);
  expect(activity.name).toBe(expected.name);
  expect(activity.status).toBe(expected.status);
  expect(activity.videos).toHaveLength(expected.videoCount);
  expect(activity.results).toHaveLength(expected.resultCount);
}

/**
 * Validates basic type correctness for a Session without checking specific values
 */
export function validateSessionStructure(session: Session): void {
  expect(session.id).toBeTruthy();
  expect(typeof session.id).toBe("string");
  expect(session.user).toBeGreaterThan(0);
  expect(typeof session.public).toBe("boolean");
  expect(session.name).toBeTruthy();
  expect(session.session_name).toBeTruthy();
  expect(session.activities_count).toBeGreaterThanOrEqual(0);
  expect(Array.isArray(session.activities)).toBe(true);
}

/**
 * Validates basic type correctness for a Subject without checking specific values
 */
export function validateSubjectStructure(subject: Subject): void {
  expect(subject.id).toBeGreaterThan(0);
  expect(subject.name).toBeTruthy();
  expect(typeof subject.characteristics).toBe("string");
  expect(Array.isArray(subject.subject_tags)).toBe(true);

  // If optional fields are present, validate they're reasonable
  if (subject.weight !== undefined) {
    expect(subject.weight).toBeGreaterThan(0);
  }
  if (subject.height !== undefined) {
    expect(subject.height).toBeGreaterThan(0);
  }
  if (subject.age !== undefined) {
    expect(subject.age).toBeGreaterThanOrEqual(0);
  }
  if (subject.birth_year !== undefined) {
    expect(subject.birth_year).toBeGreaterThan(1900);
    expect(subject.birth_year).toBeLessThanOrEqual(2100);
  }
}

/**
 * Validates basic type correctness for an Activity without checking specific values
 */
export function validateActivityStructure(activity: Activity): void {
  expect(activity.id).toBeTruthy();
  expect(typeof activity.id).toBe("string");
  expect(activity.session).toBeTruthy();
  expect(typeof activity.session).toBe("string");
  expect(activity.status).toBeTruthy();
  expect(typeof activity.status).toBe("string");
  expect(Array.isArray(activity.videos)).toBe(true);
  expect(Array.isArray(activity.results)).toBe(true);
}
