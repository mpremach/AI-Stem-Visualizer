# AI Stem Visualizer

Created by: https://github.com/mpremach 

A Python program to split songs into separate audio stems (vocals, bass, drums, melody) and map them to a reactive 3D visualizer in real-time.

For easiest use download the newest version located in releases!

![Downloads](https://img.shields.io/github/downloads/mpremach/AI-Stem-Visualizer/total) ![Latest Version](https://img.shields.io/github/v/release/mpremach/AI-Stem-Visualizer)

# Features

- GUI for ease of use.
- AI Audio Splitting: Separates any .mp3 or .wav into Bass, Drums, Vocals, and Melody offline.
- 3D Visualizer: Maps the audio stems to reactive 3D graphics.
- Multiple Presets: Switch instantly between different visual styles (Hyper-Tunnel or Eclipse Canyon).
- Built-in Mixer: Adjust the volume of individual stems while the song plays.
- Works on Windows (requires ffmpeg).

# Setup

This program also requires ffmpeg, see download instructions below.

For new users if you are cloning to make changes, upon launching the packaged executable for the first time it may take 10–15 seconds to unpack the AI libraries and launch the window. After the initial extraction, it can be used freely. Ensure `ffmpeg.exe` is placed in the same folder as the executable before running.

If you wish to make changes and rebundle as .exe use
Bundle as .exe (`pyinstaller app.spec`)

# ffmpeg

FFmpeg Requirement (Windows)
This program requires FFmpeg to convert the audio files.

Go to the FFmpeg builds page: https://www.gyan.dev/ffmpeg/builds/

Download the "essentials" zip: Scroll down to the "release builds" section and download the `ffmpeg-release-essentials.zip` file.

Extract the files: Unzip the file you just downloaded.

Copy the tools:
Go into the unzipped folder (it will be named something like ffmpeg-X.X-essentials_build).
Go into the bin folder.
Copy the `ffmpeg.exe` file.

Paste the tools: Paste `ffmpeg.exe` into the exact same folder as the AI Stem Visualizer executable (or app.py).