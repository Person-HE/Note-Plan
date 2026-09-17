const { app, BrowserWindow, protocol, Notification, Tray, Menu, ipcMain, globalShortcut } = require('electron')
const path = require('path')
const fs = require('fs')
const { URL } = require('url')
const https = require('https')
const http = require('http')

let mainWindow
let floatingWindow = null
let tray = null
let closeToTray = true

// 单实例锁：防止程序多开，第二次启动时聚焦已有窗口
if (!app.requestSingleInstanceLock()) {
  app.quit()
  return
}
app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.show()
    mainWindow.focus()
  }
})

// 自定义数据路径：必须在 app ready 之前生效，否则 Chromium 仍使用默认 userData
const DEFAULT_USER_DATA = app.getPath('userData')
const DATA_PATH_CONFIG_FILE = path.join(DEFAULT_USER_DATA, 'data-path-config.json')

function readConfiguredDataPath() {
  try {
    if (!fs.existsSync(DATA_PATH_CONFIG_FILE)) return null
    const parsed = JSON.parse(fs.readFileSync(DATA_PATH_CONFIG_FILE, 'utf8'))
    const dataPath = parsed && typeof parsed.dataPath === 'string' ? parsed.dataPath : ''
    if (dataPath && fs.existsSync(dataPath)) {
      return dataPath
    }
    return null
  } catch {
    return null
  }
}

const configuredDataPath = readConfiguredDataPath()
if (configuredDataPath) {
  app.setPath('userData', configuredDataPath)
}

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'app',
    privileges: {
      secure: true,
      standard: true,
      supportFetchAPI: true,
      corsEnabled: true,
      bypassCSP: true,
    },
  },
])

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 375,
    minHeight: 667,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
    backgroundColor: '#faf8f5',
    icon: path.join(__dirname, 'assets', 'appIcon.ico'),
    title: 'Note-Plan',
    autoHideMenuBar: true,
  })

  mainWindow.loadURL('app://localhost/index.html')

  mainWindow.on('close', (e) => {
    if (!app.isQuitting) {
      if (closeToTray) {
        e.preventDefault()
        mainWindow.hide()
      } else {
        app.isQuitting = true
      }
    }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

function createFloatingWindow() {
  if (floatingWindow) return

  floatingWindow = new BrowserWindow({
    width: 360,
    height: 500,
    frame: false,
    alwaysOnTop: true,
    backgroundColor: '#faf8f5',
    resizable: false,
    skipTaskbar: true,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  })

  floatingWindow.loadURL('app://localhost/index.html?mode=floating')

  floatingWindow.on('closed', () => {
    floatingWindow = null
  })
}

function createTray() {
  const iconPath = path.join(__dirname, 'assets', 'appIcon.ico')
  tray = new Tray(iconPath)

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示主窗口',
      click: () => {
        if (mainWindow) {
          mainWindow.show()
          mainWindow.focus()
        }
      },
    },
    {
      label: '隐藏主窗口',
      click: () => {
        if (mainWindow) {
          mainWindow.hide()
        }
      },
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        app.isQuitting = true
        app.quit()
      },
    },
  ])

  tray.setToolTip('Note-Plan')
  tray.setContextMenu(contextMenu)

  tray.on('double-click', () => {
    if (mainWindow) {
      mainWindow.show()
      mainWindow.focus()
    }
  })
}

function setupIpcHandlers() {
  ipcMain.handle('notification:send', (_event, data) => {
    const { title, body, taskId, type } = data

    if (!Notification.isSupported()) {
      return { success: false, error: 'Notifications not supported' }
    }

    const notification = new Notification({
      title,
      body,
      silent: false,
    })

    notification.on('click', () => {
      if (mainWindow) {
        mainWindow.show()
        mainWindow.focus()
        mainWindow.webContents.send('notification:clicked', { taskId, type })
      }
    })

    notification.on('close', () => {
      if (mainWindow) {
        mainWindow.webContents.send('notification:closed', { taskId, type })
      }
    })

    notification.show()
    return { success: true }
  })

  ipcMain.handle('notification:request-permission', () => {
    if (!Notification.isSupported()) {
      return 'denied'
    }
    return 'granted'
  })

  ipcMain.handle('notification:get-permission-status', () => {
    if (!Notification.isSupported()) {
      return 'denied'
    }
    return 'granted'
  })

  ipcMain.handle('notification:dismiss', (_event, _data) => {
    return { success: true }
  })

  ipcMain.handle('window:minimize-to-tray', () => {
    if (mainWindow) {
      mainWindow.hide()
    }
    return { success: true }
  })

  ipcMain.handle('window:show', () => {
    if (mainWindow) {
      mainWindow.show()
      mainWindow.focus()
    }
    return { success: true }
  })

  ipcMain.handle('dialog:selectDataPath', async () => {
    const { dialog } = require('electron')
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
      title: '选择数据存储路径',
    })
    if (result.canceled) return null
    return result.filePaths[0]
  })

  ipcMain.handle('path:getDataPath', () => {
    return app.getPath('userData')
  })

  ipcMain.handle('window:set-close-behavior', (_event, enabled) => {
    closeToTray = !!enabled
    return { success: true }
  })

  ipcMain.handle('data:migrate', async (_event, newPath) => {
    try {
      if (!newPath || typeof newPath !== 'string') return false

      const currentUserData = app.getPath('userData')
      if (path.resolve(newPath) === path.resolve(currentUserData)) return false

      fs.mkdirSync(newPath, { recursive: true })

      const copyDir = (src, dest) => {
        if (!fs.existsSync(src)) return
        fs.mkdirSync(dest, { recursive: true })
        for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
          const srcPath = path.join(src, entry.name)
          const destPath = path.join(dest, entry.name)
          if (entry.isDirectory()) {
            copyDir(srcPath, destPath)
          } else {
            try {
              fs.copyFileSync(srcPath, destPath)
            } catch {
              // 单文件复制失败（如文件被占用）时跳过，不影响整体迁移
            }
          }
        }
      }

      copyDir(path.join(currentUserData, 'IndexedDB'), path.join(newPath, 'IndexedDB'))
      copyDir(path.join(currentUserData, 'Local Storage'), path.join(newPath, 'Local Storage'))

      // 持久化数据路径配置（存放在默认 userData 下，下次启动时读取并生效）
      fs.mkdirSync(DEFAULT_USER_DATA, { recursive: true })
      fs.writeFileSync(DATA_PATH_CONFIG_FILE, JSON.stringify({ dataPath: newPath }))
      return true
    } catch {
      return false
    }
  })

  ipcMain.handle('floating:toggle', () => {
    if (floatingWindow) {
      if (floatingWindow.isVisible()) {
        floatingWindow.hide()
      } else {
        floatingWindow.show()
        floatingWindow.focus()
      }
    } else {
      createFloatingWindow()
      if (floatingWindow) {
        floatingWindow.show()
      }
    }
    return { success: true }
  })

  ipcMain.handle('floating:show', () => {
    if (!floatingWindow) {
      createFloatingWindow()
    }
    if (floatingWindow) {
      floatingWindow.show()
      floatingWindow.focus()
    }
    return { success: true }
  })

  ipcMain.handle('floating:hide', () => {
    if (floatingWindow) {
      floatingWindow.hide()
    }
    return { success: true }
  })

  ipcMain.handle('floating:setAlwaysOnTop', (_event, flag) => {
    if (floatingWindow) {
      floatingWindow.setAlwaysOnTop(flag)
      return { success: true, alwaysOnTop: flag }
    }
    return { success: false }
  })

  ipcMain.handle('floating:getAlwaysOnTop', () => {
    if (floatingWindow) {
      return { success: true, alwaysOnTop: floatingWindow.isAlwaysOnTop() }
    }
    return { success: false, alwaysOnTop: true }
  })

  ipcMain.handle('data:changed', (_event, data) => {
    if (mainWindow) {
      mainWindow.webContents.send('data:changed', data)
    }
    return { success: true }
  })

  ipcMain.handle('ai:call', async (_event, config, payload) => {
    try {
      const data = await callAIHttp(config, payload)
      const choice = data?.choices?.[0]
      if (!choice || !choice.message) {
        return { success: false, error: 'AI 返回数据格式异常', raw: data }
      }
      const content = choice.message.content || ''
      const toolCalls = choice.message.tool_calls
      // 既无文本又无工具调用，视为空内容
      if (!content.trim() && (!toolCalls || toolCalls.length === 0)) {
        return { success: false, error: 'AI 返回了空内容', raw: data }
      }
      return { success: true, data: { content: content.trim(), raw: data } }
    } catch (err) {
      return { success: false, error: err.message || 'AI 请求失败' }
    }
  })

  ipcMain.handle('ai:test', async (_event, config) => {
    try {
      const data = await callAIHttp(config, {
        messages: [{ role: 'user', content: 'Hi' }],
        max_tokens: 5,
        stream: false,
      })
      return { success: true, message: '连接成功！' }
    } catch (err) {
      return { success: false, message: err.message || '连接失败' }
    }
  })

  ipcMain.handle('content:fetch', async (_event, url) => {
    try {
      let html = ''
      let lastError = null

      // 优先使用 BrowserWindow 渲染（可拿到 SPA 渲染后的内容）
      try {
        html = await fetchRenderedPage(url)
      } catch (err) {
        lastError = err
        console.warn('[content:fetch] 渲染方式失败，降级到静态抓取:', err.message)
      }

      // 渲染失败或拿到的内容明显是错误页时，降级用 http(s).get 直接抓取
      const looksLikeErrorPage = !html || html.length < 500
      if (looksLikeErrorPage) {
        try {
          html = await fetchStaticPage(url)
          lastError = null
        } catch (err2) {
          lastError = lastError || err2
        }
      }

      if (!html || html.length < 200) {
        throw new Error(lastError?.message || '无法获取页面内容，可能是链接无效、需要登录或被网站反爬虫策略拦截')
      }

      const result = parseContent(url, html)
      // 简单校验：若关键信息几乎全部为空，提示用户
      if (!result.title && (!result.content || result.content === '无法提取正文内容' || result.content === '无法提取内容')) {
        return {
          success: false,
          error: '页面已加载但未能解析出有效内容。可能原因：1) 链接需要登录查看 2) 平台反爬虫限制 3) 该页面结构与已知模板不匹配',
        }
      }
      return { success: true, data: result }
    } catch (err) {
      return { success: false, error: err.message || '采集失败' }
    }
  })
}

