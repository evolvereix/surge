// ============================================================
// Stream Panel 设计约定
// ------------------------------------------------------------
// 本区块是 UI 与状态语义的唯一设计说明，sgmodule 只负责加载。
//
// 展示结构：
// - 顶部：「服务解锁检测 · 可用数/总数」。
// - 每行：「状态图标 服务 · 状态 · 地区」；技术失败不拼地区。
// - 分组：影音 / 会员服务在上，AI 服务在下，中间空一行。
// - 顺序：Netflix、Disney+、HBO Max、Hulu、YouTube；
//   ChatGPT、Gemini、Claude。
//
// 行内状态：
// - 🟢 AVAILABLE：影音 / 会员显示 Unlocked，AI 显示 Supported。
// - 🟡 PARTIAL：Originals Only、Coming Soon、Hotstar 或 via X。
// - 🔴 BLOCKED：影音 / 会员显示 Unavailable，AI 显示 Unsupported。
// - 🔵 UNKNOWN：Unverified。
// - 🟠 TIMEOUT / ERROR：超时、网络、限流或判据失效。
//
// 顶部图标：
// - 紫 #BF5AF2：没有明确失败，包括全部可用或仅有部分解锁 / 未验证。
// - 橙 #FF9F0A：存在封锁、超时或异常，但尚未触发红色阈值。
// - 红 #FF3B30：明确结论中的可用率低于配置阈值。
// - 灰 #8E8E93：只有未验证状态，没有明确结论。
//
// 判定原则：
// - 只有服务专属的明确限制判据才进入 BLOCKED，页面改版不得冒充封锁。
// - 地区只来自服务自身证据，不跨服务推断，也不使用共享出口兜底。
// - 所有请求共享全局预算与并发闸门，任何路径只调用一次 $done。
// ============================================================

// ============================================================
// 默认配置
// ------------------------------------------------------------
// sgmodule 不暴露 #!arguments，默认使用下方 SETTINGS。
// budget / icon / alertBelow 可通过 script-path 的 argument= 临时覆盖；
// title 只读取 SETTINGS，不支持 argument 覆盖。
// 生产环境未传 services，固定检测 SERVICES 全部条目；services= 解析路径
// 仅供开发和 shim 隔离单个 checker。增减正式服务直接改 SERVICES。
// ============================================================
const SETTINGS = {
  // 面板标题，渲染时自动追加「可用数/总数」。
  title: '服务解锁检测',

  // 全局预算，单位秒，范围 4-25，超出会被钳到边界。
  // 到点后，尚未完成的服务统一记 TIMEOUT，不会误报成 BLOCKED。
  budget: 12,

  // 面板图标，任意合法 SF Symbol 名。已在本机 SF Symbols 目录中
  // 核对过的备选：bubbles.and.sparkles / sparkle.magnifyingglass /
  // sparkles / sparkles.rectangle.stack / sparkles.tv
  // 注意：icon 与 style 互斥，Surge 只在不传 style 时才使用 icon。
  // 本面板不传 style，由顶部约定的全局颜色表达整体状态。
  icon: 'sparkles.rectangle.stack.fill',

  // 可用率低于此比例时图标转红，取值 0-1。
  // 比例只计 AVAILABLE / PARTIAL / BLOCKED 这些明确结论，
  // UNKNOWN / ERROR / TIMEOUT 由独立的颜色规则表达。
  alertBelow: 2 / 3
}

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) ' +
  'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'

// ============================================================
// 请求与调度参数，一般不需要改
// ============================================================
const CONFIG = {
  ua: UA,

  // 单个请求的默认耗时上限。同一个值会换算成秒传给 $httpClient
  // 的 timeout 让宿主真正断开连接，JS 侧计时只负责按预算裁剪。
  requestTimeoutMs: 8000,

  // 单个请求的硬上限。checker 可以用 spec.timeoutMs 申请更长的
  // 时间（Gemini 首页 800KB+，实测偶尔要 6s 以上），但一律不得
  // 超过这个值，否则一个慢服务能吃掉大半预算。
  requestTimeoutMaxMs: 10000,

  // 扣除收尾余量后的可用预算低于此值时，不再发起新请求。
  budgetGuardMs: 300,

  // 每个请求从剩余预算里让出的收尾余量。
  requestReserveMs: 200,

  // 同时在途的 HTTP 请求上限，也是唯一的并发负载闸门。
  // checker 会一起启动，但单个 checker 仍可能并行申请多个请求，
  // 例如 Disney+ 同时检测首页与 API。
  maxInFlight: 8,

  // 参数取值范围，越界钳到边界；fallback 用于取值非法时。
  budget: { fallback: SETTINGS.budget, min: 4, max: 25 }
}

// ============================================================
// 状态模型与展示元数据
// ============================================================
const STATUS = {
  AVAILABLE: 'available',
  PARTIAL: 'partial',
  BLOCKED: 'blocked',
  // 请求成功但拿不到足以判定可用性的证据（例如被 Cloudflare 质询）。
  // 不计入可用数，也不进入明确可用率分母，避免把「不知道」
  // 说成「能用」。
  UNKNOWN: 'unknown',
  TIMEOUT: 'timeout',
  ERROR: 'error'
}

