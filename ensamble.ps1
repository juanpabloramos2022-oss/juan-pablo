# Ensamble Maestro V33.7: Ken Burns Procedural + EBU R128 (-14 LUFS) + Multi-Proyecto
param(
    [string]$ProjectPath = ""
)
$ErrorActionPreference = 'Continue'

$inv = [System.Globalization.CultureInfo]::InvariantCulture
$currentProjectFile = 'C:\tiktok\current_project.txt'
$ffmpegExe = 'C:\tiktok\ffmpeg.exe'

# 1. Determinar el directorio del proyecto
if ([string]::IsNullOrWhiteSpace($ProjectPath)) {
    if (Test-Path $currentProjectFile) {
        $candidate = (Get-Content -Path $currentProjectFile -Raw).Trim()
        if (Test-Path $candidate) {
            $ProjectPath = $candidate
        }
    }
}

if ([string]::IsNullOrWhiteSpace($ProjectPath) -or (-not (Test-Path $ProjectPath))) {
    $ProjectPath = 'C:\tiktok'
}

Write-Host "=================================================="
Write-Host "ENSAMBLE VIRAL V33.7: KEN BURNS + EBU R128 (-14 LUFS)"
Write-Host "  Ruta Proyecto: $ProjectPath"
Write-Host "=================================================="

# Resolver directorios del proyecto
$scriptPath = if (Test-Path "$ProjectPath\script.json") { "$ProjectPath\script.json" } else { "C:\tiktok\script.json" }
$projVideosDir = "$ProjectPath\videos"
$flowVideosDir = 'C:\tiktok\flow\videos'
$tiktokVideosDir = 'C:\tiktok\videos'

$stagingDir = "$ProjectPath\staging"
$outputDir = "$ProjectPath\output"
$audioDir = "$ProjectPath\audio"
$ambientDir = "$ProjectPath\audio\ambient"
$sfxDir = "$ProjectPath\audio\sfx"

foreach ($d in @($stagingDir, $outputDir, $audioDir, $ambientDir, $sfxDir, $projVideosDir)) {
    if (-not (Test-Path $d)) { New-Item -ItemType Directory -Path $d -Force | Out-Null }
}

function Get-MediaDuration([string]$filePath) {
    if (-not (Test-Path $filePath)) { return 0.0 }
    $lines = cmd.exe /c "`"$ffmpegExe`" -i `"$filePath`" 2>&1"
    $raw = $lines -join "`n"
    if ($raw -match "Duration:\s*(\d+):(\d+):(\d+\.\d+)") {
        $hrs = [double]$Matches[1]
        $mins = [double]$Matches[2]
        $secs = [double]$Matches[3]
        return [Math]::Round(($hrs * 3600 + $mins * 60 + $secs), 2)
    }
    return 5.21
}

# 2. Cargar metadatos
$projectMeta = $null
$scenesList = @()

if (Test-Path $scriptPath) {
    try {
        $json = Get-Content -Path $scriptPath -Raw -Encoding UTF8 | ConvertFrom-Json
        if ($json.project_meta) { $projectMeta = $json.project_meta }
        $scenes = if ($json.scenes) { $json.scenes } elseif ($json.escenas) { $json.escenas } else { $json }
        if ($scenes -is [System.Array] -or $scenes -is [System.Collections.IList]) {
            $scenesList = $scenes
        }
    } catch {
        Write-Warning "Aviso leyendo script.json: $_"
    }
}

$projectName = if ($projectMeta -and $projectMeta.project_name) { $projectMeta.project_name } else { "tiktok_video" }
$niche = if ($projectMeta -and $projectMeta.niche) { $projectMeta.niche } else { "dark_fantasy_mystery" }
$ambientTrackName = if ($projectMeta -and $projectMeta.ambient_track) { $projectMeta.ambient_track } else { "ambient_cinematic.mp3" }
$ambientVolume = if ($projectMeta -and $projectMeta.ambient_volume) { [double]$projectMeta.ambient_volume } else { 0.15 }