const DESKTOP_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

function fetchRenderedPage(url) {
  return new Promise((resolve, reject) => {
    const fetchWindow = new BrowserWindow({
      width: 1280,
      height: 800,
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        offscreen: true,
      },
    })

    // 设置桌面端 User-Agent，避免被抖音/微信识别为非法客户端
    fetchWindow.webContents.setUserAgent(DESKTOP_USER_AGENT)

    const timeout = setTimeout(() => {
      fetchWindow.destroy()
      reject(new Error('页面加载超时（20秒）'))
    }, 20000)

    let finished = false

    fetchWindow.webContents.on('did-finish-load', () => {
      // 给 SPA 路由足够时间渲染数据
      setTimeout(async () => {
        if (finished) return
        try {
          const html = await fetchWindow.webContents.executeJavaScript('document.documentElement.outerHTML')
          clearTimeout(timeout)
          finished = true
          fetchWindow.destroy()
          resolve(html)
        } catch (err) {
          clearTimeout(timeout)
          finished = true
          fetchWindow.destroy()
          reject(err)
        }
      }, 5000)
    })

    fetchWindow.webContents.on('did-fail-load', (_event, errorCode, errorDesc, validatedURL, isMainFrame) => {
      // 仅主帧失败才认为是整页失败
      if (!isMainFrame) return
      clearTimeout(timeout)
      if (finished) return
      finished = true
      fetchWindow.destroy()
      reject(new Error(errorDesc || `加载失败 (${errorCode})`))
    })

    fetchWindow.loadURL(url, { userAgent: DESKTOP_USER_AGENT })
  })
}

