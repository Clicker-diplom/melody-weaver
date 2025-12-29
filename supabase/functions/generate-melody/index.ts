import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { mood, genre, key, tempo, bars } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are a music composition AI that generates melodies as JSON data.
Generate musical notes for a piano roll editor.

Return ONLY valid JSON with this exact structure:
{
  "tracks": [
    {
      "name": "Track Name",
      "synth": "lead|bass|pad|pluck|keys|strings|brass|bells|organ|marimba|choir|synth",
      "color": "hsl(hue, 100%, 50%)",
      "notes": [
        { "pitch": 0-11, "octave": 2-5, "start": 0-31, "duration": 1-8 }
      ]
    }
  ]
}

Notes:
- pitch: 0=C, 1=C#, 2=D, 3=D#, 4=E, 5=F, 6=F#, 7=G, 8=G#, 9=A, 10=A#, 11=B
- octave: 2-5 (lower for bass, higher for melody)
- start: beat position 0-31 (32 beats total = 8 bars)
- duration: how many beats the note lasts

Create musically coherent melodies that follow music theory principles.`;

    const userPrompt = `Generate a ${bars || 8} bar melody with these parameters:
- Mood: ${mood || 'happy'}
- Genre: ${genre || 'electronic'}
- Key: ${key || 'C major'}
- Tempo feel: ${tempo || 120} BPM

Create 2-3 complementary tracks (melody + bass at minimum).
Make it sound professional and musical.`;

    console.log("Generating melody with params:", { mood, genre, key, tempo, bars });

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.8,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required, please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error("No content in AI response");
    }

    console.log("AI response content:", content);

    // Extract JSON from response (handle markdown code blocks)
    let jsonStr = content;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    const melody = JSON.parse(jsonStr);
    
    return new Response(JSON.stringify(melody), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Error generating melody:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
