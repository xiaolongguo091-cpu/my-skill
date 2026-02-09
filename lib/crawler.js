#!/usr/bin/env node
import { exec } from 'child_process';
import { promisify } from 'util';
import fetch from 'node-fetch';
import { parseStringPromise } from 'xml2js';

const execAsync = promisify(exec);

/**
 * YouTube爬虫模块（无需API Key）
 * 使用 RSS Feed + yt-dlp 获取视频数据
 */
export class YouTubeCrawler {
  constructor() {
    this.quotaUsed = 0; // 爬虫模式不消耗API配额
  }

  /**
   * 通过RSS Feed获取频道最新视频
   */
  async fetchChannelVideosFromRSS(channelId, startDate, endDate) {
    try {
      const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
      const response = await fetch(rssUrl);
      const xml = await response.text();
      const result = await parseStringPromise(xml);

      if (!result.feed || !result.feed.entry) {
        return [];
      }

      const videos = result.feed.entry
        .map(entry => {
          const videoId = entry['yt:videoId'][0];
          const title = entry.title[0];
          const publishedAt = new Date(entry.published[0]);
          const channelTitle = entry.author[0].name[0];
          const description = entry['media:group'][0]['media:description'][0] || '';
          const thumbnail = entry['media:group'][0]['media:thumbnail'][0].$.url;

          return {
            videoId,
            title,
            publishedAt: publishedAt.toISOString(),
            channelTitle,
            description,
            thumbnails: {
              high: { url: thumbnail }
            },
            url: `https://www.youtube.com/watch?v=${videoId}`
          };
        })
        .filter(video => {
          const publishDate = new Date(video.publishedAt);
          return publishDate >= startDate && publishDate <= endDate;
        });

      return videos;
    } catch (error) {
      console.error(`RSS获取失败 (${channelId}):`, error.message);
      return [];
    }
  }

  /**
   * 使用 yt-dlp 获取视频详细信息
   */
  async getVideoDetailsWithYtDlp(videoId) {
    try {
      const command = `yt-dlp --dump-json --no-warnings "https://www.youtube.com/watch?v=${videoId}"`;
      const { stdout } = await execAsync(command, { timeout: 30000 });
      const data = JSON.parse(stdout);

      return {
        videoId,
        title: data.title,
        description: data.description || '',
        channelTitle: data.uploader || data.channel,
        publishedAt: data.upload_date ? this.formatYtDlpDate(data.upload_date) : new Date().toISOString(),
        thumbnails: {
          high: { url: data.thumbnail }
        },
        duration: this.formatDuration(data.duration),
        viewCount: parseInt(data.view_count || 0),
        likeCount: parseInt(data.like_count || 0),
        commentCount: parseInt(data.comment_count || 0),
        url: `https://www.youtube.com/watch?v=${videoId}`
      };
    } catch (error) {
      console.error(`yt-dlp获取失败 (${videoId}):`, error.message);
      return null;
    }
  }

  /**
   * 批量获取视频详细信息
   */
  async getVideosDetails(videoIds, maxConcurrent = 5) {
    const results = [];
    const chunks = this.chunkArray(videoIds, maxConcurrent);

    for (const chunk of chunks) {
      console.log(`  正在获取 ${chunk.length} 个视频的详细信息...`);
      const promises = chunk.map(id => this.getVideoDetailsWithYtDlp(id));
      const chunkResults = await Promise.all(promises);
      results.push(...chunkResults.filter(r => r !== null));

      // 避免请求过快
      await this.sleep(1000);
    }

    return results;
  }

  /**
   * 获取频道的视频（RSS + yt-dlp混合）
   */
  async fetchChannelVideos(channel, startDate, endDate, category) {
    try {
      console.log(`  📡 ${channel.name}: 通过RSS获取视频列表...`);

      // 1. 先用RSS获取视频列表（快速）
      const rssVideos = await this.fetchChannelVideosFromRSS(channel.id, startDate, endDate);

      if (rssVideos.length === 0) {
        console.log(`  ⚪ ${channel.name}: 无新视频`);
        return [];
      }

      console.log(`  🔍 ${channel.name}: 获取到 ${rssVideos.length} 个视频，正在获取详细数据...`);

      // 2. 用 yt-dlp 获取详细统计信息（观看数、点赞数等）
      const videoIds = rssVideos.map(v => v.videoId);
      const detailedVideos = await this.getVideosDetails(videoIds, 3);

      // 3. 添加频道分类信息
      const enrichedVideos = detailedVideos.map(video => ({
        ...video,
        channelCategory: category,
        channelSubscribers: channel.subscribers || ''
      }));

      console.log(`  ✅ ${channel.name}: ${enrichedVideos.length} 个视频`);
      return enrichedVideos;
    } catch (error) {
      console.error(`  ❌ ${channel.name}:`, error.message);
      return [];
    }
  }

  /**
   * 格式化 yt-dlp 的日期格式（YYYYMMDD -> ISO）
   */
  formatYtDlpDate(dateStr) {
    const year = dateStr.substring(0, 4);
    const month = dateStr.substring(4, 6);
    const day = dateStr.substring(6, 8);
    return new Date(`${year}-${month}-${day}`).toISOString();
  }

  /**
   * 格式化时长（秒 -> PT格式）
   */
  formatDuration(seconds) {
    if (!seconds) return 'PT0S';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    let duration = 'PT';
    if (hours > 0) duration += `${hours}H`;
    if (minutes > 0) duration += `${minutes}M`;
    if (secs > 0 || (hours === 0 && minutes === 0)) duration += `${secs}S`;

    return duration;
  }

  /**
   * 将数组分块
   */
  chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * 延时函数
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default YouTubeCrawler;
