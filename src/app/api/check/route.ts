import { NextRequest, NextResponse } from 'next/server';
import { GrammarMatch, ReplacementOption } from '@/types';
import { GoogleGenAI } from '@google/genai';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface LanguageToolRawReplacement {
  value: string;
  shortDescription?: string;
}

interface LanguageToolRawMatch {
  offset: number;
  length: number;
  message?: string;
  shortMessage?: string;
  replacements?: LanguageToolRawReplacement[];
  rule?: {
    id?: string;
    subId?: string;
    description?: string;
    issueType?: string;
    category?: {
      id?: string;
      name?: string;
    };
    urls?: { value: string }[];
  };
  sentence?: string;
  context?: {
    text: string;
    offset: number;
    length: number;
  };
}

// Supplementary deterministic collocation rules
interface SupplementaryRule {
  id: string;
  category: { id: string; name: string };
  pattern: RegExp;
  extract: (m: RegExpExecArray) => {
    offset: number;
    length: number;
    originalText: string;
    replacement: string;
    message: string;
    shortMessage: string;
  };
}

const SUPPLEMENTARY_RULES: SupplementaryRule[] = [
  {
    id: 'COLLOCATION_MAKE_SENSE',
    category: { id: 'COLLOCATIONS', name: 'Idiom & Collocation' },
    pattern: /\b(make|makes|making|made)\s+(sensed)\b/gi,
    extract: (m) => {
      const verb = m[1];
      const offset = m.index + verb.length + 1;
      return {
        offset,
        length: 6,
        originalText: 'sensed',
        replacement: 'sense',
        message:
          "In the idiom 'make sense', use the noun 'sense' instead of the verb/participle 'sensed'.",
        shortMessage: "Did you mean 'sense'?",
      };
    },
  },
  {
    id: 'COLLOCATION_TAKE_FOR_GRANTED',
    category: { id: 'COLLOCATIONS', name: 'Idiom & Collocation' },
    pattern: /\b(take|takes|taking|took|taken)\s+(for\s+granite)\b/gi,
    extract: (m) => {
      const verb = m[1];
      const offset = m.index + verb.length + 1;
      return {
        offset,
        length: 11,
        originalText: 'for granite',
        replacement: 'for granted',
        message: "The standard English idiom is 'take for granted'.",
        shortMessage: "Idiom: 'take for granted'",
      };
    },
  },
];

