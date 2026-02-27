import test from 'ava';
import * as fs from 'fs';
import * as path from 'path';
import {
  saveCopilotCredential,
  loadCopilotCredential,
  removeCopilotCredential,
} from './copilot-credentials.js';

// Mock config path for testing
const TEST_DIR = path.join(process.cwd(), '.test-temp');
const originalGetConfigPath = (global as any).getConfigPath;

test.beforeEach(() => {
  // Set up test directory
  if (!fs.existsSync(TEST_DIR)) {
    fs.mkdirSync(TEST_DIR, { recursive: true });
  }
  
  // Mock config path
  (global as any).getConfigPath = () => TEST_DIR;
});

test.afterEach(() => {
  // Clean up test files
  const testFiles = [
    path.join(TEST_DIR, 'copilot-credentials.json'),
  ];
  
  for (const file of testFiles) {
    if (fs.existsSync(file)) {
      fs.unlinkSync(file);
    }
  }
  
  // Restore original function
  if (originalGetConfigPath) {
    (global as any).getConfigPath = originalGetConfigPath;
  }
});

test('saveCopilotCredential saves credential correctly', t => {
  saveCopilotCredential('TestProvider', 'test-refresh-token');
  
  const credential = loadCopilotCredential('TestProvider');
  t.truthy(credential);
  t.is(credential!.refreshToken, 'test-refresh-token');
});

test('loadCopilotCredential returns null for non-existent provider', t => {
  const credential = loadCopilotCredential('NonExistentProvider');
  t.is(credential, null);
});

test('removeCopilotCredential removes credential', t => {
  // Save a credential first
  saveCopilotCredential('ToRemove', 'token-to-remove');
  
  // Verify it exists
  t.truthy(loadCopilotCredential('ToRemove'));
  
  // Remove it
  removeCopilotCredential('ToRemove');
  
  // Verify it's gone
  t.is(loadCopilotCredential('ToRemove'), null);
});

test('saveCopilotCredential handles enterprise URLs', t => {
  saveCopilotCredential('EnterpriseProvider', 'enterprise-token', 'github.enterprise.com');
  
  const credential = loadCopilotCredential('EnterpriseProvider');
  t.truthy(credential);
  t.is(credential!.refreshToken, 'enterprise-token');
  t.is(credential!.enterpriseUrl, 'github.enterprise.com');
});