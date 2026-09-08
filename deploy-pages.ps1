# 部署 frontend/dist 到 GitHub Pages（gh-pages 分支）
# 用法：powershell -ExecutionPolicy Bypass -File deploy-pages.ps1
$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)

Write-Host "==> 构建前端..."
Push-Location frontend
npm run build
Pop-Location

Write-Host "==> 同步 gh-pages 分支（worktree）..."
git fetch github gh-pages 2>$null

$wt = ".gh-pages-wt"
if (Test-Path $wt) { git worktree remove $wt --force }
git worktree add $wt gh-pages 2>$null
if (-not (Test-Path "$wt\.git")) {
  Write-Host "gh-pages 分支不存在，创建孤儿分支"
  git worktree remove $wt --force
  git worktree add --detach $wt
  git -C $wt checkout --orphan gh-pages
  git -C $wt rm -rf . 2>$null
}

# 清空旧内容（保留 .git），复制新构建
Get-ChildItem $wt -Force | Where-Object { $_.Name -ne '.git' } | Remove-Item -Recurse -Force
Copy-Item frontend\dist\* $wt -Recurse -Force

git -C $wt add -A
git -C $wt commit -m "deploy: $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
git -C $wt push github gh-pages
git worktree remove $wt --force

Write-Host "==> 部署完成: https://prisdvl.github.io/Kakuki/"
