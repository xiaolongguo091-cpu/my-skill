#!/usr/bin/env node
import { analyzeHotVideos } from './lib/index.js';

console.log('=== YouTube热门视频分析 - 生产环境运行 ===\n');

// 获取最近3天的热门视频
const endDate = new Date();
const startDate = new Date();
startDate.setDate(startDate.getDate() - 3);

console.log('运行参数:');
console.log(`  时间范围: ${startDate.toISOString()} - ${endDate.toISOString()}`);
console.log(`  API Key: ${process.env.YOUTUBE_API_KEY ? '已配置' : '❌ 未配置'}`);
console.log(`  邮件配置: ${process.env.EMAIL_USER ? '已配置' : '❌ 未配置'}`);
console.log('');

try {
  const result = await analyzeHotVideos({
    startDate,
    endDate,
    generateReport: true,
    sendEmail: true,  // 发送邮件
    outputDir: '/Users/sniper/work/0自媒体/AiALiang/自媒体/自动获取热门博客/YoutubeResult'
  });

  console.log('\n=== 运行完成 ===');
  console.log('✅ 报告路径:', result.reportPath);
  console.log(`✅ 邮件发送: ${result.emailSent ? '成功' : '失败'}`);
  console.log(`✅ 获取视频数: ${result.stats.totalVideos}`);
  console.log(`✅ API配额消耗: ${result.stats.apiQuotaUsed}`);
  console.log('\n📂 查看历史报告:');
  console.log('   file:///Users/sniper/work/0自媒体/AiALiang/自媒体/自动获取热门博客/YoutubeResult/index.html');

} catch (error) {
  console.error('\n❌ 运行失败:', error.message);
  console.error(error.stack);
  process.exit(1);
}