// 降级方案：直接用 Node 原生 http/https 抓取静态 HTML（不执行 JS）
function fetchStaticPage(url) {
  return new Promise((resolve, reject) => {
    let targetUrl
    try {
      targetUrl = new URL(url)
    } catch {
      reject(new Error('无效的 URL'))
      return
    }

    const lib = targetUrl.protocol === 'http:' ? http : https

    const req = lib.get(
      url,
      {
        headers: {
          'User-Agent': DESKTOP_USER_AGENT,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
          'Referer': targetUrl.origin,
        },
        timeout: 15000,
      },
      (res) => {
        // 处理重定向
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          const redirectUrl = new URL(res.headers.location, url).toString()
          res.resume()
          fetchStaticPage(redirectUrl).then(resolve, reject)
          return
        }

        if (res.statusCode && (res.statusCode < 200 || res.statusCode >= 300)) {
          res.resume()
          reject(new Error(`HTTP ${res.statusCode}`))
          return
        }

        const chunks = []
        res.on('data', (chunk) => chunks.push(Buffer.from(chunk)))
        res.on('end', () => {
          const buffer = Buffer.concat(chunks)
          // 简单处理常见 gzip/br：Electron 内置 zlib 可解 gzip
          const encoding = res.headers['content-encoding']
          let html
          if (encoding === 'gzip') {
            const zlib = require('zlib')
            html = zlib.gunzipSync(buffer).toString('utf-8')
          } else if (encoding === 'br') {
            const zlib = require('zlib')
            html = zlib.brotliDecompressSync(buffer).toString('utf-8')
          } else if (encoding === 'deflate') {
            const zlib = require('zlib')
            html = zlib.inflateSync(buffer).toString('utf-8')
          } else {
            html = buffer.toString('utf-8')
          }
          resolve(html)
        })
        res.on('error', reject)
      }
    )

    req.on('error', reject)
    req.on('timeout', () => {
      req.destroy()
      reject(new Error('静态抓取超时（15秒）'))
    })
  })
}

// 主进程代理 AI 请求：避开浏览器 CORS，兼容 OpenAI/DeepSeek/Moonshot/通义等 OpenAI 兼容接口
function buildChatCompletionsUrl(apiBaseUrl) {
  // 兼容用户填入的多种格式：
  //   https://api.openai.com           -> https://api.openai.com/v1/chat/completions
  //   https://api.openai.com/v1        -> https://api.openai.com/v1/chat/completions
  //   https://api.openai.com/v1/       -> https://api.openai.com/v1/chat/completions
  //   https://host/some/path           -> https://host/some/path/v1/chat/completions
  const trimmed = (apiBaseUrl || '').trim().replace(/\/+$/, '')
  if (/\/v1$/i.test(trimmed)) {
    return trimmed + '/chat/completions'
  }
  return trimmed + '/v1/chat/completions'
}

function callAIHttp(config, payload) {
  return new Promise((resolve, reject) => {
    if (!config || !config.apiBaseUrl || !config.model) {
      reject(new Error('AI 配置不完整：缺少 apiBaseUrl 或 model'))
      return
    }

    const fullUrl = buildChatCompletionsUrl(config.apiBaseUrl)
    let targetUrl
    try {
      targetUrl = new URL(fullUrl)
    } catch {
      reject(new Error(`apiBaseUrl 无效：${config.apiBaseUrl}`))
      return
    }

    const lib = targetUrl.protocol === 'http:' ? http : https

    const bodyStr = JSON.stringify({
      model: config.model,
      ...payload,
      stream: false,
    })

    const headers = {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(bodyStr),
      'User-Agent': DESKTOP_USER_AGENT,
      'Accept': 'application/json',
    }
    if (config.apiKey) {
      headers['Authorization'] = `Bearer ${config.apiKey}`
    }

    const req = lib.request(
      {
        method: 'POST',
        hostname: targetUrl.hostname,
        port: targetUrl.port || (targetUrl.protocol === 'https:' ? 443 : 80),
        path: targetUrl.pathname + targetUrl.search,
        headers,
        timeout: 60000,
      },
      (res) => {
        const chunks = []
        res.on('data', (chunk) => chunks.push(Buffer.from(chunk)))
        res.on('end', () => {
          const buffer = Buffer.concat(chunks)
          const text = buffer.toString('utf-8')

          if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
            let detail = text
            try {
              const j = JSON.parse(text)
              detail = j?.error?.message || j?.message || text
            } catch {}
            reject(new Error(`AI API 请求失败 (HTTP ${res.statusCode}): ${detail || res.statusMessage || ''}`))
            return
          }

          try {
            resolve(JSON.parse(text))
          } catch {
            reject(new Error('AI 返回内容不是有效 JSON：' + text.slice(0, 200)))
          }
        })
        res.on('error', reject)
      }
    )

    req.on('error', (err) => {
      reject(new Error(`网络错误：${err.message}`))
    })
    req.on('timeout', () => {
      req.destroy()
      reject(new Error('AI 请求超时（60秒）'))
    })

    req.write(bodyStr)
    req.end()
  })
}

