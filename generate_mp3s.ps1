
# =========================================
# generate_mp3s.ps1 (Google TTS REST API)
# =========================================

$basePath = "C:\Users\keito\Downloads\flashcards_with_audio"

$wordsJson = Join-Path $basePath "words.json"
$words = Get-Content $wordsJson | ConvertFrom-Json

$outputDir = Join-Path $basePath "audio_mp3"
if (!(Test-Path $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir | Out-Null
}

$API_KEY = "AIzaSyBuoAdxHPO9jv2qNS5oraVau8gajX65bQM"
$TTS_URL = "https://texttospeech.googleapis.com/v1/text:synthesize?key=$API_KEY"

Write-Host "Starting MP3 generation..."

foreach ($item in $words) {

    $text = $item.english
    $fname = $text.ToLower() -replace '[^\w\s-]', '' -replace '\s+', '_'
    $outFile = Join-Path $outputDir ("$fname.mp3")

    if (Test-Path $outFile) {
        Write-Host "SKIP: $text"
        continue
    }

    Write-Host "Generating: $text -> $fname.mp3"

    $body = @{
        input = @{ text = $text }
        voice = @{ languageCode = "en-US"; name = "en-US-Wavenet-D" }
        audioConfig = @{ audioEncoding = "MP3"; speakingRate = 1.0 }
    } | ConvertTo-Json -Depth 5

    $response = Invoke-RestMethod -Method Post -Uri $TTS_URL -Body $body -ContentType "application/json"

    if ($response.audioContent) {
        $bytes = [System.Convert]::FromBase64String($response.audioContent)
        [System.IO.File]::WriteAllBytes($outFile, $bytes)
    }
    else {
        Write-Host "ERROR: $text"
    }
}

Write-Host "All MP3 files generated!"