const REASON = {
  BUDGET_EMPTY: 'budget_empty',
  REQUEST_TIMEOUT: 'request_timeout',
  NETWORK_ERROR: 'network_error',
  INVALID_RESPONSE: 'invalid_response',
  REGION_BLOCKED: 'region_blocked',
  ORIGINALS_ONLY: 'originals_only',
  COMING_SOON: 'coming_soon',
  THIRD_PARTY: 'third_party',
  CHALLENGED: 'challenged'
}

// Gemini 返回 3 字母国家码。不能用 substring(0, 2) 截断：
// KOR→KO、CHN→CH（瑞士）都是错的，必须查表。
const ALPHA3 = {
  ARG: 'AR',
  AUS: 'AU',
  AUT: 'AT',
  BRA: 'BR',
  CAN: 'CA',
  CHE: 'CH',
  CHN: 'CN',
  DEU: 'DE',
  EGY: 'EG',
  ESP: 'ES',
  FRA: 'FR',
  GBR: 'GB',
  HKG: 'HK',
  IDN: 'ID',
  IND: 'IN',
  ITA: 'IT',
  JPN: 'JP',
  KOR: 'KR',
  MAC: 'MO',
  MEX: 'MX',
  MYS: 'MY',
  NLD: 'NL',
  PHL: 'PH',
  RUS: 'RU',
  SGP: 'SG',
  SWE: 'SE',
  THA: 'TH',
  TUR: 'TR',
  TWN: 'TW',
  USA: 'US',
  VNM: 'VN',
  ZAF: 'ZA'
}

// 统一使用圆点表达状态。相比勾、叉、问号混排，圆点的视觉尺寸
// 和基线更接近，面板在 iPhone / Mac 上都能形成稳定的状态列。
const STATUS_ICON = {
  [STATUS.AVAILABLE]: '🟢',
  [STATUS.PARTIAL]: '🟡',
  [STATUS.BLOCKED]: '🔴',
  [STATUS.UNKNOWN]: '🔵',
  [STATUS.TIMEOUT]: '🟠',
  [STATUS.ERROR]: '🟠'
}

// 未命中服务专属限制判据时，非 2xx 一律归 ERROR。
// 408 / 425 / 429 / 5xx 视为临时网络问题，其余视为响应异常；
// 任何 HTTP 异常都不得冒充 BLOCKED。
const TRANSIENT = new Set([408, 425, 429, 500, 502, 503, 504])

const httpReason = (status) =>
  !status || status >= 500 || TRANSIENT.has(status)
    ? REASON.NETWORK_ERROR
    : REASON.INVALID_RESPONSE

const httpFailure = (status) => ({
  status: STATUS.ERROR,
  reason: httpReason(status),
  httpStatus: status || null
})

const REASON_LABEL = {
  [REASON.ORIGINALS_ONLY]: 'Originals Only',
  [REASON.COMING_SOON]: 'Coming Soon',
  [REASON.THIRD_PARTY]: 'Third-party',
  [REASON.CHALLENGED]: 'Unverified',
  [REASON.BUDGET_EMPTY]: 'Budget Exhausted',
  [REASON.REQUEST_TIMEOUT]: 'Timeout',
  [REASON.INVALID_RESPONSE]: 'Detection Error',
  [REASON.NETWORK_ERROR]: 'Network Error'
}

const debug = (message) => {
  const line = `[Stream Panel] ${message}`
  console.log(line)
}

const decodeToken = (value) => {
  try {
    return decodeURIComponent(String(value).replace(/\+/g, '%20'))
  } catch (error) {
    return String(value)
  }
}

const parseArgs = (raw) => {
  if (!raw || typeof raw !== 'string') return {}
  return raw.split('&').reduce((acc, pair) => {
    if (!pair) return acc
    const at = pair.indexOf('=')
    const key = at < 0 ? pair : pair.slice(0, at)
    const value = at < 0 ? '' : pair.slice(at + 1)
    if (key) acc[decodeToken(key)] = decodeToken(value)
    return acc
  }, {})
}

const readInt = (raw, spec) => {
  const parsed = Number.parseInt(raw, 10)
  if (!Number.isFinite(parsed)) return spec.fallback
  return Math.min(spec.max, Math.max(spec.min, parsed))
}

const readFloat = (raw, fallback, min, max) => {
  const parsed = Number.parseFloat(raw)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(max, Math.max(min, parsed))
}

const fail = (reason, detail) => ({ reason, detail: detail || '' })

const attempt = async (task) => {
  try {
    return { ok: true, value: await task() }
  } catch (error) {
    return { ok: false, error }
  }
}

const toFlag = (code) => {
  if (!code || code.length !== 2 || !/^[A-Z]{2}$/.test(code)) return ''
  const points = [...code].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65)
  return String.fromCodePoint(...points)
}

const regionText = (code) => {
  if (!code) return ''
  const flag = toFlag(code)
  return flag ? `${flag} ${code}` : code
}

// ============================================================
// 全局预算、并发闸门与 HTTP 封装
// ============================================================
let deadline = 0
let expired = false
let finished = false

const budgetLeft = () => Math.max(0, deadline - Date.now())

const gate = { active: 0, waiters: [] }

const releaseSlot = () => {
  const next = gate.waiters.shift()
  if (next) {
    next.resolve()
    return
  }
  gate.active = Math.max(0, gate.active - 1)
}

const drainWaiters = () => {
  while (gate.waiters.length) {
    gate.waiters.shift().reject(fail(REASON.BUDGET_EMPTY))
  }
}

