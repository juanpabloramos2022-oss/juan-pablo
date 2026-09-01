<#
.SYNOPSIS
    Sync-Remotion.ps1 - Polling ultraligero para GitHub Actions y disparador CLI de Remotion.
    Consumo: ~15 MB de RAM durante ~3 segundos de ejecución. Cero RAM en reposo.
#>

param (
    [string]$RepoOwner = $(if ($env:GITHUB_REPO_OWNER) { $env:GITHUB_REPO_OWNER } else { "juanpabloramos2022-oss" }),
    [string]$RepoName = $(if ($env:GITHUB_REPO_NAME) { $env:GITHUB_REPO_NAME } else { "juan-pablo" }),
    [string]$Token = "",
    [string]$WorkflowFileName = "generate_script.yml",
    [string]$BaseDir = "C:\tiktok",
    [string]$ProjectDir = "C:\tiktok\projects\actual",
    [string]$StateFile = "C:\tiktok\remotion\.last_run_id"
)

$ErrorActionPreference = "Stop"

# Si no se definieron por parámetro ni por variable de entorno, intentar autodetectar desde git remote
if ($RepoOwner -eq "TU_USUARIO_GITHUB" -or $RepoName -eq "TU_REPOSITORIO_GITHUB") {
    try {
        $RemoteUrl = git -C $BaseDir config --get remote.origin.url
        if (-not $RemoteUrl) {
            $RemoteUrl = git -C (Join-Path $BaseDir "remotion") config --get remote.origin.url
        }
        if ($RemoteUrl -and $RemoteUrl -match "github\.com[:/](?<owner>[^/]+)/(?<repo>[^/\.]+?)(\.git)?$") {
            if ($RepoOwner -eq "TU_USUARIO_GITHUB") { $RepoOwner = $Matches.owner }
            if ($RepoName -eq "TU_REPOSITORIO_GITHUB") { $RepoName = $Matches.repo }
            Write-Host "[POLL] Repositorio detectado automáticamente: $RepoOwner/$RepoName"
        }
    } catch {
        # Fallback a los valores configurados
    }
}

# Resolución segura del token en cascada: 1. Argumento CLI, 2. Variable de proceso, 3. Registro Usuario/Máquina, 4. Archivo local .github_token
if (-not $Token) {
    if ($env:GITHUB_TOKEN) {
        $Token = $env:GITHUB_TOKEN
    } elseif ([System.Environment]::GetEnvironmentVariable("GITHUB_TOKEN", "User")) {
        $Token = [System.Environment]::GetEnvironmentVariable("GITHUB_TOKEN", "User")
    } elseif ([System.Environment]::GetEnvironmentVariable("GITHUB_TOKEN", "Machine")) {
        $Token = [System.Environment]::GetEnvironmentVariable("GITHUB_TOKEN", "Machine")
    } else {
        $TokenCandidates = @(
            (Join-Path $PSScriptRoot ".github_token"),
            (Join-Path $BaseDir ".github_token")
        )
        foreach ($Candidate in $TokenCandidates) {
            if (Test-Path $Candidate) {
                $CandidateContent = (Get-Content -Path $Candidate -Raw).Trim()
                if ($CandidateContent) {
                    $Token = $CandidateContent
                    break
                }
            }
        }
    }
}

if (-not $Token) {
    Write-Error "[FATAL] GITHUB_TOKEN no encontrado en entorno, registro ni archivo local .github_token."
    exit 1
}

$Headers = @{
    "Authorization" = "token $Token"
    "Accept"        = "application/vnd.github.v3+json"
    "User-Agent"    = "V33-8-Local-Agent"
}

# 1. Consultar el último run exitoso del workflow en GitHub Actions
$UriRuns = "https://api.github.com/repos/$RepoOwner/$RepoName/actions/workflows/$WorkflowFileName/runs?status=success&per_page=1"

try {
    $Response = Invoke-RestMethod -Uri $UriRuns -Headers $Headers -Method Get
} catch {
    Write-Warning "[POLL] Error de conexión con la API de GitHub: $_"
    exit 0
}

if ($Response.total_count -eq 0) {
    Write-Host "[POLL] No hay runs exitosos registrados para $WorkflowFileName en $RepoOwner/$RepoName."
    exit 0
}

$LatestRun = $Response.workflow_runs[0]
$LatestRunId = [string]$LatestRun.id

# 2. Comprobar si ya fue procesado
$LastRunId = ""
if (Test-Path $StateFile) {
    $LastRunId = (Get-Content -Path $StateFile -Raw).Trim()
}

if ($LatestRunId -eq $LastRunId) {
    # Sin novedades, salir inmediatamente liberando memoria
    exit 0
}

