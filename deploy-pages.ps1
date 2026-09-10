# 部署 frontend/dist 到 GitHub Pages（gh-pages 分支）
# 用法：powershell -ExecutionPolicy Bypass -File deploy-pages.ps1
$ErrorActionPreference = 'Stop'
$ROOT = 'D:\develop\Kakuki'
Set-Location $ROOT

Write-Host "==> 构建前端..."
Push-Location "$ROOT\frontend"
npm run build
if ($LASTEXITCODE -ne 0) { Write-Host "BUILD_FAILED"; exit 1 }
Pop-Location

# SPA 路由兜底：GitHub Pages 对未知路径提供 404.html
Copy-Item "$ROOT\frontend\dist\index.html" "$ROOT\frontend\dist\404.html" -Force
Write-Host "==> 已生成 404.html（SPA 兜底）"

Write-Host "==> 同步 gh-pages 分支（worktree）..."
git fetch github gh-pages 2>$null
if (-not (git rev-parse --verify github/gh-pages 2>$null)) {
  Write-Host "FETCH_FAILED: 无法获取远端 gh-pages"; exit 1
}

$wt = ".gh-pages-wt"
if (Test-Path $wt) { git worktree remove $wt --force 2>$null }
git branch -D gh-pages 2>$null

# 从 remote-tracking 检出 detached HEAD，再创建本地 gh-pages 分支（避免 orphan 分支 rm -rf . 破坏 .git）
git worktree add --detach $wt github/gh-pages 2>$null
if ($LASTEXITCODE -ne 0) { Write-Host "WORKTREE_ADD_FAILED"; exit 1 }
git -C $wt checkout -B gh-pages

# 清空旧内容（保留 .git），复制新构建
Get-ChildItem $wt -Force | Where-Object { $_.Name -ne '.git' } | Remove-Item -Recurse -Force
Copy-Item frontend\dist\* $wt -Recurse -Force

git -C $wt add -A
git -C $wt commit -m "deploy: $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
if ($LASTEXITCODE -ne 0) { Write-Host "COMMIT_FAILED"; exit 1 }
git -C $wt push github gh-pages --force
if ($LASTEXITCODE -ne 0) { Write-Host "PUSH_FAILED"; exit 1 }
git worktree remove $wt --force

Write-Host "==> 部署完成: https://prisdvl.github.io/Kakuki/"
