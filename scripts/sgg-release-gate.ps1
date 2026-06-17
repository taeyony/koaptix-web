$ErrorActionPreference = "Stop"

function Get-RollbackTarget {
  try {
    $path = Join-Path (Get-Location) "src/lib/koaptix/universes.ts"
    $raw = Get-Content -LiteralPath $path -Raw
    $pattern = "(?s)//\s*(Batch\s+\d+)\s+.*?staged exposure.*?(?=//\s*Batch\s+\d+\s+.*?staged exposure|\];)"
    $matches = [regex]::Matches($raw, $pattern)

    if ($matches.Count -eq 0) {
      return "latest staged SGG batch block"
    }

    $latest = $matches[$matches.Count - 1]
    $codes = [regex]::Matches($latest.Value, 'code:\s*"(?<code>SGG_\d+)"') |
      ForEach-Object { $_.Groups["code"].Value }

    if ($codes.Count -gt 0) {
      return "$($latest.Groups[1].Value) registry block ($($codes -join ', '))"
    }

    return "$($latest.Groups[1].Value) registry block"
  } catch {
    return "latest staged SGG batch block"
  }
}

function Invoke-GateCommand {
  param(
    [Parameter(Mandatory = $true)][string]$Name,
    [hashtable]$Environment = @{}
  )

  $envSummary = "none"
  if ($Environment.Count -gt 0) {
    $envSummary = (($Environment.GetEnumerator() | Sort-Object Name | ForEach-Object {
      "$($_.Name)=$($_.Value)"
    }) -join ",")
  }

  Write-Host "[sgg-release-gate] step=npm run $Name env=$envSummary"
  $previousEnv = @{}
  foreach ($key in $Environment.Keys) {
    $previousEnv[$key] = [Environment]::GetEnvironmentVariable($key, "Process")
    [Environment]::SetEnvironmentVariable($key, [string]$Environment[$key], "Process")
  }

  $previousErrorActionPreference = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  try {
    $output = & npm.cmd run $Name 2>&1
    $exitCode = $LASTEXITCODE
  } finally {
    $ErrorActionPreference = $previousErrorActionPreference
    foreach ($key in $Environment.Keys) {
      [Environment]::SetEnvironmentVariable($key, $previousEnv[$key], "Process")
    }
  }

  foreach ($line in $output) {
    Write-Host $line
  }

  return [pscustomobject]@{
    Name = $Name
    ExitCode = $exitCode
    Text = ($output -join [Environment]::NewLine)
  }
}

function ConvertFrom-EmbeddedJson {
  param(
    [Parameter(Mandatory = $true)][string]$Text
  )

  $start = $Text.IndexOf("{")
  $end = $Text.LastIndexOf("}")

  if ($start -lt 0 -or $end -le $start) {
    throw "Command output did not contain JSON."
  }

  $json = $Text.Substring($start, $end - $start + 1)
  return $json | ConvertFrom-Json
}

function Get-ParsedCount {
  param(
    [Parameter(Mandatory = $false)]$Value
  )

  if ($null -eq $Value) {
    return 0
  }

  return [int]$Value
}

function Analyze-Audit {
  param(
    [Parameter(Mandatory = $true)][string]$Text
  )

  $parsed = ConvertFrom-EmbeddedJson -Text $Text
  $requiredFailures = Get-ParsedCount $parsed.required_failures_count
  $warnings = Get-ParsedCount $parsed.warnings_count
  $enabledCount = if ($null -ne $parsed.checked_sgg_count) {
    [int]$parsed.checked_sgg_count
  } else {
    @($parsed.enabledResults).Count
  }

  $blockingFailed = @($parsed.blockingFailed)
  if ($blockingFailed.Count -gt 0 -and $requiredFailures -eq 0) {
    $requiredFailures = $blockingFailed.Count
  }

  return [pscustomobject]@{
    Status = [string]$parsed.status
    Scope = [string]$parsed.scope
    Checks = @($parsed.selected_checks)
    EnabledCount = $enabledCount
    ServiceExposedSggCount = Get-ParsedCount $parsed.service_exposed_sgg_count
    RequiredFailures = $requiredFailures
    Warnings = $warnings
    SkippedExtendedStatus = [string]$parsed.skipped_extended_status
    BlockingFailed = $blockingFailed
    Failures = @($parsed.failures)
  }
}

