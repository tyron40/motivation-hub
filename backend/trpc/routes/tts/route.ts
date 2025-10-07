import { publicProcedure } from "../../create-context";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { getOpenAIKey } from "../../../lib/supabase";

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

      const apiKey = await getOpenAIKey();
      if (!apiKey) {
        console.error("❌ OPENAI_API_KEY not found in Supabase or environment");
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "OpenAI API key not configured",
        });
      }

      console.log("📤 Calling OpenAI TTS API...");
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
        
        let errorMessage = `OpenAI TTS API error: ${response.status}`;
        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson.error?.message) {
            errorMessage = errorJson.error.message;
          }
        } catch {
          errorMessage = errorText.substring(0, 200);
        }
        
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: errorMessage,
        });
      }

      console.log("✅ TTS response received, content-type:", response.headers.get("content-type"));
      
      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("audio") && !contentType.includes("octet-stream")) {
        const responseText = await response.text();
        console.error("❌ Unexpected response type:", contentType);
        console.error("❌ Response body:", responseText.substring(0, 500));
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Unexpected response from OpenAI TTS API",
        });
      }
      
      console.log("✅ Converting audio to base64...");
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const base64Data = buffer.toString("base64");

      console.log("✅ TTS audio generated, base64 length:", base64Data.length);
      
      const result = {
        audio: {
          base64Data: base64Data,
          mimeType: "audio/mpeg",
        },
      };
      
      console.log("✅ Returning TTS result");
      return result;
    } catch (error) {
      console.error("❌ Error in TTS route:", error);
      if (error instanceof TRPCError) {
        throw error;
      }
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });
