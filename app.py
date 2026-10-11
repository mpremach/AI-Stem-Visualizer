import webview
import split
import os
import sys
import multiprocessing

# Automatically detect if running as a raw script or a packaged .exe
def get_base_path():
    if hasattr(sys, '_MEIPASS'):
        return sys._MEIPASS
    return os.path.dirname(os.path.abspath(__file__))

class Api:
    def pick_file(self):
        file_types = ('Audio Files (*.mp3;*.wav)', 'All files (*.*)')
        result = webview.windows[0].create_file_dialog(
            webview.FileDialog.OPEN, allow_multiple=False, file_types=file_types
        )
        if result:
            return result[0]
        return None

    def process_audio(self, file_path):
        print(f"Processing: {file_path}")
        # Dynamically route the output to the correct 'web/stems' folder location
        base_path = get_base_path()
        out_dir = os.path.join(base_path, 'web', 'stems')
        # Call the separate_stems function from split.py
        split.separate_stems(file_path, out_dir=out_dir)
        return os.path.splitext(os.path.basename(file_path))[0]

    def open_stems_folder(self, track_name):
        base_path = get_base_path()
        folder_path = os.path.abspath(os.path.join(base_path, 'web', 'stems', track_name))
        
        if os.path.exists(folder_path):
            os.startfile(folder_path)

if __name__ == '__main__':
    # CRITICAL: This stops PyTorch from opening duplicate windows in the .exe
    multiprocessing.freeze_support()
    # Initialize the UI with the dynamic HTML path
    api = Api()
    base_path = get_base_path()
    html_path = os.path.join(base_path, 'web', 'index.html')

    webview.create_window('AI Stem Visualizer', html_path, js_api=api, width=1280, height=720, maximized=True)
    webview.start(http_server=True)