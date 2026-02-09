#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 读取配置文件
const channelsPath = path.join(__dirname, 'config/channels.json');
const fixesPath = path.join(__dirname, 'apply-channel-fixes.json');

const channels = JSON.parse(fs.readFileSync(channelsPath, 'utf-8'));
const fixes = JSON.parse(fs.readFileSync(fixesPath, 'utf-8'));

console.log('=== 应用频道ID修复 ===\n');
console.log(`需要修复的频道数: ${fixes.length}\n`);

let fixedCount = 0;

for (const fix of fixes) {
  const category = fix.category;
  const channelList = channels[category];

  if (!channelList) {
    console.log(`❌ 未找到分类: ${category}`);
    continue;
  }

  const channelIndex = channelList.findIndex(c => c.id === fix.oldId);

  if (channelIndex === -1) {
    console.log(`⚠️  [${category}] ${fix.name}: 旧ID未找到 (${fix.oldId})`);
    // 尝试通过名称查找
    const nameIndex = channelList.findIndex(c => c.name === fix.name);
    if (nameIndex !== -1) {
      channelList[nameIndex].id = fix.newId;
      console.log(`  ✅ 通过名称匹配已更新: ${fix.oldId} → ${fix.newId}`);
      fixedCount++;
    }
  } else {
    channelList[channelIndex].id = fix.newId;
    console.log(`✅ [${category}] ${fix.name}: ${fix.oldId} → ${fix.newId}`);
    fixedCount++;
  }
}

// 保存更新后的配置
fs.writeFileSync(channelsPath, JSON.stringify(channels, null, 2), 'utf-8');

console.log(`\n=== 修复完成 ===`);
console.log(`成功修复: ${fixedCount}/${fixes.length}`);
console.log(`配置已更新: ${channelsPath}`);
