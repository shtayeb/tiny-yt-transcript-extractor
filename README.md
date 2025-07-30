# YouTube Transcript Extractor

A Chrome extension that adds a convenient transcript button directly into YouTube's video interface, allowing you to easily extract, copy, and download video transcripts.

## Features

- **Seamless Integration**: Adds a "Transcript" button directly to YouTube's video controls
- **Multiple Actions**: Copy transcript to clipboard, download as text file
- **Native Compatibility**: Works with YouTube's built-in transcript system

## Installation
### Chrome webstore
- Install via Chrome Webstore: [Tiny Youtube Transcript Extractor](https://chromewebstore.google.com/detail/tiny-youtube-transcript-e/ckdannejaobflfiabbmjakfmejciened)
### Manual
1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right corner
4. Click "Load unpacked" and select the `yt-transcript` folder
5. The extension will be installed and ready to use

## How to Use

### Button Interface

1. Navigate to any YouTube video page (`youtube.com/watch?v=...`)
2. Look for the "Transcript" button with a download icon in the video controls area (next to like/dislike buttons)
3. Click the button to reveal a dropdown menu with copy/download actions and timestamp settings:

#### Available Actions

- **Copy**: Instantly copies the transcript to your clipboard
- **Download**: Downloads the transcript as a `.txt` file with the video title as filename

### Extension Icon

You can also click the extension icon in your browser toolbar to toggle the dropdown menu when on a YouTube video page.

## Requirements

- **Transcript Availability**: The video must have transcripts available (either auto-generated or manually added)
- **Supported Languages**: Works with any language that YouTube supports for transcripts
- **Permissions**: Requires access to YouTube pages and clipboard for copying functionality

## Troubleshooting

### "No transcript available" Error
- The video doesn't have transcripts enabled
- Try checking if the "Show transcript" button appears below the video

### Button Not Appearing
- Refresh the page and wait a moment for YouTube to fully load
- The extension targets the area next to like/dislike buttons - make sure this area is visible

### Transcript Panel Issues
- If the transcript panel doesn't open automatically, try manually opening it first
- Some videos may have region-restricted transcripts

## Technical Details

- **Manifest Version**: 3 (Chrome Extensions MV3)
- **Permissions**: `activeTab`, `scripting`, `clipboardWrite`, `notifications`
- **Content Script**: Injects into `*://*.youtube.com/watch*` pages
- **Background Script**: Handles extension icon clicks and script injection

## File Structure

```
yt-transcript/
├── manifest.json          # Extension configuration
├── content.js             # Main extension logic
├── background.js          # Background service worker
├── icons/                 # Extension icons 
└── README.md             # This file
```

## Privacy & Security

- **No Data Collection**: The extension doesn't collect or transmit any personal data
- **Local Processing**: All transcript processing happens locally in your browser
- **Minimal Permissions**: Requests only essential permissions for functionality

## Contributing

Feel free to submit issues, feature requests, or pull requests to improve the extension.

## License

This project is open source and available under standard open source terms.
