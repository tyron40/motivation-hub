import { z } from "zod";
import { publicProcedure } from "../../create-context";

export const rssFeedProxyProcedure = publicProcedure
  .input(
    z.object({
      url: z.string().url(),
    })
  )
  .query(async ({ input }) => {
    try {
      console.log(`📡 Fetching RSS feed from backend: ${input.url}`);
      
      const response = await fetch(input.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; PodcastApp/1.0)',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const xmlText = await response.text();
      
      console.log(`✅ Successfully fetched RSS feed (${xmlText.length} bytes)`);
      
      return {
        xml: xmlText,
        success: true,
      };
    } catch (error) {
      console.error(`❌ Error fetching RSS feed:`, error);
      throw new Error(`Failed to fetch RSS feed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });
