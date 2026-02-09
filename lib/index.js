#!/usr/bin/env node
import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { YouTubeCrawler } from './crawler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 导入基础skills（通过相对路径）
const SKILLS_DIR = path.join(__dirname, '../..');

/**
 * YouTube热门视频分析器
 */
export class YouTubeHotAnalyzer {
  constructor(apiKey, useCrawler = false) {
    this.useCrawler = useCrawler;

    if (useCrawler) {
      console.log('🕷️  使用爬虫模式（无API配额限制）');
      this.crawler = new YouTubeCrawler();
      this.quotaUsed = 0;
    } else {
      // 支持多个API Key（数组或逗号分隔的字符串）
      if (!apiKey) {
        throw new Error('需要YouTube API Key');
      }

      this.apiKeys = Array.isArray(apiKey)
        ? apiKey
        : apiKey.split(',').map(k => k.trim());

      this.currentKeyIndex = 0;
      this.keyQuotaUsed = new Array(this.apiKeys.length).fill(0);
      this.quotaUsed = 0;

      console.log(`🔑 使用API模式 (共 ${this.apiKeys.length} 个Key)`);
      this.initYouTubeClient();
    }

    this.channels = this.loadChannels();
    this.categories = this.loadCategories();
  }

  /**
   * 初始化YouTube客户端
   */
  initYouTubeClient() {
    this.youtube = google.youtube({
      version: 'v3',
      auth: this.apiKeys[this.currentKeyIndex]
    });
    console.log(`  → 当前使用 Key #${this.currentKeyIndex + 1}`);
  }

  /**
   * 切换到下一个API Key
   */
  switchToNextKey() {
    if (this.currentKeyIndex < this.apiKeys.length - 1) {
      this.currentKeyIndex++;
      this.initYouTubeClient();
      console.log(`⚠️  配额不足，切换到 Key #${this.currentKeyIndex + 1}`);
      return true;
    }
    console.error('❌ 所有API Key配额已用尽');
    return false;
  }

  /**
   * 记录配额使用
   */
  recordQuotaUsage(units) {
    this.keyQuotaUsed[this.currentKeyIndex] += units;
    this.quotaUsed += units;
  }

