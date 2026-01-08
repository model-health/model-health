/**
 * Integration tests for CRUD operations.
 * 
 * Tests get(activity), update(activity), createSubject, and createSession.
 */

import { describe, test, expect, beforeAll } from "vitest";
import { ModelHealthService } from "../src/index";
import { TestConfig } from "./config";
import {
  createAuthenticatedService,
  validateActivity,
  validateActivityStructure,
  validateSubjectStructure,
  validateSessionStructure,
} from "./helpers";

describe("CRUD Integration Tests", () => {
  let service: ModelHealthService;

  beforeAll(async () => {
    service = await createAuthenticatedService();
  });

  // MARK: - Get Activity Tests

  test("get activity by ID returns correct activity", async () => {
    const activity = await service.getActivity(TestConfig.knownIds.activity);

    validateActivity(activity);
  });

  test("get activity returns valid structure", async () => {
    const activity = await service.getActivity(TestConfig.knownIds.activity);

    validateActivityStructure(activity);
  });

  test("get activity returns consistent data", async () => {
    // Fetch the same activity twice
    const activity1 = await service.getActivity(TestConfig.knownIds.activity);
    const activity2 = await service.getActivity(TestConfig.knownIds.activity);

    // Core fields should be identical
    expect(activity1.id).toBe(activity2.id);
    expect(activity1.session).toBe(activity2.session);
    expect(activity1.name).toBe(activity2.name);
    expect(activity1.status).toBe(activity2.status);
  });

  // MARK: - Update Activity Tests

  test("update activity modifies name field", async () => {
    // Get the original activity
    let activity = await service.getActivity(TestConfig.knownIds.activity);
    const originalName = activity.name;

    // Modify the name with a timestamp to ensure uniqueness
    const timestamp = new Date().toISOString();
    const newName = `Updated Test Activity - ${timestamp}`;
    activity.name = newName;

    // Update the activity
    const updatedActivity = await service.updateActivity(activity);

    // Verify the update
    expect(updatedActivity.name).toBe(newName);
    expect(updatedActivity.id).toBe(activity.id);
    expect(updatedActivity.session).toBe(activity.session);

    // Restore original name for future tests
    activity.name = originalName;
    await service.updateActivity(activity);
  });

  test("update activity preserves other fields", async () => {
    let activity = await service.getActivity(TestConfig.knownIds.activity);

    const originalId = activity.id;
    const originalSession = activity.session;
    const originalStatus = activity.status;
    const originalVideosCount = activity.videos.length;
    const originalResultsCount = activity.results.length;

    // Update just the name
    activity.name = `Preserve Fields Test - ${Date.now()}`;
    const updatedActivity = await service.updateActivity(activity);

    // Verify other fields are unchanged
    expect(updatedActivity.id).toBe(originalId);
    expect(updatedActivity.session).toBe(originalSession);
    expect(updatedActivity.status).toBe(originalStatus);
    expect(updatedActivity.videos.length).toBe(originalVideosCount);
    expect(updatedActivity.results.length).toBe(originalResultsCount);
  });

  // MARK: - Create Subject Tests

  test("create subject with valid parameters succeeds", async () => {
    const timestamp = Date.now();
    const params = {
      name: `Integration Test Subject ${timestamp}`,
      weight: 72.5,
      height: 175.0,
      birth_year: 1995,
      subject_tags: ["integration-test", "auto-created"],
      sex_at_birth: "man" as const,
      gender: "man" as const,
      characteristics: "Created by integration test suite",
      terms: true,
    };

    const subject = await service.createSubject(params);

    // Verify the created subject has expected values
    expect(subject.name).toBe(params.name);
    expect(subject.weight).toBe(params.weight);
    expect(subject.height).toBe(params.height);
    expect(subject.birth_year).toBe(params.birth_year);
    expect(subject.sex_at_birth).toBe(params.sex_at_birth);
    expect(subject.gender).toBe(params.gender);
    expect(subject.characteristics).toBe(params.characteristics);
    expect(subject.subject_tags).toEqual(params.subject_tags);

    // Verify ID was assigned
    expect(subject.id).toBeGreaterThan(0);
  });

  test("create subject returns valid structure", async () => {
    const timestamp = Date.now();
    const params = {
      name: `Structure Test Subject ${timestamp}`,
      weight: 80.0,
      height: 185.0,
      birth_year: 1990,
      subject_tags: ["test"],
      sex_at_birth: "man" as const,
      gender: "man" as const,
      characteristics: "Test subject",
      terms: true,
    };

    const subject = await service.createSubject(params);

    validateSubjectStructure(subject);
  });

  test("created subject appears in subject list", async () => {
    const timestamp = Date.now();
    const uniqueName = `List Test Subject ${timestamp}`;

    const params = {
      name: uniqueName,
      weight: 75.0,
      height: 180.0,
      birth_year: 1992,
      subject_tags: ["list-test"],
      sex_at_birth: "man" as const,
      gender: "man" as const,
      characteristics: "",
      terms: true,
    };

    const createdSubject = await service.createSubject(params);

    // Fetch the subject list
    const subjects = await service.subjectList();

    // Find our newly created subject
    const foundSubject = subjects.find(s => s.id === createdSubject.id);

    expect(foundSubject).toBeDefined();
    expect(foundSubject?.name).toBe(uniqueName);
  });

  // MARK: - Create Session Tests

  test("create session succeeds", async () => {
    const session = await service.createSession();

    // Verify basic structure
    expect(session.id).toBeTruthy();
    expect(typeof session.id).toBe("string");
    expect(session.user).toBeGreaterThan(0);
    expect(session.name).toBeTruthy();
    expect(session.session_name).toBeTruthy();
    expect(session.activities_count).toBe(0);
    expect(session.activities).toEqual([]);
  });

  test("create session returns valid structure", async () => {
    const session = await service.createSession();

    validateSessionStructure(session);
  });

  test("created session appears in session list", async () => {
    const createdSession = await service.createSession();

    // Fetch the session list
    const sessions = await service.sessionList();

    // Find our newly created session
    const foundSession = sessions.find(s => s.id === createdSession.id);

    expect(foundSession).toBeDefined();
    expect(foundSession?.id).toBe(createdSession.id);
  });

  test("multiple session creates produce unique sessions", async () => {
    const session1 = await service.createSession();
    const session2 = await service.createSession();

    // Should have different IDs
    expect(session1.id).not.toBe(session2.id);
  });
});
