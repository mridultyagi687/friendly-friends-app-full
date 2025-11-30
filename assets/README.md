# App Icons

Place your application icons here:

- `icon.ico` - Windows icon (256x256, .ico format)
- `icon.icns` - macOS icon (512x512, .icns format)
- `icon.png` - Linux/fallback icon (512x512, .png format)

## Creating Icons

You can create icons from a PNG image using online tools:
- https://convertio.co/png-ico/
- https://cloudconvert.com/png-to-ico
- https://iconverticons.com/ (for macOS .icns)

Or use command-line tools:
- ImageMagick: `convert icon.png -define icon:auto-resize=256,128,64,48,32,16 icon.ico`
- png2icons (macOS): `png2icons icon.png icon.icns -all`

For now, the app will use default Electron icons if these files don't exist.

