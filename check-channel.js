#!/usr/bin/env node
import dotenv from 'dotenv';
import { google } from 'googleapis';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

const youtube = google.youtube({
  version: 'v3',
  auth: process.env.YOUTUBE_API_KEY.split(',')[0]
});

// 检查配置文件中的频道ID
const configChannelId = 'UCcwIUJHYJlsj-lKHRFBRZvg';
const actualChannelId = 'UCvxm0qTrGN_1LMYgUaftWyQ';

console.log('=== 检查配置文件中的频道ID ===');
try {
  const response1 = await youtube.channels.list({
    part: 'snippet,statistics',
    id: configChannelId
  });

  if (response1.data.items && response1.data.items.length > 0) {
    const channel = response1.data.items[0];
    console.log('配置中的频道:');
    console.log('  频道名:', channel.snippet.title);
    console.log('  频道ID:', configChannelId);
    console.log('  订阅数:', channel.statistics.subscriberCount);
    console.log('  自定义URL:', channel.snippet.customUrl || 'N/A');
  } else {
    console.log('配置中的频道ID未找到');
  }
} catch (error) {
  console.error('错误:', error.message);
}

console.log('\n=== 检查实际视频所属频道ID ===');
try {
  const response2 = await youtube.channels.list({
    part: 'snippet,statistics',
    id: actualChannelId
  });

  if (response2.data.items && response2.data.items.length > 0) {
    const channel = response2.data.items[0];
    console.log('实际的频道:');
    console.log('  频道名:', channel.snippet.title);
    console.log('  频道ID:', actualChannelId);
    console.log('  订阅数:', channel.statistics.subscriberCount);
    console.log('  自定义URL:', channel.snippet.customUrl || 'N/A');
  }
} catch (error) {
  console.error('错误:', error.message);
}
