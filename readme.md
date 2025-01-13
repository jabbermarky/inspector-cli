# Readme

This is the inspector command line application for inspecting PayPal integrations.

## command line options:
### Screenshot a single URL to a PNG file
```
inspector screenshot [--width=<width>] <url> <path>
```

width is an option to specify the width of the capture in px. Default is 768.
url is a required argument that is the URL of the page to capture
path is a required argument that is the path of where to save the file. The default extension is .png. the default path is ./scrapes. The width is appended to the filename. 

Example:

capture google home page into a file at path ./scrapes/google_home_1024.png
```
inspector screenshot --width=1024 https://www.google.com google_home
```

### Screenshot multiple URLs from a CSV file
```
inspector csv <csvfile>
```

csvfile is a required argument that contains one row per url, with 2 columns: URL & Path.

The first row of the file is a header and will be skipped.

Screenshots are taken per row @ 3 widths: 768, 1024, 1536.