function parseContent(url, html) {
  const isDouyin = url.includes('douyin.com') || url.includes('iesdouyin.com')
  const isWechat = url.includes('mp.weixin.qq.com')

  if (isDouyin) {
    return parseDouyin(html, url)
  }
  if (isWechat) {
    return parseWechat(html, url)
  }
  return parseGeneric(html, url)
}

function parseDouyin(html, url) {
  let title = ''
  let description = ''
  let author = ''
  let coverImage = ''

  const renderDataMatch = html.match(/<script[^>]*id="RENDER_DATA"[^>]*>\s*([\s\S]*?)\s*<\/script>/)
  if (renderDataMatch) {
    try {
      const decoded = decodeURIComponent(renderDataMatch[1])
      const data = JSON.parse(decoded)
      const awmeDetail = findNestedValue(data, 'awemeDetail') || findNestedValue(data, 'aweme_info')
      if (awmeDetail) {
        title = awmeDetail.desc || ''
        description = awmeDetail.desc || ''
        author = awmeDetail.author?.nickname || ''
        coverImage = awmeDetail.video?.cover?.url_list?.[0] || ''
      }
    } catch {}
  }

  if (!title) {
    const metaDescMatch = html.match(/<meta\s+name="description"\s+content="([^"]*)"/i)
    || html.match(/<meta\s+content="([^"]*)"\s+name="description"/i)
    if (metaDescMatch) {
      const metaDesc = decodeHtmlEntities(metaDescMatch[1])
      const metaTitleAuthor = metaDesc.match(/^(.+?)\s*-\s*(\S+?)于\d{4,8}发布/)
      if (metaTitleAuthor) {
        title = metaTitleAuthor[1].trim()
        if (!author) author = metaTitleAuthor[2]
      } else {
        title = metaDesc.replace(/\s*-\s*\S+?于\d{4,8}发布在抖音.*$/, '').trim()
      }
      if (!author) {
        const authorInDesc = metaDesc.match(/(\S+?)于\d{4,8}发布/)
        if (authorInDesc) author = authorInDesc[1]
      }
      if (!description) {
        description = metaDesc.replace(/，来抖音，记录美好生活！$/, '').trim()
      }
    }
  }

  if (!title) {
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
    if (titleMatch) title = decodeHtmlEntities(titleMatch[1].trim())
  }

  if (!description) {
    const descMatch = html.match(/"desc"\s*:\s*"([^"]+)"/)
    if (descMatch) description = decodeHtmlEntities(descMatch[1])
  }

  if (!author) {
    const authorMatch = html.match(/"nickname"\s*:\s*"([^"]+)"/)
    if (authorMatch) author = decodeHtmlEntities(authorMatch[1])
  }

  if (!coverImage) {
    const coverMetaMatch = html.match(/<meta\s+name="lark:url:video_cover_image_url"\s+content="([^"]*)"/i)
    || html.match(/<meta\s+content="([^"]*)"\s+name="lark:url:video_cover_image_url"/i)
    if (coverMetaMatch) {
      coverImage = decodeHtmlEntities(coverMetaMatch[1])
    } else {
      const coverMatch = html.match(/"cover"\s*:\s*"([^"]+)"/)
      if (coverMatch) coverImage = decodeHtmlEntities(coverMatch[1].replace(/\\u002F/g, '/'))
    }
  }

  if (!description && title) {
    description = title
  }
  if (!title) {
    title = '抖音视频'
  }

  return {
    source: 'douyin',
    title: title.replace(/ - 抖音$/, '').trim(),
    content: description || title,
    author,
    coverImage,
    sourceUrl: url,
  }
}

function findNestedValue(obj, key) {
  if (!obj || typeof obj !== 'object') return null
  if (obj[key] !== undefined) return obj[key]
  for (const k of Object.keys(obj)) {
    const result = findNestedValue(obj[k], key)
    if (result) return result
  }
  return null
}

