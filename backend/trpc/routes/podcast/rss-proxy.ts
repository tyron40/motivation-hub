import { z } from "zod";
import { publicProcedure } from "../../create-context";

interface RSSItem {
  title: string;
  description: string;
  link: string;
  guid: string;
  pubDate: string;
  duration: string;
  image: string;
  author: string;
  enclosure: {
    url: string;
    type: string;
    length: string;
  } | null;
}

interface ParsedRSS {
  items: RSSItem[];
  image: { url: string };
}

function parseXML(xmlText: string): ParsedRSS {
  const getTextBetweenTags = (text: string, tag: string): string => {
    const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i');
    const match = text.match(regex);
    return match ? match[1].trim() : '';
  };

  const getCDATA = (text: string): string => {
    const cdataMatch = text.match(/<!\[CDATA\[([\s\S]*?)\]\]>/);
    return cdataMatch ? cdataMatch[1].trim() : text;
  };

  const getAttribute = (text: string, tag: string, attr: string): string => {
    const regex = new RegExp(`<${tag}[^>]*${attr}=["']([^"']*)["']`, 'i');
    const match = text.match(regex);
    return match ? match[1] : '';
  };

  const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi;
  const itemMatches = Array.from(xmlText.matchAll(itemRegex));

  const items: RSSItem[] = itemMatches.map(match => {
    const itemXml = match[1];
    
    const enclosureUrl = getAttribute(itemXml, 'enclosure', 'url');
    const enclosureType = getAttribute(itemXml, 'enclosure', 'type');
    const enclosureLength = getAttribute(itemXml, 'enclosure', 'length');

    return {
      title: getCDATA(getTextBetweenTags(itemXml, 'title')),
      description: getCDATA(getTextBetweenTags(itemXml, 'description')),
      link: getTextBetweenTags(itemXml, 'link'),
      guid: getTextBetweenTags(itemXml, 'guid'),
      pubDate: getTextBetweenTags(itemXml, 'pubDate'),
      duration: getTextBetweenTags(itemXml, 'itunes:duration') || getTextBetweenTags(itemXml, 'duration'),
      image: getAttribute(itemXml, 'itunes:image', 'href') || getTextBetweenTags(itemXml, 'image'),
      author: getTextBetweenTags(itemXml, 'itunes:author') || getTextBetweenTags(itemXml, 'author'),
      enclosure: enclosureUrl ? {
        url: enclosureUrl,
        type: enclosureType,
        length: enclosureLength,
      } : null,
    };
  });

  const channelImageUrl = getAttribute(xmlText, 'itunes:image', 'href') || 
                          getTextBetweenTags(xmlText, 'image');

  return {
    items,
    image: { url: channelImageUrl },
  };
}

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
      
      const parsed = parseXML(xmlText);
      
      console.log(`✅ Parsed ${parsed.items.length} items from RSS feed`);
      
      return {
        ...parsed,
        success: true,
      };
    } catch (error) {
      console.error(`❌ Error fetching RSS feed:`, error);
      throw new Error(`Failed to fetch RSS feed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });
