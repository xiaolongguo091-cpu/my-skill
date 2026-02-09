#!/usr/bin/env node
import { analyzeHotVideos } from './lib/index.js';

console.log('=== YouTube爬虫模式测试 ===\n');

// 测试日期: 2026-01-01 到 2026-01-05
const startDate = new Date('2026-01-01');
const endDate = new Date('2026-01-05');

console.log('测试参数:');
console.log(`  时间范围: ${startDate.toISOString()} - ${endDate.toISOString()}`);
console.log(`  使用爬虫: 是 (RSS + yt-dlp)`);
console.log(`  输出目录: /Users/sniper/work/0自媒体/AiALiang/自媒体/自动获取热门博客/YoutubeResult`);
console.log('');

try {
  const result = await analyzeHotVideos({
    startDate,
    endDate,
    useCrawler: true,  // 使用爬虫模式
    generateReport: true,
    sendEmail: false,  // 不发送邮件
    outputDir: '/Users/sniper/work/0自媒体/AiALiang/自媒体/自动获取热门博客/YoutubeResult'
  });

  console.log('\n=== 测试完成 ===');
  console.log('✅ 报告路径:', result.reportPath);
  console.log(`✅ 获取视频数: ${result.stats.totalVideos}`);
  console.log(`✅ API配额消耗: ${result.stats.apiQuotaUsed} (爬虫模式应为0)`);
  console.log('\n📂 查看报告:');
  console.log('   file:///Users/sniper/work/0自媒体/AiALiang/自媒体/自动获取热门博客/YoutubeResult/index.html');

} catch (error) {
  console.error('\n❌ 测试失败:', error.message);
  console.error(error.stack);
  process.exit(1);
}