interface LLMCorrectionItem {
  original: string;
  fixed: string;
  category: string;
  explanation: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      text,
      language = 'en-US',
      customEndpoint,
      mode = 'fast',
      geminiApiKey,
      geminiModel,
    } = body;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json({ matches: [], count: 0, mode });
    }

    // ==========================================
    // MODE: DEEP (Google Gemini 3.5 Flash Lite with Strict Diff-Lock)
    // ==========================================
    if (mode === 'deep') {
      const apiKey = geminiApiKey?.trim() || process.env.GEMINI_API_KEY?.trim();

      if (!apiKey) {
        return NextResponse.json(
          {
            error:
              'GEMINI_API_KEY is not configured. Please add GEMINI_API_KEY in your .env.local file or in Engine Settings.',
          },
          { status: 400 }
        );
      }

      try {
        const ai = new GoogleGenAI({ apiKey });

        const systemInstruction = `Anda adalah pemeriksa tata bahasa akademik (grammar linter), BUKAN penulis ulang. Tugas Anda HANYA menemukan kesalahan grammar, konsistensi tenses antar klausa, subject-verb agreement, preposisi, artikel (a/an/the), dan tanda baca. DILARANG KERAS memparafrase kalimat, mengganti kosakata dengan sinonim (misal mengubah 'use' menjadi 'utilize'), atau merombak struktur kalimat asli penulis. Kembalikan output HANYA dalam JSON array: [{"original": "kata/frasa yang keliru", "fixed": "perbaikan minimal", "category": "Grammar / Tense Consistency / Subject-Verb Agreement", "explanation": "penjelasan aturan tata bahasa"}]. Jika tidak ada kesalahan, kembalikan [].`;

        const userPrompt = `Periksa tata bahasa dan konsistensi level kalimat pada naskah berikut (Dialek: ${language}):\n\n"""\n${text}\n"""`;

        const primaryModel =
          geminiModel?.trim() ||
          process.env.GEMINI_MODEL?.trim() ||
          'gemini-3.5-flash-lite';

        let response;
        try {
          response = await ai.models.generateContent({
            model: primaryModel,
            contents: userPrompt,
            config: {
              systemInstruction,
              responseMimeType: 'application/json',
            },
          });
        } catch (callErr: unknown) {
          const errStr = String((callErr as Error)?.message || '');
          if (
            errStr.includes('404') ||
            errStr.includes('NOT_FOUND') ||
            errStr.includes('no longer available') ||
            errStr.includes('not found')
          ) {
            // Check if error recommendation mentions a specific model, e.g. gemini-3.8-flash
            const matchRec = errStr.match(/models\/(gemini-[a-zA-Z0-9.-]+)/);
            const fallbackModel = matchRec ? matchRec[1] : 'gemini-3.8-flash';
            response = await ai.models.generateContent({
              model: fallbackModel,
              contents: userPrompt,
              config: {
                systemInstruction,
                responseMimeType: 'application/json',
              },
            });
          } else {
            throw callErr;
          }
        }

        const rawJson = response.text?.trim() || '[]';
        let parsedItems: LLMCorrectionItem[] = [];

        try {
          parsedItems = JSON.parse(rawJson);
          if (!Array.isArray(parsedItems)) {
            parsedItems = [];
          }
        } catch {
          parsedItems = [];
        }

        // ==========================================
        // STRICT DIFF-LOCK ANTI-PARAPHRASE FILTER
        // ==========================================
        const deepMatches: GrammarMatch[] = [];
        let searchCursor = 0;

        for (let idx = 0; idx < parsedItems.length; idx++) {
          const item = parsedItems[idx];
          if (!item.original || !item.fixed) continue;

          const origStr = item.original.trim();
          const fixedStr = item.fixed.trim();

          // Rule 1: Word difference check (diff > 2 words rejected)
          const origWords = origStr.split(/\s+/).filter(Boolean).length;
          const fixedWords = fixedStr.split(/\s+/).filter(Boolean).length;
          if (Math.abs(origWords - fixedWords) > 2) {
            // Discard suggestion to prevent rewriting/paraphrasing
            continue;
          }

          // Rule 2: Exact occurrence check in source text
          let offset = text.indexOf(origStr, searchCursor);
          if (offset === -1) {
            offset = text.indexOf(origStr);
          }
          if (offset === -1) {
            // Original string does not exist in user text, discard
            continue;
          }

          searchCursor = offset + origStr.length;

          // Rule 3: Format identical to LanguageTool output
          deepMatches.push({
            id: `deep_${idx}_${offset}_${origStr.length}`,
            offset,
            length: origStr.length,
            originalText: origStr,
            message:
              item.explanation ||
              'Grammatical consistency correction recommended.',
            shortMessage: item.category || 'Deep Check',
            replacements: [{ value: fixedStr }],
            rule: {
              id: `DEEP_${(item.category || 'GRAMMAR').replace(/\s+/g, '_').toUpperCase()}`,
              description: item.explanation || 'Sentence consistency rule',
              issueType: 'grammar',
              category: {
                id: 'DEEP_SENTENCE_CHECK',
                name: item.category || 'Sentence Consistency',
              },
            },
          });
        }

        // Sort by character offset
        deepMatches.sort((a, b) => a.offset - b.offset);

        return NextResponse.json({
          matches: deepMatches,
          count: deepMatches.length,
          mode: 'deep',
          model: primaryModel,
        });
      } catch (geminiErr: unknown) {
        console.error('Gemini Deep Check Error:', geminiErr);
        return NextResponse.json(
          {
            error: `Failed to execute Deep Sentence Check via Gemini: ${(geminiErr as Error)?.message}`,
            details: (geminiErr as Error)?.message,
          },
          { status: 502 }
        );
      }
    }

    // ==========================================
    // MODE: FAST (Default LanguageTool Engine)
    // ==========================================
    const targetUrl =
      customEndpoint?.trim() || 'https://api.languagetool.org/v2/check';

    const params = new URLSearchParams();
    params.append('text', text);
    params.append('language', language);
    params.append('enabledOnly', 'false');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

    let response: Response;
    try {
      response = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
          'User-Agent': 'AcademicProofreader/1.0',
        },
        body: params.toString(),
        signal: controller.signal,
      });
    } catch (networkErr: unknown) {
      clearTimeout(timeoutId);
      const isAbort = (networkErr as Error)?.name === 'AbortError';
      const msg = isAbort
        ? 'Request timed out (15s).'
        : `Unable to connect to LanguageTool server at ${targetUrl}. Please ensure network or local Docker container is running.`;

      return NextResponse.json(
        {
          error: msg,
          endpoint: targetUrl,
          details: (networkErr as Error)?.message,
        },
        { status: 502 }
      );
    }

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errText = await response.text();
      return NextResponse.json(
        {
          error: `LanguageTool server returned HTTP ${response.status}`,
          details: errText,
          endpoint: targetUrl,
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    const rawMatches: LanguageToolRawMatch[] = data.matches || [];

    const mappedMatches: GrammarMatch[] = rawMatches.map(
      (m: LanguageToolRawMatch, idx: number) => {
        const originalText = text.substring(m.offset, m.offset + m.length);
        const uniqueId = `match_${idx}_${m.offset}_${m.length}_${m.rule?.id || 'rule'}`;

        const replacements: ReplacementOption[] = (
          m.replacements || []
        )
          .slice(0, 5)
          .map((r: LanguageToolRawReplacement) => ({
            value: r.value,
            shortDescription: r.shortDescription || undefined,
          }));

        return {
          id: uniqueId,
          offset: m.offset,
          length: m.length,
          originalText,
          message: m.message || 'Grammar or spelling issue detected.',
          shortMessage: m.shortMessage || '',
          replacements,
          rule: {
            id: m.rule?.id || 'UNKNOWN_RULE',
            subId: m.rule?.subId,
            description: m.rule?.description || 'Academic grammar rule',
            issueType: m.rule?.issueType || 'grammar',
            category: {
              id: m.rule?.category?.id || 'GRAMMAR',
              name: m.rule?.category?.name || 'Grammar',
            },
            urls: m.rule?.urls || [],
          },
          sentence: m.sentence,
          context: m.context,
        };
      }
    );

    // Apply supplementary deterministic collocation rules
    for (const rule of SUPPLEMENTARY_RULES) {
      const regex = new RegExp(rule.pattern.source, rule.pattern.flags);
      let match: RegExpExecArray | null;
      while ((match = regex.exec(text)) !== null) {
        const extracted = rule.extract(match);
        const alreadyFlagged = mappedMatches.some(
          (m) =>
            Math.max(m.offset, extracted.offset) <
            Math.min(m.offset + m.length, extracted.offset + extracted.length)
        );

        if (!alreadyFlagged) {
          mappedMatches.push({
            id: `supp_${rule.id}_${extracted.offset}_${extracted.length}`,
            offset: extracted.offset,
            length: extracted.length,
            originalText: extracted.originalText,
            message: extracted.message,
            shortMessage: extracted.shortMessage,
            replacements: [{ value: extracted.replacement }],
            rule: {
              id: rule.id,
              description: extracted.message,
              issueType: 'grammar',
              category: rule.category,
            },
          });
        }
      }
    }

    mappedMatches.sort((a, b) => a.offset - b.offset);

    return NextResponse.json({
      matches: mappedMatches,
      count: mappedMatches.length,
      mode: 'fast',
      software: data.software,
    });
  } catch (err: unknown) {
    console.error('API Check Error:', err);
    return NextResponse.json(
      {
        error: 'An internal error occurred while processing grammar check.',
        details: (err as Error)?.message,
      },
      { status: 500 }
    );
  }
}
