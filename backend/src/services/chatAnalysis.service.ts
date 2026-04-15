import { OpenRouter } from "@openrouter/sdk";
import { config } from "@/config/env.js";

export interface ChatAnalysisResult {
	isIssue: boolean;
	reason: string;
	category?: string;
	suggestedPriority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
}

export interface MessageContext {
	content: string;
	senderRole: string;
	createdAt: Date;
}

class ChatAnalysisService {
	private client: OpenRouter | null = null;

	constructor() {
		if (config.openrouter.apiKey) {
			this.client = new OpenRouter({
				apiKey: config.openrouter.apiKey,
			});
		}
	}

	/**
	 * Analyze a chat message to determine if it should be converted to an issue
	 */
	async analyzeMessage(
		messageContent: string,
		messageContext: MessageContext[] = [],
	): Promise<ChatAnalysisResult> {
		// If OpenRouter is not configured, return a default response
		if (!this.client || !config.openrouter.apiKey) {
			console.warn(
				"[ChatAnalysisService] OpenRouter not configured, skipping analysis",
			);
			return {
				isIssue: false,
				reason: "",
			};
		}

		try {
			const systemPrompt = `You are an AI assistant that analyzes chat messages in a boarding house management platform.
Your task is to identify messages that express concerns, complaints, problems, or issues that should be tracked as formal issues.

Look for messages that indicate:
- Maintenance problems (e.g., "the bulb is not working", "the faucet is leaking")
- Rule violations or concerns (e.g., "don't drink at the boarding", "no visitors after 10pm")
- Payment issues (e.g., "you didn't pay the rent in 3 months")
- Safety concerns
- Service complaints
- Any other problems that need attention or resolution

Respond ONLY with a valid JSON object in this exact format:
{
  "cmd": "isIssue" | "notIssue",
  "reason": "brief explanation of why this is or isn't an issue",
  "category": "optional category like 'maintenance', 'payment', 'rules', 'safety', etc.",
  "suggestedPriority": "LOW" | "MEDIUM" | "HIGH" | "URGENT" (optional)
}

Do not include any other text, explanations, or markdown formatting. Only the JSON object.`;

			const contextString =
				messageContext.length > 0
					? `\n\nRecent conversation context:\n${messageContext.map((msg) => `[${msg.senderRole}]: ${msg.content}`).join("\n")}`
					: "";

			const userPrompt = `Analyze this message and determine if it should be converted to a formal issue:${contextString}

Message to analyze: "${messageContent}"

Remember to respond only with the JSON object.`;

			const stream = await this.client.chat.send({
				chatGenerationParams: {
					model: config.openrouter.model,
					messages: [
						{
							role: "system",
							content: systemPrompt,
						},
						{
							role: "user",
							content: userPrompt,
						},
					],
					stream: true,
					provider: {
						dataCollection: "allow",
					},
				},
			});

			let response = "";
			for await (const chunk of stream) {
				const content = chunk.choices?.[0]?.delta?.content;
				if (content) {
					response += content;
				}
			}

			// Parse the JSON response
			const parsed = this.parseAIResponse(response);
			return parsed;
		} catch (error) {
			console.error("[ChatAnalysisService] Error analyzing message:", error);
			return {
				isIssue: false,
				reason: "Error analyzing message",
			};
		}
	}

	/**
	 * Parse the AI response and ensure it matches the expected format
	 */
	private parseAIResponse(response: string): ChatAnalysisResult {
		try {
			// Clean up the response (remove markdown code blocks if present)
			const cleaned = response
				.replace(/```json/g, "")
				.replace(/```/g, "")
				.trim();

			const parsed = JSON.parse(cleaned) as {
				cmd?: string;
				reason?: string;
				category?: string;
				suggestedPriority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
			};

			// Normalize the response to match our expected format
			const isIssue = parsed.cmd === "isIssue";

			return {
				isIssue,
				reason: parsed.reason || "",
				category: parsed.category,
				suggestedPriority: parsed.suggestedPriority,
			};
		} catch (error) {
			console.error(
				"[ChatAnalysisService] Error parsing AI response:",
				error,
				"Raw response:",
				response,
			);
			return {
				isIssue: false,
				reason: "Error parsing AI response",
			};
		}
	}

	/**
	 * Generate a title for an issue based on the message content
	 */
	async generateIssueTitle(messageContent: string): Promise<string> {
		if (!this.client || !config.openrouter.apiKey) {
			// Fallback: use first 50 characters of the message
			return messageContent.length > 50
				? `${messageContent.substring(0, 50)}...`
				: messageContent;
		}

		try {
			const stream = await this.client.chat.send({
				chatGenerationParams: {
					model: config.openrouter.model,
					messages: [
						{
							role: "system",
							content:
								"Generate a concise, descriptive title (max 80 characters) for a boarding house issue based on the following message. Respond with only the title, no quotes or explanations.",
						},
						{
							role: "user",
							content: `Generate an issue title for: "${messageContent}"`,
						},
					],
					stream: true,
					provider: {
						dataCollection: "allow",
					},
				},
			});

			let title = "";
			for await (const chunk of stream) {
				const content = chunk.choices?.[0]?.delta?.content;
				if (content) {
					title += content;
				}
			}

			return title.trim().substring(0, 80);
		} catch (error) {
			console.error("[ChatAnalysisService] Error generating title:", error);
			return messageContent.length > 50
				? `${messageContent.substring(0, 50)}...`
				: messageContent;
		}
	}
}

export const chatAnalysisService = new ChatAnalysisService();
