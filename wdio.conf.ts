import { spawn, spawnSync } from 'child_process'
import { pathExistsSync } from 'fs-extra'
import path from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Keep track of the child processes
let tauriDriver: ReturnType<typeof spawn>
let nativeDriver: ReturnType<typeof spawn>

// Determine the application binary path
const isWindows = process.platform === 'win32'
const binaryName = isWindows ? 'email-client-app.exe' : 'email-client-app'
const releasePath = path.resolve(__dirname, 'src-tauri/target/release', binaryName)
const debugPath = path.resolve(__dirname, 'src-tauri/target/debug', binaryName)

// Use debug build for more error info
const appPath = debugPath

// Get edgedriver path - it's downloaded by edgedriver npm package to temp
const edgedriverPath = path.resolve(process.env.TEMP || '', 'msedgedriver.exe')

// Ports
const tauriDriverPort = 4444
const nativeDriverPort = 9515

export const config: WebdriverIO.Config = {
  //
  // ====================
  // Runner Configuration
  // ====================
  runner: 'local',
  autoCompileOpts: {
    autoCompile: true,
    tsNodeOpts: {
      transpileOnly: true,
      files: true,
    },
  },
  specs: ['./e2e-wdio/**/*.spec.ts'],
  maxInstances: 1,

  capabilities: [
    {
      maxInstances: 1,
      'tauri:options': {
        application: appPath,
      },
    },
  ],

  // WebDriver server settings for tauri-driver
  hostname: 'localhost',
  port: tauriDriverPort,

  //
  // ===================
  // Test Configurations
  // ===================
  logLevel: 'info',
  bail: 0,
  baseUrl: 'http://localhost',
  waitforTimeout: 30000,
  connectionRetryTimeout: 120000,
  connectionRetryCount: 3,

  reporters: ['spec'],

  framework: 'mocha',
  mochaOpts: {
    ui: 'bdd',
    timeout: 120000,
  },

  //
  // =====
  // Hooks
  // =====

  // Build the Tauri application before running tests
  onPrepare: () => {
    console.log('Building Tauri application...')
    const buildResult = spawnSync('cargo', ['build', '--release'], {
      cwd: path.resolve(__dirname, 'src-tauri'),
      stdio: 'inherit',
      shell: true,
    })

    if (buildResult.status !== 0) {
      console.log('Release build failed, trying debug build...')
      spawnSync('cargo', ['build'], {
        cwd: path.resolve(__dirname, 'src-tauri'),
        stdio: 'inherit',
        shell: true,
      })
    }
    console.log('Build complete!')
  },

  // Start native WebDriver and tauri-driver before each session
  beforeSession: () => {
    const tauriDriverPath = path.resolve(
      process.env.HOME || process.env.USERPROFILE || '',
      '.cargo/bin/tauri-driver' + (isWindows ? '.exe' : '')
    )

    console.log(`tauri-driver path: ${tauriDriverPath}`)
    console.log(`msedgedriver path: ${edgedriverPath}`)
    console.log(`App path: ${appPath}`)

    // Start native WebDriver (msedgedriver) first
    console.log(`Starting msedgedriver on port ${nativeDriverPort}...`)
    nativeDriver = spawn(edgedriverPath, [
      '--port=' + nativeDriverPort,
      '--allowed-ips=0.0.0.0',
      '--allowed-origins=*',
    ], {
      stdio: [null, process.stdout, process.stderr],
    })

    // Wait a bit for native driver to start
    const waitSync = (ms: number) => {
      const end = Date.now() + ms
      while (Date.now() < end) {}
    }
    waitSync(2000)

    // Start tauri-driver pointing to the native driver
    console.log(`Starting tauri-driver on port ${tauriDriverPort}...`)
    tauriDriver = spawn(tauriDriverPath, [
      '--port', String(tauriDriverPort),
      '--native-port', String(nativeDriverPort),
      '--native-driver', edgedriverPath,
    ], {
      stdio: [null, process.stdout, process.stderr],
    })
  },

  // Cleanup tauri-driver and native driver after session
  afterSession: () => {
    console.log('Stopping tauri-driver...')
    if (tauriDriver) {
      tauriDriver.kill()
    }
    console.log('Stopping msedgedriver...')
    if (nativeDriver) {
      nativeDriver.kill()
    }
  },
}
