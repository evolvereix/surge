#!/usr/bin/env node
// 开发期使用的 Surge 宿主模拟器，Surge 不会加载本文件。
// 用法:
//   node modules/stream/stream.test.mjs --all
//   node modules/stream/stream.test.mjs --case netflix-full

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve as resolvePath } from 'node:path'
import vm from 'node:vm'

const here = dirname(fileURLToPath(import.meta.url))
const target = resolvePath(here, 'stream.js')
a#!/usr/bin/env node
// 开发期使用的 Surge 宿主模拟器，Surge 不会加载本文件。
// 用法:
//   node modules/stream/stream.test.mjs --all
//   node modules/stream/stream.test.mjs --case netflix-full

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve as resolvePath } from 'node:path'
import vm from 'node:vm'

const here = dirname(fileURLToPath(import.meta.url))
const target = resolvePath(here, 'stream.js')

// 将顶部 UI 约定的全局颜色反查成语义色名，便于断言聚合结果
const TONE_BY_COLOR = {
  '#BF5AF2': 'normal',
  '#FF9F0A': 'warn',
  '#FF3B30': 'alert',
  '#8E8E93': 'error'
}

// 真实的可用页面同样含有 "Oh no! ..." 隐藏模板，fixture 必须
// 复现这一点，否则会把误报重新引回来。
const NF_US =
  '<html>{"id":"us","countryName":"United States"} LEGO Ninjago' +
  '<div>Oh no! This title currently isn’t available to watch in your ' +
  'country.</div></html>'
const NF_HK = '<html>{"id":"hk","countryName":"Hong Kong"}</html>'
const NF_JP = '<html>{"id":"jp","countryName":"Japan"}</html>'
const NF_NO_REGION = '<html>LEGO Ninjago</html>'
const NF_GONE = '<html>Not Found</html>'

const disneyHomeBody = (country, hasContent) =>
  `<html>{"hasContent":${hasContent},"language":"en",` +
  `"location":"${country.toUpperCase()}","pageId":"welcome",` +
  `"region":"${country.toLowerCase()}"}</html>`

const DISNEY_HOME = disneyHomeBody('US', true)

const DISNEY_API_DEAD = JSON.stringify({
  data: null,
  errors: [{ extensions: { code: 'token.service.unauthorized.client' } }],
  extensions: { sdk: { session: null } }
})

const disneyApiBody = (country, supported) =>
  JSON.stringify({
    extensions: {
      sdk: {
        session: {
          inSupportedLocation: supported,
          location: { countryCode: country }
        }
      }
    }
  })

const YT_OK =
  '<html>"countryCode":"US" ... purchaseButtonOverride ... Start trial</html>'
const YT_BLOCKED = '<html>Premium is not available in your country</html>'
const YT_CN = '<html>window.location = "https://www.google.cn"</html>'
const YT_REGION_ONLY = '<html>"countryCode":"US"</html>'
const YT_CHANGED = '<html><body>Unexpected page structure</body></html>'

const maxBody = (country) =>
  `<html>{"countryCode":"${country.toLowerCase()}"}` +
  '"url":"/us/es especial""url":"/de/de""url":"/jp/ja"</html>'

// Hulu 的正向证据是 __NEXT_DATA__ 里的 pageType，不是单看 200
const HULU_OK =
  '<html><script id="__NEXT_DATA__" type="application/json">' +
  '{"props":{"pageProps":{"asPath":"/welcome","pageType":"LandingPage"}}}' +
  '</script></html>'
const HULU_BLOCKED = '<html>not available in your region</html>'
// 200 但不是真正的落地页（维护页 / 反爬页）
const HULU_PLACEHOLDER = '<html><body>We will be right back</body></html>'
// 带 __NEXT_DATA__ 但 pageType 不是 LandingPage
const HULU_ERROR_PAGE =
  '<html><script id="__NEXT_DATA__" type="application/json">' +
  '{"props":{"pageProps":{"pageType":"MaintenancePage"}}}</script></html>'

const GPT_OK = JSON.stringify({ cookie_consent_required: false })
const GPT_BLOCKED = JSON.stringify({ detail: 'unsupported_country' })
const trace = (loc) => `fl=1f2\nloc=${loc}\nwarp=off\n`

// 使用 3 字母地区码 fixture，专门覆盖查表转换逻辑
const GEMINI_OK = '<html>45631641,null,true ... ,2,1,200,"USA" ...</html>'
const GEMINI_KR = '<html>45631641,null,true ... ,2,1,200,"KOR" ...</html>'
const GEMINI_XYZ = '<html>45631641,null,true ... ,2,1,200,"XYZ" ...</html>'
const GEMINI_BLOCKED =
  '<html>Gemini isn\'t currently supported in your country</html>'
const GEMINI_CHANGED = '<html>Unexpected page structure</html>'

// 模拟数据中心出口可能收到的 Cloudflare 质询页
const CLAUDE_CHALLENGE =
  '<html><head><title>Just a moment...</title></head>cloudflare</html>'
const CLAUDE_CHALLENGE_HEADERS = { 'cf-mitigated': 'challenge' }
const CLAUDE_BLOCKED = '<html>app-unavailable-in-region</html>'
const CLAUDE_API_AUTH = JSON.stringify({
  type: 'error',
  error: {
    type: 'authentication_error',
    message: 'x-api-key header is required'
  }
})
const CLAUDE_API_BLOCKED = JSON.stringify({
  type: 'error',
  error: {
    type: 'permission_error',
    message: 'Claude is not available in your country'
  }
})

const NF_FULL = /netflix\.com\/title\/81280792/
const NF_ORIG = /netflix\.com\/title\/80018499/
const NF_HK_URL = /netflix\.com\/hk-en\/title\//
const DISNEY_HOME_URL = /disneyplus\.com/
const DISNEY_API_URL = /bamgrid\.com/
const YT_URL = /youtube\.com\/premium/
const MAX_URL = /hbomax\.com/
const HULU_URL = /hulu\.com/
const GPT_GATE_URL = /api\.openai\.com\/compliance/
const GPT_TRACE_URL = /chatgpt\.com\/cdn-cgi\/trace/
const GEMINI_URL = /gemini\.google\.com/
const CLAUDE_PAGE_URL = /claude\.ai\/login/
const CLAUDE_TRACE_URL = /claude\.ai\/cdn-cgi\/trace/
const CLAUDE_API_URL = /api\.anthropic\.com\/v1\/models/
const EGRESS_TRACE_URL = /www\.cloudflare\.com\/cdn-cgi\/trace/
const okDisney = [
  { match: DISNEY_HOME_URL, status: 200, body: DISNEY_HOME },
  { match: DISNEY_API_URL, status: 200, body: disneyApiBody('US', true) }
]
const okYoutube = [{ match: YT_URL, status: 200, body: YT_OK }]

const okEverything = [
  { match: NF_FULL, status: 200, body: NF_US },
  ...okDisney,
  { match: MAX_URL, status: 200, body: maxBody('US') },
  ...okYoutube,
  { match: HULU_URL, status: 200, body: HULU_OK },
  { match: GPT_GATE_URL, status: 200, body: GPT_OK },
  { match: GPT_TRACE_URL, status: 200, body: trace('US') },
  { match: GEMINI_URL, status: 200, body: GEMINI_OK },
  {
    match: CLAUDE_PAGE_URL,
    status: 403,
    headers: CLAUDE_CHALLENGE_HEADERS,
    body: CLAUDE_CHALLENGE
  },
  { match: CLAUDE_API_URL, status: 401, body: CLAUDE_API_AUTH },
  { match: CLAUDE_TRACE_URL, status: 200, body: trace('US') }
]

