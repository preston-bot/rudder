/**
 * Rudder AI Edge Function
 * Deployed to Supabase Edge Functions — holds the Anthropic API key server-side.
 *
 * Deploy: supabase functions deploy ai
 * Set secret: supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
 */

import Anthropic from 'npm:@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: Deno.env.get('ANTHROPIC_API_KEY')!,
});

const MODEL = 'claude-opus-4-6';

// ─── Prompts ──────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are Rudder's training engine — an expert open-water swim coach and exercise physiologist.
You speak plainly and directly. You never use fluff. You give swimmers real, defensible training plans.

Core principles:
- Phase ≠ time block. Phase = best next stimulus.
- No plan regeneration. Adjustments are small deltas to intensity, volume, or recovery.
- The user always sees why something changed.
- At 4 weeks out, confidence matters more than fitness.
- Normalize effort, not just distance — pools vary (20m, 25y, 25m).

Output valid JSON only. No markdown, no prose outside the JSON.`;

// ─── Handlers ─────────────────────────────────────────────────────────────────

async function generatePlan(payload: Record<string, unknown>) {
  const { race, focus_areas, has_benchmark } = payload;

  const prompt = `
Generate a complete training plan for this race:
${JSON.stringify(race, null, 2)}

Focus areas: ${JSON.stringify(focus_areas)}
Has existing benchmark: ${has_benchmark}

Return a TrainingPlan JSON object with:
- current_phase (base | build | specific | taper)
- phases: array of PhaseBlock objects, each with:
  - phase, start_date, end_date, description
  - weeks: array of WeekBlock, each with:
    - week_number, start_date
    - sessions: 3-4 PlannedSession per week, each with:
      - session_id (uuid), date, type (long|pace|intervals|skills|benchmark)
      - intent (short label e.g. "Aerobic depth")
      - intent_description (one sentence e.g. "Today is about swimming long without drifting.")
      - pool_length (25m), total_distance_meters, total_time_minutes
      - effort_band (easy|aerobic|threshold|speed)
      - intervals: array of PlannedInterval
      - completed: false, skipped: false, actual_session_id: null
- focus_areas, compliance_score: null, trend_flag: null
- last_adjustment_explanation: null

Make phases realistic given the days to race. Use today's date as plan start.
`;

  const msg = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 8192,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = msg.content[0].type === 'text' ? msg.content[0].text : '';
  return JSON.parse(text);
}

async function adjustPlan(payload: Record<string, unknown>) {
  const { plan, race, trigger } = payload;

  const prompt = `
Adjust this existing training plan based on the following trigger:
${JSON.stringify(trigger, null, 2)}

Race: ${JSON.stringify(race, null, 2)}
Current plan (abbreviated — phases structure):
${JSON.stringify({ current_phase: (plan as any).current_phase, phases_summary: (plan as any).phases?.map((p: any) => ({ phase: p.phase, start: p.start_date, end: p.end_date, session_count: p.weeks?.reduce((a: number, w: any) => a + (w.sessions?.length ?? 0), 0) })) }, null, 2)}

Rules:
- Make incremental adjustments only. Do NOT regenerate the full plan.
- Adjust individual sessions' volume, intensity, or recovery.
- Protect priority sessions when behind.
- Write a user_visible_explanation in plain English (1-2 sentences, no jargon).
- At 4 weeks out with "behind" status: protect confidence, protect health, arrive intact.

Return JSON:
{
  "updated_plan": { /* same structure as input plan with modifications */ },
  "user_visible_explanation": "...",
  "deltas": [
    {
      "session_id": "...",
      "field": "volume|intensity|recovery|date",
      "before": ...,
      "after": ...,
      "reason": "..."
    }
  ]
}
`;

  const msg = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 8192,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = msg.content[0].type === 'text' ? msg.content[0].text : '';
  return JSON.parse(text);
}

async function interpretSession(payload: Record<string, unknown>) {
  const { raw_session, pool_length_declared } = payload;

  const prompt = `
Interpret this raw swim session from a wearable device:
${JSON.stringify(raw_session, null, 2)}

Declared pool length: ${pool_length_declared ?? 'unknown'}

Tasks:
1. Normalize distance for the true pool length (25y ≠ 25m — many devices assume 25m).
2. Separate effort from rest using timestamps.
3. Flag "false rest" (swimmer standing at wall > 90s in a distance context).
4. Reconstruct intervals if raw data is ambiguous.
5. Normalize pace to per-100m.

Return JSON:
{
  "cleaned_session": { /* SwimSession with corrected values */ },
  "flags": ["false_rest_detected", "pool_length_corrected", ...],
  "summary": "one-line plain-English summary"
}
`;

  const msg = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = msg.content[0].type === 'text' ? msg.content[0].text : '';
  return JSON.parse(text);
}

async function revealCopy(payload: Record<string, unknown>) {
  const { race, days_to_race, current_phase, trend_flag } = payload;

  const prompt = `
Write a single motivational line for a swimmer's training dashboard.

Context:
- Race: ${(race as any).name}, ${days_to_race} days away
- Current phase: ${current_phase}
- Trend: ${trend_flag ?? 'on_track'}

Rules:
- 8–12 words max
- No fluff, no exclamation marks
- Honest, not cheerful
- Examples: "Train steady. Arrive sharp. Leave nothing behind." | "Consistency beats heroics. Every time."

Return JSON: { "motivational_line": "..." }
`;

  const msg = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 100,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = msg.content[0].type === 'text' ? msg.content[0].text : '';
  return JSON.parse(text);
}

// ─── Router ───────────────────────────────────────────────────────────────────

const HANDLERS: Record<string, (p: Record<string, unknown>) => Promise<unknown>> = {
  generate_plan: generatePlan,
  adjust_plan: adjustPlan,
  interpret_session: interpretSession,
  reveal_copy: revealCopy,
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    const body = await req.json() as Record<string, unknown>;
    const { action, ...payload } = body;

    if (typeof action !== 'string' || !HANDLERS[action]) {
      return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const result = await HANDLERS[action](payload);
    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  } catch (err: any) {
    console.error(err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
