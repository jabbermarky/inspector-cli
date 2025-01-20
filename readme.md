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

capture google home page into a file at path ./scrapes/google_home_w1024.png
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

    .command("footer")
    .alias("header")
    .description("Create image segments from the header and footer of an image")
    .argument('<filename>', 'Image file to process')
    .option('-h, --header <headerSize>', 'Height of the header segment', myParseInt, 1024)
    .option('-f, --footer <footerSize>', 'Height of the footer segment', myParseInt, 1024)


### Create image segments from the header and footer of an image file
```
inspector footer [--header=<headerSize>] [--footer=<footerSize> <filepath>
or
inspector header [--header=<headerSize>] [--footer=<footerSize> <filepath>

```

header is an option to specify the header height in px. Default is 1024. If 0 is passed, then no file is created.
footer is an option to specify the footer height in px. Default is 1024. If 0 is passed, then no file is created.
path is a required argument that is the path of the source image file. The default extension is .png.
The section and height are appended to the filename. 

Example:

extract the header (height 512px) and footer (default height) from ./scrapes/google_home_1024.png; 

```
inspector footer --header=512 ./scrapes/google_home_1024.png

//creates 2 files:
//  ./scrapes/google_home_1024_header_h512.png
//  ./scrapes/google_home_1024_footer_h1024.png
```


