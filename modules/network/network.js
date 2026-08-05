const CONFIG = {
  primary: {
    url: 'https://api-ipv4.ip.sb/geoip',
    timeout: 3,
    accept: 'application/json'
  },
  fallback: {
    url: 'https://1.1.1.1/cdn-cgi/trace',
    timeout: 2,
    accept: 'text/plain'
  },
  networkChangeDelay: 250,
  deadline: 7500,
  userAgent: 'Surge-Network-Panel/2.0'
}

const RADIO_GENERATIONS = {
  GPRS: '2.5G',
  CDMA1x: '2.5G',
  EDGE: '2.75G',
  Edge: '2.75G',
  WCDMA: '3G',
  HSDPA: '3.5G',
  CDMAEVDORev0: '3.5G',
  CDMAEVDORevA: '3.5G',
  CDMAEVDORevB: '3.75G',
  HSUPA: '3.75G',
  eHRPD: '3.9G',
  HRPD: '3.9G',
  LTE: '4G',
  NRNSA: '5G',
  NR: '5G'
}

// Each carrier name is stored once while preserving all original MCC-MNC codes.
const CARRIER_GROUPS = [
  ['中華電信', '466-11,466-92'],
  ['遠傳電信', '466-01,466-03'],
  ['台灣大哥大', '466-97'],
  ['台灣之星', '466-89'],
  ['GT', '466-05'],
  ['中国电信', '460-03,460-05,460-11'],
  ['中国联通', '460-01,460-06,460-09'],
  ['中国移动', '460-00,460-02,460-04,460-07,460-08'],
  ['中国广电', '460-15'],
  ['中移铁通', '460-20'],
  ['CSL', '454-00,454-02,454-10,454-18'],
  ['3', '454-03,454-04,454-05,234-20'],
  ['SMC HK', '454-06,454-15,454-17'],
  ['CMHK', '454-09,454-12,454-13,454-28,454-31'],
  ['csl.', '454-16,454-19,454-20,454-29'],
  ['中信國際電訊', '454-01'],
  ['UNICOM HK', '454-07'],
  ['Truphone', '454-08'],
  ['CHKTL', '454-11'],
  ['Lycamobile', '454-23'],
  ['Y!mobile', '440-00'],
  ['docomo', '440-10'],
  ['Rakuten', '440-11'],
  ['SoftBank', '440-20'],
  ['au', '440-50,440-51,440-52,440-53,440-54'],
  ['WCP', '441-00'],
  ['UQ WiMAX', '441-10'],
  ['SKT', '450-03,450-05'],
  ['KT', '450-02,450-04,450-08'],
  ['LG U+', '450-06,450-10'],
  [
    'AT&T',
    '310-030,310-070,310-150,310-170,310-280,310-380,310-410,310-560,310-680,310-980'
  ],
  [
    'T-Mobile',
    '310-160,310-200,310-210,310-220,310-230,310-240,310-250,310-260,310-270,310-300,310-310,310-660,310-800,311-660,311-882,311-490,312-530,311-870,311-880'
  ],
  [
    'Verizon',
    '310-004,310-010,310-012,310-013,311-110,311-270,311-271,311-272,311-273,311-274,311-275,311-276,311-277,311-278,311-279,311-280,311-281,311-282,311-283,311-284,311-285,311-286,311-287,311-288,311-289,311-390,311-480,311-481,311-482,311-483,311-484,311-485,311-486,311-487,311-488,311-489,310-590,310-890,310-910'
  ],
  ['Sprint', '310-120'],
  ['Aeris Comm. Inc.', '310-850'],
  ['Airtel Wireless LLC', '310-510'],
  ['Allied Wireless Communications Corporation', '312-090'],
  ['Arctic Slope Telephone Association Cooperative Inc.', '310-710'],
  ['Bluegrass Wireless LLC', '311-440,311-800,311-810'],
  ['Cable & Communications Corp.', '310-900'],
  ['California RSA No. 3 Limited Partnership', '311-590'],
  ['Cambridge Telephone Company Inc.', '311-500'],
  ['Caprock Cellular Ltd.', '310-830'],
  ['Cellular Network Partnership LLC', '312-270,312-280,310-360'],
  ['Choice Phone LLC', '311-120,310-480'],
  ['Cincinnati Bell Wireless LLC', '310-420'],
  ['Cingular Wireless', '310-180'],
  ['Coleman County Telco /Trans TX', '310-620'],
  ['Consolidated Telcom', '310-06,310-60'],
  ['Cross Valliant Cellular Partnership', '310-700'],
  ['Cross Wireless Telephone Co.', '312-030,311-140'],
  ['Custer Telephone Cooperative Inc.', '312-040'],
  ['Dobson Cellular Systems', '310-440'],
  ['E.N.M.R. Telephone Coop.', '310-990'],
  ['East Kentucky Network LLC', '312-120,312-130,310-750'],
  ['Edge Wireless LLC', '310-090'],
  ['Elkhart TelCo. / Epic Touch Co.', '310-610'],
  ['Farmers', '311-311'],
  ['Fisher Wireless Services Inc.', '311-460'],
  ['GCI Communication Corp.', '311-370,310-430'],
  ['Get Mobile Inc.', '310-920'],
  ['Illinois Valley Cellular RSA 2 Partnership', '311-340'],
  ['Iowa RSA No. 2 Limited Partnership', '312-170,311-410'],
  ['Iowa Wireless Services LLC', '310-770'],
  ['Jasper', '310-650'],
  ['Kaplan Telephone Company Inc.', '310-870'],
  ['Keystone Wireless LLC', '312-180,310-690'],
  ['Lamar County Cellular', '311-310'],
  ['Leap Wireless International Inc.', '310-016'],
  ['Matanuska Tel. Assn. Inc.', '310-040'],
  ['Message Express Co. / Airlink PCS', '310-780'],
  ['Michigan Wireless LLC', '311-330'],
  ['Minnesota South. Wirel. Co. / Hickory', '310-400'],
  ['Missouri RSA No 5 Partnership', '311-010,312-010,311-020,312-220,311-920'],
  ['Mohave Cellular LP', '310-350'],
  ['MTPCS LLC', '310-570'],
  ['NEP Cellcorp Inc.', '310-290'],
  ['Nevada Wireless LLC', '310-34'],
  ['New-Cell Inc.', '310-600'],
  ['Nexus Communications Inc.', '311-300'],
  ['North Carolina RSA 3 Cellular Tel. Co.', '310-130'],
  ['North Dakota Network Company', '312-230,311-610'],
  ['Northeast Colorado Cellular Inc.', '310-450'],
  ['Northeast Wireless Networks LLC', '311-710'],
  ['Northstar', '310-011,310-670'],
  ['Northwest Missouri Cellular Limited Partnership', '311-420'],
  ['Panhandle Telephone Cooperative Inc.', '310-760'],
  ['PCS ONE', '310-580'],
  ['PetroCom', '311-170'],
  ['Pine Belt Cellular, Inc.', '311-670'],
  ['Plateau Telecommunications Inc.', '310-100'],
  ['Poka Lambro Telco Ltd.', '310-940'],
  ['Public Service Cellular Inc.', '310-500'],
  ['RSA 1 Limited Partnership', '312-160,311-430'],
  ['Sagebrush Cellular Inc.', '311-350'],
  ['SIMMETRY', '310-46'],
  ['SLO Cellular Inc / Cellular One of San Luis', '311-260'],
  ['Smith Bagley Inc.', '310-320'],
  ['Southern Communications Services Inc.', '316-011'],
  ['Telemetrix Inc.', '310-740'],
  ['Testing', '310-14'],
  ['Texas RSA 15B2 Limited Partnership', '310-860'],
  ['Thumb Cellular Limited Partnership', '311-050,311-830'],
  ['TMP Corporation', '310-460'],
  ['Triton PCS', '310-490'],
  [
    'Uintah Basin Electronics Telecommunications Inc.',
    '312-290,311-860,310-960'
  ],
  ['Union Telephone Co.', '310-020'],
  ['United States Cellular Corp.', '311-220,310-730'],
  ['United Wireless Communications Inc.', '311-650'],
  ['Unknown', '310-003,310-15,310-23,310-24,310-25,310-26,310-190,310-950'],
  ['USA 3650 AT&T', '310-38'],
  ['Various Networks', '310-999'],
  ['VeriSign', '310-520'],
  ['West Virginia Wireless', '310-530'],
  ['Westlink Communications, LLC', '310-340'],
  ['Wisconsin RSA #7 Limited Partnership', '311-070'],
  ['Yorkville Telephone Cooperative', '310-390'],
  ['BT OnePhone UK', '234-08'],
  ['O2-UK', '234-10'],
  ['vodafone UK', '234-15'],
  ['EE', '234-30,234-33'],
  ['Virgin', '234-38'],
  ['JT', '234-50'],
  ['Sure', '234-55'],
  ['Manx Telecom', '234-58'],
  ['Islacom', '515-01'],
  ['Globe', '515-02'],
  ['Smart', '515-03'],
  ['Sun', '515-04'],
  ['Next Mobile', '515-08'],
  ['Cure', '515-18'],
  ['ABS-CBN', '515-24'],
  ['Mobifone', '452-01'],
  ['VinaPhone', '452-02'],
  ['S-Fone', '452-03'],
  ['Viettel', '452-04'],
  ['VietNamobile', '452-05'],
  ['E-mobile', '452-06'],
  ['Gmobile', '452-07']
]

