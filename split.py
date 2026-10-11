import os
import subprocess
import sys
import shutil

# Used to get the base path of the application, especially when packaged with PyInstaller.
def get_base_path():
    if hasattr(sys, '_MEIPASS'):
        return sys._MEIPASS
    return os.path.dirname(os.path.abspath(__file__))

# Separate the audio file into stems using Demucs (AI) and save them in the specified output directory.
def separate_stems(audio_file, out_dir="stems"):
    if not os.path.exists(audio_file):
        print(f"Error: Could not find '{audio_file}'")
        sys.exit(1)

    track_name = os.path.splitext(os.path.basename(audio_file))[0]
    clean_folder = os.path.join(out_dir, track_name)

    
    # If the folder exists and has the files, skip the AI processing entirely
    if os.path.exists(clean_folder):
        print(f"Stems already found for '{track_name}'. Skipping AI processing.")
        return 

    base_path = get_base_path()
    ffmpeg_path = os.path.join(base_path, "ffmpeg.exe")

    os.makedirs(out_dir, exist_ok=True)
    temp_wav = os.path.join(out_dir, f"{track_name}_temp.wav")
    
    print("Sanitizing audio file with FFmpeg")
    try:
        subprocess.run([
            ffmpeg_path, "-y", 
            "-i", audio_file, 
            "-ar", "44100",  
            temp_wav
        ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    except Exception as e:
        print(f"Failed to convert file. Make sure ffmpeg.exe is in the folder. Error: {e}")
        sys.exit(1)

    print(f"Splitting '{track_name}' into 4 stems...")
    from demucs.separate import main as demucs_main
    
    try:
        # Run Demucs natively without triggering a new terminal process
        demucs_main(["-n", "htdemucs", "--out", out_dir, temp_wav])
    except Exception as e:
        print(f"Error: Demucs failed to process the audio. {e}")
        if os.path.exists(temp_wav): os.remove(temp_wav)
        sys.exit(1)

    if os.path.exists(temp_wav):
        os.remove(temp_wav)

    temp_folder_name = f"{track_name}_temp"
    nested_folder = os.path.join(out_dir, "htdemucs", temp_folder_name)

    if os.path.exists(nested_folder):
        if os.path.exists(clean_folder):
            shutil.rmtree(clean_folder)
        shutil.move(nested_folder, clean_folder)
        
        htdemucs_dir = os.path.join(out_dir, "htdemucs")
        if os.path.exists(htdemucs_dir) and not os.listdir(htdemucs_dir):
            os.rmdir(htdemucs_dir)

    print(f"\nSuccess! Stems saved to: {clean_folder}/")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python split.py <song.mp3>")
    else:
        separate_stems(sys.argv[1])