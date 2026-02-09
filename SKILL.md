---
name: youtube-hot-analyzer
version: 1.0.0
description: YouTube热门视频分析核心skill，获取、翻译、分析并生成报告
tags: [youtube, video-analysis, automation, content-curation]
---

# YouTube Hot Analyzer Skill

YouTube热门视频分析核心skill，负责获取指定时间段的热门视频、翻译标题、计算热度评分、生成HTML报告。

## 功能特性

- ✅ 从61个频道获取视频
- ✅ 智能热度评分算法
- ✅ 自动翻译视频标题
- ✅ 分类过滤（AI分类优先）
- ✅ 多维度排序（时间、观看、点赞、热度）
- ✅ 生成精美HTML报告
- ✅ 可选邮件通知

## 使用场景

这是一个核心skill，通常由快捷skills调用：
- youtube-hot-daily - 获取今日热门
- youtube-hot-period - 获取指定时间段热门
- youtube-hot-realtime - 实时监控

也可以直接调用：
- "分析YouTube热门视频"
- "获取最近3天的热门视频"

## 输入参数

```javascript
{
  startDate: Date | string,    // 开始日期
  endDate: Date | string,      // 结束日期
  generateReport: boolean,     // 是否生成HTML报告（默认true）
  sendEmail: boolean,          // 是否发送邮件（默认false）
  outputDir: string,           // 输出目录（默认./output/youtube-reports）
  minViews: number            // 最小观看数过滤（默认0）
}
```

## 输出格式

```javascript
{
  success: true,
  stats: {
    totalVideos: 88,
    channels: 61,
    categories: 6,
    translated: 88,
    apiQuotaUsed: 133
  },
  reportPath: "/path/to/report.html",
  emailSent: false,
  videos: [...]  // 视频数据数组
}
```

## 工作流程

1. **获取视频数据**
   - 从YouTube Data API获取61个频道的视频
   - 根据日期范围过滤
   - 获取详细统计数据（观看、点赞、评论等）

2. **计算热度评分**
   - 观看数评分（40%）
   - 点赞数评分（30%）
   - 互动率评分（20%）
   - 新鲜度评分（10%）

3. **翻译标题**
   - 调用 content-translator skill
   - 使用增量缓存避免重复翻译
   - 支持手动编辑翻译缓存

4. **分类整理**
   - 按频道分类（AI个人博主、AI产品官方等）
   - AI相关分类优先排序

5. **生成报告**
   - 调用 html-report-generator skill
   - 支持分类过滤
   - 支持多维度排序

6. **发送通知**（可选）
   - 调用 email-sender skill
   - 发送HTML邮件报告

## 热度评分算法

```javascript
hotScore = {
  viewScore: (views / maxViews) * 40,
  likeScore: (likes / maxLikes) * 30,
  engagementScore: (likes / views) * 100 * 20,
  freshnessScore: (1 - ageHours / maxAgeHours) * 10,
  total: sum of above
}
```

## 依赖的Skills

- **content-translator** - 标题翻译
- **html-report-generator** - 报告生成
- **email-sender** - 邮件发送（可选）

## 依赖的npm包

- googleapis (YouTube Data API v3)
- Node.js 18+

## 配置文件

### channels.json
61个监控频道的配置：
```json
{
  "AI个人博主": [
    {"name": "Sam Altman", "id": "UCxxxxxx", "subscribers": "1.2M"}
  ],
  ...
}
```

### categories.json
分类顺序配置：
```json
{
  "order": [
    "AI个人博主",
    "AI产品官方",
    "科技个人博主",
    "人生感悟/情绪",
    "投资机构/创业",
    "综合访谈/播客"
  ]
}
```

## 环境变量

```bash
YOUTUBE_API_KEY=your_youtube_api_key
EMAIL_USER=your@qq.com           # 如果需要邮件通知
EMAIL_PASS=your_authorization_code
EMAIL_TO=recipient@example.com
```

## API配额消耗

每次运行大约消耗133配额单位：
- 频道信息查询：61 x 1 = 61
- 视频搜索：61 x 100 = 61（使用search）
- 视频详情：N x 1（N为视频数量）

每日配额限制：10,000单位

## 使用示例

```javascript
import { analyzeHotVideos } from './lib/analyzer.js';

// 获取最近5天的热门视频
const result = await analyzeHotVideos({
  startDate: '2025-12-31',
  endDate: '2026-01-04',
  generateReport: true,
  sendEmail: true
});

console.log(`✅ 分析完成！获取了 ${result.stats.totalVideos} 个视频`);
console.log(`📊 报告: ${result.reportPath}`);
```

## 注意事项

- YouTube API配额有限，建议每天运行不超过3次
- 翻译缓存存储在 ~/.claude/skills/content-translator/cache/youtube-videos.json
- HTML报告默认保存在当前目录的output/youtube-reports/
- 首次运行会自动创建所需目录
