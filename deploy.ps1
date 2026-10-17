param(
    [switch]$SkipGitPush
)

$ErrorActionPreference = "Stop"

$SSH_KEY = "C:\Users\CGS_Computer\Videos\oracle cli\keys\instance_id_rsa_private"
$VM_IP = "129.213.134.206"
$VM_USER = "ubuntu"

Write-Host "StockLens Oracle Cloud Deployment" -ForegroundColor Cyan
Write-Host "----------------------------------------" -ForegroundColor Gray

# 1. Push to GitHub if not skipped
if (-not $SkipGitPush) {
    Write-Host "Checking local git status..." -ForegroundColor Yellow
    $unpushed = git log origin/master..HEAD --oneline 2>$null
    if ($unpushed) {
        Write-Host "Pushing local commits to GitHub..." -ForegroundColor Yellow
        git push origin master
    } else {
        Write-Host "Local branch is in sync with GitHub." -ForegroundColor Green
    }
}

# 2. Trigger pull and rebuild on Oracle VM
Write-Host "Updating and rebuilding on Oracle VM ($VM_IP)..." -ForegroundColor Yellow

$cmd = "set -e; cd /home/ubuntu/StockLens && echo '--> Pulling latest code...' && git pull origin master && echo '--> Building production bundle...' && npm run build && echo '--> Restarting systemd service...' && sudo systemctl restart stocklens && sleep 2 && echo '--> Verifying health...' && curl -s http://127.0.0.1:3000/health"

ssh -i "$SSH_KEY" -o BatchMode=yes -o StrictHostKeyChecking=no "$VM_USER@$VM_IP" "$cmd"

Write-Host ""
Write-Host "Deployment successful! Live at:" -ForegroundColor Green
Write-Host "   -> http://$VM_IP" -ForegroundColor Cyan
Write-Host "   -> https://stockalphai.duckdns.org" -ForegroundColor Cyan
