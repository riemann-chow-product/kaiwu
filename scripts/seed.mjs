/**
 * 初始化「开物」空间：把两个真实仓库跑一遍 AI 识别流水线并上架。
 *
 * 用法：先 `npm run dev`，另开一个终端执行 `npm run seed`
 * 说明：卡片文案由识别引擎生成，下面 polish 里是人工润色过的定稿，
 *      用来演示「AI 起草 + 人确认」的真实工作流。
 */

const BASE = process.env.KAIWU_BASE || 'http://localhost:4310'

const tenant = {
  handle: 'riemann',
  name: 'Riemann',
  title: '自己做、天天在用的东西',
  bio: '写后端，也折腾智能体。偏好把复杂系统拆成能看懂的样子——文档写清楚，架构画明白，接口留干净。下面这些是自己真的在用的项目，不是演示玩具。',
  glyph: '✦',
  accent: '#B8442F',
  github: 'https://github.com/RiemannChow',
}

const repos = [
  {
    url: 'https://github.com/RiemannChow/agent-hub',
    polish: {
      name: '问数中枢',
      nameEn: 'agent-hub',
      tagline: '把 ReAct、结构化卡片和混合检索装进一个对话界面的问数智能体',
      summary:
        '一个对话式数据分析智能体：用户用中文提问，它自己决定调哪个工具、查哪张表，把结果画成图。\n关键取舍是让大模型只负责编排——工具返回带 type 字段的结构化信封，前端直接挂载成柱状图、饼图或检索面板，模型不再把数据抄一遍进正文，于是数字永远和查询结果一致。检索侧融合向量、全文与标量三路信号，图书检索用 RRF 倒数排名融合精排；记忆分短期会话与长期事实两层，后者异步抽取、跨会话按语义召回。\n对外同时暴露 A2A 协议，别的智能体可以通过 Agent Card 发现它、用 JSON-RPC 直接调它。',
      highlights: [
        'ReAct 编排，31 类事件收敛成 5 种领域事件推给前端',
        'A2UI 结构化卡片，图表纯 CSS 渲染不依赖图表库',
        '向量 + 全文 + 标量三路混合检索',
        'RRF 倒数排名融合精排',
        '短期会话记忆 + 长期事实记忆',
        'A2A 协议与 Nacos 服务发现',
      ],
      tags: ['Agent', 'A2UI', '混合检索', 'A2A', 'DDD'],
      stack: ['Java', 'Spring Boot', 'WebFlux', 'AgentScope', 'SeekDB', 'MongoDB'],
      category: '智能体',
      glyph: '◎',
      accent: '#8C4A3F',
      cover: '/covers/agent-hub.png',
    },
  },
  {
    url: 'https://github.com/RiemannChow/nantianmen-ai-gateway',
    polish: {
      name: '南天门 AI 网关',
      nameEn: 'nantianmen-ai-gateway',
      tagline: '把上百个模型、提示词和 REST 接口收进一套统一入口来管',
      summary:
        '面向团队与企业的 AI 网关加 API 开发者门户。把主流模型接到一处，模型与提示词可以组合成新的 REST API，调用方只认一套数据格式——换模型、改提示词都不用动上层应用。\n除了 AI 侧，它同时是个正经的 API 网关：应用与密钥管理、订阅审批、配额限流、用量图表、调用日志外送第三方平台。多租户隔离，各业务线各管各的。\n一条命令起服务，五分钟能跑起来；集群部署能扛量，性能对标 Nginx。',
      highlights: [
        '100+ 主流模型统一接入',
        '模型 + 提示词直接发布成 REST API',
        '请求数据格式统一，换模型不动应用',
        '应用与密钥治理、订阅审批',
        '用量监控图表与日志外送',
        '多租户隔离与配额限流',
      ],
      tags: ['AI 网关', '统一 API', '多租户', '密钥治理', '开发者门户'],
      stack: ['Go', 'Gin', 'React', 'Ant Design', 'Docker'],
      category: 'AI 基础设施',
      glyph: '◈',
      accent: '#3F5D8C',
    },
  },
]

const res = await fetch(`${BASE}/api/import`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ tenant, repos }),
})

const data = await res.json()
if (!res.ok) {
  console.error('导入失败：', data)
  process.exit(1)
}

console.log(`空间 @${data.tenant.handle} 就绪`)
for (const r of data.results) {
  if (r.error) console.log(`  ✗ ${r.url}\n    ${r.error}`)
  else if (r.skipped) console.log(`  · ${r.url} 已存在，跳过`)
  else console.log(`  ✓ ${r.url} → /${data.tenant.handle}/${r.slug}  [${r.engine}]`)
}
