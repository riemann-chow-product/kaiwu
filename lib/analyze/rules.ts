/**
 * 类别与能力的语义词典。
 *
 * 每个能力点有两套判定：
 *  - match ：在「宣称语料」（README / 描述 / topics）里找 —— 它说自己有什么
 *  - PROOF ：在「证据语料」（文件树 / 依赖清单）里找 —— 它真有什么
 *
 * 注意：match 用字符串数组而不是正则。因为 JS 的 \b 基于 \w（只有 ASCII），
 * 对「兼容网关」这种中文词根本不算边界，写成 /\b网关\b/ 永远匹配不到。
 * 所以这里对纯 ASCII 词自动加 \b，对含中文的词不加。
 *
 * evidence = 'structural' 的能力点，找不到证据就可以判定「说了但没做到」；
 * evidence = 'semantic'   的能力点，机器不下结论，标为「需人工核对」。
 */

export type EvidenceKind = 'structural' | 'semantic'

const CJK = /[\u4e00-\u9fa5]/

/** 把词表编译成带边界处理的正则：ASCII 加 \b，中文不加 */
export function altRegex(alts: string[], flags = 'i'): RegExp {
  const parts = alts.map((a) => {
    const escaped = a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    return CJK.test(a) ? escaped : `\\b${escaped}\\b`
  })
  return new RegExp(parts.join('|'), flags)
}

interface RawCapability {
  match: string[]
  label: string
  tag: string
  weight: number
  evidence: EvidenceKind
}

export interface Capability extends RawCapability {
  re: RegExp
}

const RAW_CAPABILITIES: RawCapability[] = [
  { match: ['llm', 'large language model', '大模型', '大语言模型'], label: '大模型接入', tag: 'LLM', weight: 3, evidence: 'structural' },
  { match: ['gateway', '网关', 'proxy', '反向代理'], label: '统一网关', tag: '网关', weight: 3, evidence: 'structural' },
  { match: ['openai compatible', 'openai-compatible', '兼容 openai', 'openai 协议'], label: 'OpenAI 协议兼容', tag: 'OpenAI 兼容', weight: 3, evidence: 'structural' },
  { match: ['multi-provider', 'multiprovider', '100+', '多模型', '多家模型', '模型市场'], label: '多模型统一接入', tag: '多模型', weight: 3, evidence: 'structural' },
  { match: ['prompt template', '提示词模板', 'prompt'], label: '提示词模板', tag: 'Prompt', weight: 2, evidence: 'structural' },
  { match: ['api key', 'apikey', '密钥', '配额', 'rate limit', 'ratelimit', '限流'], label: '密钥与配额治理', tag: '密钥治理', weight: 2, evidence: 'structural' },
  { match: ['dashboard', 'console', '控制台', 'developer portal', '门户'], label: '可视化控制台', tag: '控制台', weight: 2, evidence: 'structural' },
  { match: ['multi-tenant', 'multitenant', '多租户', '租户'], label: '多租户隔离', tag: '多租户', weight: 2, evidence: 'structural' },
  { match: ['observability', 'monitor', '监控', '可观测', '日志', 'logging', 'trace'], label: '可观测与日志', tag: '可观测', weight: 2, evidence: 'structural' },
  { match: ['agent', '智能体'], label: '智能体编排', tag: 'Agent', weight: 3, evidence: 'structural' },
  { match: ['react', 're-act'], label: 'ReAct 推理循环', tag: 'ReAct', weight: 3, evidence: 'structural' },
  { match: ['mcp'], label: 'MCP 工具协议', tag: 'MCP', weight: 3, evidence: 'structural' },
  { match: ['a2a'], label: 'A2A 智能体互通', tag: 'A2A', weight: 3, evidence: 'structural' },
  { match: ['rag', 'retrieval augmented', 'retrieval-augmented'], label: 'RAG 检索增强', tag: 'RAG', weight: 3, evidence: 'structural' },
  { match: ['vector', 'embedding', '向量', '语义检索'], label: '向量检索', tag: '向量检索', weight: 2, evidence: 'structural' },
  { match: ['hybrid search', '混合检索', 'rrf', '全文检索', 'full text', 'fulltext'], label: '混合检索与融合排序', tag: '混合检索', weight: 3, evidence: 'structural' },
  { match: ['memory', '记忆'], label: '记忆与上下文管理', tag: '记忆', weight: 2, evidence: 'structural' },
  { match: ['stream', 'sse', '流式'], label: '流式输出', tag: '流式', weight: 2, evidence: 'structural' },
  { match: ['graphql', 'rest api', 'openapi', '接口'], label: '开放 API', tag: 'API', weight: 1, evidence: 'structural' },
  { match: ['docker', 'compose', '容器', '一键部署', 'deploy'], label: '一键部署', tag: 'Docker', weight: 1, evidence: 'structural' },
  { match: ['kubernetes', 'k8s', '集群', 'cluster'], label: '集群部署', tag: '集群', weight: 2, evidence: 'structural' },
  { match: ['high performance', '高性能', '百万', 'qps'], label: '高性能', tag: '高性能', weight: 2, evidence: 'semantic' },
  { match: ['ddd', 'domain driven', '分层架构', '架构'], label: '分层架构', tag: '架构', weight: 2, evidence: 'structural' },
  { match: ['cli', '命令行', '终端'], label: '命令行体验', tag: 'CLI', weight: 2, evidence: 'structural' },
  { match: ['小程序', 'mini program', 'miniprogram', 'wechat'], label: '小程序载体', tag: '小程序', weight: 3, evidence: 'structural' },
  { match: ['desktop', '菜单栏', 'macos', 'windows', '桌面端'], label: '桌面端常驻', tag: '桌面端', weight: 2, evidence: 'structural' },
  { match: ['open source', 'opensource', '开源'], label: '开源可商用', tag: '开源', weight: 1, evidence: 'structural' },
  { match: ['test', '测试', 'ci', 'pipeline', '流水线'], label: '自动化测试与交付', tag: 'CI', weight: 1, evidence: 'structural' },
  { match: ['知识图谱', 'knowledge graph', 'neo4j'], label: '知识图谱', tag: '知识图谱', weight: 3, evidence: 'structural' },
  { match: ['sql', '数据库', 'database', '存储'], label: '数据存储', tag: '数据', weight: 1, evidence: 'structural' },
]