let finished = false

const asText = (value) => {
  if (value === undefined || value === null) return ''
  return String(value).trim()
}

const findCarrierName = (carrierId) => {
  if (!carrierId) return ''
  const match = CARRIER_GROUPS.find(([, codes]) =>
    codes.split(',').includes(carrierId)
  )
  return match ? match[0] : ''
}

const formatCellularTitle = (cellular) => {
  if (!cellular) return ''

  const carrierId = asText(cellular.carrier)
  const radio = asText(cellular.radio)
  const carrierName = findCarrierName(carrierId)
  const carrierLabel =
    carrierName || (carrierId ? `蜂窝数据（${carrierId}）` : '蜂窝数据')
  const generation = RADIO_GENERATIONS[radio]
  const radioLabel = generation ? `${generation} - ${radio}` : radio

  return [carrierLabel, radioLabel].filter(Boolean).join(' ')
}

const collectDeviceNetwork = () => {
  const network = typeof $network === 'object' && $network ? $network : {}
  const wifi = network.wifi || {}
  const v4 = network.v4 || {}
  const v6 = network.v6 || {}
  const ssid = asText(wifi.ssid)
  const cellularTitle = formatCellularTitle(network['cellular-data'])
  const lines = []

  if (asText(v4.primaryAddress)) {
    lines.push(`设备IP：${asText(v4.primaryAddress)}`)
  }
  if (asText(v6.primaryAddress)) {
    lines.push('IPv6地址：已分配')
  }
  if (ssid && asText(v4.primaryRouter)) {
    lines.push(`路由器IP：${asText(v4.primaryRouter)}`)
  }
  if (lines.length === 0) {
    lines.push('网络状态：可能中断')
  }

  if (ssid) {
    return {
      title: ssid,
      icon: 'wifi',
      iconColor: '#0A84FF',
      lines
    }
  }
  if (cellularTitle) {
    return {
      title: cellularTitle,
      icon: 'antenna.radiowaves.left.and.right',
      iconColor: '#34C759',
      lines
    }
  }
  return {
    title: '当前网络',
    icon: 'network',
    iconColor: '#AF52DE',
    lines
  }
}

