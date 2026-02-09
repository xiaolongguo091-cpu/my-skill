#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 加载最新的报告数据
const reportPath = '/Users/sniper/work/0自媒体/AiALiang/自媒体/自动获取热门博客/YoutubeResult/2026-01-05/热门视频_2026-01-05_2026-01-07.html';
const content = fs.readFileSync(reportPath, 'utf-8');

// 从HTML中提取JSON数据
const match = content.match(/const allData = (\[[\s\S]*?\]);/);
if (!match) {
  console.log('未找到数据');
  process.exit(1);
}

const videos = JSON.parse(match[1]);

// 加载翻译缓存
const cachePath = '/Users/sniper/.claude/skills/content-translator/cache/youtube-videos.json';
const cache = JSON.parse(fs.readFileSync(cachePath, 'utf-8'));
const translations = cache.translations || {};

// 找出未翻译的标题
const untranslated = videos
  .map(v => v.title)
  .filter((title, index, self) => self.indexOf(title) === index) // 去重
  .filter(title => !translations[title]);

console.log(`总视频数: ${videos.length}`);
console.log(`唯一标题数: ${videos.map(v => v.title).filter((title, index, self) => self.indexOf(title) === index).length}`);
console.log(`已翻译: ${Object.keys(translations).length}`);
console.log(`需要翻译: ${untranslated.length}\n`);

if (untranslated.length > 0) {
  console.log('需要翻译的标题:');
  untranslated.forEach((title, i) => {
    console.log(`${i + 1}. ${title}`);
  });

  // 输出为JSON供翻译使用
  console.log('\n--- JSON格式 ---');
  console.log(JSON.stringify(untranslated, null, 2));
}
