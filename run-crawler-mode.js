#!/usr/bin/env node
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 加载 .env 文件
dotenv.config({ path: join(__dirname, '.env') });

console.log('=== YouTube热门视频分析 - 爬虫模式 ===\n');

// 动态导入 analyzeHotVideos
const { analyzeHotVideos } = await import('./lib/index.js');

// 从命令行参数获取日期
const args = process.argv.slice(2);
let startDate, endDate;

if (args.length >= 2) {
  // 使用命令行参数：node run-crawler-mode.js 2026-01-07 2026-01-09
  startDate = new Date(args[0]);
  endDate = new Date(args[1]);
  endDate.setHours(23, 59, 59, 999);
} else {
  console.error('❌ 请提供开始和结束日期参数');
  console.error('用法: node run-crawler-mode.js 2026-01-07 2026-01-09');
  process.exit(1);
}

console.log('运行参数:');
console.log(`  时间范围: ${startDate.toISOString()} - ${endDate.toISOString()}`);
console.log(`  使用模式: 爬虫模式 (RSS + yt-dlp)`);
console.log(`  生成报告: 是`);
console.log(`  发送邮件: 否`);
console.log('');

try {
  const result = await analyzeHotVideos({
    startDate,
    endDate,
    generateReport: true,
    sendEmail: false,
    useCrawler: true,  // 使用爬虫模式
    outputDir: '/Users/sniper/work/0自媒体/AiALiang/自媒体/自动获取热门博客/YoutubeResult'
  });

  console.log('\n=== 运行完成 ===');
  console.log('✅ 报告路径:', result.reportPath);
  console.log(`✅ 获取视频数: ${result.stats.totalVideos}`);
  console.log(`✅ 频道数: ${result.stats.channels}`);
  console.log(`✅ 分类数: ${result.stats.categories}`);
  console.log(`✅ 翻译数: ${result.stats.translated}`);
  console.log('\n📂 查看历史报告:');
  console.log('   file:///Users/sniper/work/0自媒体/AiALiang/自媒体/自动获取热门博客/YoutubeResult/index.html');

  process.exit(0);
} catch (error) {
  console.error('\n❌ 运行失败:', error.message);
  console.error(error.stack);
  process.exit(1);
}
