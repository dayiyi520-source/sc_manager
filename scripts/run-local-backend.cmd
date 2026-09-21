@echo off
setlocal
set "PROJECT_ROOT=%~dp0.."
set "MAVEN=%PROJECT_ROOT%\.tools\apache-maven-3.9.11\bin\mvn.cmd"
set "SERVICE_PORT=%~1"
if "%SERVICE_PORT%"=="" set "SERVICE_PORT=8080"
if not exist "%MAVEN%" exit /b 2
cd /d "%PROJECT_ROOT%\backend"
call "%MAVEN%" spring-boot:run "-Dspring-boot.run.profiles=local" "-Dspring-boot.run.arguments=--server.port=%SERVICE_PORT% --spring.flyway.out-of-order=true"
exit /b %ERRORLEVEL%
