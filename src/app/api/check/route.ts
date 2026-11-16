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
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

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
