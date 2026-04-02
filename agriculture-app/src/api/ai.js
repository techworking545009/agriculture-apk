/**
 * AI Advisor API with automatic fallback across 2 API keys.
 * Uses OpenRouter API. If first key fails, second is tried automatically.
 */

const AI_API_KEYS = [
  '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',
  'sk-4bc7db73d76e475d95a5a9814f3f801e',
];

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

export async function getAIAdvice({ messages, model = 'google/gemini-2.5-pro', temperature = 0.7 }) {
  let lastError = null;

  for (let i = 0; i < AI_API_KEYS.length; i++) {
    const apiKey = AI_API_KEYS[i];
    try {
      const response = await fetch(OPENROUTER_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': window.location?.origin || 'http://localhost:5173',
          'X-Title': 'My Agriculture App',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages,
          temperature,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.choices?.[0]?.message?.content) {
          return data.choices[0].message.content;
        }
        throw new Error('Invalid response format from AI');
      }

      const errorText = await response.text();
      console.warn(`AI API key ${i + 1} failed (${response.status}):`, errorText);

      // On auth errors, try next key
      if (response.status === 401 || response.status === 403 || response.status === 429) {
        lastError = new Error(`AI key ${i + 1} failed: ${response.status} - ${errorText}`);
        continue;
      }

      // For other errors, throw immediately
      throw new Error(`AI API Error ${response.status}: ${errorText}`);
    } catch (err) {
      if (err.message.startsWith('AI key')) {
        lastError = err;
        continue;
      }
      // Network errors - try next key
      if (err.name === 'TypeError' || err.message.includes('fetch')) {
        console.warn(`AI API key ${i + 1} network error, trying next...`);
        lastError = err;
        continue;
      }
      throw err;
    }
  }

  throw lastError || new Error('All AI API keys failed. Please check your internet connection.');
}

export const AI_SYSTEM_PROMPT = `You are a local agriculture advisor who speaks simple Urdu like an experienced farmer. Your job is to explain crop diseases and solutions in a short and practical way.

STRICT RESPONSE FORMAT:
Line 1: Tell the disease in one short line
Line 2: Tell the reason in one short line
Line 3: Give practical advice about what the farmer should do
Line 4: Tell 4 to 5 medicine or spray names that can control the disease
Line 5: Tell approximate market price of the crop or one of the medicines

IMPORTANT RULES:
Use only simple Urdu
Total response must be 7 to 9 lines long
Each line must be short and clear
Do NOT use headings
Do NOT use bullet points
Do NOT use special characters like . , * : - ( ) [ ] "
Do NOT write long paragraphs
Do NOT mention AI or analysis
Speak like a farmer giving quick advice in the field
Tone: Friendly, simple, practical`;