const CASES = {
  'netflix-full': {
    argument: 'services=netflix|disney|youtube&budget=12',
    routes: [
      { match: NF_FULL, status: 200, body: NF_US },
      ...okDisney,
      ...okYoutube
    ],
    expect: {
      doneCount: 1,
      contains: [
        '🟢 Netflix · Unlocked · 🇺🇸 US',
        '🟢 Disney+ · Unlocked · 🇺🇸 US',
        '🟢 YouTube · Unlocked · 🇺🇸 US'
      ],
      notContains: ['区域限制', '超时', '未检测'],
      tone: 'normal'
    }
  },

  'netflix-partial': {
    argument: 'services=netflix&budget=12',
    routes: [
      { match: NF_FULL, status: 404, body: NF_GONE },
      { match: NF_ORIG, status: 200, body: NF_US }
    ],
    expect: {
      doneCount: 1,
      contains: ['🟡 Netflix · Originals Only · 🇺🇸 US'],
      notContains: ['区域限制'],
      title: '服务解锁检测 · 1/1',
      tone: 'normal'
    }
  },

  'netflix-blocked': {
    argument: 'services=netflix&budget=12',
    routes: [{ match: NF_FULL, status: 403, body: '' }],
    expect: {
      doneCount: 1,
      contains: ['🔴 Netflix · Unavailable · 🌐 Unknown'],
      tone: 'alert'
    }
  },

  // 片源 200 足以证明可用，但读不到地区时不得默认成 US
  'netflix-region-unknown': {
    argument: 'services=netflix&budget=12',
    routes: [{ match: NF_FULL, status: 200, body: NF_NO_REGION }],
    expect: {
      doneCount: 1,
      contains: ['🟢 Netflix · Unlocked · 🌐 Unknown'],
      notContains: ['🇺🇸 US'],
      tone: 'normal'
    }
  },

  // 回归：可用页面含隐藏 "Oh no!" 模板，不得误判为仅自制剧
  'netflix-hidden-template': {
    argument: 'services=netflix&budget=12',
    routes: [
      { match: NF_FULL, status: 200, body: NF_US },
      { match: NF_ORIG, status: 200, body: NF_US }
    ],
    expect: {
      doneCount: 1,
      contains: ['🟢 Netflix · Unlocked · 🇺🇸 US'],
      notContains: ['仅自制剧', '区域限制'],
      tone: 'normal'
    }
  },

  // 回归：GraphQL 静态 token 失效时，首页判据必须仍然成立
  'disney-api-dead': {
    argument: 'services=disney&budget=12',
    routes: [
      { match: DISNEY_HOME_URL, status: 200, body: DISNEY_HOME },
      { match: DISNEY_API_URL, status: 200, body: DISNEY_API_DEAD }
    ],
    expect: {
      doneCount: 1,
      contains: ['🟢 Disney+ · Unlocked · 🇺🇸 US'],
      notContains: ['区域限制', '异常'],
      tone: 'normal'
    }
  },

  // 首页的明确地区禁用证据不得被 GraphQL session 覆盖
  'disney-explicit-block-wins': {
    argument: 'services=disney&budget=12',
    routes: [
      {
        match: DISNEY_HOME_URL,
        status: 200,
        body: '<html>Sorry, Disney+ is not available</html>'
      },
      { match: DISNEY_API_URL, status: 200, body: disneyApiBody('US', true) }
    ],
    expect: {
      doneCount: 1,
      contains: ['🔴 Disney+ · Unavailable · 🇺🇸 US'],
      tone: 'alert'
    }
  },

  'disney-coming-soon': {
    argument: 'services=disney&budget=12',
    routes: [
      {
        match: DISNEY_HOME_URL,
        status: 200,
        body: disneyHomeBody('TR', false)
      },
      { match: DISNEY_API_URL, status: 200, body: DISNEY_API_DEAD }
    ],
    expect: {
      doneCount: 1,
      contains: ['🟡 Disney+ · Coming Soon · 🇹🇷 TR'],
      tone: 'normal'
    }
  },

  'disney-hotstar': {
    argument: 'services=disney&budget=12',
    routes: [
      {
        match: DISNEY_HOME_URL,
        status: 200,
        body: disneyHomeBody('ID', true)
      },
      { match: DISNEY_API_URL, status: 200, body: DISNEY_API_DEAD }
    ],
    expect: {
      doneCount: 1,
      contains: ['🟡 Disney+ · Hotstar · 🇮🇩 ID'],
      tone: 'normal'
    }
  },

  // 地区存在但两个来源都没有 supported 布尔值时不得默认已解锁
  'disney-missing-supported': {
    argument: 'services=disney&budget=12',
    routes: [
      {
        match: DISNEY_HOME_URL,
        status: 200,
        body: '<html>{"location":"US","region":"us"}</html>'
      },
      { match: DISNEY_API_URL, status: 200, body: DISNEY_API_DEAD }
    ],
    expect: {
      doneCount: 1,
      contains: ['🟠 Disney+ · Detection Error'],
      notContains: ['Unlocked', '🇺🇸 US'],
      tone: 'warn'
    }
  },

  'netflix-redirect': {
    argument: 'services=netflix&budget=12',
    routes: [
      {
        match: NF_FULL,
        status: 301,
        headers: { Location: 'https://www.netflix.com/hk-en/title/81280792' },
        body: ''
      },
      { match: NF_HK_URL, status: 200, body: NF_HK }
    ],
    expect: {
      doneCount: 1,
      contains: ['🟢 Netflix · Unlocked · 🇭🇰 HK'],
      notContains: ['区域限制'],
      tone: 'normal'
    }
  },

  'youtube-blocked': {
    argument: 'services=youtube&budget=12',
    routes: [{ match: YT_URL, status: 200, body: YT_BLOCKED }],
    expect: {
      doneCount: 1,
      contains: ['🔴 YouTube · Unavailable · 🌐 Unknown'],
      tone: 'alert'
    }
  },

  'youtube-cn-redirect': {
    argument: 'services=youtube&budget=12',
    routes: [{ match: YT_URL, status: 200, body: YT_CN }],
    expect: {
      doneCount: 1,
      contains: ['🔴 YouTube · Unavailable · 🇨🇳 CN'],
      tone: 'alert'
    }
  },

  // 200 页面同时缺少地区和购买标记时视为判据失效，
  // 不得因为「没找到按钮」就误报为地区限制。
  'youtube-structure-changed': {
    argument: 'services=youtube&budget=12',
    routes: [{ match: YT_URL, status: 200, body: YT_CHANGED }],
    expect: {
      doneCount: 1,
      contains: ['🟠 YouTube · Detection Error'],
      notContains: ['Unavailable'],
      tone: 'warn'
    }
  },

  // 无 Cookie 页面判据不足时才补发 Cookie 请求
  'youtube-cookie-fallback': {
    argument: 'services=youtube&budget=12',
    routes: [
      {
        match: YT_URL,
        when: (opts) => !opts.headers.Cookie,
        status: 200,
        body: YT_CHANGED
      },
      {
        match: YT_URL,
        when: (opts) => Boolean(opts.headers.Cookie),
        status: 200,
        body: YT_OK
      }
    ],
    expect: {
      doneCount: 1,
      contains: ['🟢 YouTube · Unlocked · 🇺🇸 US'],
      tone: 'normal'
    }
  },

  // 第一次 200 只有地区码时必须以 Cookie 重试为最终证据，
  // 重试限流不能借第一次的模糊页面误报成地区不可用。
  'youtube-cookie-retry-429': {
    argument: 'services=youtube&budget=12',
    routes: [
      {
        match: YT_URL,
        when: (opts) => !opts.headers.Cookie,
        status: 200,
        body: YT_REGION_ONLY
      },
      {
        match: YT_URL,
        when: (opts) => Boolean(opts.headers.Cookie),
        status: 429,
        body: ''
      }
    ],
    expect: {
      doneCount: 1,
      contains: ['🟠 YouTube · Rate Limited（429）'],
      notContains: ['Unavailable'],
      tone: 'warn'
    }
  },

  'network-error': {
    argument: 'services=disney&budget=12',
    routes: [
      { match: DISNEY_HOME_URL, error: 'connection reset' },
      { match: DISNEY_API_URL, error: 'connection reset' }
    ],
    expect: {
      doneCount: 1,
      contains: ['🟠 Disney+ · Network Error'],
      notContains: ['区域限制'],
      tone: 'warn'
    }
  },

  // 预算耗尽必须显示为超时，绝不能变成「区域限制」
  'budget-empty': {
    argument: 'services=netflix|disney|youtube&budget=4',
    routes: [
      { match: NF_FULL, status: 200, body: NF_US, delayMs: 200 },
      { match: DISNEY_HOME_URL, status: 200, body: DISNEY_HOME, delayMs: 9000 },
      { match: DISNEY_API_URL, status: 200, body: '', delayMs: 9000 },
      { match: YT_URL, status: 200, body: YT_OK, delayMs: 9000 }
    ],
    settleMs: 500,
    expect: {
      doneCount: 1,
      contains: ['🟢 Netflix · Unlocked · 🇺🇸 US'],
      notContains: ['区域限制'],
      matches: [/🟠 Disney\+ ·/, /🟠 YouTube ·/],
      tone: 'warn'
    }
  },

  // 剩余 500ms 时必须先保留 200ms 收尾余量；可用于请求的 300ms
  // 已触及 guard，不应再发起 Netflix 的第二个片名请求。
  'request-reserve': {
    argument: 'services=netflix&budget=4',
    routes: [
      { match: NF_FULL, status: 404, body: NF_GONE, delayMs: 3500 },
      { match: NF_ORIG, status: 200, body: NF_US }
    ],
    expect: {
      doneCount: 1,
      contains: ['🟠 Netflix · Budget Exhausted'],
      notContains: ['Originals Only'],
      notRequested: [NF_ORIG],
      tone: 'warn'
    }
  },

  'late-callback': {
    argument: 'services=netflix&budget=12',
    routes: [{ match: NF_FULL, status: 200, body: NF_US, delayMs: 9000 }],
    settleMs: 2500,
    expect: {
      doneCount: 1,
      contains: ['🟠 Netflix · Timeout'],
      notContains: ['区域限制']
    }
  },

  'all-services': {
    argument: 'services=all&budget=20',
    routes: okEverything,
    expect: {
      doneCount: 1,
      contains: [
        '🟢 Netflix · Unlocked · 🇺🇸 US',
        '🟢 Disney+ · Unlocked · 🇺🇸 US',
        '🟢 HBO Max · Unlocked · 🇺🇸 US',
        '🟢 Hulu · Unlocked · 🇺🇸 US\n' +
          '🟢 YouTube · Unlocked · 🇺🇸 US',
        '\n\n🟢 ChatGPT',
        '🟢 ChatGPT · Supported · 🇺🇸 US',
        '🟢 Gemini · Supported · 🇺🇸 US',
        '🟢 Claude · Supported · 🇺🇸 US'
      ],
      notContains: ['Viu', 'CF Challenge', '超时', 'ms'],
      tone: 'normal'
    }
  },

  // 空参数即默认，默认为全部服务
  'default-all': {
    argument: '',
    routes: okEverything,
    expect: {
      doneCount: 1,
      contains: [
        'Netflix',
        'Disney+',
        'HBO Max',
        'YouTube',
        'Hulu',
        'ChatGPT',
        'Gemini',
        'Claude'
      ],
      notContains: ['Viu'],
      tone: 'normal'
    }
  },

  // checker 一起启动，由请求闸门限制实际 HTTP 并发。
  'request-gate-all': {
    argument: 'services=all&budget=12',
    routes: okEverything.map((item) => ({ ...item, delayMs: 900 })),
    expect: {
      doneCount: 1,
      notContains: ['Timeout'],
      tone: 'normal'
    }
  },

  // 有失败项但可用率仍在阈值以上 → warn 橙，而不是 alert 红
  'warn-tone': {
    argument: 'services=netflix|disney|max|youtube&budget=12',
    routes: [
      { match: NF_FULL, status: 200, body: NF_US },
      ...okDisney,
      { match: MAX_URL, status: 200, body: maxBody('US') },
      { match: YT_URL, status: 503, body: '' }
    ],
    expect: {
      doneCount: 1,
      notContains: ['区域限制'],
      matches: [/🟠 YouTube ·/],
      tone: 'warn'
    }
  },

  // 各服务地区独立：失败项不得继承 Netflix 已取得的 JP
  'mixed-region-no-inference': {
    argument: 'services=netflix|max|youtube&budget=12',
    routes: [
      { match: NF_FULL, status: 200, body: NF_JP },
      { match: MAX_URL, status: 503, body: '' },
      { match: YT_URL, status: 429, body: '' }
    ],
    expect: {
      doneCount: 1,
      contains: [
        '🟢 Netflix · Unlocked · 🇯🇵 JP',
        '🟠 HBO Max · Service Error（503）',
        '🟠 YouTube · Rate Limited（429）'
      ],
      notContains: [
        'HBO Max · Service Error（503） ·',
        'YouTube · Rate Limited（429） ·'
      ],
      tone: 'warn'
    }
  },

  // 回归：3 字母码必须查表，KOR→KR 而不是截断成 KO
  'gemini-alpha3': {
    argument: 'services=gemini&budget=12',
    routes: [{ match: GEMINI_URL, status: 200, body: GEMINI_KR }],
    expect: {
      doneCount: 1,
      contains: ['🟢 Gemini · Supported · 🇰🇷 KR'],
      tone: 'normal'
    }
  },

  // 未知三字母码保留原值，不能截断成并不存在的两字母地区
  'gemini-unknown-alpha3': {
    argument: 'services=gemini&budget=12',
    routes: [{ match: GEMINI_URL, status: 200, body: GEMINI_XYZ }],
    expect: {
      doneCount: 1,
      contains: ['🟢 Gemini · Supported · XYZ'],
      notContains: ['🇽🇾 XY'],
      tone: 'normal'
    }
  },

  // 开放标记和明确限制文案都缺失时只能判判据失效
  'gemini-structure-changed': {
    argument: 'services=gemini&budget=12',
    routes: [{ match: GEMINI_URL, status: 200, body: GEMINI_CHANGED }],
    expect: {
      doneCount: 1,
      contains: ['🟠 Gemini · Detection Error'],
      notContains: ['Unsupported'],
      tone: 'warn'
    }
  },

  'gemini-blocked': {
    argument: 'services=gemini&budget=12',
    routes: [{ match: GEMINI_URL, status: 200, body: GEMINI_BLOCKED }],
    expect: {
      doneCount: 1,
      contains: ['🔴 Gemini · Unsupported · 🌐 Unknown'],
      tone: 'alert'
    }
  },

  // 任意 HTTP 200 不足以证明 ChatGPT 可用，响应结构也必须有效
  'chatgpt-invalid-200': {
    argument: 'services=chatgpt&budget=12',
    routes: [
      { match: GPT_GATE_URL, status: 200, body: '<html>challenge</html>' },
      { match: GPT_TRACE_URL, status: 200, body: trace('US') }
    ],
    expect: {
      doneCount: 1,
      contains: ['🟠 ChatGPT · Detection Error'],
      notContains: ['Supported', '🇺🇸 US'],
      tone: 'warn'
    }
  },

  'chatgpt-blocked': {
    argument: 'services=chatgpt&budget=12',
    routes: [
      { match: GPT_GATE_URL, status: 403, body: GPT_BLOCKED },
      { match: GPT_TRACE_URL, status: 200, body: trace('SG') }
    ],
    expect: {
      doneCount: 1,
      contains: ['🔴 ChatGPT · Unsupported · 🇸🇬 SG'],
      tone: 'alert'
    }
  },

  'claude-blocked': {
    argument: 'services=claude&budget=12',
    routes: [
      { match: CLAUDE_PAGE_URL, status: 200, body: CLAUDE_BLOCKED },
      { match: CLAUDE_TRACE_URL, status: 200, body: trace('CN') }
    ],
    expect: {
      doneCount: 1,
      contains: ['🔴 Claude · Unsupported · 🇨🇳 CN'],
      tone: 'alert'
    }
  },

  // API 的明确地区封锁证据必须优先于登录页的通用 200。
  'claude-api-blocked-priority': {
    argument: 'services=claude&budget=12',
    routes: [
      { match: CLAUDE_PAGE_URL, status: 200, body: '<html>Login</html>' },
      { match: CLAUDE_API_URL, status: 403, body: CLAUDE_API_BLOCKED },
      { match: CLAUDE_TRACE_URL, status: 200, body: trace('CN') }
    ],
    expect: {
      doneCount: 1,
      contains: ['🔴 Claude · Unsupported · 🇨🇳 CN'],
      tone: 'alert'
    }
  },

  'max-third-party': {
    argument: 'services=max&budget=12',
    routes: [{ match: MAX_URL, status: 200, body: maxBody('JP') }],
    expect: {
      doneCount: 1,
      contains: ['🟡 HBO Max · via U-NEXT · 🇯🇵 JP'],
      tone: 'normal'
    }
  },

  'hulu-blocked': {
    argument: 'services=hulu&budget=12',
    routes: [{ match: HULU_URL, status: 200, body: HULU_BLOCKED }],
    expect: {
      doneCount: 1,
      contains: ['🔴 Hulu · Unavailable · 🌐 Unknown'],
      tone: 'alert'
    }
  },

  // ── 5xx / 429 一律归 ERROR，绝不冒充「区域限制」 ──────────────
  'transient-5xx': {
    argument: 'services=netflix|disney|max|youtube|hulu&budget=12',
    routes: [
      { match: NF_FULL, status: 503, body: '' },
      { match: NF_ORIG, status: 503, body: '' },
      { match: DISNEY_HOME_URL, status: 503, body: '' },
      { match: DISNEY_API_URL, status: 503, body: '' },
      { match: MAX_URL, status: 502, body: '' },
      { match: YT_URL, status: 429, body: '' },
      { match: HULU_URL, status: 503, body: '' }
    ],
    expect: {
      doneCount: 1,
      notContains: ['区域限制'],
      notRequested: [EGRESS_TRACE_URL],
      matches: [
        /🟠 Netflix · Service Error（503）/,
        /🟠 YouTube · Rate Limited（429）/
      ],
      tone: 'warn'
    }
  },

  // YouTube 429 不得因为缺少购买标记落到「区域限制」
  'youtube-429': {
    argument: 'services=youtube&budget=12',
    routes: [{ match: YT_URL, status: 429, body: '' }],
    expect: {
      doneCount: 1,
      contains: ['🟠 YouTube · Rate Limited（429）'],
      notContains: ['区域限制'],
      tone: 'warn'
    }
  },

  // 带 __NEXT_DATA__ 但 pageType 非 LandingPage，同样不能算解锁
  'hulu-non-landing': {
    argument: 'services=hulu&budget=12',
    routes: [{ match: HULU_URL, status: 200, body: HULU_ERROR_PAGE }],
    expect: {
      doneCount: 1,
      contains: ['🟠 Hulu · Detection Error'],
      notContains: ['区域限制'],
      tone: 'warn'
    }
  },

  // Hulu 返回 200 占位页时不得报成美国解锁
  'hulu-placeholder': {
    argument: 'services=hulu&budget=12',
    routes: [{ match: HULU_URL, status: 200, body: HULU_PLACEHOLDER }],
    expect: {
      doneCount: 1,
      contains: ['🟠 Hulu · Detection Error'],
      notContains: ['区域限制'],
      tone: 'warn'
    }
  },

  // 回归：login 请求彻底失败不得并进「未验证」，要按原始 reason
  // 归类为超时；技术失败不把另一个 trace 请求的地区拼到结果上
  'claude-request-failed': {
    argument: 'services=claude&budget=12',
    routes: [
      { match: CLAUDE_PAGE_URL, error: 'connection reset' },
      { match: CLAUDE_TRACE_URL, status: 200, body: trace('JP') }
    ],
    expect: {
      doneCount: 1,
      contains: ['🟠 Claude · Network Error'],
      notContains: ['🇯🇵 JP'],
      tone: 'warn'
    }
  },

  // Claude 质询页记 UNKNOWN，不计入已解锁数
  'claude-challenged': {
    argument: 'services=claude&budget=12',
    routes: [
      {
        match: CLAUDE_PAGE_URL,
        status: 403,
        headers: CLAUDE_CHALLENGE_HEADERS,
        body: '<html>challenge</html>'
      },
      { match: CLAUDE_TRACE_URL, status: 200, body: trace('US') }
    ],
    expect: {
      doneCount: 1,
      contains: ['🔵 Claude · Unverified · 🇺🇸 US'],
      notContains: ['CF Challenge', '403', 'ms'],
      tone: 'error'
    }
  },

  // cf-mitigated 头缺失时，保留对旧式质询页标题的兼容识别
  'claude-challenge-title-fallback': {
    argument: 'services=claude&budget=12',
    routes: [
      { match: CLAUDE_PAGE_URL, status: 403, body: CLAUDE_CHALLENGE },
      { match: CLAUDE_TRACE_URL, status: 200, body: trace('US') }
    ],
    expect: {
      doneCount: 1,
      contains: ['🔵 Claude · Unverified · 🇺🇸 US'],
      notContains: ['CF Challenge', '403', 'ms'],
      tone: 'error'
    }
  },

  // ── 可用率阈值边界：默认 2/3 ────────────────────────────────
  // 3 项里 2 项可用 = 恰好在阈值上，不转红
  'ratio-at-threshold': {
    argument: 'services=netflix|disney|max&budget=12',
    routes: [
      { match: NF_FULL, status: 200, body: NF_US },
      ...okDisney,
      { match: MAX_URL, status: 503, body: '' }
    ],
    // 恰好在阈值上不转红；但存在失败项，所以是 warn 橙而非 normal 紫
    expect: { doneCount: 1, tone: 'warn' }
  },

  // 3 项里只有 1 项可用 = 低于阈值
  'ratio-below-threshold': {
    argument: 'services=netflix|disney|max&budget=12',
    routes: [
      { match: NF_FULL, status: 200, body: NF_US },
      {
        match: DISNEY_HOME_URL,
        status: 200,
        body: '<html>Sorry, Disney+ is not available</html>'
      },
      { match: DISNEY_API_URL, status: 503, body: '' },
      { match: MAX_URL, status: 200, body: maxBody('CN') }
    ],
    expect: { doneCount: 1, tone: 'alert' }
  },

  // 单个未验证项不得因为「可用率 0」而转红：UNKNOWN 不进分母
  'unknown-not-counted': {
    argument: 'services=claude&budget=12',
    routes: [
      {
        match: CLAUDE_PAGE_URL,
        status: 403,
        headers: CLAUDE_CHALLENGE_HEADERS,
        body: CLAUDE_CHALLENGE
      },
      { match: CLAUDE_TRACE_URL, status: 200, body: trace('US') }
    ],
    expect: { doneCount: 1, tone: 'error' }
  },

  // Gemini 慢响应不得超过 requestTimeoutMaxMs
  'gemini-timeout-ceiling': {
    argument: 'services=gemini&budget=25',
    routes: [
      { match: GEMINI_URL, status: 200, body: GEMINI_OK, delayMs: 14000 }
    ],
    settleMs: 300,
    expect: {
      doneCount: 1,
      contains: ['🟠 Gemini · Timeout'],
      notContains: ['🇺🇸 US']
    }
  }
}

