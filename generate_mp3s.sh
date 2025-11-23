#!/bin/bash
# generate_mp3s.sh
# Example script: generate MP3 files for each word using Google Cloud Text-to-Speech (gcloud) or AWS Polly.
# You must install and authenticate the chosen CLI and have API access.
# This script reads words.json and generates mp3 files into audio_mp3/ (one per word).
# Adjust voice/language parameters as needed.

mkdir -p audio_mp3

# Example using gcloud TTS (Google Cloud)
# Requires: gcloud CLI and `gcloud auth application-default login` plus billing enabled.
# jq required
if command -v gcloud >/dev/null 2>&1; then
  echo 'Using Google Cloud TTS (gcloud) to generate MP3s...'
  cat words.json | jq -r '.[].english' | while read -r text; do
    fname=$(echo "$text" | tr -cd '[:alnum:] _-' | tr ' ' '_' | tr '[:upper:]' '[:lower:]')
    gcloud ml speech synthesize --text "$text" --voice "en-US-Wavenet-D" --audio-encoding MP3 "audio_mp3/${fname}.mp3" 2>/dev/null || true
  done
fi

# Example using AWS Polly (aws cli)
if command -v aws >/dev/null 2>&1; then
  echo 'Using AWS Polly to generate MP3s...'
  cat words.json | jq -r '.[].english' | while read -r text; do
    fname=$(echo "$text" | tr -cd '[:alnum:] _-' | tr ' ' '_' | tr '[:upper:]' '[:lower:]')
    aws polly synthesize-speech --output-format mp3 --voice-id Joanna --text "$text" "audio_mp3/${fname}.mp3" || true
  done
fi

echo 'MP3 generation script finished. Inspect audio_mp3/ for results.'
