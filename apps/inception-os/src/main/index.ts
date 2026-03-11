import { app, shell, BrowserWindow, ipcMain, WebContentsView } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    titleBarStyle: 'hidden',
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  // Create the WebContentsView for the Spatial Browser content
  const view = new WebContentsView()
  mainWindow.contentView.addChildView(view)

  // Position it to the right of the IconRail (56px) and below the Chrome (48px)
  // We subtract 100px from the height to leave space for the ATHENA Command Bar
  const updateViewBounds = (): void => {
    const contentBounds = mainWindow.getContentBounds()
    view.setBounds({
      x: 56,
      y: 48,
      width: Math.max(0, contentBounds.width - 56),
      height: Math.max(0, contentBounds.height - 48 - 100)
    })
  }

  mainWindow.on('resize', updateViewBounds)
  mainWindow.on('ready-to-show', () => {
    updateViewBounds()
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // Handle browser navigation from the React UI (ATHENA bar)
  ipcMain.on('browser:navigate', (_, url) => {
    let finalUrl = url
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      // Basic heuristic: if it looks like a domain, prepend https, else search google
      if (url.includes('.') && !url.includes(' ')) {
        finalUrl = 'https://' + url
      } else {
        finalUrl = 'https://google.com/search?q=' + encodeURIComponent(url)
      }
    }
    view.webContents.loadURL(finalUrl)
  })

  // Start the spatial browser with a default page
  view.webContents.loadURL('https://fal.ai')

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