const requestText = (endpoint) => {
  return new Promise((resolve, reject) => {
    $httpClient.get(
      {
        url: endpoint.url,
        timeout: endpoint.timeout,
        headers: {
          Accept: endpoint.accept,
          'User-Agent': CONFIG.userAgent
        },
        'auto-cookie': false
      },
      (error, response, data) => {
        if (error) {
          reject(new Error(asText(error) || 'Network request failed'))
          return
        }

        const status = Number(response && response.status)
        if (!Number.isFinite(status) || status < 200 || status >= 300) {
          reject(new Error(`Unexpected HTTP status: ${status || 'unknown'}`))
          return
        }
        resolve(asText(data))
      }
    )
  })
}

const normalizeAsn = (value) => {
  const match = asText(value).match(/\d+/)
  return match ? match[0] : ''
}

const callSurgeUtility = (name, ip) => {
  try {
    if (typeof $utils !== 'object' || typeof $utils[name] !== 'function') {
      return ''
    }
    return asText($utils[name](ip))
  } catch (error) {
    console.log(`[Network Panel] ${name} lookup failed: ${error}`)
    return ''
  }
}

const enrichWithSurgeUtilities = (info) => {
  if (!info.ip) return info
  return {
    ...info,
    countryCode: info.countryCode || callSurgeUtility('geoip', info.ip),
    asn: info.asn || normalizeAsn(callSurgeUtility('ipasn', info.ip)),
    networkName: info.networkName || callSurgeUtility('ipaso', info.ip)
  }
}

