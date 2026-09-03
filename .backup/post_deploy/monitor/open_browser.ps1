param([string]$Port = "8080")

$portFile = Join-Path $PSScriptRoot "monitor_port.txt"
$retryCount = 0
while (-not (Test-Path $portFile) -and $retryCount -lt 10) {
    Start-Sleep -Milliseconds 500
    $retryCount++
}

if (Test-Path $portFile) {
    $filePort = (Get-Content $portFile).Trim()
    if ($filePort -match '^\d+$') {
        $Port = $filePort
    }
}

$url = "http://localhost:$Port"
$taskName = "AIMonitorLaunch_$($PID)_$((Get-Date).Ticks)"
$action = New-ScheduledTaskAction -Execute "cmd.exe" -Argument "/c start $url"
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddSeconds(2)
Register-ScheduledTask -Action $action -Trigger $trigger -TaskName $taskName -User $env:USERNAME -Force | Out-Null
Start-ScheduledTask -TaskName $taskName | Out-Null
Start-Sleep -Seconds 3
Unregister-ScheduledTask -TaskName $taskName -Confirm:$false | Out-Null
