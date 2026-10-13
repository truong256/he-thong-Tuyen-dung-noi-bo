$candidateJdks = @(
    "C:\Program Files\Eclipse Adoptium\jdk-21.0.12.101-hotspot",
    "C:\Program Files\Java\jdk-21.0.12.1",
    "C:\Program Files\Java\latest"
)
$javaHome = $candidateJdks | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $javaHome -and $env:JAVA_HOME) { $javaHome = $env:JAVA_HOME }
if ($javaHome) {
    $env:JAVA_HOME = $javaHome
    $env:Path = "$javaHome\bin;$env:Path"
}
$javaExe = if ($javaHome -and (Test-Path "$javaHome\bin\java.exe")) { "$javaHome\bin\java.exe" } else { "java" }


$envFile = Join-Path $PSScriptRoot ".env"
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        $line = $_.Trim()
        if ($line -and -not $line.StartsWith("#") -and $line.Contains("=")) {
            $parts = $line.Split("=", 2)
            $name = $parts[0].Trim()
            $val = $parts[1].Trim()
            [Environment]::SetEnvironmentVariable($name, $val, "Process")
        }
    }
}

Set-Location "$PSScriptRoot\backend\auth-service"
& $javaExe -jar "target\auth-service-0.0.1-SNAPSHOT.jar" --spring.profiles.active=dev,smtp
