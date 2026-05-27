import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BadRequestCustomException } from 'src/common/http/exceptions/bad-request.exception';
import {
  AiSuggestionsResponseDto,
  AnsweredQuestionDto,
  GenerateSuggestionsRequestDto,
} from './dto/generate-suggestions.dto';

type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(private readonly configService: ConfigService) {}

  async generateSuggestions(
    dto: GenerateSuggestionsRequestDto,
  ): Promise<AiSuggestionsResponseDto> {
    const apiKey = this.configService.get<string>('HF_API_KEY');
    if (!apiKey || apiKey.trim().length === 0) {
      throw new BadRequestCustomException('AI service not configured');
    }

    const baseUrl =
      this.configService.get<string>('HF_ROUTER_BASE_URL') ??
      'https://router.huggingface.co/v1';
    const model =
      this.configService.get<string>('HF_MODEL') ?? 'openai/gpt-oss-120b:groq';

    const messages = this.buildPrompt(dto);

    let raw: string;
    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: 0.4,
          max_tokens: 1600,
          response_format: { type: 'json_object' },
        }),
      });
      if (!response.ok) {
        const text = await response.text().catch(() => '');
        this.logger.warn(
          `HF call failed status=${response.status} body=${text.slice(0, 300)}`,
        );
        throw new BadRequestCustomException(
          'AI provider rejected the request. Please retry.',
        );
      }
      const json = (await response.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      raw = json.choices?.[0]?.message?.content?.trim() ?? '';
    } catch (error) {
      this.logger.error('AI call exception', error as Error);
      throw new BadRequestCustomException(
        'Could not reach the AI service. Try again.',
      );
    }

    return this.parseResponse(raw);
  }

  private buildPrompt(
    dto: GenerateSuggestionsRequestDto,
  ): ChatMessage[] {
    const compliant = dto.answers.filter((a) => a.compliant);
    const nonCompliant = dto.answers.filter((a) => !a.compliant);
    const byCategoryFailures = this.groupByCategory(nonCompliant);
    const byCategoryPassed = this.groupByCategory(compliant);

    const failureSummary = byCategoryFailures.length
      ? byCategoryFailures
          .map((g) => {
            const sample = g.items
              .slice(0, 4)
              .map((i) => `"${this.short(i.name)}"`)
              .join('; ');
            const more =
              g.items.length > 4 ? ` (+${g.items.length - 4} more)` : '';
            return `- ${g.category}: ${g.items.length} non-compliant — ${sample}${more}`;
          })
          .join('\n')
      : '- (none)';

    const passedSummary = byCategoryPassed.length
      ? byCategoryPassed
          .map((g) => `- ${g.category}: ${g.items.length} compliant`)
          .join('\n')
      : '- (none)';

    const systemPrompt = `You are a Kigali public-health inspector assistant. The HSO just finished a checklist (Food Safety Articles 21-26 or Water Quality). Each question was answered Yes (compliant) or No (non-compliant).

Stay grounded in the supplied non-compliant items. Do not invent issues. Tone: professional, neutral, action-oriented, short.

Return ONLY valid JSON, no markdown, no extra prose. Schema:
{
  "comments": string,             // 3-4 short bullet lines, ~70 words total, summarising what was seen per category, citing actual failures
  "recommendations": string,      // 2-3 numbered lines, ~60 words total, concrete remedial actions mapped to the failures
  "quickComments": string[],      // 3 snippets, each <=14 words
  "quickRecommendations": string[]// 3 snippets, each <=14 words
}

If all items are compliant: comments confirm full compliance; quickComments/quickRecommendations reinforce maintenance habits.`;

    const userPrompt = `Inspection: ${dto.inspectionTypeName ?? dto.inspectionTypeCode}
Facility: ${dto.facilityName ?? '(unspecified)'}
Visit: ${dto.visitType ?? '-'}  Decision: ${dto.decision ?? '-'}
Counts: ${compliant.length}/${dto.answers.length} compliant, ${nonCompliant.length} failed.

Non-compliant by category:
${failureSummary}

Compliant counts by category:
${passedSummary}

Respond with the JSON now.`;

    return [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];
  }

  private groupByCategory(answers: AnsweredQuestionDto[]) {
    const map = new Map<string, AnsweredQuestionDto[]>();
    for (const a of answers) {
      const key = a.category?.trim() || 'General';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(a);
    }
    return Array.from(map.entries()).map(([category, items]) => ({
      category,
      items,
    }));
  }

  private parseResponse(raw: string): AiSuggestionsResponseDto {
    const cleaned = this.stripJsonFences(raw);
    let parsed: Record<string, unknown> = {};
    try {
      parsed = JSON.parse(cleaned) as Record<string, unknown>;
    } catch {
      // Fall back to a single-blob comment when the model didn't return JSON.
      return {
        comments: cleaned.slice(0, 1000),
        recommendations: '',
        quickComments: [],
        quickRecommendations: [],
      };
    }
    const asStringArray = (value: unknown): string[] => {
      if (!Array.isArray(value)) return [];
      return value
        .map((item) => (typeof item === 'string' ? item.trim() : ''))
        .filter((item) => item.length > 0)
        .slice(0, 6);
    };
    return {
      comments: typeof parsed.comments === 'string' ? parsed.comments.trim() : '',
      recommendations:
        typeof parsed.recommendations === 'string'
          ? parsed.recommendations.trim()
          : '',
      quickComments: asStringArray(parsed.quickComments),
      quickRecommendations: asStringArray(parsed.quickRecommendations),
    };
  }

  private short(value: string): string {
    const trimmed = value.trim().replace(/\s+/g, ' ');
    return trimmed.length > 80 ? `${trimmed.slice(0, 77)}…` : trimmed;
  }

  private stripJsonFences(value: string): string {
    const trimmed = value.trim();
    if (trimmed.startsWith('```')) {
      return trimmed
        .replace(/^```(?:json)?/i, '')
        .replace(/```$/, '')
        .trim();
    }
    return trimmed;
  }
}
