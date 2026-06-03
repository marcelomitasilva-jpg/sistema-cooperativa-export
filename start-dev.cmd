@echo off
cd /d "%~dp0"
echo Iniciando Sistema Cooperativa en http://localhost:3000
echo.
node.exe node_modules\next\dist\bin\next dev
echo.
echo El servidor se detuvo. Presiona una tecla para cerrar.
pause > nul
