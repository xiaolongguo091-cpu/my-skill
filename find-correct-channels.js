#!/usr/bin/env node
import dotenv from 'dotenv';
import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

// 使用第3个API Key（前两个已耗尽配额）
const apiKeys = process.env.YOUTUBE_API_KEY.split(',');
let currentKeyIndex = 2; // 从第3个key开始

function getYoutubeClient() {
  return google.youtube({
    version: 'v3',
    auth: apiKeys[currentKeyIndex]
  });
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function searchChannel(channelName) {
  const youtube = getYoutubeClient();

  try {
    const response = await youtube.search.list({
      part: 'snippet',
      q: channelName,
      type: 'channel',
      maxResults: 5
    });

    await sleep(300);

    if (response.data.items && response.data.items.length > 0) {
      console.log(`\n搜索: "${channelName}"`);
      response.data.items.forEach((item, idx) => {
        const channel = item.snippet;
        console.log(`  ${idx + 1}. ${channel.title}`);
        console.log(`     ID: ${channel.channelId}`);
        console.log(`     描述: ${channel.description.substring(0, 100)}...`);
      });

      return response.data.items[0].snippet.channelId;
    }
  } catch (error) {
    if (error.code === 403 && currentKeyIndex < apiKeys.length - 1) {
      console.log(`⚠️  Key #${currentKeyIndex + 1} 配额不足，切换到 Key #${currentKeyIndex + 2}`);
      currentKeyIndex++;
      return await searchChannel(channelName);
    }
    console.error(`  ❌ 搜索失败: ${error.message}`);
  }
  return null;
}

// 需要修复的频道
const invalidChannels = [
  { name: "跟李沐学AI", category: "AI个人博主" },
  { name: "Andrew Ng", category: "AI个人博主" },
  { name: "MIT HAN Lab", category: "AI个人博主" },
  { name: "Latent Space", category: "AI个人博主" },
  { name: "Eye on AI", category: "AI个人博主" },
  { name: "No Priors", category: "AI个人博主" },
  { name: "Google DeepMind", category: "AI产品官方" },
  { name: "Jay Shetty", category: "人生感悟/情绪" },
  { name: "Psych2Go", category: "人生感悟/情绪" },
  { name: "Mel Robbins", category: "人生感悟/情绪" },
  { name: "Chris Williamson", category: "人生感悟/情绪" },
  { name: "Sequoia Capital", category: "投资机构/创业" },
  { name: "a16z", category: "投资机构/创业" },
  { name: "This Week in Startups", category: "投资机构/创业" },
  { name: "Greylock", category: "投资机构/创业" },
  { name: "First Round Capital", category: "投资机构/创业" },
  { name: "Lenny's Podcast", category: "投资机构/创业" },
  { name: "Kleiner Perkins", category: "投资机构/创业" }
];

console.log('=== 开始搜索正确的频道ID ===');
console.log(`使用API Key #${currentKeyIndex + 1} (共 ${apiKeys.length} 个)\n`);

const fixes = [];

for (const channel of invalidChannels) {
  const correctId = await searchChannel(channel.name);
  if (correctId) {
    fixes.push({
      category: channel.category,
      name: channel.name,
      newId: correctId
    });
  }
}

console.log('\n\n=== 修复建议 ===');
fixes.forEach(fix => {
  console.log(`\n[${fix.category}] ${fix.name}`);
  console.log(`  新ID: ${fix.newId}`);
});

// 保存到文件
const fixesPath = path.join(__dirname, 'channel-fixes.json');
fs.writeFileSync(fixesPath, JSON.stringify(fixes, null, 2), 'utf-8');
console.log(`\n📄 修复建议已保存: ${fixesPath}`);
