#!/usr/bin/env node
/**
 * 开物 MCP Server
 *
 * 把「查这个人会做什么」和「帮他上架一个仓库」变成智能体可以调用的工具。
 * 零依赖，stdio + 换行分隔的 JSON-RPC 2.0。
 *
 * 用法：
 *   KAIWU_BASE=http://localhost:4310 node packages/mcp/server.mjs
 *
 * 挂进 Claude Desktop / Cursor：
 *   { "mcpServers": { "kaiwu": { "command": "node",
 *       "args": ["/abs/path/packages/mcp/server.mjs"],
 *       "env": { "KAIWU_BASE": "http://localhost:4310" } } } }
 */

import readline from 'node:readline'

const BASE = (process.env.KAIWU_BASE || 'http://localhost:4310').replace(/\/+$/, '')
const TOKEN = process.env.KAIWU_SEED_TOKEN || ''
const VERSION = '1.0.0'

const TOOLS = [
  {
    name: 'list_spaces',
    description: '列出开物上所有公开的作品空间（人），以及每个空间有多少件作品。',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'search_portfolio',
    description:
      '按能力或关键词跨空间检索作品。比如「混合检索」「能接多个模型的网关」「A2A」。返回作品名、定位、技术栈、所属空间和链接。',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: '关键词或能力描述，支持中文' },
        space: { type: 'string', description: '可选，只在某个空间内搜（空间 handle）' },
        limit: { type: 'number', description: '返回条数，默认 8' },
      },
      required: ['query'],
      additionalProperties: false,
    },
  },
  {
    name: 'get_agent_card',
    description:
      '获取某个空间的 Agent Card：机器可读的自我描述，包含技能清单、技术栈、证据强度。适合先读它再决定要不要深入。',
    inputSchema: {
      type: 'object',
      properties: { space: { type: 'string', description: '空间 handle，例如 riemann' } },
      required: ['space'],
      additionalProperties: false,
    },
  },
  {
    name: 'publish_project',
    description:
      '把一个 GitHub 仓库上架到某个空间：AI 会读 README、扫描文件树、核对宣称与证据，然后生成作品卡片。',
    inputSchema: {
      type: 'object',
      properties: {
        repo: { type: 'string', description: 'GitHub 仓库地址或 owner/repo' },
        space: { type: 'string', description: '目标空间 handle；空间不存在时会自动创建' },
        space_name: { type: 'string', description: '新建空间时的显示名' },
      },
      required: ['repo', 'space'],
      additionalProperties: false,
    },
  },
]

const text = (t) => ({ content: [{ type: 'text', text: t }] })
const fail = (t) => ({ content: [{ type: 'text', text: t }], isError: true })

async function callApi(path, init = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(TOKEN ? { 'x-kaiwu-token': TOKEN } : {}),
      ...(init.headers || {}),
    },
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`)
  return body
}

async function handleTool(name, args) {
  if (name === 'list_spaces') {
    const { spaces } = await callApi('/api/tenants')
    if (!spaces?.length) return text('目前还没有任何空间。')
    return text(
      spaces
        .map((s) => `@${s.handle} · ${s.name} · ${s.projects} 件作品\n  ${s.title || '（未写介绍）'}\n  ${BASE}${s.url}`)
        .join('\n\n'),
    )
  }

  if (name === 'search_portfolio') {
    const q = new URLSearchParams({ q: args.query, limit: String(args.limit ?? 8) })
    if (args.space) q.set('handle', args.space)
    const { results, total } = await callApi(`/api/search?${q}`)
    if (!results.length) return text(`没有找到和「${args.query}」相关的作品。`)
    return text(
      `共 ${total} 个结果，显示前 ${results.length} 个：\n\n` +
        results
          .map(
            (r, i) =>
              `${i + 1}. ${r.name}${r.nameEn ? ` (${r.nameEn})` : ''} — ${r.tagline}\n` +
              `   空间 @${r.space.handle} · ${r.category} · ${r.stack.slice(0, 4).join(' / ')}\n` +
              `   命中：${r.matched.join('、')}\n` +
              `   ${BASE}${r.url}`,
          )
          .join('\n\n'),
    )
  }

  if (name === 'get_agent_card') {
    const card = await callApi(`/api/agent-card/${encodeURIComponent(args.space)}`)
    const summary =
      `${card.name} (@${card.handle})\n${card.description}\n\n` +
      `技能 ${card.skills.length} 项，技术栈 ${card.capabilities.stack.join(' / ')}\n` +
      `核对分 ${card.capabilities.auditScore ?? '—'}（${card.capabilities.verifiedClaims} 条有据 / ${card.capabilities.claimedOnly} 条存疑）\n\n` +
      card.skills.map((s) => `- ${s.name}：${s.description}`).join('\n')
    return text(`${summary}\n\n--- 原始 Agent Card ---\n${JSON.stringify(card, null, 2)}`)
  }

  if (name === 'publish_project') {
    const body = await callApi('/api/import', {
      method: 'POST',
      body: JSON.stringify({
        tenant: { handle: args.space, name: args.space_name || args.space },
        repos: [args.repo],
      }),
    })
    const r = body.results?.[0] ?? {}
    if (r.error) return fail(`上架失败：${r.error}`)
    if (r.skipped) return text(`这个仓库已经在 @${args.space} 里了：${BASE}/${args.space}/${r.slug}`)
    return text(`已上架到 @${args.space}：${BASE}/${args.space}/${r.slug}（引擎 ${r.engine}）`)
  }

  return fail(`未知工具：${name}`)
}

function send(msg) {
  process.stdout.write(JSON.stringify(msg) + '\n')
}

const rl = readline.createInterface({ input: process.stdin, terminal: false })

rl.on('line', async (line) => {
  const raw = line.trim()
  if (!raw) return
  let req
  try {
    req = JSON.parse(raw)
  } catch {
    return
  }

  const { id, method, params } = req
  const isNotification = id === undefined || id === null

  try {
    if (method === 'initialize') {
      send({
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: params?.protocolVersion || '2024-11-05',
          capabilities: { tools: { listChanged: false } },
          serverInfo: { name: 'kaiwu', version: VERSION },
        },
      })
      return
    }

    if (method === 'ping') {
      if (!isNotification) send({ jsonrpc: '2.0', id, result: {} })
      return
    }

    if (method === 'tools/list') {
      send({ jsonrpc: '2.0', id, result: { tools: TOOLS } })
      return
    }

    if (method === 'tools/call') {
      const result = await handleTool(params?.name, params?.arguments ?? {})
      send({ jsonrpc: '2.0', id, result })
      return
    }

    if (isNotification) return
    send({ jsonrpc: '2.0', id, error: { code: -32601, message: `Method not found: ${method}` } })
  } catch (e) {
    if (isNotification) return
    send({ jsonrpc: '2.0', id, result: fail(e instanceof Error ? e.message : String(e)) })
  }
})
