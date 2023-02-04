# An extension of chrome.
I'm not native english speaker. Usually, im always practice my english skills from youtube videos, especially listening skill. That's why i was developed this extension. It's still working in progress. If you have anything suggestions, you can open an issue.

# How to install
The extension was only worked for videos that's has subtitles, not for auto-generated subtitles.

- Download this repo.
- Go to chrome extension page, chrome://extensions
- In develop mode, load extension manully.

# If not work
Sometimes extension scripts was loaded after page was loaded, cause injected js cannot listen page request like subtitles request, result in extension not init correct. i dont kown why that happen yet. You can follow the steps behinds:
1. In the youtube video, click subtitle control icon to reload subtitle request;
2. Open browser develop tool, CMD+shift+i(Mac), and reload page, repeat number 1 step again.

# When extension active
You will see top-right corner with youtube icon, click to toggle subtitles display or hide, when you click sentence, video will navigate to that sentence time.
[![pSyRLzF.png](https://s1.ax1x.com/2023/02/04/pSyRLzF.png)](https://imgse.com/i/pSyRLzF)