function parseWechat(html, url) {
  let title = ''
  let content = ''
  let author = ''

  const titleMatch = html.match(/<h1[^>]*id="activity-name"[^>]*>([\s\S]*?)<\/h1>/i)
  || html.match(/<h1[^>]*class="rich_media_title"[^>]*>([\s\S]*?)<\/h1>/i)
  || html.match(/var msg_title\s*=\s*'([^']+)'/)
  || html.match(/<title[^>]*>([^<]+)<\/title>/i)
  if (titleMatch) title = decodeHtmlEntities(titleMatch[1].replace(/<[^>]+>/g, '').trim())

  const authorMatch = html.match(/var nickname\s*=\s*'([^']+)'/)
  || html.match(/class="rich_media_meta_nickname"[^>]*>([\s\S]*?)<\/a>/i)
  || html.match(/id="js_name"[^>]*>([\s\S]*?)<\/a>/i)
  if (authorMatch) {
    const text = authorMatch[1].replace(/<[^>]+>/g, '').trim()
    author = decodeHtmlEntities(text)
  }

  const contentMatch = html.match(/id="js_content"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/i)
  || html.match(/class="rich_media_content"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/i)
  if (contentMatch) {
    content = contentMatch[1]
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      // 块级元素转换为换行，保留文本结构
      .replace(/<\/(p|div|h[1-6]|li|blockquote|ul|ol|tr)>/gi, '\n')
      .replace(/<br\s*\/?>/gi, '\n')
      // 移除所有剩余 HTML 标签
      .replace(/<[^>]+>/g, '')
      // 解码 HTML 实体
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      // 清理多余空白
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
      .slice(0, 5000)
  }

  if (!content) {
    const bodyText = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim()
      .slice(0, 5000)
    if (bodyText.length > 100) {
      content = bodyText
    }
  }

  if (!title) title = '微信公众号文章'

  return {
    source: 'wechat',
    title: title.replace(/ - 微信公众平台$/, '').trim(),
    content: content || '无法提取正文内容',
    author,
    sourceUrl: url,
  }
}

function parseGeneric(html, url) {
  let title = ''
  let content = ''

  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  if (titleMatch) title = decodeHtmlEntities(titleMatch[1].trim())

  // 优先提取 meta description / og:description 作为摘要
  const metaDescMatch = html.match(/<meta\s+name="description"\s+content="([^"]*)"/i)
    || html.match(/<meta\s+content="([^"]*)"\s+name="description"/i)
    || html.match(/<meta\s+property="og:description"\s+content="([^"]*)"/i)
    || html.match(/<meta\s+content="([^"]*)"\s+property="og:description"/i)
  if (metaDescMatch) {
    content = decodeHtmlEntities(metaDescMatch[1]).trim()
  }

  // 若无 meta 描述，从 body 提取纯文本
  if (!content) {
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
    if (bodyMatch) {
      content = bodyMatch[1]
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
        .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
        .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
        .replace(/<\/(p|div|h[1-6]|li|blockquote|ul|ol|tr)>/gi, '\n')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/[ \t]+/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim()
        .slice(0, 5000)
    }
  }

  return {
    source: 'share',
    title: title || '网页内容',
    content: content || '无法提取内容',
    author: '',
    sourceUrl: url,
  }
}

function decodeHtmlEntities(str) {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '\t')
}

app.whenReady().then(() => {
  const distPath = path.join(__dirname, '..', 'dist')

  protocol.handle('app', (request) => {
    const url = new URL(request.url)
    let filePath = path.join(distPath, url.pathname)

    if (url.pathname === '/' || url.pathname === '') {
      filePath = path.join(distPath, 'index.html')
    }

    const ext = path.extname(filePath)
    const mimeTypes = {
      '.html': 'text/html',
      '.js': 'text/javascript',
      '.mjs': 'text/javascript',
      '.css': 'text/css',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.ico': 'image/x-icon',
      '.webmanifest': 'application/manifest+json',
      '.woff': 'font/woff',
      '.woff2': 'font/woff2',
      '.ttf': 'font/ttf',
    }

    const mimeType = mimeTypes[ext] || 'application/octet-stream'

    try {
      const data = fs.readFileSync(filePath)
      return new Response(data, {
        headers: { 'content-type': mimeType },
      })
    } catch {
      return new Response('Not Found', { status: 404 })
    }
  })

  setupIpcHandlers()
  createWindow()
  createTray()
  createFloatingWindow()

  globalShortcut.register('Ctrl+Shift+N', () => {
    if (floatingWindow) {
      if (floatingWindow.isVisible()) {
        floatingWindow.hide()
      } else {
        floatingWindow.show()
        floatingWindow.focus()
      }
    } else {
      createFloatingWindow()
      if (floatingWindow) {
        floatingWindow.show()
      }
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  } else if (mainWindow) {
    mainWindow.show()
  }
})

app.on('before-quit', () => {
  app.isQuitting = true
  globalShortcut.unregisterAll()
})
