# Check for administrator privileges
if (-NOT ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Warning "이 스크립트는 관리자 권한으로 실행해야 합니다. PowerShell을 관리자 권한으로 다시 열어주세요."
    Break
}

Write-Host "Installing Node.js (LTS)..." -ForegroundColor Cyan
winget install OpenJS.NodeJS.LTS --silent --accept-package-agreements --accept-source-agreements

Write-Host "Installing FFmpeg..." -ForegroundColor Cyan
winget install Gyan.FFmpeg --silent --accept-package-agreements --accept-source-agreements

Write-Host "`n--------------------------------------------------" -ForegroundColor Green
Write-Host "설치가 완료되었습니다!" -ForegroundColor Green
Write-Host "중요: 환경 변수 반영을 위해 현재 터미널(VS Code)을 껐다가 다시 켜주세요." -ForegroundColor Yellow
Write-Host "그 후 'npm install' -> 'npm start'를 실행하시면 됩니다." -ForegroundColor Yellow
Write-Host "--------------------------------------------------" -ForegroundColor Green