const acquireSlot = () =>
  new Promise((resolve, reject) => {
    const usableMs = budgetLeft() - CONFIG.requestReserveMs
    if (expired || usableMs <= CONFIG.budgetGuardMs) {
      reject(fail(REASON.BUDGET_EMPTY))
      return
    }
    if (gate.active < CONFIG.maxInFlight) {
      gate.active += 1
      resolve()
      return
    }
    gate.waiters.push({ resolve, reject })
  })

// 由 SETTINGS 解析归一化而来的运行时取值，见 readOptions()
const options = {
  services: [],
  budgetSec: SETTINGS.budget,
  icon: SETTINGS.icon,
  alertBelow: SETTINGS.alertBelow
}

const send = (spec) =>
  new Promise((resolve, reject) => {
    const usableMs = budgetLeft() - CONFIG.requestReserveMs
    if (expired || usableMs <= CONFIG.budgetGuardMs) {
      reject(fail(REASON.BUDGET_EMPTY))
      return
    }

    // checker 申请值（未提供则用默认值）先受硬上限约束，
    // 再受剩余预算裁剪。
    const asked = Math.min(
      spec.timeoutMs || CONFIG.requestTimeoutMs,
      CONFIG.requestTimeoutMaxMs
    )
    const capMs = Math.min(asked, usableMs)

    const payload = {
      url: spec.url,
      headers: {
        'User-Agent': CONFIG.ua,
        'Accept-Language': 'en',
        ...spec.headers
      },
      timeout: Math.max(1, Math.ceil(capMs / 1000))
    }
    if (spec.body !== undefined) payload.body = spec.body
    if (spec.autoRedirect === false) payload['auto-redirect'] = false
    if (spec.autoCookie === false) payload['auto-cookie'] = false

    let settled = false

    const timer = setTimeout(() => {
      if (settled) return
      settled = true
      reject(fail(expired ? REASON.BUDGET_EMPTY : REASON.REQUEST_TIMEOUT))
    }, capMs)

    const handle = (error, response, data) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      if (error) {
        reject(fail(REASON.NETWORK_ERROR, String(error)))
        return
      }
      resolve({
        status: response && response.status ? response.status : 0,
        headers: response && response.headers ? response.headers : {},
        body: data || ''
      })
    }

    const method = spec.method === 'POST' ? 'post' : 'get'
    $httpClient[method](payload, handle)
  })

const request = async (spec) => {
  await acquireSlot()
  try {
    return await send(spec)
  } finally {
    releaseSlot()
  }
}

const headerValue = (headers, name) => {
  const target = name.toLowerCase()
  const key = Object.keys(headers || {}).find(
    (item) => item.toLowerCase() === target
  )
  return key ? headers[key] : ''
}

// ============================================================
// 服务检测器
// ============================================================
const NETFLIX_FULL_ID = 81280792
const NETFLIX_ORIGINAL_ID = 80018499

const netflixRegion = (body, headers) => {
  const embedded = body.match(/"id"\s*:\s*"([a-z]{2})"[^}]*?"countryName"/)
  if (embedded) return embedded[1].toUpperCase()

  const inBody = body.match(/netflix\.com\/([a-z]{2})(?:-[a-z]+)?\/title\//i)
  if (inBody) return inBody[1].toUpperCase()

  const originating = headerValue(headers, 'x-originating-url')
  const segment = String(originating).split('/')[3]
  if (!segment) return ''
  const code = segment.split('-')[0].toUpperCase()
  return code === 'TITLE' ? 'US' : code
}

