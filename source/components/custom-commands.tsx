import {TitledBox, titleStyles} from '@mishieck/ink-titled-box';
import {Text, Box} from 'ink';
import {useTheme} from '../hooks/useTheme.js';
import type {CustomCommand} from '../types/index.js';
import {useTerminalWidth} from '../hooks/useTerminalWidth.js';

interface CustomCommandsProps {
	commands: CustomCommand[];
}

function formatCommand(cmd: CustomCommand): string {
	const parts: string[] = [`/${cmd.fullName}`];

	if (cmd.metadata.parameters && cmd.metadata.parameters.length > 0) {
		parts.push(cmd.metadata.parameters.map((p: string) => `<${p}>`).join(' '));
	}

	if (cmd.metadata.description) {
		parts.push(`- ${cmd.metadata.description}`);
	}

	if (cmd.metadata.aliases && cmd.metadata.aliases.length > 0) {
		const aliasNames = cmd.metadata.aliases.map((a: string) =>
			cmd.namespace ? `${cmd.namespace}:${a}` : a,
		);
		parts.push(`(aliases: ${aliasNames.join(', ')})`);
	}

	return parts.join(' ');
}

export default function CustomCommands({commands}: CustomCommandsProps) {
	const boxWidth = useTerminalWidth();
	const {colors} = useTheme();
	// Sort commands alphabetically by full name
	const sortedCommands = [...commands].sort((a, b) =>
		a.fullName.localeCompare(b.fullName),
	);

	return (
		<TitledBox
			key={colors.primary}
			borderStyle="round"
			titles={['/custom-commands']}
			titleStyles={titleStyles.pill}
			width={boxWidth}
			borderColor={colors.primary}
			paddingX={2}
			paddingY={1}
			flexDirection="column"
			marginBottom={1}
		>
			{commands.length === 0 ? (
				<>
					<Box marginBottom={1}>
						<Text color={colors.white} bold>
							No custom commands found
						</Text>
					</Box>

					<Text color={colors.white}>To create custom commands:</Text>

					<Text color={colors.secondary}>
						1. Create a <Text color={colors.primary}>.nanocoder/commands</Text>{' '}
						directory in your project
					</Text>

					<Text color={colors.secondary}>
						2. Add <Text color={colors.primary}>.md</Text> files with command
						prompts
					</Text>

					<Text color={colors.secondary}>
						3. Optionally add frontmatter for metadata:
					</Text>

					<Box marginTop={1} marginBottom={1}>
						<Text color={colors.secondary}>
							{`---\n`}
							{`description: Generate unit tests\n`}
							{`aliases: [test, unittest]\n`}
							{`parameters: [filename]\n`}
							{`---\n`}
							{`Generate comprehensive unit tests for {{filename}}...`}
						</Text>
					</Box>
				</>
			) : (
				<>
					<Box marginBottom={1}>
						<Text color={colors.white}>
							Found {commands.length} custom command
							{commands.length !== 1 ? 's' : ''}:
						</Text>
					</Box>

					{sortedCommands.map((cmd, index) => (
						<Text key={index} color={colors.white}>
							• {formatCommand(cmd)}
						</Text>
					))}
				</>
			)}
		</TitledBox>
	);
}
