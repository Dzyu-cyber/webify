import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';
import { IDistilledDesignTokens, IExtractedElement } from '../types';

dotenv.config();

// Initialize the Anthropic Client using the environment variable key
const apiKey = process.env.CLAUDE_API_KEY;
const anthropic = apiKey ? new Anthropic({ apiKey }) : null;

const SYSTEM_PROMPT = `You are a senior design systems engineer and frontend architect.
Your task is to transform raw, distilled design tokens and sampled page element styles into a precise, production-ready, and beautifully organized "design.md" file.

CRITICAL RULES:
1. STRICT ACCURACY: Do not invent, guess, or interpolate design values (colors, spacing, fonts). Rely strictly on the provided JSON tokens and element samples.
2. DO NOT HALLUCINATE: If a component pattern (e.g. Cards or Inputs) is not present in the element samples, do not document it.
3. Keep the output clean, professional, and well-structured.

Output format must be clean Markdown and follow this outline:
# Design System: [Page Title]

## Color Palette
List the distilled color tokens. Categorize them into Primary, Backgrounds, and Accents based on usage counts. Provide both their HEX values and a brief description.

## Typography
- **Font Families**: List the primary font families and their counts.
- **Type Scale**: List the sorted font sizes in px/rem and describe how they are utilized.

## Spacing & Grid
- **Base Grid**: The detected base spacing unit in pixels (e.g., 4px or 8px).
- **Spacing Scale**: Map standard multipliers of the base grid (e.g. 1x, 2x, 3x, 4x) to their pixel values.

## UI Component Specifications
Analyze the provided element samples to document styles for core components found on the page (e.g., Button, Card, Link, Heading).
For each component, specify:
- Tag and class patterns
- Applied background colors, text colors, and borders
- Font sizes and weights
- Paddings, margins, and border-radius values
`;

/**
 * Retries the Claude API request with exponential backoff on failure.
 */
async function callClaudeWithRetry(
  client: Anthropic,
  params: Anthropic.MessageCreateParams,
  retries = 3,
  delayMs = 1500
): Promise<Anthropic.Message> {
  try {
    const response = await client.messages.create(params);
    return response as Anthropic.Message;
  } catch (error) {
    if (retries > 0) {
      console.warn(`Claude API request failed. Retrying in ${delayMs}ms. Retries left: ${retries}. Error:`, error);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      return callClaudeWithRetry(client, params, retries - 1, delayMs * 2);
    }
    throw error;
  }
}

/**
 * Sends distilled design tokens and element samples to Claude API to generate a design.md file.
 */
export async function generateDesignMarkdown(
  pageTitle: string,
  tokens: IDistilledDesignTokens,
  elementsSample: IExtractedElement[]
): Promise<string> {
  if (!anthropic) {
    throw new Error('CLAUDE_API_KEY is not defined or Anthropic client failed to initialize.');
  }

  // Create a trimmed sample of elements to avoid blowing up the token context window
  // Only pass the tag name, class/id, and non-empty styles for up to 50 elements
  const simplifiedElements = elementsSample.slice(0, 50).map((el) => ({
    tagName: el.tagName,
    className: el.className,
    id: el.id,
    styles: Object.fromEntries(
      Object.entries(el.styles).filter(([_, v]) => v !== '' && v !== 'initial' && v !== 'none')
    ),
  }));

  const userContent = `Here are the distilled design tokens and element samples for the page "${pageTitle}":

Distilled Tokens:
${JSON.stringify(tokens, null, 2)}

Sampled Elements:
${JSON.stringify(simplifiedElements, null, 2)}

Please generate the "design.md" documentation following the outlined specifications. Output only the Markdown content. Do not include introductory or concluding conversational text.`;

  console.log(`Sending design system formatting request to Claude for: "${pageTitle}"...`);

  const response = await callClaudeWithRetry(anthropic, {
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 4000,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: userContent,
      },
    ],
  });

  // Extract content from message blocks
  const textContentBlock = response.content.find((block) => block.type === 'text');
  if (!textContentBlock || textContentBlock.type !== 'text') {
    throw new Error('No text content returned from Claude API response.');
  }

  return textContentBlock.text;
}
