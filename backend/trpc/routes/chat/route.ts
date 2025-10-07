import { publicProcedure } from "../../create-context";
import { z } from "zod";
import { getOpenAIKey } from "../../../lib/supabase";

export const chatRoute = publicProcedure
  .input(
    z.object({
      messages: z.array(
        z.object({
          role: z.enum(["system", "user", "assistant"]),
          content: z.string(),
        })
      ),
    })
  )
  .mutation(async ({ input }) => {
    try {
      console.log("🤖 Calling OpenAI chat completion API");

      const apiKey = await getOpenAIKey();
      if (!apiKey) {
        console.error("❌ OPENAI_API_KEY not found in Supabase or environment");
        throw new Error("OpenAI API key not configured");
      }

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: input.messages,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ OpenAI API error:", response.status, errorText);
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const completion = data.choices?.[0]?.message?.content;

      if (!completion || typeof completion !== "string") {
        throw new Error("Invalid response format from OpenAI API");
      }

      console.log("✅ Chat completion received, length:", completion.length);
      return { message: completion };
    } catch (error) {
      console.error("❌ Error in chat route:", error);
      throw error;
    }
  });
