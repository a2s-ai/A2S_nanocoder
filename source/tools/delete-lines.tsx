import React from 'react';
import {resolve} from 'node:path';
import {readFile, writeFile} from 'node:fs/promises';
import {highlight} from 'cli-highlight';
import {Text, Box} from 'ink';
import type {ToolHandler, ToolDefinition} from '../types/index.js';
import {ThemeContext} from '../hooks/useTheme.js';
import {getColors} from '../config/index.js';
import {getLanguageFromExtension} from '../utils/programming-language-helper.js';
import ToolMessage from '../components/tool-message.js';

interface DeleteLinesArgs {
	path: string;
	line_number: number;
	end_line?: number;
}

const handler: ToolHandler = async (args: DeleteLinesArgs): Promise<string> => {
	const {path, line_number, end_line} = args;

	// Validate line numbers
	if (!line_number || line_number < 1) {
		throw new Error(`Invalid line_number: ${line_number}. Must be a positive integer.`);
	}

	const endLine = end_line ?? line_number;
	if (endLine < line_number) {
		throw new Error(`end_line (${endLine}) cannot be less than line_number (${line_number}).`);
	}

	const absPath = resolve(path);
	const fileContent = await readFile(absPath, 'utf-8');
	const lines = fileContent.split('\n');

	// Validate line range is within file bounds
	if (line_number > lines.length) {
		throw new Error(
			`Line number ${line_number} is out of range (file has ${lines.length} lines)`
		);
	}
	if (endLine > lines.length) {
		throw new Error(
			`End line ${endLine} is out of range (file has ${lines.length} lines)`
		);
	}

	// Delete lines
	const linesToRemove = endLine - line_number + 1;
	const newLines = [...lines];
	newLines.splice(line_number - 1, linesToRemove);

	// Write updated content
	const newContent = newLines.join('\n');
	await writeFile(absPath, newContent, 'utf-8');

	// Generate full file contents to show the model the current file state
	let fileContext = '\n\nUpdated file contents:\n';
	for (let i = 0; i < newLines.length; i++) {
		const lineNumStr = String(i + 1).padStart(4, ' ');
		const line = newLines[i] || '';
		fileContext += `${lineNumStr}: ${line}\n`;
	}

	// Add a note about the deletion
	fileContext += `\n(Deleted ${linesToRemove} line${linesToRemove > 1 ? 's' : ''} that were previously at line${linesToRemove > 1 ? 's' : ''} ${line_number}${endLine !== line_number ? `-${endLine}` : ''})\n`;

	const rangeDesc = line_number === endLine ? `line ${line_number}` : `lines ${line_number}-${endLine}`;
	return `Successfully deleted ${rangeDesc}.${fileContext}`;
};

const DeleteLinesFormatter = React.memo(({args, result}: {args: any; result?: string}) => {
	const {colors} = React.useContext(ThemeContext)!;
	const [preview, setPreview] = React.useState<React.ReactElement | null>(null);

	React.useEffect(() => {
		const generatePreview = async () => {
			const formattedPreview = await formatDeleteLinesPreview(args, result, colors);
			setPreview(formattedPreview);
		};
		generatePreview();
	}, [args, result, colors]);

	return preview;
});

