$ErrorActionPreference = 'SilentlyContinue'
function Start-ServiceDetached($commandLine) {
  $null = Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments @{ CommandLine = $commandLine }
}
function Test-Port($port) {
  return [bool](Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue)
}
Write-Output "[keepalive] Kakuki daemon started $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
while ($true) {
  try {
    if (-not (Test-Port 8000)) {
      Write-Output "[keepalive] backend 8000 down, restarting $(Get-Date -Format 'HH:mm:ss')"
      Start-ServiceDetached 'cmd.exe /c cd /d D:\develop\Kakuki\backend && .\venv\Scripts\python.exe manage.py runserver 0.0.0.0:8000 --noreload > runserver.log 2>&1'
      Start-Sleep -Seconds 5
    }
    if (-not (Test-Port 3000)) {
      Write-Output "[keepalive] frontend 3000 down, restarting $(Get-Date -Format 'HH:mm:ss')"
      Start-ServiceDetached 'cmd.exe /c cd /d D:\develop\Kakuki\frontend && npm run dev > dev.log 2>&1'
      Start-Sleep -Seconds 5
    }
  } catch {
    Write-Output "[keepalive] check error: $($_.Exception.Message)"
  }
  Start-Sleep -Seconds 10
}