const makeClient = (spec, requests) => {
  const dispatch = (opts, cb) => {
    const url = typeof opts === 'string' ? opts : opts.url
    requests.push(url)
    const route = spec.routes.find(
      (item) => item.match.test(url) && (!item.when || item.when(opts))
    )
    if (!route) {
      setTimeout(() => cb(`no fixture for ${url}`, null, null), 1)
      return
    }
    setTimeout(() => {
      if (route.error) {
        cb(route.error, null, null)
        return
      }
      cb(
        null,
        { status: route.status, headers: route.headers || {} },
        route.body || ''
      )
    }, route.delayMs ?? 10)
  }
  return { get: dispatch, post: dispatch }
}

const runCase = (name) =>
  new Promise((resolve, reject) => {
    const spec = CASES[name]
    if (!spec) {
      reject(new Error(`unknown case: ${name}`))
      return
    }

    const state = { doneCount: 0, panel: null, logs: [], requests: [] }

    const guard = setTimeout(
      () => reject(new Error(`${name}: $done was never called`)),
      40000
    )

    const sandbox = {
      console: { log: (msg) => state.logs.push(String(msg)) },
      setTimeout,
      clearTimeout,
      $argument: spec.argument,
      $httpClient: makeClient(spec, state.requests),
      $done: (result) => {
        state.doneCount += 1
        if (state.doneCount > 1) return
        state.panel = result
        setTimeout(() => {
          clearTimeout(guard)
          resolve(state)
        }, spec.settleMs ?? 50)
      }
    }

    const source = readFileSync(target, 'utf8')
    try {
      vm.runInNewContext(source, vm.createContext(sandbox), {
        filename: 'stream.js'
      })
    } catch (error) {
      clearTimeout(guard)
      reject(error)
    }
  })

