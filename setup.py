from setuptools import setup

APP = ['prompt_ui.py']
DATA_FILES = [('resources', ['resources/prompt_logic.py'])]
OPTIONS = {
    'iconfile': 'vox.icns',
    'packages': ['pyperclip'],
    'plist': {
        'CFBundleName': 'Prompt Generator Vox',
        'CFBundleShortVersionString': '1.0',
        'CFBundleVersion': '1.0',
        'CFBundleIdentifier': 'com.voxstrategy.promptgenerator'
    }
}

setup(
    app=APP,
    data_files=DATA_FILES,
    options={'py2app': OPTIONS},
    setup_requires=['py2app'],
)
