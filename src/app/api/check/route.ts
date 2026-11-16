import { NextRequest, NextResponse } from 'next/server';
import { GrammarMatch, ReplacementOption } from '@/types';

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

// Supplementary deterministic collocation rules to catch idioms that POS taggers miss
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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text, language = 'en-US', customEndpoint } = body;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json({ matches: [], count: 0 });
    }

    const targetUrl = customEndpoint?.trim() || 'https://api.languagetool.org/v2/check';

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

        const replacements: ReplacementOption[] = (m.replacements || []).slice(0, 5).map(
          (r: LanguageToolRawReplacement) => ({
            value: r.value,
            shortDescription: r.shortDescription || undefined,
          })
        );

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
        // Check if an existing match already covers this range
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

    // Sort all matches by character offset
    mappedMatches.sort((a, b) => a.offset - b.offset);

    return NextResponse.json({
      matches: mappedMatches,
      count: mappedMatches.length,
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