const netflixTitle = async (id) => {
  const first = await request({
    url: `https://www.netflix.com/title/${id}`,
    autoRedirect: false
  })
  if (first.status !== 301 && first.status !== 302) return first

  const location = headerValue(first.headers, 'location')
  if (!location || !/\/title\//.test(location)) return first

  return request({ url: location, autoRedirect: false })
}

// 不要用正文里的 "Oh no! ..." 文案做判据：它是预渲染的隐藏
// 模板，可用页面（实测 US / 200）同样含有；而不存在的片源
// 返回 404 且不含该字符串。HTTP 状态才是可靠信号。
const checkNetflix = async () => {
  const primary = await netflixTitle(NETFLIX_FULL_ID)

  if (primary.status === 403) {
    return {
      status: STATUS.BLOCKED,
      reason: REASON.REGION_BLOCKED,
      httpStatus: primary.status
    }
  }

  if (primary.status === 200) {
    return {
      status: STATUS.AVAILABLE,
      region: netflixRegion(primary.body, primary.headers),
      httpStatus: primary.status
    }
  }

  // 主片非 404 时（5xx、0 等）没有地区证据，不该继续往下判
  if (primary.status !== 404) return httpFailure(primary.status)

  const fallback = await netflixTitle(NETFLIX_ORIGINAL_ID)

  if (fallback.status === 200) {
    return {
      status: STATUS.PARTIAL,
      reason: REASON.ORIGINALS_ONLY,
      region: netflixRegion(fallback.body, fallback.headers),
      httpStatus: fallback.status
    }
  }

  if (fallback.status === 403) {
    return {
      status: STATUS.BLOCKED,
      reason: REASON.REGION_BLOCKED,
      httpStatus: fallback.status
    }
  }

  // 两部片都 404 才是「这个地区两者都没有」的确证
  if (fallback.status === 404) {
    return {
      status: STATUS.BLOCKED,
      reason: REASON.REGION_BLOCKED,
      httpStatus: fallback.status
    }
  }

  return httpFailure(fallback.status)
}

const DISNEY_TOKEN =
  'ZGlzbmV5JmJyb3dzZXImMS4wLjA.Cu56AgSfBTDag5NiRA81oLHkDZfu5L3CKadnefEAY84'

const DISNEY_QUERY =
  'mutation registerDevice($input: RegisterDeviceInput!) { ' +
  'registerDevice(registerDevice: $input) { grant { grantType assertion } } }'

const HOTSTAR_REGIONS = ['ID', 'MY', 'PH', 'TH', 'VN']

// 旧脚本依赖的 `Region: XX ... CNBL: [12]` 标记已从首页移除。
// 现行页面在同一段配置里带有 "location":"US"、"region":"us"
// 与 "hasContent":true，后者是 inSupportedLocation 的等价物。
const disneyHome = async () => {
  const res = await request({ url: 'https://www.disneyplus.com/' })
  if (res.body.includes('Sorry, Disney+ is not available')) {
    throw fail(REASON.REGION_BLOCKED)
  }
  if (res.status !== 200) throw fail(httpReason(res.status))

  const upper = res.body.match(/"location"\s*:\s*"([A-Za-z]{2})"/)
  const lower = res.body.match(/"region"\s*:\s*"([A-Za-z]{2})"/)
  const content = res.body.match(/"hasContent"\s*:\s*(true|false)/)

  return {
    region: ((upper || lower || [])[1] || '').toUpperCase(),
    supported: content ? content[1] === 'true' : null,
    httpStatus: res.status
  }
}

const disneyApi = async () => {
  const res = await request({
    url: 'https://disney.api.edge.bamgrid.com/graph/v1/device/graphql',
    method: 'POST',
    headers: {
      Authorization: DISNEY_TOKEN,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      query: DISNEY_QUERY,
      variables: {
        input: {
          applicationRuntime: 'chrome',
          attributes: {
            browserName: 'chrome',
            browserVersion: '131.0.6778',
            operatingSystem: 'macintosh',
            operatingSystemVersion: '10.15.7'
          },
          deviceFamily: 'browser',
          deviceLanguage: 'en',
          deviceProfile: 'macosx'
        }
      }
    })
  })

  if (res.status !== 200) throw fail(httpReason(res.status))

  let parsed = null
  try {
    parsed = JSON.parse(res.body)
  } catch (error) {
    throw fail(REASON.INVALID_RESPONSE)
  }
  if (!parsed || parsed.errors) throw fail(REASON.INVALID_RESPONSE)

  const session =
    parsed.extensions && parsed.extensions.sdk
      ? parsed.extensions.sdk.session
      : null
  if (!session) throw fail(REASON.INVALID_RESPONSE)

  return {
    region: session.location ? session.location.countryCode : '',
    supported: session.inSupportedLocation,
    httpStatus: res.status
  }
}

// 首页和 GraphQL 并行取证：GraphQL 提供更结构化的地区与
// inSupportedLocation，首页则在静态 token 失效时兜底。
const checkDisney = async () => {
  const [home, api] = await Promise.all([
    attempt(disneyHome),
    attempt(disneyApi)
  ])

  const region = (
    (api.ok && api.value.region) ||
    (home.ok && home.value.region) ||
    ''
  ).toUpperCase()

  // 首页出现明确的地区禁用文案时优先判定为不可用；
  // 不能因 GraphQL 恰好返回了 session 就覆盖这个强证据。
  if (
    !home.ok &&
    home.error &&
    home.error.reason === REASON.REGION_BLOCKED
  ) {
    return {
      status: STATUS.BLOCKED,
      reason: REASON.REGION_BLOCKED,
      region,
      httpStatus: api.ok ? api.value.httpStatus : null
    }
  }

  if (!home.ok && !api.ok) throw home.error

  const httpStatus = home.ok ? home.value.httpStatus : api.value.httpStatus

  // 页面拿到了但读不出地区码，多半是页面结构变了，不是地区限制
  if (!region) {
    return {
      status: STATUS.ERROR,
      reason: REASON.INVALID_RESPONSE,
      httpStatus
    }
  }

  const apiSupported = api.ok ? api.value.supported : null
  const homeSupported = home.ok ? home.value.supported : null
  const supported =
    typeof apiSupported === 'boolean'
      ? apiSupported
      : typeof homeSupported === 'boolean'
        ? homeSupported
        : null

  // 拿到地区不等于拿到可用性结论。两个来源都缺少明确布尔值时，
  // 说明页面或 API 结构已经变化，不能默认当作已解锁。
  if (supported === null) {
    return {
      status: STATUS.ERROR,
      reason: REASON.INVALID_RESPONSE,
      httpStatus
    }
  }

  if (!supported) {
    return {
      status: STATUS.PARTIAL,
      reason: REASON.COMING_SOON,
      region,
      httpStatus
    }
  }

  if (HOTSTAR_REGIONS.includes(region)) {
    return {
      status: STATUS.PARTIAL,
      reason: REASON.THIRD_PARTY,
      region,
      httpStatus
    }
  }

  return { status: STATUS.AVAILABLE, region, httpStatus }
}

const YOUTUBE_URL = 'https://www.youtube.com/premium'

const YOUTUBE_COOKIE =
  'YSC=BiCUU3-5Gdk; CONSENT=YES+cb.20220301-11-p0.en+FX+700; GPS=1; ' +
  'VISITOR_INFO1_LIVE=4VwPMkB7W5A; PREF=tz=Asia.Shanghai'

