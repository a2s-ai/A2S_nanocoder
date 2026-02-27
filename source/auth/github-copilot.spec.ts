import test from 'ava';
import {
  getCopilotUrls,
  getCopilotBaseUrl,
  getCopilotAccessToken,
} from './github-copilot.js';

test('getCopilotUrls returns correct URLs for github.com', t => {
  const urls = getCopilotUrls('github.com');
  t.is(urls.deviceCodeUrl, 'https://github.com/login/device/code');
  t.is(urls.accessTokenUrl, 'https://github.com/login/oauth/access_token');
  t.is(urls.copilotTokenUrl, 'https://api.github.com/copilot_internal/v2/token');
});

test('getCopilotUrls returns correct URLs for enterprise domains', t => {
  const urls = getCopilotUrls('github.enterprise.com');
  t.is(urls.deviceCodeUrl, 'https://github.enterprise.com/login/device/code');
  t.is(urls.accessTokenUrl, 'https://github.enterprise.com/login/oauth/access_token');
  t.is(urls.copilotTokenUrl, 'https://api.github.enterprise.com/copilot_internal/v2/token');
});

test('getCopilotBaseUrl returns correct base URL', t => {
  t.is(getCopilotBaseUrl('github.com'), 'https://api.githubcopilot.com');
  t.is(getCopilotBaseUrl('github.enterprise.com'), 'https://copilot-api.github.enterprise.com');
});

test('getCopilotAccessToken uses caching', async t => {
  // Mock fetch function
  const mockFetch = async () => ({
    ok: true,
    json: async () => ({ token: 'test-token', expires_at: Math.floor(Date.now()/1000) + 3600 }),
  }) as any;

  // First call
  const result1 = await getCopilotAccessToken('refresh-123', 'github.com', mockFetch as any);
  t.truthy(result1.token);
  t.truthy(result1.expiresAt);

  // Second call should use cache
  const result2 = await getCopilotAccessToken('refresh-123', 'github.com', mockFetch as any);
  t.is(result1.token, result2.token);
});