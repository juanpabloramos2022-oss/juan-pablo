$ErrorActionPreference = "Stop"
try {
    $res = Invoke-WebRequest -Uri "http://localhost:5678/form/crear-video" -Method Get
    Write-Host ">>> RESULTADO EXITOSO <<<"
    Write-Host "HTTP StatusCode: $($res.StatusCode)"
    Write-Host "StatusDescription: $($res.StatusDescription)"
    Write-Host "Contenido Recibido (Bytes): $($res.Content.Length)"
    if ($res.Content -match "Factoría TikTok V33.7: Generador Universal de Guiones") {
        Write-Host "Formulario desplegado correctamente con el título esperado."
    }
} catch {
    Write-Error "Error al invocar endpoint: $_"
}