const youtubeOutcome = (attempts, final) => {
  // 429 / 5xx 也是「成功返回」的响应，attempt() 不会拒绝它们。
  // 只有 200 的正文才有判据价值，否则会因为缺少购买标记误判成
  // 区域限制 —— 所以先按状态码筛，一个 200 都没有就是无法判定。
  const usable = attempts.filter(
    (item) => item.ok && item.value.status === 200
  )
  if (!usable.length) {
    if (!final) return null
    const seen = (attempts.find((item) => item.ok) || {}).value
    return httpFailure(seen ? seen.status : 0)
  }

  const bodies = usable.map((item) => item.value.body).join(':')
  const httpStatus = usable[0].value.status

  if (bodies.includes('www.google.cn')) {
    return {
      status: STATUS.BLOCKED,
      reason: REASON.REGION_BLOCKED,
      region: 'CN',
      httpStatus
    }
  }

  const region =
    (bodies.match(/"countryCode":"([A-Z]{2})"/) || [])[1] ||
    (bodies.match(/"contentRegion":"([A-Z]{2})"/) || [])[1] ||
    ''

  const purchasable =
    bodies.includes('purchaseButtonOverride') || bodies.includes('Start trial')
  const unavailable = /Premium (?:is )?not available/i.test(bodies)

  if (unavailable) {
    return {
      status: STATUS.BLOCKED,
      reason: REASON.REGION_BLOCKED,
      region,
      httpStatus
    }
  }

  // 第一次无 Cookie 请求没找到购买入口时，先补发一次
  // Cookie 请求，避免把同意页 / 个性化差异误报为不可用。
  if (!purchasable && !final) return null

  if (!purchasable && !region) {
    return {
      status: STATUS.ERROR,
      reason: REASON.INVALID_RESPONSE,
      httpStatus
    }
  }

  if (!purchasable) {
    return {
      status: STATUS.BLOCKED,
      reason: REASON.REGION_BLOCKED,
      region,
      httpStatus
    }
  }

  return { status: STATUS.AVAILABLE, region, httpStatus }
}

const checkYoutube = async () => {
  const plain = await attempt(() =>
    request({ url: YOUTUBE_URL, autoCookie: false })
  )
  const first = youtubeOutcome([plain], false)
  if (first) return first

  const primed = await attempt(() =>
    request({
      url: YOUTUBE_URL,
      autoCookie: false,
      headers: { Cookie: YOUTUBE_COOKIE }
    })
  )
  if (!primed.ok) throw primed.error
  if (primed.value.status !== 200) return httpFailure(primed.value.status)

  return youtubeOutcome([plain, primed], true)
}

// HBO Max 当前主站为 hbomax.com。地区码正文里的 "countryCode":"us"
// 最直接，Set-Cookie 里的 countryCode=XX 作为兜底；可用地区表取自
// 正文的 "url":"/xx/yy"，US 主站不含自身故手动补。
const MAX_THIRD_PARTY = { JP: 'U-NEXT', CA: 'Crave', KR: 'Coupang Play' }

const checkMax = async () => {
  const res = await request({ url: 'https://www.hbomax.com/' })
  if (res.status !== 200) return httpFailure(res.status)

  const body = res.body || ''

  const region = (
    (body.match(/"countryCode"\s*:\s*"([A-Za-z]{2})"/) || [])[1] ||
    (JSON.stringify(res.headers).match(/countryCode=([A-Za-z]{2})/) || [])[1] ||
    ''
  ).toUpperCase()

  // 读不出地区码 ≠ 被限制，按无法判定处理
  if (!region) {
    return {
      status: STATUS.ERROR,
      reason: REASON.INVALID_RESPONSE,
      httpStatus: res.status
    }
  }

  if (MAX_THIRD_PARTY[region]) {
    return {
      status: STATUS.PARTIAL,
      reason: REASON.THIRD_PARTY,
      provider: MAX_THIRD_PARTY[region],
      region,
      httpStatus: res.status
    }
  }

  const available = new Set(['US'])
  for (const hit of body.matchAll(/"url":"\/([a-z]{2})\/[a-z]{2}"/gi)) {
    available.add(hit[1].toUpperCase())
  }

  return available.has(region)
    ? { status: STATUS.AVAILABLE, region, httpStatus: res.status }
    : {
        status: STATUS.BLOCKED,
        reason: REASON.REGION_BLOCKED,
        region,
        httpStatus: res.status
      }
}

// Hulu 仅在美国开服。正向证据取 Next.js 注入的 __NEXT_DATA__ 里的
// "pageType":"LandingPage"（实测 / 会 302 到 /welcome 并带该字段），
// 光看 HTTP 200 不够 —— 维护页、占位页、反爬页同样是 200。
const checkHulu = async () => {
  const res = await request({ url: 'https://www.hulu.com/' })
  const body = res.body || ''

  if (
    /not available in your region/i.test(body) ||
    /geo.?restrict/i.test(body)
  ) {
    return {
      status: STATUS.BLOCKED,
      reason: REASON.REGION_BLOCKED,
      httpStatus: res.status
    }
  }

  if (res.status !== 200) return httpFailure(res.status)

  // 只认 LandingPage：ErrorPage / MaintenancePage 同样带
  // __NEXT_DATA__，放宽到任意 pageType 等于没有正向判据
  const landed =
    body.includes('__NEXT_DATA__') &&
    /"pageType"\s*:\s*"LandingPage"/.test(body)

  return landed
    ? { status: STATUS.AVAILABLE, region: 'US', httpStatus: res.status }
    : {
        status: STATUS.ERROR,
        reason: REASON.INVALID_RESPONSE,
        httpStatus: res.status
      }
}

