@echo off
cd /d "%~dp0"
echo Foodie Hub is starting at http://localhost:8080
start "" http://localhost:8080
python -m http.server 8080
