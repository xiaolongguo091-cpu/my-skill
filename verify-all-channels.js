#!/usr/bin/env node
import dotenv from 'dotenv';
import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const youtube = google.youtube({
  version: 'v3',
  auth: process.env.YOUTUBE_API_KEY.split(',')[0]
});

// 加载频道配置
const configPath = path.join(__dirname, 'config/channels.json');
const channels = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

console.log('=== 开始验证所有频道ID ===\n');

const results = {
  valid: [],
  invalid: [],
  mismatch: [],
  total: 0
};

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

for (const [category, channelList] of Object.entries(channels)) {
  console.log(`\n[${category}] 验证中...`);

  for (const channel of channelList) {
    results.total++;

    try {
      const response = await youtube.channels.list({
        part: 'snippet,statistics',
        id: channel.id
      });

      await sleep(200); // 避免API速率限制

      if (!response.data.items || response.data.items.length === 0) {
        console.log(`  ❌ ${channel.name}: 频道ID无效 (${channel.id})`);
        results.invalid.push({
          category,
          configName: channel.name,
          channelId: channel.id,
          reason: '频道不存在'
        });
      } else {
        const actualChannel = response.data.items[0];
        const actualName = actualChannel.snippet.title;
        const actualSubs = parseInt(actualChannel.statistics.subscriberCount);

        // 检查名称是否匹配（允许一些差异）
        const nameMatch = actualName.toLowerCase().includes(channel.name.toLowerCase()) ||
                         channel.name.toLowerCase().includes(actualName.toLowerCase()) ||
                         actualName === channel.name;

        if (!nameMatch) {
          console.log(`  ⚠️  ${channel.name}: 名称不匹配`);
          console.log(`      配置: "${channel.name}"`);
          console.log(`      实际: "${actualName}"`);
          console.log(`      ID: ${channel.id}`);
          console.log(`      订阅: ${actualSubs.toLocaleString()}`);
          results.mismatch.push({
            category,
            configName: channel.name,
            actualName: actualName,
            channelId: channel.id,
            subscribers: actualSubs
          });
        } else {
          console.log(`  ✅ ${channel.name}: 有效 (${actualSubs.toLocaleString()} 订阅)`);
          results.valid.push({
            category,
            name: channel.name,
            channelId: channel.id,
            subscribers: actualSubs
          });
        }
      }
    } catch (error) {
      if (error.code === 403) {
        console.log(`  ⚠️  API配额可能已耗尽，停止验证`);
        break;
      }
      console.log(`  ❌ ${channel.name}: 验证失败 - ${error.message}`);
      results.invalid.push({
        category,
        configName: channel.name,
        channelId: channel.id,
        reason: error.message
      });
    }
  }
}

// 生成报告
console.log('\n\n=== 验证报告 ===');
console.log(`总频道数: ${results.total}`);
console.log(`✅ 有效: ${results.valid.length} (${(results.valid.length/results.total*100).toFixed(1)}%)`);
console.log(`⚠️  名称不匹配: ${results.mismatch.length}`);
console.log(`❌ 无效: ${results.invalid.length}`);

if (results.invalid.length > 0) {
  console.log('\n--- 无效的频道 ---');
  results.invalid.forEach(item => {
    console.log(`  [${item.category}] ${item.configName}`);
    console.log(`    ID: ${item.channelId}`);
    console.log(`    原因: ${item.reason}`);
  });
}

if (results.mismatch.length > 0) {
  console.log('\n--- 名称不匹配的频道 ---');
  results.mismatch.forEach(item => {
    console.log(`  [${item.category}]`);
    console.log(`    配置名: ${item.configName}`);
    console.log(`    实际名: ${item.actualName}`);
    console.log(`    ID: ${item.channelId}`);
    console.log(`    订阅数: ${item.subscribers.toLocaleString()}`);
  });
}

// 保存完整报告到文件
const reportPath = path.join(__dirname, 'channel-verification-report.json');
fs.writeFileSync(reportPath, JSON.stringify(results, null, 2), 'utf-8');
console.log(`\n📄 完整报告已保存: ${reportPath}`);
