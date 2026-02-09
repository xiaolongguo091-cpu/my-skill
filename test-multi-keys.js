#!/usr/bin/env node
import { analyzeHotVideos } from './lib/index.js';

console.log('=== YouTube多Key轮换测试 ===\n');

// 测试日期: 2026-01-01 到 2026-01-05
const startDate = new Date('2026-01-01');
const endDate = new Date('2026-01-05');

console.log('测试参数:');
console.log(`  时间范围: ${startDate.toISOString()} - ${endDate.toISOString()}`);
console.log(`  API Keys: 2个（支持自动轮换）`);
console.log(`  输出目录: /Users/sniper/work/0自媒体/AiALiang/自媒体/自动获取热门博客/YoutubeResult`);
console.log('');

try {
  const result = await analyzeHotVideos({
    startDate,
    endDate,
    useCrawler: false,  // 使用API模式
    generateReport: true,
    sendEmail: false,
    outputDir: '/Users/sniper/work/0自媒体/AiALiang/自媒体/自动获取热门博客/YoutubeResult'
  });

  console.log('\n=== 测试完成 ===');
  console.log('✅ 报告路径:', result.reportPath);
  console.log(`✅ 获取视频数: ${result.stats.totalVideos}`);
  console.log(`✅ API配额总消耗: ${result.stats.apiQuotaUsed}`);

  if (result.stats.quotaDetails) {
    console.log('\n📊 各Key配额使用详情:');
    result.stats.quotaDetails.forEach(detail => {
      console.log(`  Key #${detail.keyIndex} (${detail.keyPreview}): ${detail.quotaUsed} 单位`);
    });
  }

  console.log('\n📂 查看报告:');
  console.log('   file:///Users/sniper/work/0自媒体/AiALiang/自媒体/自动获取热门博客/YoutubeResult/index.html');

} catch (error) {
  console.error('\n❌ 测试失败:', error.message);
  console.error(error.stack);
  process.exit(1);
}
