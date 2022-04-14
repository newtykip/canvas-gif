import { performance } from 'perf_hooks';
import canvasGif from '../src';
import fs from 'fs';
import path from 'path';

const startTime = performance.now();

async function doStuff() {
	const gif = await canvasGif(path.resolve(__dirname, 'input.gif'), {
		coalesce: false, // whether the gif should be coalesced first, default: true
		repeat: 'forever', // how many times the GIF should repeat, default: 'forever'
		fps: 30, // the amount of frames to render per second, default: source gif frame count!
		verbose: true, // whether it should log about its rendering process, default: false
	});

	gif.brushColour = '#ffffff';
	gif.fontSize = 30;
	gif.fontWeight = 'bolder';

	// Obviously will only render properly if you have Poppins! Get it here: https://fonts.google.com/specimen/Poppins
	gif.fontName = 'Poppins';

	gif.drawText('yems', 100, 100);

	const result = await gif.render();
	const endTime = performance.now();
	console.log(`Finished in ${endTime - startTime}ms!`);

	fs.writeFileSync(path.resolve(__dirname, 'drawText.gif'), result);
}

doStuff();
