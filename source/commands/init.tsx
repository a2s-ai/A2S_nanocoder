import {Command} from '@/types/index';
import React from 'react';
import {TitledBox, titleStyles} from '@mishieck/ink-titled-box';
import {Box, Text} from 'ink';
import {colors} from '@/config/index';
import {useTerminalWidth} from '@/hooks/useTerminalWidth';
import ErrorMessage from '@/components/error-message';
import {existsSync, mkdirSync, writeFileSync} from 'fs';
import {join} from 'path';
import {ProjectAnalyzer} from '@/init/project-analyzer';
import {AgentsTemplateGenerator} from '@/init/agents-template-generator';
import {ExistingRulesExtractor} from '@/init/existing-rules-extractor';

function InitSuccess({
	created,
	analysis,
}: {
	created: string[];
	analysis?: {
		projectType: string;
		primaryLanguage: string;
		frameworks: string[];
		totalFiles: number;
	};
}) {
	const boxWidth = useTerminalWidth();
	return (
		<TitledBox
			borderStyle="round"
			titles={['Project Initialized']}
			titleStyles={titleStyles.pill}
			width={boxWidth}
			borderColor={colors.primary}
			paddingX={2}
			paddingY={1}
			flexDirection="column"
			marginBottom={1}
		>
			<Box marginBottom={1}>
				<Text color={colors.primary} bold>
					✓ Nanocoder project initialized successfully!
				</Text>
			</Box>

			{analysis && (
				<>
					<Box marginBottom={1}>
						<Text color={colors.white} bold>
							Project Analysis:
						</Text>
					</Box>
					<Text color={colors.secondary}>• Type: {analysis.projectType}</Text>
					<Text color={colors.secondary}>
						• Primary Language: {analysis.primaryLanguage}
					</Text>
					{analysis.frameworks.length > 0 && (
						<Text color={colors.secondary}>
							• Frameworks: {analysis.frameworks.slice(0, 3).join(', ')}
						</Text>
					)}
					<Text color={colors.secondary}>
						• Files Analyzed: {analysis.totalFiles}
					</Text>
					<Box marginBottom={1} />
				</>
			)}

			<Box marginBottom={1}>
				<Text color={colors.white} bold>
					Files Created:
				</Text>
			</Box>

			{created.map((item, index) => (
				<Text key={index} color={colors.secondary}>
					• {item}
				</Text>
			))}

			<Box marginTop={1} flexDirection="column">
				<Text color={colors.white}>
					Your project is now ready for AI-assisted development!
				</Text>
				<Text color={colors.secondary}>
					The AGENTS.md file will help AI understand your project context.
				</Text>
			</Box>
		</TitledBox>
	);
}

function InitError({message}: {message: string}) {
	return <ErrorMessage message={`✗ ${message}`} />;
}

const DEFAULT_CONFIG = {
	nanocoder: {
		providers: [
			{
				name: 'OpenRouter',
				baseUrl: 'https://openrouter.ai/api/v1',
				apiKey: 'your-openrouter-api-key-here',
				models: ['openai/gpt-4o-mini', 'anthropic/claude-3-haiku'],
			},
			{
				name: 'Local Ollama',
				baseUrl: 'http://localhost:11434/v1',
				models: ['llama3.2', 'qwen2.5-coder'],
			},
		],
		mcpServers: [],
	},
};

// Enhanced example commands based on detected project type
const getExampleCommands = (projectType: string, primaryLanguage: string) => {
	const baseCommands = {
		'review.md': `---
description: Review code and suggest improvements
aliases: [code-review, cr]
parameters: [files]
---

Review the code in {{files}} and provide detailed feedback on:

1. Code quality and best practices
2. Potential bugs or issues
3. Performance considerations
4. Readability and maintainability
5. Security concerns

Provide specific, actionable suggestions for improvement.`,

		'test.md': `---
description: Generate comprehensive unit tests
aliases: [unittest, test-gen]
parameters: [filename]
---

Generate comprehensive unit tests for {{filename}}.

Consider:
1. Test all public functions and methods
2. Include edge cases and error scenarios
3. Use appropriate mocking where needed
4. Follow existing test framework conventions
5. Ensure good test coverage

If no filename provided, suggest which files need tests.`,
	};

	// Add language/framework-specific commands
	const additionalCommands: {[key: string]: string} = {};

	if (primaryLanguage === 'JavaScript' || primaryLanguage === 'TypeScript') {
		additionalCommands['refactor.md'] = `---
description: Refactor JavaScript/TypeScript code
aliases: [refactor-js, clean]
parameters: [target]
---

Refactor {{target}} to improve:

1. Code structure and organization
2. Modern ES6+ syntax usage
3. Performance optimizations
4. Type safety (for TypeScript)
5. Reusability and maintainability

Follow current project conventions and patterns.`;
	}

	if (primaryLanguage === 'Python') {
		additionalCommands['optimize.md'] = `---
description: Optimize Python code for performance
aliases: [perf, optimize-py]
parameters: [file]
---

Analyze and optimize {{file}} for:

1. Algorithm efficiency
2. Memory usage
3. Pythonic patterns
4. Performance bottlenecks
5. Code readability

Follow PEP 8 and project conventions.`;
	}

	if (projectType.includes('Web')) {
		additionalCommands['component.md'] = `---
description: Create a new UI component
aliases: [comp, ui]
parameters: [name, type]
---

Create a new {{type}} component named {{name}} that:

1. Follows project component patterns
2. Includes proper TypeScript types
3. Has responsive design considerations
4. Includes basic styling structure
5. Has proper prop validation

Make it reusable and well-documented.`;
	}

	return {...baseCommands, ...additionalCommands};
};

