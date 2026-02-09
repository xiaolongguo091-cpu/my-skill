#!/usr/bin/env node
import dotenv from 'dotenv';
import { google } from 'googleapis';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

// 使用第4个API Key
const apiKeys = process.env.YOUTUBE_API_KEY.split(',');
const youtube = google.youtube({
  version: 'v3',
  auth: apiKeys[3] // Key #4
});

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const remaining = [
  "a16z",
  "This Week in Startups",
  "Greylock",
  "First Round Capital",
  "Lenny's Podcast",
  "Kleiner Perkins"
];

console.log('=== 搜索剩余6个频道 ===\n');

for (const name of remaining) {
  try {
    const response = await youtube.search.list({
      part: 'snippet',
      q: name,
      type: 'channel',
      maxResults: 3
    });

    await sleep(300);

    if (response.data.items && response.data.items.length > 0) {
      console.log(`"${name}":`);
      response.data.items.forEach((item, idx) => {
        console.log(`  ${idx + 1}. ${item.snippet.title}`);
        console.log(`     ID: ${item.snippet.channelId}`);
      });
      console.log('');
    }
  } catch (error) {
    console.error(`搜索 "${name}" 失败:`, error.message);
  }
}