# 3. Color Grading segun el nicho
$colorFilter = "eq=contrast=1.05:saturation=1.05"
if ($niche -match "mystery|misterio|terror|dark|horror") {
    $colorFilter = "eq=contrast=1.15:brightness=-0.02:saturation=0.88,vignette=PI/5"
} elseif ($niche -match "finance|finanzas|crypto|money") {
    $colorFilter = "eq=contrast=1.08:saturation=1.12"
} elseif ($niche -match "science|ciencia|nature|ocean|mar") {
    $colorFilter = "eq=saturation=1.22:contrast=1.06"
} elseif ($niche -match "history|historia|war|guerra") {
    $colorFilter = "curves=vintage,eq=saturation=0.90:contrast=1.10"
}

# 4. Helper para ubicar clip de video
function Find-VideoClip([string]$p) {
    $candidates = @(
        "$projVideosDir\scene_$p.mp4",
        "$flowVideosDir\scene_$p.mp4",
        "$tiktokVideosDir\scene_$p.mp4",
        "$projVideosDir\scene_$p\video_0001.mp4",
        "$flowVideosDir\scene_$p\video_0001.mp4"
    )
    foreach ($c in $candidates) {
        if (Test-Path $c) { return $c }
    }
    return $null
}

# 5. Helper para sonorizar, recortar y aplicar Zoompan Ken Burns a 1080x1920 (30fps)
function Stage-Clip-KenBurns([string]$videoPath, [string]$voicePath, [string]$outputPath) {
    $vDur = Get-MediaDuration $videoPath
    $aDur = if (Test-Path $voicePath) { Get-MediaDuration $voicePath } else { 0.0 }

    # Filtro Ken Burns procedural: Empuje lento continuo centrado del 100% al 115% de escala a 1080x1920 @ 30fps
    $kenBurnsVf = "zoompan=z='min(zoom+0.0015,1.15)':d=250:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1080x1920:fps=30"

    if ($aDur -gt 0) {
        $cutDur = [Math]::Min($vDur, [Math]::Round(($aDur + 0.30), 2))
        $fadeOutStart = [Math]::Max(0.05, [Math]::Round(($aDur - 0.15), 2))
        $cutDurStr = $cutDur.ToString("0.00", $inv)
        $fadeOutStartStr = $fadeOutStart.ToString("0.00", $inv)

        $fcChain = "[0:v]$kenBurnsVf[vz]; [1:a]afade=t=in:ss=0:d=0.04,afade=t=out:st=${fadeOutStartStr}:d=0.15,apad[a]"
        cmd.exe /c "`"$ffmpegExe`" -y -i `"$videoPath`" -i `"$voicePath`" -filter_complex `"$fcChain`" -map `"[vz]`" -map `"[a]`" -c:v libx264 -preset ultrafast -crf 18 -pix_fmt yuv420p -c:a aac -b:a 192k -t $cutDurStr `"$outputPath`" 2>&1" | Out-Null
    } else {
        $cutDurStr = $vDur.ToString("0.00", $inv)
        $fcChain = "[0:v]$kenBurnsVf[vz]; anullsrc=channel_layout=stereo:sample_rate=44100[a]"
        cmd.exe /c "`"$ffmpegExe`" -y -i `"$videoPath`" -f lavfi -i anullsrc=channel_layout=stereo:sample_rate=44100 -filter_complex `"$fcChain`" -map `"[vz]`" -map `"[a]`" -c:v libx264 -preset ultrafast -crf 18 -pix_fmt yuv420p -c:a aac -b:a 192k -t $cutDurStr `"$outputPath`" 2>&1" | Out-Null
    }
    return (Get-MediaDuration $outputPath)
}

# Escena 1 Hook A
$vid1 = Find-VideoClip "0001"
if (-not $vid1) {
    Write-Host "Error: No se encontro clip de video para Escena 1 en $projVideosDir ni en fallback."
    exit 1
}

Write-Host "`n[1/3] Procesando Escena 1 (Hook A + Ken Burns)..."
$durHookA_1 = Stage-Clip-KenBurns -videoPath $vid1 -voicePath "$audioDir\voice_scene_0001.mp3" -outputPath "$stagingDir\staged_0001_hookA.mp4"

# Escena 1 Hook B
$hasHookB = Test-Path "$audioDir\voice_scene_0001_b.mp3"
$durHookB_1 = $durHookA_1
if ($hasHookB) {
    Write-Host "[1/3] Procesando Escena 1 (Hook B + Ken Burns)..."
    $durHookB_1 = Stage-Clip-KenBurns -videoPath $vid1 -voicePath "$audioDir\voice_scene_0001_b.mp3" -outputPath "$stagingDir\staged_0001_hookB.mp4"
}

# Escenas 2..N
$laterStagedClips = @()
for ($i = 1; $i -lt $scenesList.Count; $i++) {
    $sc = $scenesList[$i]
    $sNum = if ($null -ne $sc.scene_number) { [int]$sc.scene_number } else { $i + 1 }
    $p = "{0:D4}" -f $sNum
    $vid = Find-VideoClip $p
    if (-not $vid) {
        Write-Host "Error: No se encontro clip para escena $sNum"
        continue
    }
    $outClip = "$stagingDir\staged_${p}.mp4"
    Write-Host "[$([int]($i+1))/$($scenesList.Count)] Procesando Escena $sNum (Ken Burns Compartido)..."
    $clipDur = Stage-Clip-KenBurns -videoPath $vid -voicePath "$audioDir\voice_scene_$p.mp3" -outputPath $outClip
    $laterStagedClips += $outClip
}

# Render Maestro de Variante
function Build-Master-Video([string]$hookSuffix, [string]$stagedFirstClip, [string]$outputFilename, [string]$subAssLeaf, [double]$hook1Duration) {
    Write-Host "`n--------------------------------------------------"
    Write-Host "ENSAMBLANDO HOOK ${hookSuffix} -> $outputFilename"
    Write-Host "--------------------------------------------------"

    $fullClips = @($stagedFirstClip) + $laterStagedClips
    $concatTxt = "$stagingDir\concat_hook${hookSuffix}.txt"
    $concatLines = @($fullClips | ForEach-Object { "file '$($_.Replace('\', '/'))'" })
    [System.IO.File]::WriteAllLines($concatTxt, $concatLines, [System.Text.Encoding]::ASCII)

    $tempVideo = "$stagingDir\temp_merged_hook${hookSuffix}.mp4"
    cmd.exe /c "`"$ffmpegExe`" -y -f concat -safe 0 -i `"$concatTxt`" -c copy `"$tempVideo`" 2>&1" | Out-Null

    # Cama ambiental
    $ambientFile = $null
    $ambCandidates = @(
        "$ambientDir\$ambientTrackName",
        "$audioDir\$ambientTrackName",
        "C:\tiktok\audio\ambient\$ambientTrackName",
        "C:\tiktok\audio\$ambientTrackName"
    )
    foreach ($a in $ambCandidates) {
        if (Test-Path $a) { $ambientFile = $a; break }
    }

    # SFX Transicion 1
    $whooshSfx = if (Test-Path "$sfxDir\whoosh.mp3") { "$sfxDir\whoosh.mp3" } else { "C:\tiktok\audio\sfx\whoosh.mp3" }
    $hasSfx = Test-Path $whooshSfx

    $audioMixedTemp = "$stagingDir\audio_mixed_hook${hookSuffix}.m4a"

    # Mezcla de audio con normalización broadcast EBU R128 (-14 LUFS)
    if ($ambientFile -and $hasSfx) {
        $t1Ms = [int]($hook1Duration * 1000)
        $volStr = $ambientVolume.ToString("0.00", $inv)
        $filterAudio = "[0:a]volume=1.0[v_diag]; [1:a]volume=$volStr[v_amb]; [2:a]adelay=$t1Ms|$t1Ms,volume=1.5[v_sfx]; [v_diag][v_amb][v_sfx]amix=inputs=3:duration=first:dropout_transition=2,loudnorm=I=-14:LRA=7:TP=-1.5[aout]"
        cmd.exe /c "`"$ffmpegExe`" -y -i `"$tempVideo`" -stream_loop -1 -i `"$ambientFile`" -i `"$whooshSfx`" -filter_complex `"$filterAudio`" -map `"[aout]`" -c:a aac -b:a 192k `"$audioMixedTemp`" 2>&1" | Out-Null
    } elseif ($ambientFile) {
        $volStr = $ambientVolume.ToString("0.00", $inv)
        $filterAudio = "[0:a]volume=1.0[v_diag]; [1:a]volume=$volStr[v_amb]; [v_diag][v_amb]amix=inputs=2:duration=first:dropout_transition=2,loudnorm=I=-14:LRA=7:TP=-1.5[aout]"
        cmd.exe /c "`"$ffmpegExe`" -y -i `"$tempVideo`" -stream_loop -1 -i `"$ambientFile`" -filter_complex `"$filterAudio`" -map `"[aout]`" -c:a aac -b:a 192k `"$audioMixedTemp`" 2>&1" | Out-Null
    } else {
        cmd.exe /c "`"$ffmpegExe`" -y -i `"$tempVideo`" -af `"loudnorm=I=-14:LRA=7:TP=-1.5`" -map 0:a -c:a aac -b:a 192k `"$audioMixedTemp`" 2>&1" | Out-Null
    }

    # Render Final: Color Grading + Subtítulos Quemados
    $finalOutput = "$outputDir\$outputFilename"
    $vfChain = "$colorFilter,subtitles=$subAssLeaf"
    cmd.exe /c "cd /d `"$audioDir`" && `"$ffmpegExe`" -y -i `"$tempVideo`" -i `"$audioMixedTemp`" -vf `"$vfChain`" -map 0:v -map 1:a -c:v libx264 -preset ultrafast -crf 18 -pix_fmt yuv420p -c:a copy `"$finalOutput`" 2>&1" | Out-Null

    if (Test-Path $finalOutput) {
        $dur = Get-MediaDuration $finalOutput
        $size = (Get-Item $finalOutput).Length
        Write-Host "  -> Master Listo en Proyecto: $finalOutput ($dur s | $size bytes)"

        # Espejo en C:\tiktok\flow\output\
        try {
            Copy-Item -Path $finalOutput -Destination "C:\tiktok\flow\output\$outputFilename" -Force -ErrorAction SilentlyContinue
        } catch {}

        return [PSCustomObject]@{
            variant = "Hook ${hookSuffix}"
            file = $finalOutput
            duration_sec = $dur
            size_bytes = $size
            subtitles_burned = $subAssLeaf
            sfx_injected = $hasSfx
            color_grading = $niche
            ken_burns_zoom = "100% -> 115% (1080x1920 @ 30fps)"
            audio_loudness = "-14 LUFS (EBU R128)"
        }
    }
    return $null
}

# Ejecutar variantes
$results = @()

$resA = Build-Master-Video -hookSuffix "A" -stagedFirstClip "$stagingDir\staged_0001_hookA.mp4" -outputFilename "video_final_hookA.mp4" -subAssLeaf "subtitles_hookA.ass" -hook1Duration $durHookA_1
if ($resA) { $results += $resA }

if ($hasHookB) {
    $resB = Build-Master-Video -hookSuffix "B" -stagedFirstClip "$stagingDir\staged_0001_hookB.mp4" -outputFilename "video_final_hookB.mp4" -subAssLeaf "subtitles_hookB.ass" -hook1Duration $durHookB_1
    if ($resB) { $results += $resB }
}

if (Test-Path "$outputDir\video_final_hookA.mp4") {
    Copy-Item -Path "$outputDir\video_final_hookA.mp4" -Destination "$outputDir\video_final.mp4" -Force -ErrorAction SilentlyContinue
    Copy-Item -Path "$outputDir\video_final_hookA.mp4" -Destination "C:\tiktok\flow\output\video_final.mp4" -Force -ErrorAction SilentlyContinue
}

Write-Host "`n=================================================="
Write-Host "MASTERIZACION VIRAL COMPLETADA CON EXITO"
Write-Host "=================================================="
$results | Format-Table -AutoSize | Out-String | Write-Host

[PSCustomObject]@{
    status = "success"
    project_path = $ProjectPath
    project_name = $projectName
    niche = $niche
    variants = $results
} | ConvertTo-Json
