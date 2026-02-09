#!/usr/bin/env node
import { analyzeHotVideos } from './lib/index.js';

console.log('=== YouTube热门视频分析 - API模式 ===\n');

const startDate = new Date('2026-01-04T00:00:00');
const endDate = new Date('2026-01-06T23:59:59');

console.log('运行参数:');
console.log(`  时间范围: ${startDate.toISOString()} - ${endDate.toISOString()}`);
console.log(`  使用模式: API模式`);
console.log(`  API Key: ${process.env.YOUTUBE_API_KEY ? '已配置 (' + process.env.YOUTUBE_API_KEY.substring(0, 15) + '...)' : '❌ 未配置'}`);
console.log('');

try {
  const result = await analyzeHotVideos({
    startDate,
    endDate,
    generateReport: true,
    sendEmail: false,
    useCrawler: false,  // 使用API模式
    outputDir: '/Users/sniper/work/0自媒体/AiALiang/自媒体/自动获取热门博客/YoutubeResult'
  });

  console.log('\n=== 运行完成 ===');
  console.log('✅ 报告路径:', result.reportPath);
  console.log(`✅ 获取视频数: ${result.stats.totalVideos}`);
  console.log(`✅ 频道数: ${result.stats.channels}`);
  console.log(`✅ 分类数: ${result.stats.categories}`);
  console.log(`✅ 翻译数: ${result.stats.translated}`);
  console.log(`✅ API配额使用: ${result.stats.apiQuotaUsed}`);
  console.log('\n📂 查看历史报告:');
  console.log('   file:///Users/sniper/work/0自媒体/AiALiang/自媒体/自动获取热门博客/YoutubeResult/index.html');
} catch (error) {
  console.error('\n❌ 运行失败:', error.message);
  console.error(error.stack);
  process.exit(1);
}
