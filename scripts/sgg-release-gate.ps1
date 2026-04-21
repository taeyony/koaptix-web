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
    [Parameter(Mandatory = $true)][string]$Name
  )

  Write-Host "[sgg-release-gate] step=npm run $Name"
  $previousErrorActionPreference = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  try {
    $output = & npm.cmd run $Name 2>&1
    $exitCode = $LASTEXITCODE
  } finally {
    $ErrorActionPreference = $previousErrorActionPreference
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

function ConvertFrom-AuditText {
  param(
    [Parameter(Mandatory = $true)][string]$Text
  )

  $start = $Text.IndexOf("{")
  $end = $Text.LastIndexOf("}")

  if ($start -lt 0 -or $end -le $start) {
    throw "Audit output did not contain JSON."
  }

  $json = $Text.Substring($start, $end - $start + 1)
  return $json | ConvertFrom-Json
}

function Get-FailedChecks {
  param(
    [Parameter(Mandatory = $true)]$Row
  )

  $failed = @()
  if ($Row.snapshotOk -ne $true) { $failed += "snapshotOk" }
  if ($Row.latestBoardOk -ne $true) { $failed += "latestBoardOk" }
  if ($Row.rankingsOk -ne $true) { $failed += "rankingsOk" }
  $mapOperationalOk = if ($null -ne $Row.mapOperationalOk) {
    $Row.mapOperationalOk
  } else {
    $Row.mapOk
  }
  if ($mapOperationalOk -ne $true) { $failed += "mapOperationalOk" }
  if ($Row.searchOk -ne $true) { $failed += "searchOk" }
  return $failed
}

function Analyze-Audit {
  param(
    [Parameter(Mandatory = $true)][string]$Text
  )

  $parsed = ConvertFrom-AuditText -Text $Text
  $failedRows = @()
  $blockingRows = @()
  $advisoryRows = @()

  foreach ($row in $parsed.enabledResults) {
    $failedChecks = @(Get-FailedChecks -Row $row)
    if ($failedChecks.Count -gt 0) {
      $failedRow = [pscustomobject]@{
        Code = $row.code
        FailedChecks = $failedChecks
      }
      $failedRows += $failedRow

      $blockingChecks = @($failedChecks | Where-Object {
        $_ -ne "snapshotOk" -and $_ -ne "latestBoardOk"
      })

      if ($blockingChecks.Count -gt 0) {
        $blockingRows += [pscustomobject]@{
          Code = $row.code
          FailedChecks = $blockingChecks
        }
      } else {
        $advisoryRows += $failedRow
      }
    }
  }

  $directReadOnlyMiss = $false
  if ($failedRows.Count -gt 0) {
    $directReadOnlyMiss = $true
    foreach ($row in $failedRows) {
      foreach ($check in $row.FailedChecks) {
        if ($check -ne "snapshotOk" -and $check -ne "latestBoardOk") {
          $directReadOnlyMiss = $false
        }
      }
    }
  }

  return [pscustomobject]@{
    EnabledCount = @($parsed.enabledResults).Count
    ConfirmedCount = @($parsed.confirmed).Count
    DeliveryConfirmedCount = @($parsed.deliveryConfirmed).Count
    FailedRows = $failedRows
    BlockingRows = $blockingRows
    AdvisoryRows = $advisoryRows
    DirectReadOnlyMiss = $directReadOnlyMiss
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

function Write-GateSummary {
  param(
    [Parameter(Mandatory = $true)][string]$Status,
    [string]$FailedCommand = "NONE",
    [string]$FailedUniverseOrStep = "NONE",
    [string]$RerunRecommended = "NO",
    [string]$Note = ""
  )

  Write-Host ""
  Write-Host "[SGG_RELEASE_GATE_$Status]"
  Write-Host "status=$Status"
  Write-Host "failed_command=$FailedCommand"
  Write-Host "failed_universe_or_step=$FailedUniverseOrStep"
  Write-Host "rerun_recommended=$RerunRecommended"
  Write-Host "rollback_decision_note=Rollback $script:RollbackTarget if this gate fails after the allowed audit rerun."
  if ($Note) {
    Write-Host "note=$Note"
  }
}

function Invoke-AuditWithPolicy {
  $first = Invoke-GateCommand -Name "audit:sgg"

  if ($first.ExitCode -ne 0) {
    return [pscustomobject]@{
      Ok = $false
      Command = "audit:sgg"
      UniverseOrStep = "AUDIT_COMMAND_FAILED"
      RerunRecommended = "YES"
      Note = "audit:sgg exited with $($first.ExitCode)"
    }
  }

  try {
    $analysis = Analyze-Audit -Text $first.Text
  } catch {
    return [pscustomobject]@{
      Ok = $false
      Command = "audit:sgg"
      UniverseOrStep = "AUDIT_PARSE_FAILED"
      RerunRecommended = "YES"
      Note = $_.Exception.Message
    }
  }

  if ($analysis.BlockingRows.Count -eq 0 -and $analysis.AdvisoryRows.Count -eq 0) {
    Write-Host "[sgg-release-gate] audit pass enabled=$($analysis.EnabledCount) confirmed=$($analysis.ConfirmedCount)"
    return [pscustomobject]@{ Ok = $true }
  }

  if ($analysis.BlockingRows.Count -gt 0) {
    $failed = ($analysis.BlockingRows | ForEach-Object {
      "$($_.Code):$($_.FailedChecks -join '|')"
    }) -join ","

    return [pscustomobject]@{
      Ok = $false
      Command = "audit:sgg"
      UniverseOrStep = $failed
      RerunRecommended = "NO"
      Note = "Audit failed with blocking delivery readiness gaps."
    }
  }

  $missCodes = ($analysis.AdvisoryRows | ForEach-Object { $_.Code }) -join ","
  Write-Host "[sgg-release-gate] audit snapshot/latest direct-read advisory miss detected: $missCodes"
  Write-Host "[sgg-release-gate] rerun=audit:sgg"

  $second = Invoke-GateCommand -Name "audit:sgg"
  if ($second.ExitCode -ne 0) {
    return [pscustomobject]@{
      Ok = $false
      Command = "audit:sgg"
      UniverseOrStep = "AUDIT_RERUN_COMMAND_FAILED"
      RerunRecommended = "NO"
      Note = "audit:sgg rerun exited with $($second.ExitCode)"
    }
  }

  try {
    $rerunAnalysis = Analyze-Audit -Text $second.Text
  } catch {
    return [pscustomobject]@{
      Ok = $false
      Command = "audit:sgg"
      UniverseOrStep = "AUDIT_RERUN_PARSE_FAILED"
      RerunRecommended = "NO"
      Note = $_.Exception.Message
    }
  }

  if ($rerunAnalysis.BlockingRows.Count -eq 0 -and $rerunAnalysis.AdvisoryRows.Count -eq 0) {
    Write-Host "[sgg-release-gate] audit pass after allowed rerun enabled=$($rerunAnalysis.EnabledCount) confirmed=$($rerunAnalysis.ConfirmedCount)"
    return [pscustomobject]@{ Ok = $true }
  }

  if ($rerunAnalysis.BlockingRows.Count -gt 0) {
    $failedAfterRerun = ($rerunAnalysis.BlockingRows | ForEach-Object {
      "$($_.Code):$($_.FailedChecks -join '|')"
    }) -join ","

    return [pscustomobject]@{
      Ok = $false
      Command = "audit:sgg"
      UniverseOrStep = $failedAfterRerun
      RerunRecommended = "NO"
      Note = "Audit blocking readiness gap persisted after allowed rerun."
    }
  }

  $advisoryAfterRerun = ($rerunAnalysis.AdvisoryRows | ForEach-Object {
    "$($_.Code):$($_.FailedChecks -join '|')"
  }) -join ","

  Write-Host "[sgg-release-gate] audit advisory persisted after rerun: $advisoryAfterRerun"
  Write-Host "[sgg-release-gate] audit delivery confirmed enabled=$($rerunAnalysis.EnabledCount) deliveryConfirmed=$($rerunAnalysis.DeliveryConfirmedCount)"

  return [pscustomobject]@{
    Ok = $true
    Note = "Direct snapshot/latest advisory miss persisted after rerun; delivery path checks remained blocking-pass."
  }
}

$script:RollbackTarget = if ($env:KOAPTIX_ROLLBACK_BATCH) {
  $env:KOAPTIX_ROLLBACK_BATCH
} else {
  Get-RollbackTarget
}

Write-Host "[sgg-release-gate] start"
Write-Host "[sgg-release-gate] rollback_target=$script:RollbackTarget"

$audit = Invoke-AuditWithPolicy
if (-not $audit.Ok) {
  Write-GateSummary `
    -Status "FAIL" `
    -FailedCommand $audit.Command `
    -FailedUniverseOrStep $audit.UniverseOrStep `
    -RerunRecommended $audit.RerunRecommended `
    -Note $audit.Note
  exit 1
}

foreach ($name in @("smoke:regional", "smoke:browser", "build")) {
  $result = Invoke-GateCommand -Name $name
  if ($result.ExitCode -ne 0) {
    $failedStep = Get-FailedStep -Text $result.Text
    if (-not $failedStep) {
      $failedStep = "$($name.ToUpper())_FAILED"
    }

    $rerunRecommended = if ($name.StartsWith("smoke:")) { "YES" } else { "NO" }

    Write-GateSummary `
      -Status "FAIL" `
      -FailedCommand $name `
      -FailedUniverseOrStep $failedStep `
      -RerunRecommended $rerunRecommended `
      -Note "$name exited with $($result.ExitCode)"
    exit 1
  }
}

Write-GateSummary `
  -Status "PASS" `
  -Note "$(if ($audit.Note) { "$($audit.Note) " })audit:sgg, smoke:regional, smoke:browser, and build completed successfully."

exit 0