export const CAPABILITIES: Capability[] = RAW_CAPABILITIES.map((c) => ({ ...c, re: altRegex(c.match) }))

/**
 * 结构证据。路径匹配（文件树）与依赖匹配（清单内容）分开写，
 * 避免把「README 里提到 docker」当成「仓库里有 Dockerfile」。
 *
 * pathAll：需要同时出现多个路径特征才算证据（用于分层架构这种「一套目录」的能力）。
 */
export const PROOF: Record<string, { path?: RegExp; pathAll?: RegExp[]; dep?: RegExp }> = {
  LLM: {
    path: /(^|\/)(ai-provider|model-providers?|llm|providers?|models?)(\/|$)/i,
    dep: /openai|anthropic|dashscope|qwen|hunyuan|lkeap|langchain|agentscope|ollama/i,
  },
  网关: { path: /(^|\/)(gateway|proxy|upstream|strategy-filter)(\/|\.|$)/i },
  'OpenAI 兼容': {
    path: /(^|\/)(openai|open_ai|anthropic)(\/|\.|$)/i,
    dep: /openai|anthropic|claude/i,
  },
  密钥治理: { path: /(apikey|api_?key|quota|rate_?limit)/i, dep: /apikey|api_key|ratelimit|quota/i },
  控制台: { path: /(^|\/)(dashboard|console|frontend|web)(\/|$)/i },
  多租户: { path: /tenant/i },
  可观测: { path: /(^|\/)(log|logs|metrics?|monitor|trace|otel)(\/|\.|$)/i, dep: /prometheus|opentelemetry|logrus|zap|winston|pino/i },
  Agent: {
    path: /(^|\/)(agent|agents|toolkit|agent-runtime)(\/|\.|$)/i,
    dep: /agentscope|langchain|langgraph|autogen|openai-agents/i,
  },
  ReAct: { path: /(re[_-]?act[_-]?agent|reactagent|react_loop|react[_-]?orchestr)/i },
  MCP: { path: /(^|\/)(mcp|mcp-server)(\/|\.|$)/i, dep: /modelcontextprotocol|mcp[-_]|mark3labs\/mcp-go/i },
  A2A: { path: /(^|\/)a2a(\/|\.|$)|agent[_-]?card/i, dep: /\ba2a\b/i },
  RAG: { path: /(^|\/)(rag|retriev)/i, dep: /langchain|llama[_-]?index|haystack/i },
  向量检索: { path: /(embed|vector|faiss|milvus|qdrant)/i, dep: /faiss|milvus|qdrant|chromadb|pgvector|embedding/i },
  混合检索: { path: /(hybrid|rrf|bm25|fulltext)/i },
  记忆: { path: /(^|\/)(memory|memories|memorize)(\/|\.|$)/i },
  流式: { path: /(^|\/)(sse|stream|streaming)(\/|$)/i, dep: /eventsource|text\/event-stream/i },
  API: { path: /(^|\/)(api|controller|controllers|router|routes|handler)(\/|$)/i },
  Docker: { path: /(^|\/)(Dockerfile|docker-compose[^/]*|\.dockerignore)$/i },
  集群: {
    path: /(^|\/)(k8s|kubernetes|helm|cluster|plugin-cluster)(\/|$)/i,
    dep: /k8s\.io|kubernetes|helm\.sh/i,
  },
  架构: {
    pathAll: [/(^|\/)domain(\/|$)/i, /(^|\/)(application|infrastructure)(\/|$)/i],
  },
  CLI: { path: /(^|\/)(cli|cmd)(\/|$)|(^|\/)main\.go$/i },
  小程序: { path: /(miniprogram|project\.config\.json$|\.wxml$)/i },
  桌面端: { path: /(tauri\.conf|electron|\.xcodeproj|menubar|Info\.plist)/i },
  开源: { path: /(^|\/)(LICENSE|LICENSE\.md|COPYING)$/i },
  CI: { path: /(\.github\/workflows\/|\.gitlab-ci\.yml|Jenkinsfile|\.circleci|\.travis\.yml|azure-pipelines)/i },
  知识图谱: { path: /(neo4j|knowledge[_-]?graph)/i, dep: /neo4j/i },
  数据: { path: /(\.sql$|migrations?\/|schema)/i, dep: /jdbc|gorm|sqlalchemy|prisma|mongoose|typeorm/i },
  Prompt: { path: /(^|\/)(prompt|prompts|prompt-editor)(\/|\.|$)/i },
  多模型: { path: /(^|\/)(model-providers?|ai-provider)(\/|$)/i },
  高性能: { path: /(^|\/)(benchmark|bench|perf|performance)(\/|$)/i },
}

