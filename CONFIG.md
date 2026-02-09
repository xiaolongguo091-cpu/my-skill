# YouTube Hot Analyzer - 配置说明

## ✅ Skill 已修复并可正常运行

### 当前配置状态

- ✅ `.env` 文件已创建
- ✅ `dotenv` 包已安装
- ✅ **YouTube API Keys: 5个已配置**
- ✅ **总配额: 50,000 单位/天**
- ✅ Email 配置已完成
- ✅ 运行脚本 `run-with-env.js` 已创建
- ✅ 自动切换 Key 功能已启用

### 使用方法

#### 1. 基本用法（使用默认日期：最近3天）

```bash
cd ~/.claude/skills/youtube-hot-analyzer
node run-with-env.js
```

#### 2. 指定日期范围

```bash
node run-with-env.js 2026-01-04 2026-01-06
```

#### 3. 通过 Claude Code Skill 调用

```
用户: 使用 youtube-hot-analyzer skill，日期：2026.01.04-2026.01.06
```

### 配置文件位置

- **Skill 目录**: `~/.claude/skills/youtube-hot-analyzer/`
- **环境变量**: `~/.claude/skills/youtube-hot-analyzer/.env`
- **输出目录**: `/Users/sniper/work/0自媒体/AiALiang/自媒体/自动获取热门博客/YoutubeResult/`

### API 配额说明

- **已配置 Key 数量**: 5个
- **每个 Key 日配额**: 10,000 单位
- **总配额**: 50,000 单位/天
- **单次运行消耗**: 约 4,000-6,000 单位（取决于视频数量）
- **可运行次数**: 每天约 8-12 次完整分析
- **配额重置**: 每天太平洋时间午夜（北京时间下午4点）
- **自动切换**: Key #1 用尽时自动切换到 Key #2，依此类推

### API Keys 配置详情

已配置的5个 YouTube Data API v3 Keys:
1. Key #1: AIzaSyDH...QSwY
2. Key #2: AIzaSyA7...DHkw
3. Key #3: AIzaSyCD...nVtA
4. Key #4: AIzaSyDF...IqQw
5. Key #5: AIzaSyBe...juMo

所有 keys 已启用 YouTube Data API v3，会在配额用尽时自动切换。

### 输出文件

每次运行会生成：

1. **HTML 报告**: `YoutubeResult/YYYY-MM-DD/热门视频_日期范围.html`
2. **历史索引页**: `YoutubeResult/index.html`

### 故障排除

#### 配额用尽
```
错误: quotaExceeded
解决: 等待明天配额重置，或配置多个 API key
```

#### API 未启用
```
错误: YouTube Data API v3 has not been used in project
解决: 访问上面的链接启用 API
```

#### 环境变量未加载
```
错误: 请设置环境变量 YOUTUBE_API_KEY
解决: 确保使用 run-with-env.js 脚本运行
```

### 下次运行建议

- **明天运行**: API 配额会自动重置
- **推荐时间**: 北京时间下午 4 点之后（配额刚重置）
- **覆盖范围**: 可以一次性获取所有 61 个频道的视频

### 维护建议

1. 定期清理旧报告（保留最近 30 天）
2. 监控 API 配额使用情况
3. 考虑启用邮件通知（设置 `sendEmail: true`）
