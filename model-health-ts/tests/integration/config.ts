/**
 * Configuration for integration tests loaded from shared test-config.json
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { ActivitySort } from '../src/types';

// Get the directory of this file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface TestConfigData {
  credentials: {
    username: string;
    password: string;
  };
  known_ids: {
    session: string;
    subject: number;
    activity: string;
  };
  expected_session: {
    id: string;
    user: number;
    public: boolean;
    name: string;
    session_name: string;
    subject: number | null;
    activities_count: number;
  };
  expected_subject: {
    id: number;
    name: string;
    weight: number | null;
    height: number | null;
    age: number | null;
    birth_year: number | null;
    gender: string;
    sex_at_birth: string;
    characteristics: string;
    subject_tags: string[];
  };
  expected_activity: {
    id: string;
    session: string;
    name: string | null;
    status: string;
    video_count: number;
    result_count: number;
  };
  activity_retrieval: {
    test_subject_id: string;
    expected_minimum_activity_count: number;
    start_index: number;
    count: number;
    sort_by: string;
  };
}

// Load configuration from test-config.json in repository root
function loadTestConfig(): TestConfigData {
  // Navigate from tests/integration/ to repository root
  const configPath = join(__dirname, '..', '..', '..', 'test', 'test-config.json');

  try {
    const configContent = readFileSync(configPath, 'utf-8');
    return JSON.parse(configContent) as TestConfigData;
  } catch (error) {
    throw new Error(
      `Failed to load test-config.json from ${configPath}\n` +
      `Please ensure test-config.json exists in the repository root.\n` +
      `Error: ${error}`
    );
  }
}

const rawConfig = loadTestConfig();

export const TestConfig = {
  credentials: rawConfig.credentials,

  knownIds: {
    session: rawConfig.known_ids.session,
    subject: rawConfig.known_ids.subject,
    activity: rawConfig.known_ids.activity,
  },

  expectedSession: {
    id: rawConfig.expected_session.id,
    user: rawConfig.expected_session.user,
    public: rawConfig.expected_session.public,
    name: rawConfig.expected_session.name,
    session_name: rawConfig.expected_session.session_name,
    subject: rawConfig.expected_session.subject,
    activities_count: rawConfig.expected_session.activities_count,
  },

  expectedSubject: {
    id: rawConfig.expected_subject.id,
    name: rawConfig.expected_subject.name,
    weight: rawConfig.expected_subject.weight,
    height: rawConfig.expected_subject.height,
    age: rawConfig.expected_subject.age,
    birth_year: rawConfig.expected_subject.birth_year,
    gender: rawConfig.expected_subject.gender as any,
    sex_at_birth: rawConfig.expected_subject.sex_at_birth as any,
    characteristics: rawConfig.expected_subject.characteristics,
    subject_tags: rawConfig.expected_subject.subject_tags,
  },

  expectedActivity: {
    id: rawConfig.expected_activity.id,
    session: rawConfig.expected_activity.session,
    name: rawConfig.expected_activity.name,
    status: rawConfig.expected_activity.status,
    videoCount: rawConfig.expected_activity.video_count,
    resultCount: rawConfig.expected_activity.result_count,
  },

  activityRetrieval: {
    testSubjectId: rawConfig.activity_retrieval.test_subject_id,
    expectedMinimumActivityCount: rawConfig.activity_retrieval.expected_minimum_activity_count,
    startIndex: rawConfig.activity_retrieval.start_index,
    count: rawConfig.activity_retrieval.count,
    sortBy: rawConfig.activity_retrieval.sort_by as ActivitySort,
  },
} as const;
