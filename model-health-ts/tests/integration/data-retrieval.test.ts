/**
 * Integration tests for data retrieval operations.
 * 
 * Tests sessionList, subjectList, and getActivities against a pre-populated test account.
 */

import { describe, test, expect, beforeAll } from "vitest";
import { ModelHealthService } from "../src/index";
import { TestConfig } from "./config";
import {
  createAuthenticatedService,
  validateSession,
  validateSubject,
  validateSessionStructure,
  validateSubjectStructure,
  validateActivityStructure,
  DataNotFoundError,
} from "./helpers";

describe("Data Retrieval Integration Tests", () => {
  let service: ModelHealthService;

  beforeAll(async () => {
    service = await createAuthenticatedService();
  });

  // MARK: - Session List Tests

  test("sessionList returns non-empty array", async () => {
    const sessions = await service.sessionList();

    expect(sessions.length).toBeGreaterThan(0);
  });

  test("sessionList contains expected test session", async () => {
    const sessions = await service.sessionList();

    const testSession = sessions.find(s => s.id === TestConfig.knownIds.session);

    if (!testSession) {
      throw new DataNotFoundError(
        `Known session with ID ${TestConfig.knownIds.session} not found`
      );
    }

    validateSession(testSession);
  });

  test("sessionList returns valid Session structures", async () => {
    const sessions = await service.sessionList();

    for (const session of sessions) {
      validateSessionStructure(session);
    }
  });

  // MARK: - Subject List Tests

  test("subjectList returns non-empty array", async () => {
    const subjects = await service.subjectList();

    expect(subjects.length).toBeGreaterThan(0);
  });

  test("subjectList contains expected test subject", async () => {
    const subjects = await service.subjectList();

    const testSubject = subjects.find(s => s.id === TestConfig.knownIds.subject);

    if (!testSubject) {
      throw new DataNotFoundError(
        `Known subject with ID ${TestConfig.knownIds.subject} not found`
      );
    }

    validateSubject(testSubject);
  });

  test("subjectList returns valid Subject structures", async () => {
    const subjects = await service.subjectList();

    for (const subject of subjects) {
      validateSubjectStructure(subject);
    }
  });

  // MARK: - Get Activities Tests

  test("getActivities returns activities for known subject", async () => {
    const config = TestConfig.activityRetrieval;

    const activities = await service.getActivitiesForSubject(
      config.testSubjectId,
      config.startIndex,
      config.count,
      config.sortBy
    );

    expect(activities.length).toBeGreaterThanOrEqual(
      config.expectedMinimumActivityCount
    );
  });

  test("getActivities respects count parameter", async () => {
    const config = TestConfig.activityRetrieval;
    const requestCount = 3;

    const activities = await service.getActivitiesForSubject(
      config.testSubjectId,
      0,
      requestCount,
      config.sortBy
    );

    expect(activities.length).toBeLessThanOrEqual(requestCount);
  });

  test("getActivities returns valid Activity structures", async () => {
    const config = TestConfig.activityRetrieval;

    const activities = await service.getActivitiesForSubject(
      config.testSubjectId,
      config.startIndex,
      config.count,
      config.sortBy
    );

    for (const activity of activities) {
      validateActivityStructure(activity);
    }
  });

  test("getActivities pagination works with startIndex", async () => {
    const config = TestConfig.activityRetrieval;

    // Get first page
    const firstPage = await service.getActivitiesForSubject(
      config.testSubjectId,
      0,
      2,
      config.sortBy
    );

    // Get second page
    const secondPage = await service.getActivitiesForSubject(
      config.testSubjectId,
      2,
      2,
      config.sortBy
    );

    // If we have enough activities, pages should be different
    if (firstPage.length === 2 && secondPage.length > 0) {
      const firstIds = new Set(firstPage.map(a => a.id));
      const secondIds = new Set(secondPage.map(a => a.id));

      // Check that sets don't overlap
      const overlap = [...firstIds].some(id => secondIds.has(id));
      expect(overlap).toBe(false);
    }
  });
});