export const initCommand: Command = {
	name: 'init',
	description:
		'Initialize nanocoder configuration and analyze project structure',
	handler: async (_args: string[], _messages, _metadata) => {
		const cwd = process.cwd();
		const created: string[] = [];

		try {
			// Check if already initialized
			const configPath = join(cwd, 'agents.config.json');
			const agentsPath = join(cwd, 'AGENTS.md');
			const nanocoderDir = join(cwd, '.nanocoder');

			// Check for existing initialization
			const hasConfig = existsSync(configPath);
			const hasAgents = existsSync(agentsPath);
			const hasNanocoder = existsSync(nanocoderDir);

			if (hasConfig && hasAgents && hasNanocoder) {
				return React.createElement(InitError, {
					key: `init-error-${Date.now()}`,
					message:
						'Project already fully initialized. Found agents.config.json, AGENTS.md, and .nanocoder/ directory.',
				});
			}

			// Show progress indicator for analysis
			// Note: In a real implementation, we'd want to show this as a loading state
			// For now, we'll do the analysis synchronously

			// Analyze the project
			const analyzer = new ProjectAnalyzer(cwd);
			const analysis = analyzer.analyze();

			// Extract existing AI configuration files
			const rulesExtractor = new ExistingRulesExtractor(cwd);
			const existingRules = rulesExtractor.extractExistingRules();

			// Create agents.config.json if it doesn't exist
			if (!hasConfig) {
				writeFileSync(configPath, JSON.stringify(DEFAULT_CONFIG, null, 2));
				created.push('agents.config.json');
			}

			// Create AGENTS.md based on analysis and existing rules
			if (!hasAgents) {
				const agentsContent = AgentsTemplateGenerator.generateAgentsMd(
					analysis,
					existingRules,
				);
				writeFileSync(agentsPath, agentsContent);
				created.push('AGENTS.md');

				// Report found existing rules
				if (existingRules.length > 0) {
					const sourceFiles = existingRules.map(r => r.source).join(', ');
					created.push(`↳ Merged content from: ${sourceFiles}`);
				}
			}

			// Create .nanocoder directory structure
			if (!hasNanocoder) {
				mkdirSync(nanocoderDir, {recursive: true});
				created.push('.nanocoder/');
			}

			const commandsDir = join(nanocoderDir, 'commands');
			if (!existsSync(commandsDir)) {
				mkdirSync(commandsDir, {recursive: true});
				created.push('.nanocoder/commands/');
			}

			// Create example custom commands based on project analysis
			const exampleCommands = getExampleCommands(
				analysis.projectType,
				analysis.languages.primary?.name || 'Unknown',
			);

			for (const [filename, content] of Object.entries(exampleCommands)) {
				const filePath = join(commandsDir, filename);
				if (!existsSync(filePath)) {
					writeFileSync(filePath, content);
					created.push(`.nanocoder/commands/${filename}`);
				}
			}

			// Prepare analysis summary for display
			const analysisSummary = {
				projectType: analysis.projectType,
				primaryLanguage: analysis.languages.primary?.name || 'Unknown',
				frameworks: analysis.dependencies.frameworks.map(f => f.name),
				totalFiles: analysis.structure.scannedFiles,
			};

			return React.createElement(InitSuccess, {
				key: `init-success-${Date.now()}`,
				created,
				analysis: analysisSummary,
			});
		} catch (error: any) {
			return React.createElement(InitError, {
				key: `init-error-${Date.now()}`,
				message: `Failed to initialize project: ${error.message}`,
			});
		}
	},
};
