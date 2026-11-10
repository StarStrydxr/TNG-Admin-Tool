@echo off
setlocal enabledelayedexpansion

rem Builds The Next Generation - GM and Admin Tool as a standalone .exe, installs it to a stable folder, and
rem puts (or refreshes) a shortcut on the Desktop.
rem
rem Run this again whenever you change data\canon\ — canon is compiled into the app.

echo.
echo Building The Next Generation - GM and Admin Tool (release). The first build takes a few minutes.
echo.

call npm run tauri build -- --no-bundle
if errorlevel 1 (
  echo.
  echo Build failed. Nothing was copied.
  exit /b 1
)

set "SRC=%~dp0src-tauri\target\release"
set "DEST=%LOCALAPPDATA%\Programs\The Next Generation - GM and Admin Tool"

rem Tauri may name the binary after productName or after the crate; check both,
rem then fall back to whatever single .exe is sitting there.
set "EXE="
if exist "%SRC%\The Next Generation - GM and Admin Tool.exe" set "EXE=The Next Generation - GM and Admin Tool.exe"
if not defined EXE if exist "%SRC%\tng-gm-admin-tool.exe" set "EXE=tng-gm-admin-tool.exe"
if not defined EXE if exist "%SRC%\JJK RP Vault.exe" set "EXE=JJK RP Vault.exe"
if not defined EXE if exist "%SRC%\jjk-rp-vault.exe" set "EXE=jjk-rp-vault.exe"
if not defined EXE for %%F in ("%SRC%\*.exe") do if not defined EXE set "EXE=%%~nxF"

if not defined EXE (
  echo Could not find a built .exe in "%SRC%".
  exit /b 1
)

if not exist "%DEST%" mkdir "%DEST%"
copy /Y "%SRC%\%EXE%" "%DEST%\%EXE%" >nul
if errorlevel 1 (
  echo Could not copy the executable. Is the app still running?
  exit /b 1
)

set "EXEPATH=%DEST%\%EXE%"
set "DESTDIR=%DEST%"

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$link = Join-Path ([Environment]::GetFolderPath('Desktop')) 'The Next Generation - GM and Admin Tool.lnk';" ^
  "$s = (New-Object -ComObject WScript.Shell).CreateShortcut($link);" ^
  "$s.TargetPath = $env:EXEPATH; $s.WorkingDirectory = $env:DESTDIR;" ^
  "$s.Description = 'The Next Generation - GM and Admin Tool'; $s.Save()"

echo.
echo Installed:  %EXEPATH%
echo Shortcut:   Desktop\The Next Generation - GM and Admin Tool.lnk
echo Your data:  %APPDATA%\jjk-rp-vault
echo.
echo First launch may show a SmartScreen warning because the app is unsigned.
echo Click "More info" then "Run anyway" once; it will not ask again.
echo.
