# Gera/atualiza images.js e manifest.json com todas as imagens desta pasta.
# Uso: clique com o botao direito > "Executar com PowerShell"
#      ou rode:  powershell -ExecutionPolicy Bypass -File gerar-manifest.ps1
#
# images.js e a fonte usada pelo carrossel (carregada como <script>, funciona
# mesmo abrindo o site direto no navegador, sem servidor). manifest.json e
# mantido apenas como lista legivel / fallback para quando o site e servido
# por um servidor HTTP.

$dir = $PSScriptRoot
$files = @(
  Get-ChildItem $dir -File |
  Where-Object { $_.Extension -match '\.(jpe?g|png|gif|webp|avif)$' } |
  Sort-Object Name |
  Select-Object -ExpandProperty Name
)

# manifest.json
$items = ($files | ForEach-Object { '  "' + $_ + '"' }) -join ",`n"
$json  = "[`n" + $items + "`n]`n"
$json | Out-File -FilePath (Join-Path $dir "manifest.json") -Encoding utf8 -NoNewline

# images.js
$jsItems = ($files | ForEach-Object { '  "' + $_ + '"' }) -join ",`n"
$jsContent = @"
/**
 * Lista de imagens do carrossel - gerada automaticamente por gerar-manifest.ps1.
 * Carregada como <script> comum (nao via fetch), por isso funciona mesmo
 * abrindo o index.html direto no navegador (file://), sem servidor.
 *
 * Para atualizar depois de adicionar/remover fotos nesta pasta, rode:
 *   powershell -ExecutionPolicy Bypass -File gerar-manifest.ps1
 */
window.NEXA_GALLERY_IMAGES = [
$jsItems
];
"@
$jsContent | Out-File -FilePath (Join-Path $dir "images.js") -Encoding utf8 -NoNewline

Write-Host ("images.js e manifest.json atualizados com " + $files.Count + " imagem(ns).")
