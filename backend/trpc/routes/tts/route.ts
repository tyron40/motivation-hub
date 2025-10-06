import { publicProcedure } from "../../create-context";
import { z } from "zod";

export const ttsRoute = publicProcedure
  .input(
    z.object({
      text: z.string(),
      voice: z.enum(["alloy", "echo", "fable", "onyx", "nova", "shimmer"]).optional(),
    })
  )
  .mutation(async ({ input }) => {
    try {
      console.log("🎤 Generating TTS for text:", input.text.substring(0, 50) + "...");
      console.log("🔊 Voice:", input.voice || "alloy");

      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        console.error("❌ OPENAI_API_KEY not found in environment variables");
        throw new Error("OpenAI API key not configured");
      }

      const response = await fetch("https://api.openai.com/v1/audio/speech", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "tts-1",
          input: input.text,
          voice: input.voice || "alloy",
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ OpenAI TTS API error:", response.status, errorText);
        throw new Error(`OpenAI TTS API error: ${response.status}`);
      }

      console.log("✅ TTS response received, converting to base64...");
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const base64Data = buffer.toString("base64");

      console.log("✅ TTS audio generated successfully");
      return {
        audio: {
          base64Data,
          mimeType: "audio/mpeg",
        },
      };
    } catch (error) {
      console.error("❌ Error in TTS route:", error);
      throw error;
    }
  });
