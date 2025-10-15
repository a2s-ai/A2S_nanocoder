import React from 'react';
import {Box, Text, useInput} from 'ink';
import SelectInput from 'ink-select-input';
import {TitledBox, titleStyles} from '@mishieck/ink-titled-box';
import {useTheme} from '@/hooks/useTheme';
import type {ToolCall} from '@/types/core';
import {toolFormatters} from '@/tools/index';
import {useTerminalWidth} from '@/hooks/useTerminalWidth';
import {getToolManager} from '@/message-handler';

interface ToolConfirmationProps {
	toolCall: ToolCall;
	onConfirm: (confirmed: boolean) => void;
	onCancel: () => void;
}

interface ConfirmationOption {
	label: string;
	value: boolean;
}

export default function ToolConfirmation({
	toolCall,
	onConfirm,
	onCancel,
}: ToolConfirmationProps) {
	const boxWidth = useTerminalWidth();
	const {colors} = useTheme();
	const [formatterPreview, setFormatterPreview] = React.useState<
		React.ReactElement | string | null
	>(null);
	const [isLoadingPreview, setIsLoadingPreview] = React.useState(false);
	const [hasFormatterError, setHasFormatterError] = React.useState(false);
	const [hasValidationError, setHasValidationError] = React.useState(false);
	const [validationError, setValidationError] = React.useState<string | null>(
		null,
	);

	// Get MCP tool info for display
	const toolManager = getToolManager();
	const mcpInfo = toolManager?.getMCPToolInfo(toolCall.function.name) || {
		isMCPTool: false,
	};

	// Load formatter preview
	React.useEffect(() => {
		const loadPreview = async () => {
			// Run validator first if available
			if (toolManager) {
				const validator = toolManager.getToolValidator(toolCall.function.name);
				if (validator) {
					try {
						// Parse arguments if they're a JSON string
						let parsedArgs = toolCall.function.arguments;
						if (typeof parsedArgs === 'string') {
							try {
								parsedArgs = JSON.parse(parsedArgs);
							} catch (e) {
								// If parsing fails, use as-is
							}
						}

						const validationResult = await validator(parsedArgs);
						if (!validationResult.valid) {
							setValidationError(validationResult.error);
							setHasValidationError(true);
							setFormatterPreview(
								<Text color={colors.error}>{validationResult.error}</Text>,
							);
							return;
						}
					} catch (error) {
						console.error('Error running validator:', error);
						const errorMsg = `Validation error: ${
							error instanceof Error ? error.message : String(error)
						}`;
						setValidationError(errorMsg);
						setHasValidationError(true);
						setFormatterPreview(<Text color={colors.error}>{errorMsg}</Text>);
						return;
					}
				}
			}

			const formatter = toolFormatters[toolCall.function.name];
			if (formatter) {
				setIsLoadingPreview(true);
				try {
					// Parse arguments if they're a JSON string
					let parsedArgs = toolCall.function.arguments;
					if (typeof parsedArgs === 'string') {
						try {
							parsedArgs = JSON.parse(parsedArgs);
						} catch (e) {
							// If parsing fails, use as-is
						}
					}
					const preview = await formatter(parsedArgs);
					setFormatterPreview(preview);
				} catch (error) {
					console.error('Error loading formatter preview:', error);
					setHasFormatterError(true);
					setFormatterPreview(
						<Text color={colors.error}>Error: {String(error)}</Text>,
					);
				} finally {
					setIsLoadingPreview(false);
				}
			}
		};

		loadPreview();
	}, [toolCall, toolManager]);

	// Handle escape key to cancel
	useInput((inputChar, key) => {
		if (key.escape) {
			onCancel();
		}
	});

	// Auto-cancel if there's a formatter error (not validation error)
	React.useEffect(() => {
		if (hasFormatterError && !hasValidationError) {
			// Automatically cancel the tool execution only for formatter crashes
			onConfirm(false);
		}
	}, [hasFormatterError, hasValidationError, onConfirm]);

	const options: ConfirmationOption[] = [
		{label: '✓ Yes, execute this tool', value: true},
		{label: '✗ No, cancel execution', value: false},
	];

	const handleSelect = (item: ConfirmationOption) => {
		onConfirm(item.value);
	};

	return (
		<Box width={boxWidth} marginBottom={1}>
			<Box flexDirection="column">
				{/* Formatter preview */}
				{isLoadingPreview && (
					<Box marginBottom={1}>
						<Text color={colors.secondary}>Loading preview...</Text>
					</Box>
				)}

				{formatterPreview && !isLoadingPreview && (
					<Box marginBottom={1} flexDirection="column">
						<Box>
							{React.isValidElement(formatterPreview) ? (
								formatterPreview
							) : (
								<Text color={colors.white}>{String(formatterPreview)}</Text>
							)}
						</Box>
					</Box>
				)}

				{/* Only show approval prompt if there's no formatter crash */}
				{!(hasFormatterError && !hasValidationError) && (
					<>
						<Box marginBottom={1}>
							<Text color={colors.tool}>
								{hasValidationError
									? 'Validation failed. Do you still want to execute this tool?'
									: `Do you want to execute ${
											mcpInfo.isMCPTool
												? `MCP tool "${toolCall.function.name}" from server "${mcpInfo.serverName}"`
												: `tool "${toolCall.function.name}"`
									  }?`}
							</Text>
						</Box>

						<SelectInput items={options} onSelect={handleSelect} />

						<Box marginTop={1}>
							<Text color={colors.secondary}>Press Escape to cancel</Text>
						</Box>
					</>
				)}

				{/* Show automatic cancellation message for formatter crashes only */}
				{hasFormatterError && !hasValidationError && (
					<Box marginTop={1}>
						<Text color={colors.error}>
							Tool execution cancelled due to formatter error.
						</Text>
						<Text color={colors.secondary}>Press Escape to continue</Text>
					</Box>
				)}
			</Box>
		</Box>
	);
}
