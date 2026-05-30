@echo off
cd /d "%~dp0"
set DATA_DIR=%USERPROFILE%\Desktop\小e阅读器数据

:: 启动 Node 服务器（隐藏窗口）
start /min node server.js
timeout /t 3 /nobreak >nul

:: 打开浏览器
start "" http://localhost:3003

:: 启动 Cloudflare 隧道
echo ============================================
echo  小e阅读器 - 正在创建 Cloudflare 隧道...
echo  请复制下面这行网址，手机也能访问
echo ============================================
echo.
cloudflared tunnel --url http://localhost:3003
echo.
pause
