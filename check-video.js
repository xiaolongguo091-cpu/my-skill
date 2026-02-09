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

// 检查特定视频
const videoId = 'RSNuB9pj9P8';

try {
  const response = await youtube.videos.list({
    part: 'snippet,statistics,contentDetails',
    id: videoId
  });

  if (response.data.items && response.data.items.length > 0) {
    const video = response.data.items[0];
    console.log('视频信息:');
    console.log('  标题:', video.snippet.title);
    console.log('  频道:', video.snippet.channelTitle);
    console.log('  频道ID:', video.snippet.channelId);
    console.log('  发布时间:', video.snippet.publishedAt);
    console.log('  观看数:', video.statistics.viewCount);
    console.log('  点赞数:', video.statistics.likeCount);
    console.log('  评论数:', video.statistics.commentCount);
    
    // 检查发布时间
    const publishedDate = new Date(video.snippet.publishedAt);
    const startDate = new Date('2026-01-05T00:00:00Z');
    const endDate = new Date('2026-01-07T23:59:59Z');
    
    console.log('\n时间范围检查:');
    console.log('  查询开始:', startDate.toISOString());
    console.log('  视频发布:', publishedDate.toISOString());
    console.log('  查询结束:', endDate.toISOString());
    console.log('  是否在范围内:', publishedDate >= startDate && publishedDate <= endDate);
  } else {
    console.log('未找到视频');
  }
} catch (error) {
  console.error('错误:', error.message);
}