const verify = (name, state) => {
  const spec = CASES[name]
  const want = spec.expect
  const panel = state.panel || {}
  const content = String(panel.content ?? '')
  const problems = []

  if (want.doneCount !== undefined && state.doneCount !== want.doneCount) {
    problems.push(`$done called ${state.doneCount}x, want ${want.doneCount}`)
  }
  if (want.title && panel.title !== want.title) {
    problems.push(`title=${panel.title}, want ${want.title}`)
  }
  const expectedContent = want.contains || []
  expectedContent.forEach((needle) => {
    if (!content.includes(needle)) problems.push(`missing: ${needle}`)
  })
  const rejectedContent = want.notContains || []
  rejectedContent.forEach((needle) => {
    if (content.includes(needle)) problems.push(`unexpected: ${needle}`)
  })
  const expectedPatterns = want.matches || []
  expectedPatterns.forEach((pattern) => {
    if (!pattern.test(content)) problems.push(`no match: ${pattern}`)
  })
  const rejectedRequests = want.notRequested || []
  rejectedRequests.forEach((pattern) => {
    const requested = state.requests.some((url) => pattern.test(url))
    if (requested) problems.push(`unexpected request: ${pattern}`)
  })
  // 面板改用 icon + 动态 icon-color（icon 与 style 互斥），
  // 断言仍按语义色名书写，这里把颜色反查回来比对
  const tone = TONE_BY_COLOR[panel['icon-color']] || panel['icon-color']
  if (want.tone && tone !== want.tone) {
    problems.push(`tone=${tone}, want ${want.tone}`)
  }
  if (want.icon && panel.icon !== want.icon) {
    problems.push(`icon=${panel.icon}, want ${want.icon}`)
  }
  return problems
}