// 只用 compliance 端点判可用性 + cdn-cgi/trace 取地区。
// 不再探测 ios.chat.openai.com：它现在对数据中心 IP 一律返回 403
// {"cf_details":"Request is not allowed...","type":"dc"}，正文里没有
// "VPN" 字样，参考实现的 /VPN/i 判据因此恒为 false，是无效判据。
// 代价是失去 Web Only / Mobile Only 的区分。
const checkChatGPT = async () => {
  const [gate, trace] = await Promise.all([
    attempt(() =>
      request({
        url: 'https://api.openai.com/compliance/cookie_requirements',
        headers: {
          Authorization: 'Bearer null',
          'Content-Type': 'application/json',
          Origin: 'https://platform.openai.com',
          Referer: 'https://platform.openai.com/'
        }
      })
    ),
    attempt(() => request({ url: 'https://chatgpt.com/cdn-cgi/trace' }))
  ])

  if (!gate.ok) throw gate.error

  const region = trace.ok
    ? ((trace.value.body || '').match(/loc=([A-Z]{2})/) || [])[1] || ''
    : ''
  const httpStatus = gate.value.status
  if (/unsupported_country/i.test(gate.value.body || '')) {
    return {
      status: STATUS.BLOCKED,
      reason: REASON.REGION_BLOCKED,
      region,
      httpStatus
    }
  }

  // 没有 unsupported_country 又不是 200，说明这次请求根本没问出结果
  if (httpStatus !== 200) return httpFailure(httpStatus)

  let parsed = null
  try {
    parsed = JSON.parse(gate.value.body || '')
  } catch (error) {
    return {
      status: STATUS.ERROR,
      reason: REASON.INVALID_RESPONSE,
      httpStatus
    }
  }

  // 200 本身不是可用性证据，必须同时拿到当前端点的预期结构。
  if (!parsed || typeof parsed.cookie_consent_required !== 'boolean') {
    return {
      status: STATUS.ERROR,
      reason: REASON.INVALID_RESPONSE,
      httpStatus
    }
  }

  return { status: STATUS.AVAILABLE, region, httpStatus }
}

