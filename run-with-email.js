#!/usr/bin/env node
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 加载 .env 文件
dotenv.config({ path: join(__dirname, '.env') });

console.log('=== YouTube热门视频分析 (带翻译和邮件) ===\n');

// 动态导入 analyzeHotVideos
const { analyzeHotVideos } = await import('./lib/index.js');

// 使用命令行参数或默认值
const args = process.argv.slice(2);
let startDate, endDate;

if (args.length >= 2) {
  startDate = new Date(args[0]);
  endDate = new Date(args[1]);
  endDate.setHours(23, 59, 59, 999);
} else {
  // 默认：最近3天
  endDate = new Date();
  startDate = new Date();
  startDate.setDate(startDate.getDate() - 3);
}

console.log('运行参数:');
console.log(`  时间范围: ${startDate.toISOString()} - ${endDate.toISOString()}`);
console.log(`  API Keys: ${process.env.YOUTUBE_API_KEY ? process.env.YOUTUBE_API_KEY.split(',').length + ' 个已配置' : '❌ 未配置'}`);
console.log(`  邮件配置: ${process.env.EMAIL_USER ? '已配置' : '未配置'}`);
console.log(`  发送邮件: 是 ✅`);
console.log('');

try {
  const result = await analyzeHotVideos({
    startDate,
    endDate,
    generateReport: true,
    sendEmail: true,  // 启用邮件发送
    useCrawler: false,  // 使用API模式
    outputDir: '/Users/sniper/work/0自媒体/AiALiang/自媒体/自动获取热门博客/YoutubeResult'
  });

  console.log('\n=== 运行完成 ===');
  console.log('✅ 报告路径:', result.reportPath);
  console.log(`✅ 获取视频数: ${result.stats.totalVideos}`);
  console.log(`✅ 频道数: ${result.stats.channels}`);
  console.log(`✅ 分类数: ${result.stats.categories}`);
  console.log(`✅ 翻译数: ${result.stats.translated}`);
  console.log(`✅ 邮件发送: ${result.emailSent ? '成功' : '失败'}`);

  if (result.stats.quotaDetails) {
    console.log('\nAPI配额使用详情:');
    result.stats.quotaDetails.forEach(detail => {
      console.log(`  Key #${detail.keyIndex} (${detail.keyPreview}): ${detail.quotaUsed} 单位`);
    });
    console.log(`  总计: ${result.stats.apiQuotaUsed} 单位`);
  } else {
    console.log(`✅ API配额使用: ${result.stats.apiQuotaUsed}`);
  }

  console.log('\n📂 查看历史报告:');
  console.log('   file:///Users/sniper/work/0自媒体/AiALiang/自媒体/自动获取热门博客/YoutubeResult/index.html');

  process.exit(0);
} catch (error) {
  console.error('\n❌ 运行失败:', error.message);
  console.error(error.stack);
  process.exit(1);
}
