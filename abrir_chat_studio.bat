@echo off
color 0B
echo ========================================================
echo [+] LANZANDO FACTORIA V34: CHAT STUDIO EN HTTP://LOCALHOST:3001
echo ========================================================

start "Servidor Backend V34" cmd /k "node C:\tiktok\scripts\servidor_chat_v34.js"
timeout /t 2 /nobreak
start http://localhost:3001