// 网页判据：功能开关 45631641,null,true 存在即已开放；地区码可能是
// 2 位或 3 位，3 位必须查表转换而不是截断。
const checkGemini = async () => {
  const res = await request({
    url: 'https://gemini.google.com',
    timeoutMs: 10000
  })
  if (res.status !== 200) return httpFailure(res.status)

  const body = res.body || ''
  const two = (body.match(/,2,1,200,"([A-Z]{2})"/) || [])[1]
  const three = (body.match(/,2,1,200,"([A-Z]{3})"/) || [])[1]
  const region = two || (three ? ALPHA3[three] || three : '')

  const available = body.includes('45631641,null,true')
  const blocked =
    /not available in your (?:country|region)/i.test(body) ||
    /isn['’]t currently supported in your country/i.test(body) ||
    /unsupported country/i.test(body)

  if (blocked) {
    return {
      status: STATUS.BLOCKED,
      reason: REASON.REGION_BLOCKED,
      region,
      httpStatus: res.status
    }
  }

  // 标记缺失可能是页面改版或响应不完整，不能反向证明区域受限。
  if (!available) {
    return {
      status: STATUS.ERROR,
      reason: REASON.INVALID_RESPONSE,
      httpStatus: res.status
    }
  }

  return { status: STATUS.AVAILABLE, region, httpStatus: res.status }
}

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/models'

// claude.ai 的网页请求容易被 Cloudflare 质询，因此再用 Anthropic
// API 的鉴权错误作正向证据：401 authentication_error 说明请求
// 已进入服务端，只是缺少 API Key。显式地区禁用文案仍优先。
const checkClaude = async () => {
  const [page, api, trace] = await Promise.all([
    attempt(() => request({ url: 'https://claude.ai/login' })),
    attempt(() => request({ url: CLAUDE_API_URL })),
    attempt(() => request({ url: 'https://claude.ai/cdn-cgi/trace' }))
  ])

  const region = trace.ok
    ? ((trace.value.body || '').match(/loc=([A-Z]{2})/) || [])[1] || ''
    : ''

  const body = page.ok ? page.value.body || '' : ''
  const httpStatus = page.ok ? page.value.status : null
  const apiBody = api.ok ? api.value.body || '' : ''
  const authenticatedEdge =
    api.ok &&
    api.value.status === 401 &&
    /authentication_error|x-api-key header is required/i.test(apiBody)
  const apiRegionBlocked =
    api.ok &&
    (api.value.status === 403 || api.value.status === 451) &&
    /country|region|not available|not allowed|unsupported/i.test(apiBody)

  if (/app-unavailable-in-region/i.test(body) || apiRegionBlocked) {
    return {
      status: STATUS.BLOCKED,
      reason: REASON.REGION_BLOCKED,
      region,
      httpStatus: apiRegionBlocked ? api.value.status : httpStatus
    }
  }

  if ((page.ok && page.value.status === 200) || authenticatedEdge) {
    return {
      status: STATUS.AVAILABLE,
      region,
      httpStatus:
        page.ok && page.value.status === 200 ? httpStatus : api.value.status
    }
  }

  if (api.ok && (api.value.status === 429 || api.value.status >= 500)) {
    return { ...httpFailure(api.value.status), region }
  }

  const challenged =
    page.ok &&
    (String(headerValue(page.value.headers, 'cf-mitigated')).toLowerCase() ===
      'challenge' ||
      (page.value.status === 403 && /Just a moment/i.test(body)))

  if (challenged) {
    return {
      status: STATUS.UNKNOWN,
      reason: REASON.CHALLENGED,
      region,
      httpStatus
    }
  }

  if (!page.ok && !api.ok) return { ...mapFailure(page.error), region }
  if (page.ok) return { ...httpFailure(page.value.status), region }
  if (api.ok) return { ...httpFailure(api.value.status), region }

  return { status: STATUS.UNKNOWN, region }
}

// ============================================================
// 服务注册与开发期选择
// ============================================================
// 顺序即渲染顺序：影音 / 会员能力在上，AI 服务在下。
const SERVICES = [
  {
    key: 'netflix',
    label: 'Netflix',
    category: 'media',
    run: checkNetflix
  },
  {
    key: 'disney',
    label: 'Disney+',
    category: 'media',
    run: checkDisney
  },
  {
    key: 'max',
    label: 'HBO Max',
    category: 'media',
    run: checkMax
  },
  {
    key: 'hulu',
    label: 'Hulu',
    category: 'media',
    run: checkHulu
  },
  {
    key: 'youtube',
    label: 'YouTube',
    category: 'media',
    run: checkYoutube
  },
  {
    key: 'claude',
    label: 'Claude',
    category: 'ai',
    run: checkClaude,
    groupStart: true
  },
  {
    key: 'gemini',
    label: 'Gemini',
    category: 'ai',
    run: checkGemini
  },
  {
    key: 'chatgpt',
    label: 'ChatGPT',
    category: 'ai',
    run: checkChatGPT
  }
]

const SERVICE_MAP = SERVICES.reduce((acc, item) => {
  acc[item.key] = item
  return acc
}, {})

const ALL_SERVICES = SERVICES.map((item) => item.key)

// sgmodule 不公开 services 参数，未传时固定使用 ALL_SERVICES。
// 解析路径仅供开发期通过 argument 隔离单个 checker（见 stream.test.mjs），
// 否则每个测试用例都得给全部服务铺路由，颜色断言也会随之改变。
const resolveServices = (raw) => {
  const text = String(raw || '').trim()
  if (!text || text.toLowerCase() === 'all') return ALL_SERVICES.slice()

  const picked = []
  text.split(/[|,\s]+/).forEach((token) => {
    const key = token.trim().toLowerCase()
    if (!key) return
    if (!SERVICE_MAP[key]) {
      debug(`unknown service ignored: ${key}`)
      return
    }
    if (!picked.includes(key)) picked.push(key)
  })

  if (!picked.length) {
    debug('no valid service selected, falling back to all')
    return ALL_SERVICES.slice()
  }
  return picked
}

// ============================================================
// 服务调度与结果收敛
// ============================================================
const mapFailure = (error) => {
  const reason = error && error.reason ? error.reason : REASON.NETWORK_ERROR
  if (reason === REASON.BUDGET_EMPTY || reason === REASON.REQUEST_TIMEOUT) {
    return { status: STATUS.TIMEOUT, reason }
  }
  if (reason === REASON.REGION_BLOCKED) {
    return { status: STATUS.BLOCKED, reason }
  }
  return { status: STATUS.ERROR, reason }
}

const baseResult = (key) => ({
  service: key,
  status: STATUS.ERROR,
  region: '',
  reason: null,
  provider: '',
  httpStatus: null
})

const runService = async (key) => {
  try {
    const outcome = await SERVICE_MAP[key].run()
    return {
      ...baseResult(key),
      ...outcome
    }
  } catch (error) {
    if (error && error.reason === undefined) {
      debug(`${key} threw unexpected error: ${error}`)
    }
    return {
      ...baseResult(key),
      ...mapFailure(error)
    }
  }
}

const runAll = async (keys) => {
  const results = new Map()
  const tasks = keys.map(async (key) => {
    results.set(key, await runService(key))
  })
  const expiry = new Promise((resolve) => setTimeout(resolve, budgetLeft()))

  await Promise.race([Promise.all(tasks), expiry])

  return keys.map((key) => {
    const done = results.get(key)
    if (done) return done
    return {
      ...baseResult(key),
      status: STATUS.TIMEOUT,
      reason: REASON.BUDGET_EMPTY
    }
  })
}

// ============================================================
// 面板文案、分组与全局颜色
// ============================================================
// 只在状态码本身有信息时显示：200 出现在原因旁边纯属噪声。
const errorCode = (entry) =>
  entry.httpStatus && entry.httpStatus !== 200 ? String(entry.httpStatus) : ''

const withErrorCode = (label, entry) => {
  const code = errorCode(entry)
  return code ? `${label}（${code}）` : label
}

const errorLabel = (entry) => {
  if (entry.httpStatus === 429) return 'Rate Limited'
  if (entry.httpStatus >= 500) return 'Service Error'
  return entry.reason ? REASON_LABEL[entry.reason] : 'Detection Error'
}

const availableLabel = (entry) =>
  SERVICE_MAP[entry.service].category === 'ai' ? 'Supported' : 'Unlocked'

const blockedLabel = (entry) =>
  SERVICE_MAP[entry.service].category === 'ai' ? 'Unsupported' : 'Unavailable'

const partialLabel = (entry) => {
  if (entry.reason === REASON.THIRD_PARTY && entry.provider) {
    return `via ${entry.provider}`
  }
  if (entry.reason === REASON.THIRD_PARTY && entry.service === 'disney') {
    return 'Hotstar'
  }
  return entry.reason ? REASON_LABEL[entry.reason] : 'Partially Unlocked'
}

const renderDetail = (entry) => {
  const region = () => regionText(entry.region) || '🌐 Unknown'

  switch (entry.status) {
    case STATUS.AVAILABLE:
      return `${availableLabel(entry)} · ${region()}`
    case STATUS.PARTIAL:
      return `${partialLabel(entry)} · ${region()}`
    case STATUS.UNKNOWN:
      return ['Unverified', regionText(entry.region)]
        .filter(Boolean)
        .join(' · ')
    case STATUS.BLOCKED:
      return `${blockedLabel(entry)} · ${region()}`
    case STATUS.TIMEOUT:
      return REASON_LABEL[entry.reason] || 'Timeout'
    default:
      return withErrorCode(errorLabel(entry), entry)
  }
}

const renderLine = (entry) => {
  const summary = [
    STATUS_ICON[entry.status] || '🟠',
    SERVICE_MAP[entry.service].label
  ].join(' ')
  const parts = [summary, renderDetail(entry)]
  return parts.filter(Boolean).join(' · ')
}

// 影音 / 会员服务连续展示，只在 AI 服务开始前留一行。
const renderContent = (entries) =>
  entries
    .reduce((lines, entry, index) => {
      if (index && SERVICE_MAP[entry.service].groupStart) lines.push('')
      lines.push(renderLine(entry))
      return lines
    }, [])
    .join('\n')

// 四档：紫色是 Panel 身份色，只在需要用户介入时转为告警色。
//   error 灰 没有明确结论，且只有未验证 / 未检测
//   normal 紫 没有明确失败：全部可用，或仅有部分解锁 / 未验证
//   alert 红 明确结论中的可用率低于 alertBelow
//   warn  橙 存在封锁 / 超时 / 异常，但未触发红色阈值
const panelTone = (entries) => {
  if (!entries.length) return 'error'
  if (entries.every((item) => item.status === STATUS.AVAILABLE)) return 'normal'

  const conclusive = entries.filter((item) =>
    [STATUS.AVAILABLE, STATUS.PARTIAL, STATUS.BLOCKED].includes(item.status)
  )
  const healthy = conclusive.filter(
    (item) => item.status === STATUS.AVAILABLE || item.status === STATUS.PARTIAL
  ).length

  if (!conclusive.length) {
    const technicalFailure = entries.some((item) =>
      [STATUS.ERROR, STATUS.TIMEOUT].includes(item.status)
    )
    return technicalFailure ? 'warn' : 'error'
  }

  if (healthy < conclusive.length * options.alertBelow) {
    return 'alert'
  }

  const hasFailure = entries.some((item) =>
    [STATUS.BLOCKED, STATUS.ERROR, STATUS.TIMEOUT].includes(item.status)
  )
  if (hasFailure) return 'warn'
  return 'normal'
}

// 颜色值集中在此处，语义以文件顶部的 UI 约定为准。
const TONE_COLOR = {
  normal: '#BF5AF2',
  warn: '#FF9F0A',
  alert: '#FF3B30',
  error: '#8E8E93'
}

const buildPanel = (entries) => {
  const usable = entries.filter(
    (item) =>
      item.status === STATUS.AVAILABLE || item.status === STATUS.PARTIAL
  ).length

  return {
    title: `${SETTINGS.title} · ${usable}/${entries.length}`,
    content: renderContent(entries),
    icon: options.icon,
    'icon-color': TONE_COLOR[panelTone(entries)]
  }
}

const finish = (panel) => {
  if (finished) return
  finished = true
  $done(panel)
}

// ============================================================
// 参数解析与入口
// ============================================================
// $argument 仅用于开发期 services 选择，以及 budget / icon /
// alertBelow 覆盖；缺省或空串退回 SETTINGS，title 始终读 SETTINGS。
const readOptions = () => {
  const raw = typeof $argument !== 'undefined' ? $argument : ''
  const args = parseArgs(raw)
  const pick = (key) =>
    args[key] === undefined || args[key] === '' ? SETTINGS[key] : args[key]

  options.services = resolveServices(args.services)
  options.budgetSec = readInt(pick('budget'), CONFIG.budget)
  options.icon = String(pick('icon') || '').trim() || SETTINGS.icon
  options.alertBelow = readFloat(pick('alertBelow'), SETTINGS.alertBelow, 0, 1)
}

;(async () => {
  try {
    readOptions()
    deadline = Date.now() + options.budgetSec * 1000

    setTimeout(() => {
      expired = true
      drainWaiters()
    }, options.budgetSec * 1000)

    const entries = await runAll(options.services)
    finish(buildPanel(entries))
  } catch (error) {
    debug(`fatal: ${error && error.stack ? error.stack : error}`)
    finish({
      title: SETTINGS.title,
      content: `检测失败：${(error && error.message) || error}`,
      icon: options.icon,
      'icon-color': TONE_COLOR.error
    })
  }
})()