const main = async () => {
  const argv = process.argv.slice(2)
  const single = argv.includes('--case')
    ? argv[argv.indexOf('--case') + 1]
    : null
  const names = single ? [single] : Object.keys(CASES)

  const outcomes = await Promise.all(
    names.map(async (name) => {
      try {
        return { name, state: await runCase(name), error: null }
      } catch (error) {
        return { name, state: null, error }
      }
    })
  )

  let failed = 0
  outcomes.forEach(({ name, state, error }) => {
    if (error) {
      failed += 1
      console.log(`FAIL ${name}\n     ${error.message}`)
      return
    }

    const problems = verify(name, state)
    if (problems.length) {
      failed += 1
      console.log(`FAIL ${name}`)
      problems.forEach((item) => console.log(`     ${item}`))
      console.log(`     --- title: ${state.panel?.title}`)
      console.log(
        String(state.panel?.content ?? '')
          .split('\n')
          .map((line) => `     | ${line}`)
          .join('\n')
      )
      return
    }

    const tone = TONE_BY_COLOR[state.panel['icon-color']] || '?'
    console.log(`PASS ${name}  [${tone}] ${state.panel.title}`)
  })

  console.log(`\n${names.length - failed}/${names.length} passed`)
  process.exit(failed ? 1 : 0)
}

main()
// 将顶部 UI 约定的全局颜色反查成语义色名，便于断言聚合结果
const TONE_BY_COLOR = {
  '#BF5AF2': 'normal',
  '#FF9F0A': 'warn',
  '#FF3B30': 'alert',
  '#8E8E93': 'error'
}

// 真实的可用页面同样含有 "Oh no! ..." 隐藏模板，fixture 必须
// 复现这一点，否则会把误报重新引回来。
const NF_US =
  '<html>{"id":"us","countryName":"United States"} LEGO Ninjago' +
  '<div>Oh no! This title currently isn’t available to watch in your ' +
  'country.</div></html>'
const NF_HK = '<html>{"id":"hk","countryName":"Hong Kong"}</html>'
const NF_JP = '<html>{"id":"jp","countryName":"Japan"}</html>'
const NF_NO_REGION = '<html>LEGO Ninjago</html>'
const NF_GONE = '<html>Not Found</html>'

const disneyHomeBody = (country, hasContent) =>
  `<html>{"hasContent":${hasContent},"language":"en",` +
  `"location":"${country.toUpperCase()}","pageId":"welcome",` +
  `"region":"${country.toLowerCase()}"}</html>`

const DISNEY_HOME = disneyHomeBody('US', true)

const DISNEY_API_DEAD = JSON.stringify({
  data: null,
  errors: [{ extensions: { code: 'token.service.unauthorized.client' } }],
  extensions: { sdk: { session: null } }
})

const disneyApiBody = (country, supported) =>
  JSON.stringify({
    extensions: {
      sdk: {
        session: {
          inSupportedLocation: supported,
          location: { countryCode: country }
        }
      }
    }
  })

const YT_OK =
  '<html>"countryCode":"US" ... purchaseButtonOverride ... Start trial</html>'
const YT_BLOCKED = '<html>Premium is not available in your country</html>'
const YT_CN = '<html>window.location = "https://www.google.cn"</html>'
const YT_CHANGED = '<html><body>Unexpected page structure</body></html>'

const maxBody = (country) =>
  `<html>{"countryCode":"${country.toLowerCase()}"}` +
  '"url":"/us/es especial""url":"/de/de""url":"/jp/ja"</html>'

// Hulu 的正向证据是 __NEXT_DATA__ 里的 pageType，不是单看 200
const HULU_OK =
  '<html><script id="__NEXT_DATA__" type="application/json">' +
  '{"props":{"pageProps":{"asPath":"/welcome","pageType":"LandingPage"}}}' +
  '</script></html>'
const HULU_BLOCKED = '<html>not available in your region</html>'
// 200 但不是真正的落地页（维护页 / 反爬页）
const HULU_PLACEHOLDER = '<html><body>We will be right back</body></html>'
// 带 __NEXT_DATA__ 但 pageType 不是 LandingPage
const HULU_ERROR_PAGE =
  '<html><script id="__NEXT_DATA__" type="application/json">' +
  '{"props":{"pageProps":{"pageType":"MaintenancePage"}}}</script></html>'

const GPT_OK = JSON.stringify({ cookie_consent_required: false })
const GPT_BLOCKED = JSON.stringify({ detail: 'unsupported_country' })
const trace = (loc) => `fl=1f2\nloc=${loc}\nwarp=off\n`

// 使用 3 字母地区码 fixture，专门覆盖查表转换逻辑
const GEMINI_OK = '<html>45631641,null,true ... ,2,1,200,"USA" ...</html>'
const GEMINI_KR = '<html>45631641,null,true ... ,2,1,200,"KOR" ...</html>'
const GEMINI_XYZ = '<html>45631641,null,true ... ,2,1,200,"XYZ" ...</html>'
const GEMINI_BLOCKED =
  '<html>Gemini isn\'t currently supported in your country</html>'
const GEMINI_CHANGED = '<html>Unexpected page structure</html>'

// 模拟数据中心出口可能收到的 Cloudflare 质询页
const CLAUDE_CHALLENGE =
  '<html><head><title>Just a moment...</title></head>cloudflare</html>'
const CLAUDE_CHALLENGE_HEADERS = { 'cf-mitigated': 'challenge' }
const CLAUDE_BLOCKED = '<html>app-unavailable-in-region</html>'
const CLAUDE_API_AUTH = JSON.stringify({
  type: 'error',
  error: {
    type: 'authentication_error',
    message: 'x-api-key header is required'
  }
})

const NF_FULL = /netflix\.com\/title\/81280792/
const NF_ORIG = /netflix\.com\/title\/80018499/
const NF_HK_URL = /netflix\.com\/hk-en\/title\//
const DISNEY_HOME_URL = /disneyplus\.com/
const DISNEY_API_URL = /bamgrid\.com/
const YT_URL = /youtube\.com\/premium/
const MAX_URL = /hbomax\.com/
const HULU_URL = /hulu\.com/
const GPT_GATE_URL = /api\.openai\.com\/compliance/
const GPT_TRACE_URL = /chatgpt\.com\/cdn-cgi\/trace/
const GEMINI_URL = /gemini\.google\.com/
const CLAUDE_PAGE_URL = /claude\.ai\/login/
const CLAUDE_TRACE_URL = /claude\.ai\/cdn-cgi\/trace/
const CLAUDE_API_URL = /api\.anthropic\.com\/v1\/models/
const EGRESS_TRACE_URL = /www\.cloudflare\.com\/cdn-cgi\/trace/
const okDisney = [
  { match: DISNEY_HOME_URL, status: 200, body: DISNEY_HOME },
  { match: DISNEY_API_URL, status: 200, body: disneyApiBody('US', true) }
]
const okYoutube = [{ match: YT_URL, status: 200, body: YT_OK }]

const okEverything = [
  { match: NF_FULL, status: 200, body: NF_US },
  ...okDisney,
  { match: MAX_URL, status: 200, body: maxBody('US') },
  ...okYoutube,
  { match: HULU_URL, status: 200, body: HULU_OK },
  { match: GPT_GATE_URL, status: 200, body: GPT_OK },
  { match: GPT_TRACE_URL, status: 200, body: trace('US') },
  { match: GEMINI_URL, status: 200, body: GEMINI_OK },
  {
    match: CLAUDE_PAGE_URL,
    status: 403,
    headers: CLAUDE_CHALLENGE_HEADERS,
    body: CLAUDE_CHALLENGE
  },
  { match: CLAUDE_API_URL, status: 401, body: CLAUDE_API_AUTH },
  { match: CLAUDE_TRACE_URL, status: 200, body: trace('US') }
]

