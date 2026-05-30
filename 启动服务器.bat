@echo off
cd /d "%~dp0"
set DATA_DIR=%USERPROFILE%\Desktop\小e阅读器数据
echo 正在启动小e阅读器网页版...
start "" http://localhost:3003
node server.js
pause
