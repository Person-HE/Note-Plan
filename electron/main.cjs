const { app, BrowserWindow, protocol, Notification, Tray, Menu, ipcMain, globalShortcut } = require('electron')
const path = require('path')
const fs = require('fs')
const { URL } = require('url')
const https = require('https')
const http = require('http')

let mainWindow
let floatingWindow = null
let tray = null

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
      e.preventDefault()
      mainWindow.hide()
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

  ipcMain.handle('data:migrate', async (_event, newPath) => {
    try {
      const userDataPath = app.getPath('userData')
      const indexedDBSource = path.join(userDataPath, 'IndexedDB')
      const indexedDBDest = path.join(newPath, 'IndexedDB')

      if (fs.existsSync(indexedDBSource)) {
        if (!fs.existsSync(indexedDBDest)) {
          fs.mkdirSync(indexedDBDest, { recursive: true })
        }

        const copyDir = (src, dest) => {
          const entries = fs.readdirSync(src, { withFileTypes: true })
          for (const entry of entries) {
            const srcPath = path.join(src, entry.name)
            const destPath = path.join(dest, entry.name)
            if (entry.isDirectory()) {
              if (!fs.existsSync(destPath)) {
                fs.mkdirSync(destPath, { recursive: true })
              }
              copyDir(srcPath, destPath)
            } else {
              fs.copyFileSync(srcPath, destPath)
            }
          }
        }

        copyDir(indexedDBSource, indexedDBDest)
      }

      const localStorageSource = path.join(userDataPath, 'Local Storage')
      const localStorageDest = path.join(newPath, 'Local Storage')

      if (fs.existsSync(localStorageSource)) {
        if (!fs.existsSync(localStorageDest)) {
          fs.mkdirSync(localStorageDest, { recursive: true })
        }

        const entries = fs.readdirSync(localStorageSource, { withFileTypes: true })
        for (const entry of entries) {
          if (entry.isFile()) {
            fs.copyFileSync(
              path.join(localStorageSource, entry.name),
              path.join(localStorageDest, entry.name)
            )
          }
        }
      }

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

  ipcMain.handle('content:fetch', async (_event, url) => {
    try {
      const html = await fetchRenderedPage(url)
      const result = parseContent(url, html)
      return { success: true, data: result }
    } catch (err) {
      return { success: false, error: err.message || '采集失败' }
    }
  })
}

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

    const timeout = setTimeout(() => {
      fetchWindow.destroy()
      reject(new Error('页面加载超时'))
    }, 20000)

    fetchWindow.webContents.on('did-finish-load', () => {
      setTimeout(async () => {
        try {
          const html = await fetchWindow.webContents.executeJavaScript('document.documentElement.outerHTML')
          clearTimeout(timeout)
          fetchWindow.destroy()
          resolve(html)
        } catch (err) {
          clearTimeout(timeout)
          fetchWindow.destroy()
          reject(err)
        }
      }, 3000)
    })

    fetchWindow.webContents.on('did-fail-load', (_event, errorCode, errorDesc) => {
      clearTimeout(timeout)
      fetchWindow.destroy()
      reject(new Error(errorDesc || `加载失败 (${errorCode})`))
    })

    fetchWindow.loadURL(url)
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
      .replace(/<img[^>]+data-src="([^"]*)"[^>]*>/gi, '<img src="$1">')
      .replace(/<[^>]+>/g, (match) => {
        if (match.match(/^<(p|br|h[1-6]|ul|ol|li|strong|em|blockquote|img|a|div|span)\b/i) || match.match(/^<\/(p|h[1-6]|ul|ol|li|strong|em|blockquote|a|div|span)\b/i)) {
          return match
        }
        return ''
      })
      .replace(/\s{2,}/g, ' ')
      .trim()
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

  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
  if (bodyMatch) {
    content = bodyMatch[1]
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim()
      .slice(0, 5000)
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
