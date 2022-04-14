<div align="center">
    <img src="playground/drawGif.gif" height="250"><br>
    <h1>canvas-gif</h1>
	<h3><code>npm i canvas-gif</code></h3> 
    <img src="https://img.shields.io/github/languages/code-size/newtykins/canvas-gif?color=red&logo=github&style=for-the-badge" alt="Code Size">
    <img src="https://img.shields.io/github/package-json/v/newtykins/canvas-gif?color=grey&logo=github&style=for-the-badge" alt="Version">
</div>

> It's like [node-canvas](https://github.com/Automattic/node-canvas) but for GIFs!

new readme coming soon! heavily breaking api!

Check out the [playground](playground) for some examples of how the library works!

## FAQ

### Why do I have to have the fonts installed on my system first? [node-canvas](https://github.com/Automattic/node-canvas) lets me register fonts, why don't you?

[sharp](https://github.com/lovell/sharp), the image processing library behind canvas-gif, depends on [librsvg](https://gitlab.gnome.org/GNOME/librsvg) to render SVGs and [does not support embedded fonts](https://gitlab.gnome.org/GNOME/librsvg/-/issues/153). This means that only fonts installed on the system may be used.

<sub>See the code's license <a href="license.md">here.</sub>
