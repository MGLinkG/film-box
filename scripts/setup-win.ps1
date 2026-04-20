$ErrorActionPreference = "Stop"

function Has-Command($name) {
  $cmd = Get-Command $name -ErrorAction SilentlyContinue
  return $null -ne $cmd
}

function Refresh-Path() {
  $machine = [Environment]::GetEnvironmentVariable("Path", "Machine")
  $user = [Environment]::GetEnvironmentVariable("Path", "User")
  $env:Path = "$machine;$user"
}

function Get-WindowsArch() {
  $arch = (Get-CimInstance Win32_OperatingSystem).OSArchitecture
  if ($arch -match "ARM") { return "arm64" }
  if ($arch -match "64") { return "x64" }
  return "x86"
}

function Ensure-NodeLts() {
  $needInstall = $false
  if (-not (Has-Command "node")) { $needInstall = $true }
  if (-not $needInstall) {
    try {
      $nodeMajor = (node -p "process.versions.node.split('.')[0]")
      if ([int]$nodeMajor -lt 22) { $needInstall = $true }
    } catch {
      $needInstall = $true
    }
  }

  if (-not $needInstall) { return }

  if (Has-Command "winget") {
    winget install -e --id OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
    Refresh-Path
    return
  }

  $arch = Get-WindowsArch
  $index = Invoke-RestMethod -Uri "https://nodejs.org/dist/index.json" -UseBasicParsing
  $lts = ($index | Where-Object { $_.lts -ne $false } | Select-Object -First 1)
  if (-not $lts -or -not $lts.version) {
    throw "Failed to get Node.js LTS version from nodejs.org."
  }

  $ver = $lts.version.TrimStart("v")
  $msi = "node-v$ver-$arch.msi"
  $url = "https://nodejs.org/dist/v$ver/$msi"
  $dest = Join-Path $env:TEMP $msi

  Invoke-WebRequest -Uri $url -OutFile $dest -UseBasicParsing
  Start-Process "msiexec.exe" -ArgumentList "/i `"$dest`" /qn /norestart" -Wait
  Refresh-Path
}

Ensure-NodeLts

if (-not (Has-Command "node")) {
  throw "Node.js installation failed."
}
if (-not (Has-Command "npm")) {
  throw "npm not found. Reinstall Node.js LTS."
}

$nodeMajor = (node -p "process.versions.node.split('.')[0]")
if ([int]$nodeMajor -lt 22) {
  throw "Node.js version too low. Need Node.js 22+."
}

if (-not $env:ELECTRON_MIRROR) {
  $env:ELECTRON_MIRROR = "https://npmmirror.com/mirrors/electron/"
}
if (-not $env:ELECTRON_BUILDER_BINARIES_MIRROR) {
  $env:ELECTRON_BUILDER_BINARIES_MIRROR = "https://npmmirror.com/mirrors/electron-builder-binaries/"
}

Set-Location (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location ..

npm ci
npm run build:win