function Get-FailedStep {
  param(
    [Parameter(Mandatory = $true)][string]$Text
  )

  $failureBlocks = [regex]::Matches(
    $Text,
    "(?ms)\[REGIONAL_IDENTITY_SMOKE_FAIL\].*?(?=(?:\r?\n\[REGIONAL_IDENTITY_SMOKE_FAIL\])|\z)"
  )

  if ($failureBlocks.Count -gt 0) {
    $block = $failureBlocks[$failureBlocks.Count - 1].Value
    $stepMatch = [regex]::Match($block, "(?m)^step=([^\r\n]+)")
    $visibleErrorMatch = [regex]::Match($block, "(?m)^visible_error=([^\r\n]+)")
    $expectedMatch = [regex]::Match($block, "(?m)^expected_universe=([^\r\n]+)")

    $step = if ($stepMatch.Success) { $stepMatch.Groups[1].Value } else { "" }
    $visibleError = if ($visibleErrorMatch.Success) { $visibleErrorMatch.Groups[1].Value } else { "" }
    $expected = if ($expectedMatch.Success) { $expectedMatch.Groups[1].Value } else { "" }

    $universeMatch = [regex]::Match($visibleError, "(?<code>(?:[A-Z]+_ALL)|(?:SGG_\d{5}))")
    $universeCode = if ($universeMatch.Success) {
      $universeMatch.Groups["code"].Value
    } elseif ($expected -and $expected -ne "UNKNOWN") {
      $expected
    } else {
      ""
    }

    if ($step -eq "BROWSER_HARNESS" -and $universeCode) {
      return "$step`:$universeCode"
    }

    if ($step) {
      return $step
    }

    if ($universeCode) {
      return $universeCode
    }
  }

  $matches = [regex]::Matches($Text, "step=([^\r\n]+)")
  if ($matches.Count -gt 0) {
    return $matches[$matches.Count - 1].Groups[1].Value
  }

  return ""
}

function Test-CommandWarnings {
  param(
    [Parameter(Mandatory = $true)][string]$Text
  )

  return (
    $Text.Contains("PASS_WITH_WARNINGS") -or
    $Text.Contains('"status": "PASS_WITH_WARNINGS"') -or
    $Text.Contains("WARN")
  )
}

function Write-GateSummary {
  param(
    [Parameter(Mandatory = $true)][string]$Status,
    [string]$FailedCommand = "NONE",
    [string]$FailedUniverseOrStep = "NONE",
    [string]$RerunRecommended = "NO",
    [string]$Note = "",
    [string[]]$Warnings = @()
  )

  $extendedCommand = '$env:KOAPTIX_REGIONAL_SMOKE_MODE=''extended''; $env:KOAPTIX_REGIONAL_SMOKE_CHUNK_INDEX=''1''; $env:KOAPTIX_REGIONAL_SMOKE_CHUNK_TOTAL=''4''; npm run smoke:regional'

  Write-Host ""
  Write-Host "[SGG_RELEASE_GATE_$Status]"
  Write-Host "status=$Status"
  Write-Host "failed_command=$FailedCommand"
  Write-Host "failed_universe_or_step=$FailedUniverseOrStep"
  Write-Host "rerun_recommended=$RerunRecommended"
  Write-Host "extended_regional_smoke=SKIPPED_EXTENDED"
  Write-Host "browser_smoke=SKIPPED_NON_BLOCKING"
  Write-Host "extended_regional_smoke_chunk_command=$extendedCommand"
  Write-Host "rollback_decision_note=Rollback $script:RollbackTarget only if a required gate fails and CTO approves rollback."
  if ($Warnings.Count -gt 0) {
    Write-Host "warnings=$($Warnings -join '; ')"
  }
  if ($Note) {
    Write-Host "note=$Note"
  }
}

function Invoke-AuditWithPolicy {
  $auditEnv = @{
    KOAPTIX_AUDIT_SCOPE = "api-all"
    KOAPTIX_AUDIT_CHECKS = "rankings,map"
    KOAPTIX_AUDIT_DIRECT_DB = "0"
  }
  $result = Invoke-GateCommand -Name "audit:sgg" -Environment $auditEnv

  if ($result.ExitCode -ne 0) {
    return [pscustomobject]@{
      Ok = $false
      Warning = $false
      Command = "audit:sgg"
      UniverseOrStep = "AUDIT_COMMAND_FAILED"
      RerunRecommended = "NO"
      Note = "audit:sgg exited with $($result.ExitCode)"
    }
  }

  try {
    $analysis = Analyze-Audit -Text $result.Text
  } catch {
    return [pscustomobject]@{
      Ok = $false
      Warning = $false
      Command = "audit:sgg"
      UniverseOrStep = "AUDIT_PARSE_FAILED"
      RerunRecommended = "NO"
      Note = $_.Exception.Message
    }
  }

  if ($analysis.RequiredFailures -gt 0 -or $analysis.Status -eq "FAIL_REQUIRED") {
    $failed = if ($analysis.Failures.Count -gt 0) {
      ($analysis.Failures | Select-Object -First 8 | ForEach-Object {
        "$($_.universe):$($_.check):$($_.reason)"
      }) -join ","
    } elseif ($analysis.BlockingFailed.Count -gt 0) {
      ($analysis.BlockingFailed | ForEach-Object {
        "$($_.code):$($_.failedChecks -join '|')"
      }) -join ","
    } else {
      "AUDIT_REQUIRED_FAILURE"
    }

    return [pscustomobject]@{
      Ok = $false
      Warning = $false
      Command = "audit:sgg"
      UniverseOrStep = $failed
      RerunRecommended = "NO"
      Note = "Audit failed required API identity or fallback checks."
    }
  }

  Write-Host "[sgg-release-gate] audit status=$($analysis.Status) scope=$($analysis.Scope) checks=$($analysis.Checks -join ',') checked=$($analysis.EnabledCount) service_exposed_sgg=$($analysis.ServiceExposedSggCount) skipped_extended=$($analysis.SkippedExtendedStatus)"

  return [pscustomobject]@{
    Ok = $true
    Warning = ($analysis.Warnings -gt 0 -or $analysis.Status -eq "PASS_WITH_WARNINGS")
    Note = "audit:sgg api-all rankings/map checked $($analysis.EnabledCount) SGGs with $($analysis.RequiredFailures) required failures."
  }
}