const CASES = {
  'netflix-full': {
    argument: 'services=netflix|disney|youtube&budget=12',
    routes: [
      { match: NF_FULL, status: 200, body: NF_US },
      ...okDisney,
      ...okYoutube
    ],
    expect: {
      doneCount: 1,
      contains: [
        '🟢 Netflix · Unlocked · 🇺🇸 US',
        '🟢 Disney+ · Unlocked · 🇺🇸 US',
        '🟢 YouTube · Unlocked · 🇺🇸 US'
      ],
      notContains: ['区域限制', '超时', '未检测'],
      tone: 'normal'
    }
  },

  'netflix-partial': {
    argument: 'services=netflix&budget=12',
    routes: [
      { match: NF_FULL, status: 404, body: NF_GONE },
      { match: NF_ORIG, status: 200, body: NF_US }
    ],
    expect: {
      doneCount: 1,
      contains: ['🟡 Netflix · Originals Only · 🇺🇸 US'],
      notContains: ['区域限制'],
      title: '服务解锁检测 · 1/1',
      tone: 'normal'
    }
  },

  'netflix-blocked': {
    argument: 'services=netflix&budget=12',
    routes: [{ match: NF_FULL, status: 403, body: '' }],
    expect: {
      doneCount: 1,
      contains: ['🔴 Netflix · Unavailable · 🌐 Unknown'],
      tone: 'alert'
    }
  },

  // 片源 200 足以证明可用，但读不到地区时不得默认成 US
  'netflix-region-unknown': {
    argument: 'services=netflix&budget=12',
    routes: [{ match: NF_FULL, status: 200, body: NF_NO_REGION }],
    expect: {
      doneCount: 1,
      contains: ['🟢 Netflix · Unlocked · 🌐 Unknown'],
      notContains: ['🇺🇸 US'],
      tone: 'normal'
    }
  },

  // 回归：可用页面含隐藏 "Oh no!" 模板，不得误判为仅自制剧
  'netflix-hidden-template': {
    argument: 'services=netflix&budget=12',
    routes: [
      { match: NF_FULL, status: 200, body: NF_US },
      { match: NF_ORIG, status: 200, body: NF_US }
    ],
    expect: {
      doneCount: 1,
      contains: ['🟢 Netflix · Unlocked · 🇺🇸 US'],
      notContains: ['仅自制剧', '区域限制'],
      tone: 'normal'
    }
  },

  // 回归：GraphQL 静态 token 失效时，首页判据必须仍然成立
  'disney-api-dead': {
    argument: 'services=disney&budget=12',
    routes: [
      { match: DISNEY_HOME_URL, status: 200, body: DISNEY_HOME },
      { match: DISNEY_API_URL, status: 200, body: DISNEY_API_DEAD }
    ],
    expect: {
      doneCount: 1,
      contains: ['🟢 Disney+ · Unlocked · 🇺🇸 US'],
      notContains: ['区域限制', '异常'],
      tone: 'normal'
    }
  },

  // 首页的明确地区禁用证据不得被 GraphQL session 覆盖
  'disney-explicit-block-wins': {
    argument: 'services=disney&budget=12',
    routes: [
      {
        match: DISNEY_HOME_URL,
        status: 200,
        body: '<html>Sorry, Disney+ is not available</html>'
      },
      { match: DISNEY_API_URL, status: 200, body: disneyApiBody('US', true) }
    ],
    expect: {
      doneCount: 1,
      contains: ['🔴 Disney+ · Unavailable · 🇺🇸 US'],
      tone: 'alert'
    }
  },

  'disney-coming-soon': {
    argument: 'services=disney&budget=12',
    routes: [
      {
        match: DISNEY_HOME_URL,
        status: 200,
        body: disneyHomeBody('TR', false)
      },
      { match: DISNEY_API_URL, status: 200, body: DISNEY_API_DEAD }
    ],
    expect: {
      doneCount: 1,
      contains: ['🟡 Disney+ · Coming Soon · 🇹🇷 TR'],
      tone: 'normal'
    }
  },

  'disney-hotstar': {
    argument: 'services=disney&budget=12',
    routes: [
      {
        match: DISNEY_HOME_URL,
        status: 200,
        body: disneyHomeBody('ID', true)
      },
      { match: DISNEY_API_URL, status: 200, body: DISNEY_API_DEAD }
    ],
    expect: {
      doneCount: 1,
      contains: ['🟡 Disney+ · Hotstar · 🇮🇩 ID'],
      tone: 'normal'
    }
  },

  // 地区存在但两个来源都没有 supported 布尔值时不得默认已解锁
  'disney-missing-supported': {
    argument: 'services=disney&budget=12',
    routes: [
      {
        match: DISNEY_HOME_URL,
        status: 200,
        body: '<html>{"location":"US","region":"us"}</html>'
      },
      { match: DISNEY_API_URL, status: 200, body: DISNEY_API_DEAD }
    ],
    expect: {
      doneCount: 1,
      contains: ['🟠 Disney+ · Detection Error'],
      notContains: ['Unlocked', '🇺🇸 US'],
      tone: 'warn'
    }
  },

  'netflix-redirect': {
    argument: 'services=netflix&budget=12',
    routes: [
      {
        match: NF_FULL,
        status: 301,
        headers: { Location: 'https://www.netflix.com/hk-en/title/81280792' },
        body: ''
      },
      { match: NF_HK_URL, status: 200, body: NF_HK }
    ],
    expect: {
      doneCount: 1,
      contains: ['🟢 Netflix · Unlocked · 🇭🇰 HK'],
      notContains: ['区域限制'],
      tone: 'normal'
    }
  },

  'youtube-blocked': {
    argument: 'services=youtube&budget=12',
    routes: [{ match: YT_URL, status: 200, body: YT_BLOCKED }],
    expect: {
      doneCount: 1,
      contains: ['🔴 YouTube · Unavailable · 🌐 Unknown'],
      tone: 'alert'
    }
  },

  'youtube-cn-redirect': {
    argument: 'services=youtube&budget=12',
    routes: [{ match: YT_URL, status: 200, body: YT_CN }],
    expect: {
      doneCount: 1,
      contains: ['🔴 YouTube · Unavailable · 🇨🇳 CN'],
      tone: 'alert'
    }
  },

  // 200 页面同时缺少地区和购买标记时视为判据失效，
  // 不得因为「没找到按钮」就误报为地区限制。
  'youtube-structure-changed': {
    argument: 'services=youtube&budget=12',
    routes: [{ match: YT_URL, status: 200, body: YT_CHANGED }],
    expect: {
      doneCount: 1,
      contains: ['🟠 YouTube · Detection Error'],
      notContains: ['Unavailable'],
      tone: 'warn'
    }
  },

  // 无 Cookie 页面判据不足时才补发 Cookie 请求
  'youtube-cookie-fallback': {
    argument: 'services=youtube&budget=12',
    routes: [
      {
        match: YT_URL,
        when: (opts) => !opts.headers.Cookie,
        status: 200,
        body: YT_CHANGED
      },
      {
        match: YT_URL,
        when: (opts) => Boolean(opts.headers.Cookie),
        status: 200,
        body: YT_OK
      }
    ],
    expect: {
      doneCount: 1,
      contains: ['🟢 YouTube · Unlocked · 🇺🇸 US'],
      tone: 'normal'
    }
  },

  'network-error': {
    argument: 'services=disney&budget=12',
    routes: [
      { match: DISNEY_HOME_URL, error: 'connection reset' },
      { match: DISNEY_API_URL, error: 'connection reset' }
    ],
    expect: {
      doneCount: 1,
      contains: ['🟠 Disney+ · Network Error'],
      notContains: ['区域限制'],
      tone: 'warn'
    }
  },

  // 预算耗尽必须显示为超时，绝不能变成「区域限制」
  'budget-empty': {
    argument: 'services=netflix|disney|youtube&budget=4',
    routes: [
      { match: NF_FULL, status: 200, body: NF_US, delayMs: 200 },
      { match: DISNEY_HOME_URL, status: 200, body: DISNEY_HOME, delayMs: 9000 },
      { match: DISNEY_API_URL, status: 200, body: '', delayMs: 9000 },
      { match: YT_URL, status: 200, body: YT_OK, delayMs: 9000 }
    ],
    settleMs: 500,
    expect: {
      doneCount: 1,
      contains: ['🟢 Netflix · Unlocked · 🇺🇸 US'],
      notContains: ['区域限制'],
      matches: [/🟠 Disney\+ ·/, /🟠 YouTube ·/],
      tone: 'warn'
    }
  },

  'late-callback': {
    argument: 'services=netflix&budget=12',
    routes: [{ match: NF_FULL, status: 200, body: NF_US, delayMs: 9000 }],
    settleMs: 2500,
    expect: {
      doneCount: 1,
      contains: ['🟠 Netflix · Timeout'],
      notContains: ['区域限制']
    }
  },

  'all-services': {
    argument: 'services=all&budget=20',
    routes: okEverything,
    expect: {
      doneCount: 1,
      contains: [
        '🟢 Netflix · Unlocked · 🇺🇸 US',
        '🟢 Disney+ · Unlocked · 🇺🇸 US',
        '🟢 HBO Max · Unlocked · 🇺🇸 US',
        '🟢 Hulu · Unlocked · 🇺🇸 US\n' +
          '🟢 YouTube · Unlocked · 🇺🇸 US',
        '\n\n🟢 ChatGPT',
        '🟢 ChatGPT · Supported · 🇺🇸 US',
        '🟢 Gemini · Supported · 🇺🇸 US',
        '🟢 Claude · Supported · 🇺🇸 US'
      ],
      notContains: ['Viu', 'CF Challenge', '超时', 'ms'],
      tone: 'normal'
    }
  },

  // 空参数即默认，默认为全部服务
  'default-all': {
    argument: '',
    routes: okEverything,
    expect: {
      doneCount: 1,
      contains: [
        'Netflix',
        'Disney+',
        'HBO Max',
        'YouTube',
        'Hulu',
        'ChatGPT',
        'Gemini',
        'Claude'
      ],
      notContains: ['Viu'],
      tone: 'normal'
    }
  },

  // 全量服务数低于并发上限，应在一轮内跑完且无超时 / 未检测
  'concurrency-auto': {
    argument: 'services=all&budget=12',
    routes: okEverything.map((item) => ({ ...item, delayMs: 900 })),
    expect: {
      doneCount: 1,
      notContains: ['Not Checked', 'Timeout'],
      tone: 'normal'
    }
  },

  // 有失败项但可用率仍在阈值以上 → warn 橙，而不是 alert 红
  'warn-tone': {
    argument: 'services=netflix|disney|max|youtube&budget=12',
    routes: [
      { match: NF_FULL, status: 200, body: NF_US },
      ...okDisney,
      { match: MAX_URL, status: 200, body: maxBody('US') },
      { match: YT_URL, status: 503, body: '' }
    ],
    expect: {
      doneCount: 1,
      notContains: ['区域限制'],
      matches: [/🟠 YouTube ·/],
      tone: 'warn'
    }
  },

  // 各服务地区独立：失败项不得继承 Netflix 已取得的 JP
  'mixed-region-no-inference': {
    argument: 'services=netflix|max|youtube&budget=12',
    routes: [
      { match: NF_FULL, status: 200, body: NF_JP },
      { match: MAX_URL, status: 503, body: '' },
      { match: YT_URL, status: 429, body: '' }
    ],
    expect: {
      doneCount: 1,
      contains: [
        '🟢 Netflix · Unlocked · 🇯🇵 JP',
        '🟠 HBO Max · Service Error（503）',
        '🟠 YouTube · Rate Limited（429）'
      ],
      notContains: [
        'HBO Max · Service Error（503） ·',
        'YouTube · Rate Limited（429） ·'
      ],
      tone: 'warn'
    }
  },

  // 回归：3 字母码必须查表，KOR→KR 而不是截断成 KO
  'gemini-alpha3': {
    argument: 'services=gemini&budget=12',
    routes: [{ match: GEMINI_URL, status: 200, body: GEMINI_KR }],
    expect: {
      doneCount: 1,
      contains: ['🟢 Gemini · Supported · 🇰🇷 KR'],
      tone: 'normal'
    }
  },

  // 未知三字母码保留原值，不能截断成并不存在的两字母地区
  'gemini-unknown-alpha3': {
    argument: 'services=gemini&budget=12',
    routes: [{ match: GEMINI_URL, status: 200, body: GEMINI_XYZ }],
    expect: {
      doneCount: 1,
      contains: ['🟢 Gemini · Supported · XYZ'],
      notContains: ['🇽🇾 XY'],
      tone: 'normal'
    }
  },

  // 开放标记和明确限制文案都缺失时只能判判据失效
  'gemini-structure-changed': {
    argument: 'services=gemini&budget=12',
    routes: [{ match: GEMINI_URL, status: 200, body: GEMINI_CHANGED }],
    expect: {
      doneCount: 1,
      contains: ['🟠 Gemini · Detection Error'],
      notContains: ['Unsupported'],
      tone: 'warn'
    }
  },

  'gemini-blocked': {
    argument: 'services=gemini&budget=12',
    routes: [{ match: GEMINI_URL, status: 200, body: GEMINI_BLOCKED }],
    expect: {
      doneCount: 1,
      contains: ['🔴 Gemini · Unsupported · 🌐 Unknown'],
      tone: 'alert'
    }
  },

  // 任意 HTTP 200 不足以证明 ChatGPT 可用，响应结构也必须有效
  'chatgpt-invalid-200': {
    argument: 'services=chatgpt&budget=12',
    routes: [
      { match: GPT_GATE_URL, status: 200, body: '<html>challenge</html>' },
      { match: GPT_TRACE_URL, status: 200, body: trace('US') }
    ],
    expect: {
      doneCount: 1,
      contains: ['🟠 ChatGPT · Detection Error'],
      notContains: ['Supported', '🇺🇸 US'],
      tone: 'warn'
    }
  },

  'chatgpt-blocked': {
    argument: 'services=chatgpt&budget=12',
    routes: [
      { match: GPT_GATE_URL, status: 403, body: GPT_BLOCKED },
      { match: GPT_TRACE_URL, status: 200, body: trace('SG') }
    ],
    expect: {
      doneCount: 1,
      contains: ['🔴 ChatGPT · Unsupported · 🇸🇬 SG'],
      tone: 'alert'
    }
  },

  'claude-blocked': {
    argument: 'services=claude&budget=12',
    routes: [
      { match: CLAUDE_PAGE_URL, status: 200, body: CLAUDE_BLOCKED },
      { match: CLAUDE_TRACE_URL, status: 200, body: trace('CN') }
    ],
    expect: {
      doneCount: 1,
      contains: ['🔴 Claude · Unsupported · 🇨🇳 CN'],
      tone: 'alert'
    }
  },

  'max-third-party': {
    argument: 'services=max&budget=12',
    routes: [{ match: MAX_URL, status: 200, body: maxBody('JP') }],
    expect: {
      doneCount: 1,
      contains: ['🟡 HBO Max · via U-NEXT · 🇯🇵 JP'],
      tone: 'normal'
    }
  },

  'hulu-blocked': {
    argument: 'services=hulu&budget=12',
    routes: [{ match: HULU_URL, status: 200, body: HULU_BLOCKED }],
    expect: {
      doneCount: 1,
      contains: ['🔴 Hulu · Unavailable · 🌐 Unknown'],
      tone: 'alert'
    }
  },

  // ── 5xx / 429 一律归 ERROR，绝不冒充「区域限制」 ──────────────
  'transient-5xx': {
    argument: 'services=netflix|disney|max|youtube|hulu&budget=12',
    routes: [
      { match: NF_FULL, status: 503, body: '' },
      { match: NF_ORIG, status: 503, body: '' },
      { match: DISNEY_HOME_URL, status: 503, body: '' },
      { match: DISNEY_API_URL, status: 503, body: '' },
      { match: MAX_URL, status: 502, body: '' },
      { match: YT_URL, status: 429, body: '' },
      { match: HULU_URL, status: 503, body: '' }
    ],
    expect: {
      doneCount: 1,
      notContains: ['区域限制'],
      notRequested: [EGRESS_TRACE_URL],
      matches: [
        /🟠 Netflix · Service Error（503）/,
        /🟠 YouTube · Rate Limited（429）/
      ],
      tone: 'warn'
    }
  },

  // YouTube 429 不得因为缺少购买标记落到「区域限制」
  'youtube-429': {
    argument: 'services=youtube&budget=12',
    routes: [{ match: YT_URL, status: 429, body: '' }],
    expect: {
      doneCount: 1,
      contains: ['🟠 YouTube · Rate Limited（429）'],
      notContains: ['区域限制'],
      tone: 'warn'
    }
  },

  // 带 __NEXT_DATA__ 但 pageType 非 LandingPage，同样不能算解锁
  'hulu-non-landing': {
    argument: 'services=hulu&budget=12',
    routes: [{ match: HULU_URL, status: 200, body: HULU_ERROR_PAGE }],
    expect: {
      doneCount: 1,
      contains: ['🟠 Hulu · Detection Error'],
      notContains: ['区域限制'],
      tone: 'warn'
    }
  },

  // Hulu 返回 200 占位页时不得报成美国解锁
  'hulu-placeholder': {
    argument: 'services=hulu&budget=12',
    routes: [{ match: HULU_URL, status: 200, body: HULU_PLACEHOLDER }],
    expect: {
      doneCount: 1,
      contains: ['🟠 Hulu · Detection Error'],
      notContains: ['区域限制'],
      tone: 'warn'
    }
  },

  // 回归：login 请求彻底失败不得并进「未验证」，要按原始 reason
  // 归类为超时；技术失败不把另一个 trace 请求的地区拼到结果上
  'claude-request-failed': {
    argument: 'services=claude&budget=12',
    routes: [
      { match: CLAUDE_PAGE_URL, error: 'connection reset' },
      { match: CLAUDE_TRACE_URL, status: 200, body: trace('JP') }
    ],
    expect: {
      doneCount: 1,
      contains: ['🟠 Claude · Network Error'],
      notContains: ['🇯🇵 JP'],
      tone: 'warn'
    }
  },

  // Claude 质询页记 UNKNOWN，不计入已解锁数
  'claude-challenged': {
    argument: 'services=claude&budget=12',
    routes: [
      {
        match: CLAUDE_PAGE_URL,
        status: 403,
        headers: CLAUDE_CHALLENGE_HEADERS,
        body: '<html>challenge</html>'
      },
      { match: CLAUDE_TRACE_URL, status: 200, body: trace('US') }
    ],
    expect: {
      doneCount: 1,
      contains: ['🔵 Claude · Unverified · 🇺🇸 US'],
      notContains: ['CF Challenge', '403', 'ms'],
      tone: 'error'
    }
  },

  // cf-mitigated 头缺失时，保留对旧式质询页标题的兼容识别
  'claude-challenge-title-fallback': {
    argument: 'services=claude&budget=12',
    routes: [
      { match: CLAUDE_PAGE_URL, status: 403, body: CLAUDE_CHALLENGE },
      { match: CLAUDE_TRACE_URL, status: 200, body: trace('US') }
    ],
    expect: {
      doneCount: 1,
      contains: ['🔵 Claude · Unverified · 🇺🇸 US'],
      notContains: ['CF Challenge', '403', 'ms'],
      tone: 'error'
    }
  },

  // ── 可用率阈值边界：默认 2/3 ────────────────────────────────
  // 3 项里 2 项可用 = 恰好在阈值上，不转红
  'ratio-at-threshold': {
    argument: 'services=netflix|disney|max&budget=12',
    routes: [
      { match: NF_FULL, status: 200, body: NF_US },
      ...okDisney,
      { match: MAX_URL, status: 503, body: '' }
    ],
    // 恰好在阈值上不转红；但存在失败项，所以是 warn 橙而非 normal 紫
    expect: { doneCount: 1, tone: 'warn' }
  },

  // 3 项里只有 1 项可用 = 低于阈值
  'ratio-below-threshold': {
    argument: 'services=netflix|disney|max&budget=12',
    routes: [
      { match: NF_FULL, status: 200, body: NF_US },
      {
        match: DISNEY_HOME_URL,
        status: 200,
        body: '<html>Sorry, Disney+ is not available</html>'
      },
      { match: DISNEY_API_URL, status: 503, body: '' },
      { match: MAX_URL, status: 200, body: maxBody('CN') }
    ],
    expect: { doneCount: 1, tone: 'alert' }
  },

  // 单个未验证项不得因为「可用率 0」而转红：UNKNOWN 不进分母
  'unknown-not-counted': {
    argument: 'services=claude&budget=12',
    routes: [
      {
        match: CLAUDE_PAGE_URL,
        status: 403,
        headers: CLAUDE_CHALLENGE_HEADERS,
        body: CLAUDE_CHALLENGE
      },
      { match: CLAUDE_TRACE_URL, status: 200, body: trace('US') }
    ],
    expect: { doneCount: 1, tone: 'error' }
  },

  // Gemini 慢响应不得超过 requestTimeoutMaxMs
  'gemini-timeout-ceiling': {
    argument: 'services=gemini&budget=25',
    routes: [
      { match: GEMINI_URL, status: 200, body: GEMINI_OK, delayMs: 14000 }
    ],
    settleMs: 300,
    expect: {
      doneCount: 1,
      contains: ['🟠 Gemini · Timeout'],
      notContains: ['🇺🇸 US']
    }
  }
}