Write-Host "[PIPELINE] Nuevo script aprobado detectado! Run ID: $LatestRunId"

# 3. Localizar el artefacto 'script-json' o 'script-artifact'
$UriArtifacts = "https://api.github.com/repos/$RepoOwner/$RepoName/actions/runs/$LatestRunId/artifacts"
$ArtifactsResp = Invoke-RestMethod -Uri $UriArtifacts -Headers $Headers -Method Get

$TargetArtifact = $ArtifactsResp.artifacts | Where-Object { $_.name -like "*script*" } | Select-Object -First 1

if (-not $TargetArtifact) {
    Write-Warning "[PIPELINE] Run ID $LatestRunId no contiene artefacto de script."
    exit 0
}

# 4. Descargar y extraer artefacto
$ZipPath = Join-Path $BaseDir "temp_artifact.zip"
if (-not (Test-Path $ProjectDir)) {
    New-Item -ItemType Directory -Force -Path $ProjectDir | Out-Null
}

Invoke-RestMethod -Uri $TargetArtifact.archive_download_url -Headers $Headers -OutFile $ZipPath
Expand-Archive -Path $ZipPath -DestinationPath $ProjectDir -Force
Remove-Item -Path $ZipPath -Force

# Asegurar que el archivo script.json quede directamente en C:\tiktok\projects\actual\script.json
$TargetScriptPath = Join-Path $ProjectDir "script.json"
if (-not (Test-Path $TargetScriptPath)) {
    $NestedScript = Get-ChildItem -Path $ProjectDir -Recurse -Filter "script.json" | Select-Object -First 1
    if ($NestedScript) {
        Move-Item -Path $NestedScript.FullName -Destination $TargetScriptPath -Force
        Write-Host "[PIPELINE] script.json reubicado en $TargetScriptPath"
    }
}

# 5. Ejecutar scripts preparatorios (Ojo Matemático, Calibración y Guardianes)
Write-Host "[PIPELINE] Ejecutando análisis matemático y guardianes..."
node "C:\tiktok\remotion\pre-render.js"
python "C:\tiktok\scripts\calibracion_fonetica.py"
python "C:\tiktok\scripts\guardian_integridad.py"
node "C:\tiktok\scripts\guardian_integridad_av.js"

if ($LASTEXITCODE -ne 0) {
    Write-Error "[PIPELINE] El Guardián abortó el render por fallo de integridad."
    exit 1
}

# 5.1 Sincronizar assets hacia C:\tiktok\remotion\public\ para staticFile
$PublicDir = "C:\tiktok\remotion\public"
if (-not (Test-Path $PublicDir)) { New-Item -ItemType Directory -Force -Path $PublicDir | Out-Null }
$PublicImgDir = Join-Path $PublicDir "images"
if (-not (Test-Path $PublicImgDir)) { New-Item -ItemType Directory -Force -Path $PublicImgDir | Out-Null }

if (Test-Path "C:\tiktok\projects\actual\audio_narracion.mp3") {
    Copy-Item "C:\tiktok\projects\actual\audio_narracion.mp3" "$PublicDir\audio_narracion.mp3" -Force
}
if (Test-Path "C:\tiktok\projects\actual\timecodes.json") {
    Copy-Item "C:\tiktok\projects\actual\timecodes.json" "$PublicDir\timecodes.json" -Force
}
if (Test-Path "C:\tiktok\projects\actual\script.json") {
    Copy-Item "C:\tiktok\projects\actual\script.json" "$PublicDir\script.json" -Force
}
if (Test-Path "C:\tiktok\projects\actual\images") {
    Copy-Item "C:\tiktok\projects\actual\images\*" $PublicImgDir -Recurse -Force
}

# 6. Renderizado por CLI de Remotion (--concurrency=2, --gl=swangle, --pixel-format=yuv420p)
Write-Host "[PIPELINE] Iniciando compilación Remotion 9:16..."
Set-Location "C:\tiktok\remotion"
$OutputPath = Join-Path $ProjectDir "output\video_final_remotion.mp4"

cmd.exe /c "npx remotion render src/index.ts TikTokComp `"$OutputPath`" --concurrency=2 --gl=swangle --pixel-format=yuv420p --crf=18 --codec=h264 --bundle-cache=false"

if ($LASTEXITCODE -eq 0) {
    Write-Host "[PIPELINE] Video renderizado con éxito!"
    Set-Content -Path $StateFile -Value $LatestRunId -Force

    # 7. Disparar evacuador final
    node "C:\tiktok\scripts\evacuador.js"
} else {
    Write-Error "[FATAL] Remotion falló en la compilación."
}