interface RawCue {
  match: string[]
  weight: number
}

export interface CategoryRule {
  name: string
  glyph: string
  accent: string
  cues: { re: RegExp; weight: number }[]
  template: string
}

interface RawCategory {
  name: string
  glyph: string
  accent: string
  cues: RawCue[]
  template: string
}

const RAW_CATEGORIES: RawCategory[] = [
  {
    name: 'AI 基础设施',
    glyph: '◈',
    accent: '#3F5D8C',
    cues: [
      { match: ['gateway', '网关'], weight: 6 },
      { match: ['100+', 'multi-provider', '多模型'], weight: 4 },
      { match: ['llm', '大模型'], weight: 3 },
      { match: ['api key', '密钥', 'quota', '限流'], weight: 2 },
    ],
    template: '面向团队与企业的{caps}层，把模型调用、密钥与流量收在一处管。',
  },
  {
    name: '智能体',
    glyph: '◎',
    accent: '#8C4A3F',
    cues: [
      { match: ['agent', '智能体'], weight: 5 },
      { match: ['react', 'tool call', '工具调用'], weight: 3 },
      { match: ['a2a', 'mcp'], weight: 3 },
      { match: ['memory', '记忆'], weight: 2 },
    ],
    template: '一个可落地的智能体工程样本，把{caps}串成完整闭环。',
  },
  {
    name: '检索与数据',
    glyph: '◍',
    accent: '#4A6B52',
    cues: [
      { match: ['vector', 'embedding', '向量'], weight: 5 },
      { match: ['hybrid', 'rrf', 'rag', '检索'], weight: 4 },
      { match: ['database', 'sql', '数据库'], weight: 2 },
    ],
    template: '围绕{caps}的数据底座，让检索结果既准又可解释。',
  },
  {
    name: '开发工具',
    glyph: '⌘',
    accent: '#7A5C2E',
    cues: [
      { match: ['cli', '命令行', 'terminal'], weight: 4 },
      { match: ['plugin', '插件', 'sdk', '脚手架'], weight: 3 },
      { match: ['editor', 'ide'], weight: 3 },
    ],
    template: '日常开发里顺手就用的{caps}，少一步配置就多一分专注。',
  },
  {
    name: '效率工具',
    glyph: '◇',
    accent: '#5B5A8C',
    cues: [
      { match: ['productivity', '效率', '自动化', 'automation'], weight: 4 },
      { match: ['desktop', '菜单栏', 'macos'], weight: 3 },
      { match: ['notion', '日历', 'calendar', 'todo'], weight: 2 },
    ],
    template: '把{caps}做进日常动线，用的时候几乎感觉不到它的存在。',
  },
  {
    name: '前端与界面',
    glyph: '▤',
    accent: '#8C6A3F',
    cues: [
      { match: ['react', 'vue', 'ui', 'component', '组件', 'design system'], weight: 4 },
      { match: ['frontend', '前端', 'css'], weight: 3 },
    ],
    template: '一套{caps}的界面实践，兼顾观感与工程可维护性。',
  },
]

export const CATEGORIES: CategoryRule[] = RAW_CATEGORIES.map((c) => ({
  ...c,
  cues: c.cues.map((cue) => ({ re: altRegex(cue.match), weight: cue.weight })),
}))

/** 语言 → 技术栈展示名 */
export const LANG_LABEL: Record<string, string> = {
  TypeScript: 'TypeScript',
  JavaScript: 'JavaScript',
  Java: 'Java',
  Go: 'Go',
  Python: 'Python',
  Rust: 'Rust',
  Vue: 'Vue',
  HTML: 'HTML',
  CSS: 'CSS',
  Shell: 'Shell',
  C: 'C',
  'C++': 'C++',
}

export const GLYPHS = ['◆', '◈', '◎', '◍', '◇', '▤', '⌘', '❖', '✦', '⬢']
export const ACCENTS = ['#3F5D8C', '#8C4A3F', '#4A6B52', '#7A5C2E', '#5B5A8C', '#8C6A3F', '#2F5F63', '#7A3F5C']
