# Desktop Application Build Guide

This guide explains how to build executable files (.exe for Windows and .app for macOS) for the Friendly Friends application.

## Prerequisites

### For Windows (.exe):
- Node.js (v18 or higher)
- Python 3.9 or higher
- npm (comes with Node.js)

### For macOS (.app):
- Node.js (v18 or higher)
- Python 3.9 or higher
- npm (comes with Node.js)
- Xcode Command Line Tools (for code signing, optional)

## Build Process

The build process consists of three steps:

1. **Build Frontend**: Compile React app to static files
2. **Build Backend**: Create Python executable using PyInstaller
3. **Build Electron App**: Package everything into a desktop application

## Quick Start

### Windows:
```bash
# Run the build script
.\build-desktop.bat
```

### macOS/Linux:
```bash
# Make script executable
chmod +x build-desktop.sh

# Run the build script
./build-desktop.sh
```

## Manual Build Steps

### Step 1: Build Frontend

```bash
cd frontend
npm install
npm run build
cd ..
```

This creates optimized static files in `frontend/dist/`.

### Step 2: Build Backend Executable

```bash
cd backend
python build_exe.py
cd ..
```

This creates a standalone executable:
- Windows: `backend/dist/friendly-friends-backend.exe`
- macOS/Linux: `backend/dist/friendly-friends-backend`

**Note**: The first time you run this, PyInstaller will be installed automatically.

### Step 3: Build Electron Desktop App

```bash
cd electron
npm install

# For Windows
npm run build:win

# For macOS
npm run build:mac

# For Linux
npm run build:linux
cd ..
```

The built application will be in `electron/dist-electron/`:
- Windows: `.exe` installer (NSIS)
- macOS: `.dmg` file
- Linux: `.AppImage` file

## Development Mode

To run the app in development mode (with hot reload):

```bash
# Terminal 1: Start backend
cd backend
python app.py

# Terminal 2: Start frontend dev server
cd frontend
npm run dev

# Terminal 3: Start Electron
cd electron
npm start
```

## Configuration

### Electron Configuration

Edit `electron/package.json` to customize:
- App name and description
- Icons (place in `assets/` directory)
- Build targets and architectures

### Backend Configuration

The backend executable uses SQLite by default for local use. To use PostgreSQL:
1. Set `DATABASE_URL` environment variable
2. Or modify `backend/app.py` to use your database

## Troubleshooting

### PyInstaller Issues

If PyInstaller fails:
1. Ensure all dependencies are installed: `pip install -r requirements.txt`
2. Try building with `--onefile` flag (modify `build_exe.py`)
3. Check for missing hidden imports in the spec file

### Electron Build Issues

If Electron build fails:
1. Clear cache: `rm -rf electron/node_modules electron/dist-electron`
2. Reinstall: `cd electron && npm install`
3. Check Node.js version: `node --version` (should be v18+)

### Missing Icons

Create icon files:
- Windows: `assets/icon.ico` (256x256)
- macOS: `assets/icon.icns` (512x512)
- Linux: `assets/icon.png` (512x512)

You can use online converters or tools like `png2icons`.

## File Structure After Build

```
Friendly Friends App/
├── frontend/
│   └── dist/              # Built frontend files
├── backend/
│   └── dist/              # Backend executable
├── electron/
│   ├── dist-electron/      # Final desktop app
│   └── resources/
│       └── backend/       # Backend executable (copied)
└── assets/                # App icons
```

## Distribution

### Windows
The NSIS installer in `electron/dist-electron/` can be distributed directly. Users can install it like any Windows application.

### macOS
The `.dmg` file can be distributed. For App Store distribution, you'll need:
- Apple Developer account
- Code signing certificates
- Notarization

### Linux
The `.AppImage` is portable and doesn't require installation. Users can:
1. Download the file
2. Make it executable: `chmod +x Friendly-Friends-*.AppImage`
3. Run it: `./Friendly-Friends-*.AppImage`

## Notes

- The desktop app runs the backend locally on port 5002
- Database is stored locally (SQLite) by default
- All uploads and user data are stored in the app's data directory
- The app works offline (except for AI features that require API keys)

## Support

For issues or questions, check:
1. Build logs in the terminal
2. Electron logs (View > Toggle Developer Tools)
3. Backend logs (console output when starting)

