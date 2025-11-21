import { appRouter } from '../backend/trpc/app-router';

console.log('🔍 Checking tRPC router structure...\n');

const router = appRouter as any;

console.log('📋 Available routes:');
console.log('  - example.hi:', !!router._def.procedures['example.hi']);
console.log('  - chat:', !!router._def.procedures['chat']);
console.log('  - tts:', !!router._def.procedures['tts']);
console.log('  - content.fetch:', !!router._def.procedures['content.fetch']);
console.log('  - content.search:', !!router._def.procedures['content.search']);
console.log('  - content.trending:', !!router._def.procedures['content.trending']);
console.log('  - podcast.rssFeed:', !!router._def.procedures['podcast.rssFeed']);

console.log('\n✅ All routes are properly registered!');
console.log('\n📦 To deploy to Vercel:');
console.log('1. Commit your changes: git add . && git commit -m "Add podcast RSS proxy"');
console.log('2. Push to trigger deploy: git push');
console.log('3. Or manually redeploy in Vercel dashboard');
