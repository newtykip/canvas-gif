<div align="center">
    <img src="examples/output1.gif" height="250"><br>
    <h1>canvas-gif</h1>
	<h3><code>npm i canvas-gif</code></h3> 
    <img src="https://img.shields.io/bundlephobia/min/canvas-gif?color=red&label=Package%20Size&logo=npm&style=for-the-badge" alt="Package Size">
    <img src="https://img.shields.io/github/package-json/v/newtykins/canvas-gif?color=grey&logo=github&style=for-the-badge" alt="Version">
</div>

new readme coming soon!

### FAQ

#### Why do I have to have the fonts installed on my system first? node-canvas lets me register fonts, why don't you?

[sharp](https://github.com/lovell/sharp), the image processing library behind this library, depends on [librsvg](https://gitlab.gnome.org/GNOME/librsvg) to render SVGs and [does not support embedded fonts](https://gitlab.gnome.org/GNOME/librsvg/-/issues/153). This means that only fonts installed on the system may be used. This may seem inconvenient, but that is just how things are as time stands.

<sub>See the code's license <a href="license.md">here.</sub>
