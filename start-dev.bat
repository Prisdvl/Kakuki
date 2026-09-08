@echo off
rem ============================================
rem  Kakuki 博客一键启动（后端 Django + 前端 Vite）
rem  双击运行，两个服务窗口会保持打开
rem ============================================
cd /d %~dp0

echo [1/3] 启动后端 Django (http://127.0.0.1:8000) ...
start "Kakuki-Backend" cmd /k "cd /d %~dp0backend && .venv\Scripts\python.exe manage.py runserver 0.0.0.0:8000 --noreload"

echo [2/3] 启动前端 Vite (http://localhost:3001) ...
start "Kakuki-Frontend" cmd /k "cd /d %~dp0frontend && npm run dev -- --port 3001"

echo [3/3] 等待服务就绪后自动打开浏览器...
timeout /t 8 /nobreak >nul
start http://localhost:3001

echo.
echo 已启动完成。关闭两个黑色窗口即可停止服务。
pause