  /**
   * 加载频道配置
   */
  loadChannels() {
    const configPath = path.join(__dirname, '../config/channels.json');
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    }
    return {};
  }

  /**
   * 加载分类配置
   */
  loadCategories() {
    const configPath = path.join(__dirname, '../config/categories.json');
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    }
    return { order: [] };
  }

  /**
   * 主分析函数
   */
  async analyze(options = {}) {
    const {
      startDate,
      endDate = new Date(),
      generateReport = true,
      sendEmail = false,
      outputDir = '/Users/sniper/work/0自媒体/AiALiang/自媒体/自动获取热门博客/YoutubeResult',
      minViews = 0
    } = options;

    console.log('\n=== YouTube热门视频分析开始 ===');
    console.log(`时间范围: ${this.formatDate(startDate)} - ${this.formatDate(endDate)}`);

    try {
      // 1. 获取视频
      const videos = await this.fetchVideos(startDate, endDate);
      console.log(`✅ 获取到 ${videos.length} 个视频`);

      if (videos.length === 0) {
        return {
          success: false,
          message: '未找到符合条件的视频'
        };
      }

      // 2. 过滤最小观看数
      const filteredVideos = minViews > 0
        ? videos.filter(v => v.viewCount >= minViews)
        : videos;

      console.log(`✅ 过滤后剩余 ${filteredVideos.length} 个视频`);

      // 3. 计算热度评分
      const analyzedVideos = this.calculateHotScores(filteredVideos);
      console.log(`✅ 热度评分计算完成`);

      // 4. 翻译标题（调用content-translator skill）
      const translatedVideos = await this.translateTitles(analyzedVideos);
      console.log(`✅ 标题翻译完成`);

      // 5. 生成HTML报告（调用html-report-generator skill）
      let reportPath = null;
      if (generateReport) {
        reportPath = await this.generateHTMLReport(translatedVideos, {
          startDate,
          endDate,
          outputDir
        });
        console.log(`✅ HTML报告生成: ${reportPath}`);

        // 生成/更新历史报告索引页
        await this.generateIndexPage(outputDir);
      }

      // 6. 发送邮件（调用email-sender skill）
      let emailSent = false;
      if (sendEmail && reportPath) {
        emailSent = await this.sendEmailReport(reportPath, translatedVideos, options);
        console.log(`✅ 邮件发送${emailSent ? '成功' : '失败'}`);
      }

      // 7. 统计信息
      const stats = this.calculateStats(translatedVideos);

      console.log('\n=== 分析完成 ===');
      console.log(`总视频数: ${stats.totalVideos}`);
      console.log(`频道数: ${stats.channels}`);
      console.log(`分类数: ${stats.categories}`);

      // 显示API配额使用情况
      if (!this.useCrawler && this.apiKeys) {
        console.log(`\nAPI配额使用:`);
        console.log(`  总计: ${this.quotaUsed} 单位`);
        this.apiKeys.forEach((key, idx) => {
          const usage = this.keyQuotaUsed[idx];
          const keyPreview = key.substring(0, 10) + '...' + key.substring(key.length - 4);
          console.log(`  Key #${idx + 1} (${keyPreview}): ${usage} 单位`);
        });
      } else if (this.useCrawler) {
        console.log(`API配额: 0 (爬虫模式)`);
      } else {
        console.log(`API配额: ${this.quotaUsed}`);
      }

      return {
        success: true,
        stats,
        reportPath,
        emailSent,
        videos: translatedVideos
      };
    } catch (error) {
      console.error('❌ 分析失败:', error.message);
      throw error;
    }
  }

  /**
   * 获取视频（按日期范围）
   */
  async fetchVideos(startDate, endDate) {
    const allVideos = [];
    const start = new Date(startDate);
    const end = new Date(endDate);

    console.log(`\n开始从 ${Object.keys(this.channels).length} 个分类的频道获取视频...`);

    for (const [category, channelList] of Object.entries(this.channels)) {
      console.log(`\n[${category}] 处理中...`);

      for (const channel of channelList) {
        try {
          const videos = await this.fetchChannelVideos(channel, start, end, category);
          allVideos.push(...videos);
          await this.sleep(100); // 避免API速率限制
        } catch (error) {
          console.error(`  ❌ ${channel.name}: ${error.message}`);
        }
      }
    }

    return allVideos;
  }

  /**
   * 获取单个频道的视频
   */
  async fetchChannelVideos(channel, startDate, endDate, category, retryCount = 0) {
    // 使用爬虫模式
    if (this.useCrawler) {
      return await this.crawler.fetchChannelVideos(channel, startDate, endDate, category);
    }

    // 使用API模式
    try {
      // 搜索频道在指定时间范围内的视频
      const response = await this.youtube.search.list({
        part: 'snippet',
        channelId: channel.id,
        publishedAfter: startDate.toISOString(),
        publishedBefore: endDate.toISOString(),
        type: 'video',
        maxResults: 10,
        order: 'date'
      });

      this.recordQuotaUsage(100); // search操作消耗100配额

      if (!response.data.items || response.data.items.length === 0) {
        return [];
      }

      // 获取视频详细信息
      const videoIds = response.data.items.map(item => item.id.videoId);
      const videoStats = await this.getVideoStats(videoIds);

      // 添加频道信息
      const enrichedVideos = videoStats.map(video => ({
        ...video,
        channelCategory: category,
        channelSubscribers: channel.subscribers || ''
      }));

      console.log(`  ✅ ${channel.name}: ${enrichedVideos.length} 个视频`);
      return enrichedVideos;
    } catch (error) {
      // 检查是否是配额超限错误
      if (this.isQuotaError(error) && retryCount === 0) {
        if (this.switchToNextKey()) {
          // 用新的Key重试一次
          return await this.fetchChannelVideos(channel, startDate, endDate, category, retryCount + 1);
        }
      }
      console.error(`  ❌ ${channel.name}: ${error.message}`);
      return [];
    }
  }

  /**
   * 批量获取视频统计信息
   */
  async getVideoStats(videoIds, retryCount = 0) {
    if (videoIds.length === 0) return [];

    try {
      const response = await this.youtube.videos.list({
        part: 'snippet,statistics,contentDetails',
        id: videoIds.join(',')
      });

      this.recordQuotaUsage(1);

      if (!response.data.items) return [];

      return response.data.items.map(item => ({
        videoId: item.id,
        title: item.snippet.title,
        description: item.snippet.description || '',
        channelTitle: item.snippet.channelTitle,
        publishedAt: item.snippet.publishedAt,
        thumbnails: item.snippet.thumbnails,
        duration: item.contentDetails.duration,
        viewCount: parseInt(item.statistics.viewCount || 0),
        likeCount: parseInt(item.statistics.likeCount || 0),
        commentCount: parseInt(item.statistics.commentCount || 0),
        url: `https://www.youtube.com/watch?v=${item.id}`
      }));
    } catch (error) {
      // 检查是否是配额超限错误
      if (this.isQuotaError(error) && retryCount === 0) {
        if (this.switchToNextKey()) {
          return await this.getVideoStats(videoIds, retryCount + 1);
        }
      }
      console.error('获取视频统计失败:', error.message);
      return [];
    }
  }

  /**
   * 检查是否是配额超限错误
   */
  isQuotaError(error) {
    return error.code === 403 &&
           error.errors &&
           error.errors.some(e => e.reason === 'quotaExceeded' || e.reason === 'rateLimitExceeded');
  }

  /**
   * 计算热度评分
   */
  calculateHotScores(videos) {
    if (videos.length === 0) return [];

    const maxViews = Math.max(...videos.map(v => v.viewCount));
    const maxLikes = Math.max(...videos.map(v => v.likeCount));
    const now = Date.now();
    const maxAge = Math.max(...videos.map(v =>
      now - new Date(v.publishedAt).getTime()
    ));

    return videos.map(video => {
      const ageMs = now - new Date(video.publishedAt).getTime();
      const ageHours = ageMs / (60 * 60 * 1000);

      const viewScore = (video.viewCount / maxViews) * 40;
      const likeScore = (video.likeCount / maxLikes) * 30;
      const engagementScore = (video.likeCount / (video.viewCount || 1)) * 100 * 20;
      const freshnessScore = (1 - ageMs / maxAge) * 10;

      const hotScore = {
        viewScore: parseFloat(viewScore.toFixed(2)),
        likeScore: parseFloat(likeScore.toFixed(2)),
        engagementScore: parseFloat(engagementScore.toFixed(2)),
        freshnessScore: parseFloat(freshnessScore.toFixed(2)),
        total: parseFloat((viewScore + likeScore + engagementScore + freshnessScore).toFixed(1))
      };

      return {
        ...video,
        hotScore
      };
    }).sort((a, b) => b.hotScore.total - a.hotScore.total);
  }

  /**
   * 翻译标题（调用content-translator skill）
   */
  async translateTitles(videos) {
    console.log('\n调用 content-translator skill 翻译标题...');

    // 这里会调用Claude来翻译，实际使用时Claude会处理翻译
    // 现在先使用缓存方式
    const { loadCache, saveCache } = await import(
      path.join(SKILLS_DIR, 'content-translator/lib/translator.js')
    );

    const cache = loadCache('youtube-videos');
    const translations = cache.translations || {};

    const translatedVideos = videos.map(video => {
      const translated = translations[video.title] || video.title;
      return {
        ...video,
        titleZh: translated
      };
    });

    // 统计需要翻译的数量
    const needTranslation = videos.filter(v => !translations[v.title]);
    if (needTranslation.length > 0) {
      console.log(`  ℹ️  有 ${needTranslation.length} 个标题需要翻译（将使用Claude翻译）`);
      console.log(`  💡 翻译后请运行脚本更新缓存`);
    }

    return translatedVideos;
  }

  /**
   * 生成HTML报告（调用html-report-generator skill）
   */
  async generateHTMLReport(videos, options) {
    console.log('\n调用 html-report-generator skill 生成报告...');

    const { generateReport } = await import(
      path.join(SKILLS_DIR, 'html-report-generator/lib/generator.js')
    );

    const { startDate, endDate, outputDir } = options;

    // 创建日期文件夹（格式：YYYY-MM-DD）
    const dateFolder = this.formatDate(startDate);
    const dateFolderPath = path.join(outputDir, dateFolder);

    // 确保日期文件夹存在
    if (!fs.existsSync(dateFolderPath)) {
      fs.mkdirSync(dateFolderPath, { recursive: true });
    }

    const filename = `热门视频_${this.formatDate(startDate)}_${this.formatDate(endDate)}.html`;
    const outputPath = path.join(dateFolderPath, filename);

    // 生成报告
    const result = await generateReport({
      title: '📺 YouTube热门视频报告',
      subtitle: `${this.formatDate(startDate)} - ${this.formatDate(endDate)}`,
      data: videos,
      config: {
        sortFields: ['time', 'views', 'likes', 'hot'],
        filterField: 'channelCategory',
        cardTemplate: (video, idx) => this.generateVideoCard(video, idx),
        customStyles: this.getCustomStyles()
      },
      outputPath
    });

    return result.outputPath;
  }

  /**
   * 生成视频卡片HTML
   */
  generateVideoCard(video, idx) {
    const thumbnail = video.thumbnails?.high?.url || video.thumbnails?.medium?.url || '';
    const publishedAgo = this.getPublishedAgo(video.publishedAt);
    const duration = this.formatDuration(video.duration);

    return `
      <div class="card video-card"
           data-filter="${video.channelCategory || '未分类'}"
           data-time="${new Date(video.publishedAt).getTime()}"
           data-views="${video.viewCount}"
           data-likes="${video.likeCount}"
           data-hot="${video.hotScore?.total || 0}">
        <div class="rank-badge">#${idx + 1}</div>
        <div class="video-content">
          <div class="video-thumbnail">
            <a href="${video.url}" target="_blank">
              <img src="${thumbnail}" alt="${video.titleZh || video.title}">
            </a>
            <div class="duration-badge">${duration}</div>
          </div>
          <div class="video-info">
            <h3 class="video-title">
              <a href="${video.url}" target="_blank">${video.titleZh || video.title}</a>
            </h3>
            ${video.titleZh ? `<div class="original-title">原标题: ${video.title}</div>` : ''}
            <div class="channel-info">
              <span class="category">${video.channelCategory || '未分类'}</span>
              <span class="channel-name">${video.channelTitle}</span>
              ${video.channelSubscribers ? `<span class="subscribers">${video.channelSubscribers}</span>` : ''}
            </div>
            <div class="video-stats">
              <span>👁️ ${this.formatNumber(video.viewCount)}</span>
              <span>👍 ${this.formatNumber(video.likeCount)}</span>
              <span>💬 ${this.formatNumber(video.commentCount)}</span>
              <span>🕐 ${publishedAgo}</span>
            </div>
            <div class="score-info">
              <span class="score-badge">🔥 热度: ${video.hotScore?.total?.toFixed(1) || 0}分</span>
              <span class="like-rate">点赞率: ${((video.likeCount / video.viewCount) * 100).toFixed(2)}%</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * 自定义样式
   */
  getCustomStyles() {
    return `
      .video-card { position: relative; }
      .rank-badge {
        position: absolute;
        top: -10px;
        left: 20px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        width: 50px;
        height: 50px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
        font-weight: bold;
        box-shadow: 0 4px 10px rgba(0,0,0,0.2);
        z-index: 10;
      }
      .video-content { display: flex; gap: 25px; margin-top: 10px; }
      .video-thumbnail { flex-shrink: 0; position: relative; }
      .video-thumbnail img { width: 320px; height: 180px; border-radius: 12px; object-fit: cover; }
      .duration-badge {
        position: absolute;
        bottom: 10px;
        right: 10px;
        background: rgba(0,0,0,0.8);
        color: white;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
        font-weight: bold;
      }
      .video-info { flex: 1; }
      .video-title { font-size: 22px; margin-bottom: 8px; line-height: 1.4; }
      .video-title a { color: #1a202c; text-decoration: none; }
      .video-title a:hover { color: #667eea; }
      .original-title { font-size: 13px; color: #718096; margin-bottom: 12px; font-style: italic; }
      .channel-info { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; flex-wrap: wrap; }
      .category { background: #edf2f7; padding: 4px 12px; border-radius: 6px; font-size: 13px; color: #4a5568; font-weight: 500; }
      .channel-name { font-size: 15px; color: #2d3748; font-weight: 600; }
      .subscribers { font-size: 13px; color: #718096; }
      .video-stats { display: flex; gap: 20px; margin-bottom: 12px; flex-wrap: wrap; font-size: 14px; color: #4a5568; }
      .score-info { display: flex; gap: 15px; flex-wrap: wrap; }
      .score-badge { padding: 6px 14px; border-radius: 20px; font-size: 13px; font-weight: 600; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; }
      .like-rate { padding: 6px 14px; background: #ebf8ff; color: #2c7a7b; border-radius: 20px; font-size: 13px; font-weight: 600; }

      @media (max-width: 768px) {
        .video-content { flex-direction: column; }
        .video-thumbnail img { width: 100%; height: auto; }
      }
    `;
  }

  /**
   * 生成邮件专用HTML（优化排版，邮箱客户端兼容）
   */
  generateEmailHTML(videos, options) {
    const { startDate, endDate } = options;
    const dateRange = `${this.formatDate(startDate)} - ${this.formatDate(endDate)}`;

    // 前10个热门视频
    const topVideos = videos.slice(0, 10);

    const videoRows = topVideos.map((video, idx) => `
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 15px 10px; text-align: center; font-weight: bold; color: #667eea;">
          #${idx + 1}
        </td>
        <td style="padding: 15px 10px;">
          <a href="${video.url}" target="_blank" style="color: #1a202c; text-decoration: none; font-weight: 600; font-size: 16px;">
            ${video.titleZh || video.title}
          </a>
          <div style="color: #718096; font-size: 13px; margin-top: 5px; font-style: italic;">
            ${video.title}
          </div>
          <div style="margin-top: 8px;">
            <span style="background: #edf2f7; padding: 3px 10px; border-radius: 4px; font-size: 12px; color: #4a5568; margin-right: 10px;">
              ${video.channelCategory}
            </span>
            <span style="font-size: 13px; color: #2d3748;">
              ${video.channelTitle}
            </span>
          </div>
          <div style="margin-top: 8px; font-size: 13px; color: #4a5568;">
            👁️ ${this.formatNumber(video.viewCount)} ·
            👍 ${this.formatNumber(video.likeCount)} ·
            🔥 ${video.hotScore?.total?.toFixed(1)}分
          </div>
        </td>
      </tr>
    `).join('');

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'PingFang SC', 'Microsoft YaHei', sans-serif; background: #f7fafc;">
  <div style="max-width: 800px; margin: 0 auto; padding: 30px 20px;">

    <!-- 头部 -->
    <div style="text-align: center; margin-bottom: 30px;">
      <h1 style="margin: 0 0 10px 0; font-size: 28px; color: #1a202c;">
        📺 YouTube热门视频报告
      </h1>
      <p style="margin: 0; color: #718096; font-size: 16px;">
        ${dateRange}
      </p>
    </div>

    <!-- 统计卡片 -->
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 12px; padding: 25px; margin-bottom: 30px; text-align: center;">
      <div style="font-size: 36px; font-weight: bold; margin-bottom: 5px;">
        ${videos.length}
      </div>
      <div style="font-size: 16px; opacity: 0.9;">
        精选热门视频
      </div>
    </div>

    <!-- 视频列表 -->
    <div style="background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="background: #f7fafc;">
            <th style="padding: 15px 10px; text-align: center; font-size: 14px; color: #4a5568;">排名</th>
            <th style="padding: 15px 10px; text-align: left; font-size: 14px; color: #4a5568;">视频信息</th>
          </tr>
        </thead>
        <tbody>
          ${videoRows}
        </tbody>
      </table>
    </div>

    <!-- 查看完整报告 -->
    <div style="text-align: center; margin-top: 30px;">
      <p style="color: #718096; margin-bottom: 15px;">
        📄 查看完整报告（${videos.length}个视频）请打开附件
      </p>
      <a href="file:///Users/sniper/work/0自媒体/AiALiang/自媒体/自动获取热门博客/YoutubeResult/index.html"
         target="_blank"
         style="display: inline-block; background: #667eea; color: white; padding: 12px 30px; border-radius: 6px; text-decoration: none; font-weight: 600;">
        浏览历史报告
      </a>
    </div>

    <!-- 页脚 -->
    <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #718096; font-size: 14px;">
      <p style="margin: 0 0 10px 0;">
        🤖 由YouTube热门分析系统自动生成
      </p>
      <p style="margin: 0;">
        生成时间: ${new Date().toLocaleString('zh-CN')}
      </p>
    </div>

  </div>
</body>
</html>
    `;
  }

  /**
   * 发送邮件报告（调用email-sender skill）
   */
  async sendEmailReport(reportPath, videos, options) {
    try {
      console.log('\n调用 email-sender skill 发送邮件...');

      const { sendEmail } = await import(
        path.join(SKILLS_DIR, 'email-sender/lib/sender.js')
      );

      // 使用邮件专用HTML（不是完整报告）
      const emailHTML = this.generateEmailHTML(videos, options);

      await sendEmail({
        subject: `📺 YouTube热门视频报告 - ${new Date().toLocaleDateString('zh-CN')} (${videos.length}个视频)`,
        html: emailHTML,
        attachments: [
          { filename: path.basename(reportPath), path: reportPath }
        ]
      });

      return true;
    } catch (error) {
      console.error('邮件发送失败:', error.message);
      return false;
    }
  }

  /**
   * 生成历史报告索引页
   */
  async generateIndexPage(outputDir) {
    console.log('\n生成历史报告索引页...');

    // 扫描所有日期文件夹
    const dateFolders = fs.readdirSync(outputDir)
      .filter(name => {
        const fullPath = path.join(outputDir, name);
        return fs.statSync(fullPath).isDirectory() && /^\d{4}-\d{2}-\d{2}$/.test(name);
      })
      .sort((a, b) => b.localeCompare(a)); // 最新的在前

    // 为每个日期文件夹收集报告信息
    const reports = [];
    for (const dateFolder of dateFolders) {
      const folderPath = path.join(outputDir, dateFolder);
      const files = fs.readdirSync(folderPath).filter(f => f.endsWith('.html'));

      for (const file of files) {
        const filePath = path.join(folderPath, file);
        const stats = fs.statSync(filePath);

        reports.push({
          date: dateFolder,
          filename: file,
          path: `./${dateFolder}/${file}`,
          size: (stats.size / 1024).toFixed(2) + ' KB',
          modified: stats.mtime.toLocaleString('zh-CN')
        });
      }
    }

    // 生成索引页HTML
    const indexHTML = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>YouTube热门视频报告 - 历史记录</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 40px 20px;
    }
    .container { max-width: 1000px; margin: 0 auto; }
    .header {
      text-align: center;
      color: white;
      margin-bottom: 40px;
    }
    .header h1 {
      font-size: 42px;
      margin-bottom: 15px;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
    }
    .header p { font-size: 18px; opacity: 0.9; }

    .stats {
      background: white;
      border-radius: 16px;
      padding: 30px;
      margin-bottom: 30px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.2);
      text-align: center;
    }
    .stats h2 { color: #667eea; font-size: 48px; margin-bottom: 10px; }
    .stats p { color: #718096; font-size: 16px; }

    .reports-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 25px;
      margin-bottom: 40px;
    }

    .report-card {
      background: white;
      border-radius: 12px;
      padding: 25px;
      box-shadow: 0 4px 15px rgba(0,0,0,0.1);
      transition: all 0.3s ease;
      text-decoration: none;
      color: inherit;
      display: block;
    }
    .report-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 8px 25px rgba(0,0,0,0.15);
    }

    .report-date {
      font-size: 24px;
      font-weight: bold;
      color: #1a202c;
      margin-bottom: 10px;
    }
    .report-filename {
      font-size: 14px;
      color: #4a5568;
      margin-bottom: 15px;
      word-break: break-all;
    }
    .report-meta {
      display: flex;
      justify-content: space-between;
      font-size: 13px;
      color: #718096;
      padding-top: 15px;
      border-top: 1px solid #e2e8f0;
    }

    .footer {
      text-align: center;
      color: white;
      padding: 20px;
      opacity: 0.9;
    }

    @media (max-width: 768px) {
      .header h1 { font-size: 32px; }
      .reports-grid { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📺 YouTube热门视频报告</h1>
      <p>历史报告浏览</p>
    </div>

    <div class="stats">
      <h2>${reports.length}</h2>
      <p>历史报告总数</p>
    </div>

    <div class="reports-grid">
      ${reports.map(report => `
        <a href="${report.path}" class="report-card" target="_blank">
          <div class="report-date">📅 ${report.date}</div>
          <div class="report-filename">${report.filename}</div>
          <div class="report-meta">
            <span>📊 ${report.size}</span>
            <span>🕐 ${report.modified}</span>
          </div>
        </a>
      `).join('')}
    </div>

    <div class="footer">
      <p>🤖 YouTube热门分析系统 · 自动生成</p>
      <p>最后更新: ${new Date().toLocaleString('zh-CN')}</p>
    </div>
  </div>
</body>
</html>`;

    // 保存索引页
    const indexPath = path.join(outputDir, 'index.html');
    fs.writeFileSync(indexPath, indexHTML, 'utf-8');
    console.log(`✅ 索引页已生成: ${indexPath}`);

    return indexPath;
  }

  /**
   * 计算统计信息
   */
  calculateStats(videos) {
    const categories = {};
    videos.forEach(v => {
      const cat = v.channelCategory || '未分类';
      categories[cat] = (categories[cat] || 0) + 1;
    });

    const stats = {
      totalVideos: videos.length,
      channels: new Set(videos.map(v => v.channelTitle)).size,
      categories: Object.keys(categories).length,
      translated: videos.filter(v => v.titleZh).length,
      apiQuotaUsed: this.quotaUsed
    };

    // 添加详细的Key使用情况
    if (!this.useCrawler && this.apiKeys && this.apiKeys.length > 1) {
      stats.quotaDetails = this.apiKeys.map((key, idx) => ({
        keyIndex: idx + 1,
        keyPreview: key.substring(0, 10) + '...' + key.substring(key.length - 4),
        quotaUsed: this.keyQuotaUsed[idx]
      }));
    }

    return stats;
  }

  // 辅助函数
  formatDate(date) {
    const d = new Date(date);
    return d.toISOString().split('T')[0];
  }

  formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  }

  formatDuration(duration) {
    if (!duration) return '未知';
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return '未知';
    const hours = match[1] || '0';
    const minutes = match[2] || '0';
    const seconds = match[3] || '0';
    return hours !== '0'
      ? `${hours}:${minutes.padStart(2, '0')}:${seconds.padStart(2, '0')}`
      : `${minutes}:${seconds.padStart(2, '0')}`;
  }

  getPublishedAgo(publishedAt) {
    const ageMs = Date.now() - new Date(publishedAt).getTime();
    const ageHours = Math.floor(ageMs / (60 * 60 * 1000));
    return ageHours < 24 ? `${ageHours}小时前` : `${Math.floor(ageHours / 24)}天前`;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * 快捷函数
 */
export async function analyzeHotVideos(options) {
  const { useCrawler = false } = options;

  // 爬虫模式不需要API Key
  if (useCrawler) {
    console.log('🕷️  使用爬虫模式（RSS + yt-dlp）');
    const analyzer = new YouTubeHotAnalyzer(null, true);
    return await analyzer.analyze(options);
  }

  // API模式需要API Key（支持多个Key，用逗号分隔）
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    throw new Error('请设置环境变量 YOUTUBE_API_KEY（可以设置多个Key，用逗号分隔）');
  }

  // 支持多个API Key（逗号分隔）
  const analyzer = new YouTubeHotAnalyzer(apiKey, false);
  return await analyzer.analyze(options);
}
