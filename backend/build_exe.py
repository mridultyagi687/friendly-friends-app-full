#!/usr/bin/env python3
"""
Build script to create executable from Flask backend using PyInstaller
"""
import os
import sys
import subprocess
import shutil

def main():
    # Get the directory of this script
    script_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(script_dir)
    
    # Check if PyInstaller is installed
    try:
        import PyInstaller
    except ImportError:
        print("PyInstaller not found. Installing...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "pyinstaller"])
    
    # Create spec file content
    spec_content = """# -*- mode: python ; coding: utf-8 -*-

block_cipher = None

a = Analysis(
    ['app.py'],
    pathex=[],
    binaries=[],
    datas=[
        ('uploads', 'uploads'),
    ],
    hiddenimports=[
        'flask',
        'flask_cors',
        'flask_sqlalchemy',
        'sqlalchemy',
        'werkzeug',
        'openai',
        'PIL',
        'dotenv',
        'requests',
        'psycopg2',
        'PyPDF2',
        'docx',
        'pkg_resources.py2_warn',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='friendly-friends-backend',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
"""
    
    # Write spec file
    spec_path = os.path.join(script_dir, 'friendly-friends-backend.spec')
    with open(spec_path, 'w') as f:
        f.write(spec_content)
    
    print("Building executable...")
    print(f"Working directory: {script_dir}")
    
    # Run PyInstaller
    cmd = [
        sys.executable, "-m", "PyInstaller",
        "--clean",
        "--noconfirm",
        spec_path
    ]
    
    try:
        subprocess.check_call(cmd)
        print("\n✅ Build successful!")
        print(f"Executable location: {os.path.join(script_dir, 'dist', 'friendly-friends-backend')}")
        
        # Copy to electron resources if electron directory exists
        electron_backend_dir = os.path.join(script_dir, '..', 'electron', 'resources', 'backend')
        if os.path.exists(os.path.join(script_dir, '..', 'electron')):
            os.makedirs(electron_backend_dir, exist_ok=True)
            exe_name = 'friendly-friends-backend.exe' if sys.platform == 'win32' else 'friendly-friends-backend'
            src = os.path.join(script_dir, 'dist', exe_name)
            if os.path.exists(src):
                dst = os.path.join(electron_backend_dir, exe_name)
                shutil.copy2(src, dst)
                print(f"✅ Copied to Electron resources: {dst}")
    except subprocess.CalledProcessError as e:
        print(f"\n❌ Build failed: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()

