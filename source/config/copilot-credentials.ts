/**
 * User-level storage for GitHub Copilot credentials.
 * The stored token is the GitHub OAuth access token from the device flow
 * (used to obtain short-lived Copilot API tokens). It is stored under the key
 * "refreshToken" in copilot-credentials.json for backward compatibility.
 * Stored under config path (e.g. ~/.config/nanocoder/) so they are not in project config.
 */

import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'fs';
import {join} from 'path';
import {getConfigPath} from '@/config/paths';

const FILENAME = 'copilot-credentials.json';

export interface CopilotCredential {
	/** GitHub OAuth access token from device flow (stored as "refreshToken" in JSON). */
	refreshToken: string;
	enterpriseUrl?: string;
}

export type CopilotCredentialsStore = Record<string, CopilotCredential>;

function getCredentialsPath(): string {
	return join(getConfigPath(), FILENAME);
}

function loadStore(): CopilotCredentialsStore {
	const path = getCredentialsPath();
	if (!existsSync(path)) {
		return {};
	}
	try {
		const raw = readFileSync(path, 'utf-8');
		const data = JSON.parse(raw) as unknown;
		if (data !== null && typeof data === 'object' && !Array.isArray(data)) {
			return data as CopilotCredentialsStore;
		}
	} catch {
		// Invalid or unreadable
	}
	return {};
}

function writeStore(store: CopilotCredentialsStore): void {
	const dir = getConfigPath();
	if (!existsSync(dir)) {
		mkdirSync(dir, {recursive: true});
	}
	const filePath = getCredentialsPath();
	writeFileSync(filePath, JSON.stringify(store, null, 2), {
		encoding: 'utf-8',
		mode: 0o600,
	});
}

/**
 * Get stored Copilot credential for a provider name (e.g. "GitHub Copilot").
 */
export function loadCopilotCredential(
	providerName: string,
): CopilotCredential | null {
	const store = loadStore();
	const entry = store[providerName];
	if (!entry || typeof entry.refreshToken !== 'string') {
		return null;
	}
	return {
		refreshToken: entry.refreshToken,
		enterpriseUrl:
			typeof entry.enterpriseUrl === 'string' ? entry.enterpriseUrl : undefined,
	};
}

/**
 * Save GitHub OAuth token (from device flow) for a provider name.
 * Stored under the key "refreshToken" in copilot-credentials.json.
 */
export function saveCopilotCredential(
	providerName: string,
	refreshToken: string,
	enterpriseUrl?: string,
): void {
	const store = loadStore();
	store[providerName] = {refreshToken, enterpriseUrl};
	writeStore(store);
}

/**
 * Remove stored credential for a provider name.
 */
export function removeCopilotCredential(providerName: string): void {
	const store = loadStore();
	if (providerName in store) {
		delete store[providerName];
		writeStore(store);
	}
}
