#!/usr/bin/env node
import { analyzeHotVideos } from './lib/index.js';
import fs from 'fs';

console.log('=== 测试 youtube-hot-analyzer skill ===\n');

// 设置测试参数：获取最近1天的视频（减少API配额消耗）
const endDate = new Date();
const startDate = new Date();
startDate.setDate(startDate.getDate() - 1); // 最近1天

console.log('测试参数:');
console.log(`  时间范围: ${startDate.toISOString()} - ${endDate.toISOString()}`);
console.log(`  API Key: ${process.env.YOUTUBE_API_KEY ? '已配置' : '未配置'}`);
console.log('');

try {
  const result = await analyzeHotVideos({
    startDate,
    endDate,
    generateReport: true,
    sendEmail: false, // 测试时不发送邮件
    outputDir: '/tmp/youtube-reports',
    minViews: 0
  });

  console.log('\n=== 测试结果 ===');
  console.log('✅ 分析成功完成');
  console.log(`✅ 获取视频数: ${result.stats.totalVideos}`);
  console.log(`✅ 频道数: ${result.stats.channels}`);
  console.log(`✅ 分类数: ${result.stats.categories}`);
  console.log(`✅ 翻译覆盖: ${result.stats.translated}/${result.stats.totalVideos}`);
  console.log(`✅ API配额消耗: ${result.stats.apiQuotaUsed}`);

  if (result.reportPath) {
    console.log(`✅ 报告路径: ${result.reportPath}`);

    // 验证报告文件
    if (fs.existsSync(result.reportPath)) {
      const fileSize = fs.statSync(result.reportPath).size;
      console.log(`✅ 报告文件大小: ${(fileSize / 1024).toFixed(2)} KB`);
    }
  }

  // 显示前5个视频示例
  if (result.videos && result.videos.length > 0) {
    console.log('\n前5个热门视频:');
    result.videos.slice(0, 5).forEach((v, idx) => {
      console.log(`  ${idx + 1}. [${v.channelCategory}] ${v.titleZh || v.title}`);
      console.log(`     观看: ${v.viewCount}, 热度: ${v.hotScore?.total?.toFixed(1)}`);
    });
  }

  console.log('\n=== youtube-hot-analyzer 测试完成 ===');

} catch (error) {
  console.error('\n❌ 测试失败:', error.message);
  console.error(error.stack);
  process.exit(1);
}