const parseIpSb = (body) => {
  let data
  try {
    data = JSON.parse(body)
  } catch (error) {
    throw new Error(`Invalid IP.SB response: ${error.message}`)
  }

  const ip = asText(data.ip)
  if (!ip) throw new Error('IP.SB response is missing the IP address')

  return enrichWithSurgeUtilities({
    ip,
    countryCode: asText(data.country_code),
    country: asText(data.country),
    region: asText(data.region),
    city: asText(data.city),
    asn: normalizeAsn(data.asn),
    networkName:
      asText(data.asn_organization) ||
      asText(data.isp) ||
      asText(data.organization),
    source: 'IP.SB'
  })
}

const parseCloudflareTrace = (body) => {
  const fields = {}
  body.split(/\r?\n/).forEach((line) => {
    const separator = line.indexOf('=')
    if (separator > 0) {
      fields[line.slice(0, separator)] = line.slice(separator + 1)
    }
  })

  const ip = asText(fields.ip)
  if (!ip) throw new Error('Cloudflare response is missing the IP address')

  return enrichWithSurgeUtilities({
    ip,
    countryCode: asText(fields.loc),
    country: '',
    region: '',
    city: '',
    asn: '',
    networkName: '',
    source: 'Cloudflare Trace'
  })
}

const delay = (milliseconds) => {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

const isNetworkChangedError = (error) => {
  return asText(error && error.message ? error.message : error)
    .toLowerCase()
    .includes('network changed')
}

const fetchEgressInfo = async () => {
  try {
    const body = await requestText(CONFIG.primary)
    return parseIpSb(body)
  } catch (primaryError) {
    console.log(`[Network Panel] IP.SB failed: ${primaryError.message}`)
    if (isNetworkChangedError(primaryError)) {
      await delay(CONFIG.networkChangeDelay)
    }

    try {
      const body = await requestText(CONFIG.fallback)
      return parseCloudflareTrace(body)
    } catch (fallbackError) {
      console.log(`[Network Panel] Cloudflare failed: ${fallbackError.message}`)
      return null
    }
  }
}

const getFlagEmoji = (countryCode) => {
  let code = asText(countryCode).toUpperCase()
  if (code === 'TW') code = 'CN'
  if (!/^[A-Z]{2}$/.test(code)) return ''

  return String.fromCodePoint(
    ...code.split('').map((character) => 127397 + character.charCodeAt())
  )
}

const formatNetworkIdentity = (info) => {
  if (!info) return ''
  const networkName = info.networkName || '未知网络'
  return info.asn ? `${networkName}（AS${info.asn}）` : networkName
}

const formatLocation = (info) => {
  if (!info) return ''
  const countryCode = asText(info.countryCode).toUpperCase()
  const country = info.country || countryCode
  const detail = info.city || info.region
  const location = [country, detail].filter(Boolean).join(' - ') || '未知位置'
  return [getFlagEmoji(countryCode), location].filter(Boolean).join(' ')
}

const buildPanel = (device, egress, egressError) => {
  const lines = [...device.lines]

  if (egress) {
    lines.push(`节点IP：${egress.ip}`)
    lines.push(`节点网络：${formatNetworkIdentity(egress)}`)
    lines.push(`节点位置：${formatLocation(egress)}`)
  } else {
    lines.push(`节点信息：${egressError || '暂时无法获取'}`)
  }

  return {
    title: device.title,
    content: lines.join('\n'),
    icon: device.icon,
    'icon-color': device.iconColor
  }
}

const finish = (panel) => {
  if (finished) return
  finished = true
  $done(panel)
}

setTimeout(() => {
  console.log('[Network Panel] Script deadline reached')
  finish(buildPanel(collectDeviceNetwork(), null, '请求超时'))
}, CONFIG.deadline)

;(async () => {
  try {
    const egress = await fetchEgressInfo()
    finish(buildPanel(collectDeviceNetwork(), egress))
  } catch (error) {
    console.log(`[Network Panel] Unexpected error: ${error}`)
    finish(buildPanel(collectDeviceNetwork(), null, '暂时无法获取'))
  }
})()