const makeClient = (spec, requests) => {
  const dispatch = (opts, cb) => {
    const url = typeof opts === 'string' ? opts : opts.url
    requests.push(url)
    const route = spec.routes.find(
      (item) => item.match.test(url) && (!item.when || item.when(opts))
    )
    if (!route) {
      setTimeout(() => cb(`no fixture for ${url}`, null, null), 1)
      return
    }
    setTimeout(() => {
      if (route.error) {
        cb(route.error, null, null)
        return
      }
      cb(
        null,
        { status: route.status, headers: route.headers || {} },
        route.body || ''
      )
    }, route.delayMs ?? 10)
  }
  return { get: dispatch, post: dispatch }
}

const runCase = (name) =>
  new Promise((resolve, reject) => {
    const spec = CASES[name]
    if (!spec) {
      reject(new Error(`unknown case: ${name}`))
      return
    }

    const state = { doneCount: 0, panel: null, logs: [], requests: [] }

    const guard = setTimeout(
      () => reject(new Error(`${name}: $done was never called`)),
      40000
    )

    const sandbox = {
      console: { log: (msg) => state.logs.push(String(msg)) },
      setTimeout,
      clearTimeout,
      $argument: spec.argument,
      $httpClient: makeClient(spec, state.requests),
      $done: (result) => {
        state.doneCount += 1
        if (state.doneCount > 1) return
        state.panel = result
        setTimeout(() => {
          clearTimeout(guard)
          resolve(state)
        }, spec.settleMs ?? 300)
      }
    }

    const source = readFileSync(target, 'utf8')
    try {
      vm.runInNewContext(source, vm.createContext(sandbox), {
        filename: 'stream.js'
      })
    } catch (error) {
      clearTimeout(guard)
      reject(error)
    }
  })

