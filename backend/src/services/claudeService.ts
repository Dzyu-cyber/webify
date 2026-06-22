import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';
import { IDistilledDesignTokens, IExtractedElement } from '../types';

dotenv.config();

// Initialize API keys from the environment
const apiKey = process.env.CLAUDE_API_KEY;
const anthropic = apiKey ? new Anthropic({ apiKey }) : null;
const geminiApiKey = process.env.GEMINI_API_KEY;

const SYSTEM_PROMPT = `You are a senior design systems engineer and frontend architect.
Your task is to transform raw, distilled design tokens and sampled page element styles into a precise, production-ready, and beautifully organized "design.md" file.

CRITICAL RULES:
1. STRICT ACCURACY: Do not invent, guess, or interpolate design values (colors, spacing, fonts). Rely strictly on the provided JSON tokens and element samples.
2. DO NOT HALLUCINATE: If a component pattern (e.g. Cards or Inputs) is not present in the element samples, do not document it.
3. Keep the output clean, professional, and well-structured.
4. VISUAL REFERENCE: You are also provided with screenshots of the page layout. Use the visual structure, layout positioning, and element alignments from the screenshots to supplement the CSS computed style tokens when writing component specifications.

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
 * Retries the Gemini API request with exponential backoff on failure.
 */
async function callGeminiWithRetry(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  screenshots: string[] = [],
  retries = 3,
  delayMs = 1500
): Promise<string> {
  const model = 'gemini-2.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const parts: any[] = [{ text: userPrompt }];
  screenshots.forEach((base64Data) => {
    parts.push({
      inlineData: {
        mimeType: 'image/jpeg',
        data: base64Data,
      },
    });
  });

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts,
          },
        ],
        systemInstruction: {
          parts: [{ text: systemPrompt }],
        },
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 8192,
          thinkingConfig: {
            thinkingBudget: 0,
          },
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API returned error status ${response.status}: ${errorText}`);
    }

    const data = (await response.json()) as any;
    console.log("Raw Gemini Response Metadata:", {
      finishReason: data.candidates?.[0]?.finishReason,
      usageMetadata: data.usageMetadata,
      partsCount: data.candidates?.[0]?.content?.parts?.length,
    });
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error(`Invalid response format from Gemini API: ${JSON.stringify(data)}`);
    }

    return text;
  } catch (error) {
    if (retries > 0) {
      console.warn(`Gemini API request failed. Retrying in ${delayMs}ms. Retries left: ${retries}. Error:`, error);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      return callGeminiWithRetry(apiKey, systemPrompt, userPrompt, screenshots, retries - 1, delayMs * 2);
    }
    throw error;
  }
}

/**
 * Sends distilled design tokens and element samples to Claude or Gemini API to generate a design.md file.
 */
export async function generateDesignMarkdown(
  pageTitle: string,
  tokens: IDistilledDesignTokens,
  elementsSample: IExtractedElement[],
  screenshots?: string[]
): Promise<string> {
  if (!anthropic && !geminiApiKey) {
    throw new Error('Neither CLAUDE_API_KEY nor GEMINI_API_KEY is defined in environment variables.');
  }

  // Create a diverse, representative sample of up to 50 elements to gather varied styles across the page
  const uniqueClassMap = new Map<string, IExtractedElement>();
  const diverseSamples: IExtractedElement[] = [];

  // Always collect headings (H1-H6)
  const headings = elementsSample.filter(el => ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(el.tagName));
  diverseSamples.push(...headings.slice(0, 15)); // Take up to 15 headings

  // Collect other elements, prioritizing unique class combinations to avoid duplicate navigation links
  elementsSample.forEach((el) => {
    if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(el.tagName)) return;
    
    // Key by tagName and sorted class names
    const sortedClasses = el.className ? String(el.className).trim().split(/\s+/).sort().join('.') : '';
    const styleKey = `${el.tagName}:${sortedClasses}`;

    if (!uniqueClassMap.has(styleKey)) {
      uniqueClassMap.set(styleKey, el);
    }
  });

  const uniqueElements = Array.from(uniqueClassMap.values());
  const budget = 50 - diverseSamples.length;
  if (budget > 0) {
    // Uniformly sample from the unique elements array to span across the page structure
    for (let i = 0; i < budget && uniqueElements.length > 0; i++) {
      const index = Math.floor((i * uniqueElements.length) / budget);
      diverseSamples.push(uniqueElements[index]);
      uniqueElements.splice(index, 1);
    }
  }

  const finalSample = diverseSamples.length > 0 ? diverseSamples.slice(0, 50) : elementsSample.slice(0, 50);

  // Map to simplified schema
  const simplifiedElements = finalSample.map((el) => ({
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

  if (geminiApiKey) {
    console.log(`Sending design system formatting request to Gemini for: "${pageTitle}"...`);
    return await callGeminiWithRetry(geminiApiKey, SYSTEM_PROMPT, userContent, screenshots);
  }

  console.log(`Sending design system formatting request to Claude for: "${pageTitle}"...`);

  const response = await callClaudeWithRetry(anthropic!, {
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
