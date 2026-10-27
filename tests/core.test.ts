import test from 'node:test'
import assert from 'node:assert/strict'
import { detectStack, auditClaims } from '../lib/analyze/heuristic'
import { diffScan } from '../lib/diff'
import type { RepoInfo } from '../lib/github'

/** 造一个最小可用的 RepoInfo 夹具，避免测试依赖网络 */
function repo(over: Partial<RepoInfo>): RepoInfo {
  return {
    owner: 'x',
    repo: 'y',
    fullName: 'x/y',
    htmlUrl: 'https://github.com/x/y',
    description: null,
    homepage: null,
    topics: [],
    language: 'Java',
    languages: { Java: 9000, HTML: 500 },
    stars: 0,
    forks: 0,
    license: null,
    defaultBranch: 'main',
    pushedAt: null,
    size: 0,
    archived: false,
    readme: '',
    rootEntries: [],
    files: [],
    truncated: false,
    commits: [{ sha: 'deadbeef', date: '2026-01-01T00:00:00Z', message: 'init' }],
    ...over,
  }
}

test('detectStack：依赖内容优先于语言分布与文件名', () => {
  const info = repo({
    files: ['pom.xml', 'frontend/package.json'],
    language: 'Java',
    languages: { Java: 9000, HTML: 500 },
  })
  const manifests = {
    'pom.xml':
      '<dependency>io.agentscope:agentscope-core</dependency><dependency>org.springframework.boot:spring-boot-starter-webflux</dependency>',
    'frontend/package.json': '{ "dependencies": { "react": "^19", "antd": "^5" } }',
  }

  const stack = detectStack(info, manifests, [])

  assert.equal(stack[0], 'AgentScope', '最具体的依赖框架应排第一')
  for (const s of ['AgentScope', 'WebFlux', 'React', 'Ant Design']) {
    assert.ok(stack.includes(s), `应识别到 ${s}`)
  }
  assert.ok(!stack.includes('Java'), '6 个名额不该被语言占掉')
  assert.ok(stack.length <= 6)
})

test('detectStack：子目录里的清单文件也要被扫到', () => {
  const info = repo({ files: ['backend/go.mod', 'web/package.json'], languages: { Go: 100 } })
  const manifests = {
    'backend/go.mod': 'require github.com/gin-gonic/gin v1.9.0\nrequire gorm.io/gorm v1.25.0',
    'web/package.json': '{ "dependencies": { "react": "^19" } }',
  }
  const stack = detectStack(info, manifests, [])
  assert.ok(stack.includes('Gin'))
  assert.ok(stack.includes('GORM'))
  assert.ok(stack.includes('React'))
})

test('auditClaims：说法 + 代码痕迹 → verified，并给出证据路径', () => {
  const files = ['src/main/java/com/x/seekdb/LocalEmbedder.java', 'README.md']
  const audit = auditClaims('本项目支持向量检索与本地嵌入', files, {})

  const hit = audit.verified.find((v) => v.tag === '向量检索')
  assert.ok(hit, '向量检索应被核对为有据')
  assert.ok(hit?.proof && /embed/i.test(hit.proof), '证据应指向 LocalEmbedder.java')
  assert.ok(audit.score !== null && audit.score > 0)
})

test('diffScan：只报技术栈新增，不报移除（避免排序波动误伤）', () => {
  const prev = {
    signals: {
      detectedStack: ['A', 'B'],
      recentCommits: [{ sha: 'old', date: '', message: 'init' }],
      keywordHits: [],
      audit: { verified: [] },
      stars: 1,
      license: 'MIT',
    },
    stars: 1,
    license: 'MIT',
    changelog: [],
  } as never

  const next = {
    signals: {
      detectedStack: ['A', 'C'],
      recentCommits: [{ sha: 'new', date: '', message: 'feat: 新增能力' }],
      keywordHits: [],
      audit: { verified: [] },
      stars: 1,
      license: 'MIT',
    },
  }

  const entries = diffScan(prev as never, next as never)
  assert.ok(entries.some((e) => e.type === 'commit' && e.sha === 'new'), '应产出新提交')
  assert.ok(entries.some((e) => e.type === 'stack_added' && /C/.test(e.text)), '应报告新增 C')
  assert.ok(!entries.some((e) => e.type === 'stack_removed'), '不应报告技术栈移除')
})
