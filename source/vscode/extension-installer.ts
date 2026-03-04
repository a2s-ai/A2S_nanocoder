/**
 * VS Code extension installation utilities
 */

import {execSync, spawn} from 'child_process';
import {existsSync} from 'fs';
import {dirname, join} from 'path';
import {platform} from 'process';
import {fileURLToPath} from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const isWindows = platform === 'win32';

/**
 * List of supported VS Code CLI executables (including forks)
 */
const SUPPORTED_CLIS = [
	'code',
	'code-insiders',
	'cursor',
	'codium',
	'vscodium',
	'windsurf',
	'trae',
	'positron',
];

/**
 * Get the path to the bundled VSIX file
 */
export function getVsixPath(): string {
	// In development: assets folder is at project root
	// In production (npm install): assets folder is in package root
	const possiblePaths = [
		join(__dirname, '../../assets/nanocoder-vscode.vsix'), // development
		join(__dirname, '../../../assets/nanocoder-vscode.vsix'), // npm installed
	];

	for (const path of possiblePaths) {
		if (existsSync(path)) {
			return path;
		}
	}

	throw new Error('VS Code extension VSIX not found in package');
}

/**
 * Get all available VS Code (or fork) CLIs in the PATH
 */
export function getAvailableClis(): string[] {
	return SUPPORTED_CLIS.filter(cli => {
		try {
			execSync(`${cli} --version`, {
				stdio: 'ignore',
				...(isWindows && {shell: 'cmd.exe'}),
			});
			return true;
		} catch {
			return false;
		}
	});
}

/**
 * Check if any VS Code CLI is available
 */
export function isVSCodeCliAvailable(): boolean {
	return getAvailableClis().length > 0;
}

/**
 * Check if the nanocoder VS Code extension is installed in any available VS Code flavor
 */
export function isExtensionInstalled(): boolean {
	const availableClis = getAvailableClis();

	if (availableClis.length === 0) {
		return false;
	}

	for (const cli of availableClis) {
		try {
			const output = execSync(`${cli} --list-extensions`, {
				encoding: 'utf-8',
				stdio: ['pipe', 'pipe', 'ignore'],
				...(isWindows && {shell: 'cmd.exe'}),
			});

			if (output.toLowerCase().includes('nanocollective.nanocoder-vscode')) {
				return true;
			}
		} catch {
			// Skip CLIs that fail
			continue;
		}
	}

	return false;
}

/**
 * Install the VS Code extension to a specific CLI
 */
async function installToCli(cli: string, vsixPath: string): Promise<boolean> {
	return new Promise(resolve => {
		const child = spawn(cli, ['--install-extension', vsixPath], {
			stdio: ['ignore', 'pipe', 'pipe'],
			...(isWindows && {shell: 'cmd.exe'}),
		});

		child.on('close', code => {
			resolve(code === 0);
		});

		child.on('error', () => {
			resolve(false);
		});
	});
}

/**
 * Install the VS Code extension from the bundled VSIX to all available VS Code flavors
 * Returns a promise that resolves when installation is complete
 */
export async function installExtension(): Promise<{
	success: boolean;
	message: string;
}> {
	const availableClis = getAvailableClis();

	if (availableClis.length === 0) {
		return {
			success: false,
			message:
				'VS Code CLI not found. Please install the "code" command (or a supported fork like Cursor, VSCodium, Windsurf, or Trae):\n' +
				'  1. Open VS Code or your preferred editor\n' +
				'  2. Press Cmd+Shift+P (Mac) or Ctrl+Shift+P (Windows/Linux)\n' +
				"  3. Type \"Shell Command: Install \'code\' command in PATH\" (replace \'code\' with your editor\'s CLI name)",
		};
	}

	try {
		const vsixPath = getVsixPath();
		const results = await Promise.all(
			availableClis.map(async cli => ({
				cli,
				success: await installToCli(cli, vsixPath),
			})),
		);

		const successful = results.filter(r => r.success);

		if (successful.length === 0) {
			return {
				success: false,
				message: `Failed to install extension to any available VS Code flavor (${availableClis.join(
					', ',
				)}).`,
			};
		}

		const successMessage =
			successful.length === availableClis.length
				? `VS Code extension installed successfully for all editors (${successful
						.map(r => r.cli)
						.join(', ')})!`
				: `VS Code extension installed for: ${successful
						.map(r => r.cli)
						.join(', ')}. (Failed for: ${results
						.filter(r => !r.success)
						.map(r => r.cli)
						.join(', ')})`;

		return {
			success: true,
			message: `${successMessage} Please reload your editor to activate it.`,
		};
	} catch (error) {
		return {
			success: false,
			message: `Failed to install extension: ${
				error instanceof Error ? error.message : String(error)
			}`,
		};
	}
}