async function formatDeleteLinesPreview(
	args: any,
	result?: string,
	colors?: any,
): Promise<React.ReactElement> {
	const themeColors = colors || getColors();
	const {path, line_number, end_line} = args;
	const lineNumber = Number(line_number);
	const endLine = Number(end_line) || lineNumber;

	// Validate line numbers
	if (!lineNumber || lineNumber < 1) {
		throw new Error(`Invalid line_number: ${line_number}. Must be a positive integer.`);
	}
	if (endLine < lineNumber) {
		throw new Error(`end_line (${endLine}) cannot be less than line_number (${lineNumber}).`);
	}

	const isResult = result !== undefined;
	const displayTitle = isResult ? '✓' : '⚒';

	try {
		const fileContent = await readFile(resolve(path), 'utf-8');
		const lines = fileContent.split('\n');
		const ext = path.split('.').pop()?.toLowerCase();
		const language = getLanguageFromExtension(ext);

		// For results mode, show the same diff format as preview mode
		// but with a completed status message
		if (isResult) {
			// In result mode, we just show the range that was deleted and the surrounding context
			// The file has already been updated, so we show the final state
			const linesToRemove = endLine - lineNumber + 1;
			const contextLines = 3;

			// Since the lines were deleted, we show context around where they used to be
			const showStart = Math.max(0, lineNumber - 1 - contextLines);
			const showEnd = Math.min(lines.length - 1, lineNumber - 1 + contextLines);

			const contextElements: React.ReactElement[] = [];

			// Show context before the deletion point
			for (let i = showStart; i < Math.min(lineNumber - 1, lines.length); i++) {
				const lineNumStr = String(i + 1).padStart(4, ' ');
				const line = lines[i] || '';
				let displayLine: string;
				try {
					displayLine = highlight(line, {language, theme: 'default'});
				} catch {
					displayLine = line;
				}

				contextElements.push(
					<Text key={`before-${i}`} color={themeColors.secondary}>
						{lineNumStr} {displayLine}
					</Text>,
				);
			}

			// Show a marker indicating where the deletion occurred
			const deletionLineNum = lineNumber;
			contextElements.push(
				<Text
					key="deletion-marker"
					backgroundColor={themeColors.diffRemoved}
					color={themeColors.diffRemovedText}
					wrap="wrap"
				>
					{String(deletionLineNum).padStart(4, ' ')} - [Deleted {linesToRemove} line{linesToRemove > 1 ? 's' : ''}]
				</Text>,
			);

			// Show context after the deletion point (adjust line numbers)
			for (let i = lineNumber - 1; i <= Math.min(showEnd, lines.length - 1); i++) {
				const displayLineNum = i + linesToRemove + 1;
				const lineNumStr = String(displayLineNum).padStart(4, ' ');
				const line = lines[i] || '';
				let displayLine: string;
				try {
					displayLine = highlight(line, {language, theme: 'default'});
				} catch {
					displayLine = line;
				}

				contextElements.push(
					<Text key={`after-${i}`} color={themeColors.secondary}>
						{lineNumStr} {displayLine}
					</Text>,
				);
			}

			const rangeDesc = lineNumber === endLine ? `line ${lineNumber}` : `lines ${lineNumber}-${endLine}`;
			const messageContent = (
				<Box flexDirection="column">
					<Text color={themeColors.tool}>{displayTitle} delete_lines</Text>

					<Box>
						<Text color={themeColors.secondary}>Path: </Text>
						<Text color={themeColors.primary}>{path}</Text>
					</Box>

					<Box>
						<Text color={themeColors.secondary}>Deleted: </Text>
						<Text color={themeColors.white}>{rangeDesc}</Text>
					</Box>

					<Box flexDirection="column" marginTop={1}>
						<Text color={themeColors.success}>✓ Delete completed successfully</Text>
					</Box>

					<Box flexDirection="column" marginTop={1}>
						<Text color={themeColors.secondary}>Result:</Text>
						{contextElements}
					</Box>
				</Box>
			);

			return <ToolMessage message={messageContent} hideBox={true} />;
		}

		// Preview mode - show what will be deleted
		if (lineNumber > lines.length || endLine > lines.length) {
			const maxLine = Math.max(lineNumber, endLine);
			throw new Error(
				`Line ${maxLine} is out of range (file has ${lines.length} lines)`
			);
		}

		const linesToRemove = endLine - lineNumber + 1;
		const contextLines = 3;
		const showStart = Math.max(0, lineNumber - 1 - contextLines);
		const showEnd = Math.min(lines.length - 1, endLine - 1 + contextLines);

		const contextBefore: React.ReactElement[] = [];
		const deletedLines: React.ReactElement[] = [];
		const contextAfter: React.ReactElement[] = [];

		// Show context before
		for (let i = showStart; i < lineNumber - 1; i++) {
			const lineNumStr = String(i + 1).padStart(4, ' ');
			const line = lines[i] || '';
			let displayLine: string;
			try {
				displayLine = highlight(line, {language, theme: 'default'});
			} catch {
				displayLine = line;
			}

			contextBefore.push(
				<Text key={`before-${i}`} color={themeColors.secondary}>
					{lineNumStr} {displayLine}
				</Text>,
			);
		}

		// Show deleted lines
		for (let i = lineNumber - 1; i < endLine; i++) {
			const lineNumStr = String(i + 1).padStart(4, ' ');
			const line = lines[i] || '';
			let displayLine: string;
			try {
				displayLine = highlight(line, {language, theme: 'default'});
			} catch {
				displayLine = line;
			}

			deletedLines.push(
				<Text
					key={`delete-${i}`}
					backgroundColor={themeColors.diffRemoved}
					color={themeColors.diffRemovedText}
					wrap="wrap"
				>
					{lineNumStr} - {displayLine}
				</Text>,
			);
		}

		// Show context after
		for (let i = endLine; i <= showEnd; i++) {
			const lineNumStr = String(i - linesToRemove + 1).padStart(4, ' ');
			const line = lines[i] || '';
			let displayLine: string;
			try {
				displayLine = highlight(line, {language, theme: 'default'});
			} catch {
				displayLine = line;
			}

			contextAfter.push(
				<Text key={`after-${i}`} color={themeColors.secondary}>
					{lineNumStr} {displayLine}
				</Text>,
			);
		}

		const rangeDesc = lineNumber === endLine ? `line ${lineNumber}` : `lines ${lineNumber}-${endLine}`;
		const messageContent = (
			<Box flexDirection="column">
				<Text color={themeColors.tool}>{displayTitle} delete_lines</Text>

				<Box>
					<Text color={themeColors.secondary}>Path: </Text>
					<Text color={themeColors.primary}>{path}</Text>
				</Box>

				<Box>
					<Text color={themeColors.secondary}>Range: </Text>
					<Text color={themeColors.white}>{rangeDesc}</Text>
				</Box>

				<Box flexDirection="column" marginTop={1}>
					<Text color={themeColors.success}>
						✓ Deleting {linesToRemove} line{linesToRemove > 1 ? 's' : ''}
					</Text>
					<Box flexDirection="column">
						{contextBefore}
						{deletedLines}
						{contextAfter}
					</Box>
				</Box>
			</Box>
		);

		return <ToolMessage message={messageContent} hideBox={true} />;
	} catch (error) {
		const errorContent = (
			<Box flexDirection="column">
				<Text color={themeColors.tool}>⚒ delete_lines</Text>

				<Box>
					<Text color={themeColors.secondary}>Path: </Text>
					<Text color={themeColors.primary}>{path}</Text>
				</Box>

				<Box>
					<Text color={themeColors.error}>Error: </Text>
					<Text color={themeColors.error}>
						{error instanceof Error ? error.message : String(error)}
					</Text>
				</Box>
			</Box>
		);

		return <ToolMessage message={errorContent} hideBox={true} />;
	}
}

const formatter = async (args: any, result?: string): Promise<React.ReactElement> => {
	return <DeleteLinesFormatter args={args} result={result} />;
};

export const deleteLinesTool: ToolDefinition = {
	handler,
	formatter,
	config: {
		type: 'function',
		function: {
			name: 'delete_lines',
			description: 'Delete a range of lines from a file',
			parameters: {
				type: 'object',
				properties: {
					path: {
						type: 'string',
						description: 'The path to the file to edit.',
					},
					line_number: {
						type: 'number',
						description: 'The starting line number (1-based) to delete.',
					},
					end_line: {
						type: 'number',
						description: 'The ending line number for range deletion. If not specified, only deletes line_number.',
					},
				},
				required: ['path', 'line_number'],
			},
		},
	},
};