const verify = (name, state) => {
  const spec = CASES[name]
  const want = spec.expect
  const panel = state.panel || {}
  const content = String(panel.content ?? '')
  const problems = []

  if (want.doneCount !== undefined && state.doneCount !== want.doneCount) {
    problems.push(`$done called ${state.doneCount}x, want ${want.doneCount}`)
  }
  if (want.title && panel.title !== want.title) {
    problems.push(`title=${panel.title}, want ${want.title}`)
  }
  const expectedContent = want.contains || []
  expectedContent.forEach((needle) => {
    if (!content.includes(needle)) problems.push(`missing: ${needle}`)
  })
  const rejectedContent = want.notContains || []
  rejectedContent.forEach((needle) => {
    if (content.includes(needle)) problems.push(`unexpected: ${needle}`)
  })
  const expectedPatterns = want.matches || []
  expectedPatterns.forEach((pattern) => {
    if (!pattern.test(content)) problems.push(`no match: ${pattern}`)
  })
  const rejectedRequests = want.notRequested || []
  rejectedRequests.forEach((pattern) => {
    const requested = state.requests.some((url) => pattern.test(url))
    if (requested) problems.push(`unexpected request: ${pattern}`)
  })
  // 面板改用 icon + 动态 icon-color（icon 与 style 互斥），
  // 断言仍按语义色名书写，这里把颜色反查回来比对
  const tone = TONE_BY_COLOR[panel['icon-color']] || panel['icon-color']
  if (want.tone && tone !== want.tone) {
    problems.push(`tone=${tone}, want ${want.tone}`)
  }
  if (want.icon && panel.icon !== want.icon) {
    problems.push(`icon=${panel.icon}, want ${want.icon}`)
  }
  return problems
}

const main = async () => {
  const argv = process.argv.slice(2)
  const single = argv.includes('--case')
    ? argv[argv.indexOf('--case') + 1]
    : null
  const names = single ? [single] : Object.keys(CASES)

  let failed = 0
  for (const name of names) {
    let state = null
    try {
      state = await runCase(name)
    } catch (error) {
      failed += 1
      console.log(`FAIL ${name}\n     ${error.message}`)
      continue
    }

    const problems = verify(name, state)
    if (problems.length) {
      failed += 1
      console.log(`FAIL ${name}`)
      problems.forEach((item) => console.log(`     ${item}`))
      console.log(`     --- title: ${state.panel?.title}`)
      console.log(
        String(state.panel?.content ?? '')
          .split('\n')
          .map((line) => `     | ${line}`)
          .join('\n')
      )
    } else {
      const tone = TONE_BY_COLOR[state.panel['icon-color']] || '?'
      console.log(`PASS ${name}  [${tone}] ${state.panel.title}`)
    }
  }

  console.log(`\n${names.length - failed}/${names.length} passed`)
  process.exit(failed ? 1 : 0)
}

main()