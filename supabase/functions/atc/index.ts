// T4.6 — OpenAI API proxy Edge Function
// Receives scenario context, returns ATC instruction + expected readback

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import OpenAI from "npm:openai@4.78";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface ATCConversationEntry {
  role: "atc" | "pilot";
  text: string;
  timestamp: number;
}

// Matches the payload shape from atc-engine.ts in the browser
interface ATCRequestPayload {
  facility: string;
  sector: string;
  callsign: string;
  conversationHistory: ATCConversationEntry[];
  drillConstraints: string;
  currentState: {
    altitude: number;
    heading: number;
    frequency: number;
    phase: string;
  };
  traffic: string[];
  weather: string;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "OPENAI_API_KEY not configured" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  try {
    const body: ATCRequestPayload = await req.json();

    const systemPrompt = `You are an ATC controller at ${body.facility}, sector ${body.sector}.
You are communicating with aircraft ${body.callsign}.

Current aircraft state:
- Altitude: ${body.currentState.altitude} feet
- Heading: ${body.currentState.heading} degrees
- Frequency: ${body.currentState.frequency} MHz
- Flight phase: ${body.currentState.phase}

Scenario constraints:
- ${body.drillConstraints}
- Traffic: ${(body.traffic ?? []).join("; ") || "None reported"}
- Weather: ${body.weather || "Not specified"}

Rules:
1. Use standard FAA/ICAO phraseology
2. Be concise and professional
3. Include altitude, heading, or frequency changes as appropriate for the scenario
4. Return your response as JSON with exactly two fields:
   - "instruction": The ATC instruction as spoken
   - "expectedReadback": What the pilot should read back

Do NOT wrap the JSON in markdown code fences. Return raw JSON only.`;

    const conversationMessages = (body.conversationHistory ?? []).map(
      (entry) => ({
        role: entry.role === "atc" ? ("assistant" as const) : ("user" as const),
        content: entry.text,
      })
    );

    const client = new OpenAI({ apiKey });

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 512,
      messages: [
        { role: "system", content: systemPrompt },
        ...conversationMessages,
        {
          role: "user",
          content:
            "Generate the next ATC instruction for this scenario. Respond with JSON only.",
        },
      ],
    });

    const text = completion.choices[0]?.message?.content;
    if (!text) {
      throw new Error("No text response from OpenAI");
    }

    const parsed = JSON.parse(text);

    return new Response(
      JSON.stringify({
        instruction: parsed.instruction,
        expectedReadback: parsed.expectedReadback,
        requiredActions: parsed.requiredActions ?? [],
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
