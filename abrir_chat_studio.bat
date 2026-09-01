@echo off
color 0B
echo ========================================================
echo [+] LANZANDO FACTORIA V34: CHAT STUDIO LOCAL
echo ========================================================

start "Servidor Backend V34" cmd /k "node C:\tiktok\scripts\servidor_chat_v34.js"
start "Remotion Dev Studio" cmd /k "cd /d C:\tiktok\remotion && npm run dev"
timeout /t 3 /nobreak
start http://localhost:3000