function Invoke-RequiredNpmStep {
  param(
    [Parameter(Mandatory = $true)][string]$Name,
    [hashtable]$Environment = @{}
  )

  $result = Invoke-GateCommand -Name $Name -Environment $Environment
  if ($result.ExitCode -eq 0) {
    return [pscustomobject]@{
      Ok = $true
      Warning = (Test-CommandWarnings -Text $result.Text)
      Command = $Name
      Text = $result.Text
    }
  }

  $failedStep = Get-FailedStep -Text $result.Text
  if (-not $failedStep) {
    $failedStep = "$($Name.ToUpper())_FAILED"
  }

  return [pscustomobject]@{
    Ok = $false
    Warning = $false
    Command = $Name
    UniverseOrStep = $failedStep
    RerunRecommended = if ($Name.StartsWith("smoke:")) { "YES" } else { "NO" }
    Note = "$Name exited with $($result.ExitCode)"
    Text = $result.Text
  }
}

$script:RollbackTarget = if ($env:KOAPTIX_ROLLBACK_BATCH) {
  $env:KOAPTIX_ROLLBACK_BATCH
} else {
  Get-RollbackTarget
}

$warnings = @()

Write-Host "[sgg-release-gate] start"
Write-Host "[sgg-release-gate] rollback_target=$script:RollbackTarget"
Write-Host "[sgg-release-gate] required_gate=smoke:delivery,audit:sgg(api-all rankings/map),smoke:regional(required),build"
Write-Host "[sgg-release-gate] extended_regional_smoke=SKIPPED_EXTENDED_BY_DEFAULT"
Write-Host "[sgg-release-gate] browser_smoke=SKIPPED_NON_BLOCKING_BY_DEFAULT"

$delivery = Invoke-RequiredNpmStep -Name "smoke:delivery"
if (-not $delivery.Ok) {
  Write-GateSummary `
    -Status "FAIL_REQUIRED" `
    -FailedCommand $delivery.Command `
    -FailedUniverseOrStep $delivery.UniverseOrStep `
    -RerunRecommended $delivery.RerunRecommended `
    -Note $delivery.Note
  exit 1
}
if ($delivery.Warning) { $warnings += "smoke:delivery emitted warnings" }

$audit = Invoke-AuditWithPolicy
if (-not $audit.Ok) {
  Write-GateSummary `
    -Status "FAIL_REQUIRED" `
    -FailedCommand $audit.Command `
    -FailedUniverseOrStep $audit.UniverseOrStep `
    -RerunRecommended $audit.RerunRecommended `
    -Note $audit.Note
  exit 1
}
if ($audit.Warning) { $warnings += "audit:sgg emitted warnings" }

$regional = Invoke-RequiredNpmStep `
  -Name "smoke:regional" `
  -Environment @{ KOAPTIX_REGIONAL_SMOKE_MODE = "required" }
if (-not $regional.Ok) {
  Write-GateSummary `
    -Status "FAIL_REQUIRED" `
    -FailedCommand $regional.Command `
    -FailedUniverseOrStep $regional.UniverseOrStep `
    -RerunRecommended $regional.RerunRecommended `
    -Note $regional.Note
  exit 1
}
if ($regional.Warning) { $warnings += "smoke:regional required emitted warnings" }

$build = Invoke-RequiredNpmStep -Name "build"
if (-not $build.Ok) {
  Write-GateSummary `
    -Status "FAIL_REQUIRED" `
    -FailedCommand $build.Command `
    -FailedUniverseOrStep $build.UniverseOrStep `
    -RerunRecommended $build.RerunRecommended `
    -Note $build.Note
  exit 1
}
if ($build.Warning) { $warnings += "build emitted warnings" }

$finalStatus = if ($warnings.Count -gt 0) { "PASS_WITH_WARNINGS" } else { "PASS" }
Write-GateSummary `
  -Status $finalStatus `
  -Warnings $warnings `
  -Note "Fast required gate completed. Broad all-SGG page/search/HTML regional smoke remains available as chunked extended diagnostics; browser smoke remains a separate diagnostic."

exit 0
