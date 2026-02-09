#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 加载环境变量
dotenv.config({ path: path.join(__dirname, '.env') });

// 加载翻译缓存
const translationsPath = '/Users/sniper/.claude/skills/content-translator/cache/youtube-videos.json';
const translations = JSON.parse(fs.readFileSync(translationsPath, 'utf8')).translations;

// 读取 HTML 文件
const htmlPath = '/Users/sniper/work/0自媒体/AiALiang/自媒体/自动获取热门博客/YoutubeResult/2026-01-04/热门视频_2026-01-04_2026-01-06.html';
let html = fs.readFileSync(htmlPath, 'utf8');

console.log('🔄 正在更新 HTML 报告中的翻译...\n');

// 替换每个标题
let count = 0;
for (const [original, translated] of Object.entries(translations)) {
  // 替换视频标题链接
  const titleRegex = new RegExp(`(<a href="https://www\\.youtube\\.com/watch\\?v=[^"]*" target="_blank">)${original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(</a>)`, 'g');
  if (html.match(titleRegex)) {
    html = html.replace(titleRegex, `$1${translated}$2`);
    count++;
    console.log(`✅ ${original} -> ${translated}`);
  }
}

console.log(`\n✅ 共更新了 ${count} 个标题\n`);

// 保存更新后的 HTML
fs.writeFileSync(htmlPath, html, 'utf8');
console.log(`✅ HTML 报告已更新: ${htmlPath}\n`);

// 发送邮件
console.log('📧 正在发送邮件...\n');

const { sendEmail } = await import('/Users/sniper/.claude/skills/email-sender/lib/sender.js');

try {
  await sendEmail({
    to: process.env.EMAIL_TO,
    subject: `📺 YouTube热门视频报告 (2026-01-04 至 2026-01-06)`,
    html: html,
    attachments: []
  });

  console.log('✅ 邮件发送成功！');
  console.log(`   收件人: ${process.env.EMAIL_TO}\n`);
} catch (error) {
  console.error('❌ 邮件发送失败:', error.message);
  throw error;
}

console.log('=== 任务完成 ===');
