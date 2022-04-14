import { performance } from 'perf_hooks';
import canvasGif from '../src';
import fs from 'fs';
import path from 'path';

const pfp = fs.readFileSync(path.resolve(__dirname, 'joker.jpg'));
const dog = fs.readFileSync(path.resolve(__dirname, 'dog.png'));
const startTime = performance.now();

async function doStuff() {
	const gif = await canvasGif(path.resolve(__dirname, 'input.gif'), {
		coalesce: false, // whether the gif should be coalesced first, default: true
		repeat: 'forever', // how many times the GIF should repeat, default: 'forever'
		fps: 30, // the amount of frames to render per second, default: source gif frame count!
		verbose: true, // whether it should log about its rendering process, default: false
	});

	const options = {
		width: 100,
		height: 100,
		includedFrames: [
			{
				from: 5,
				to: 10,
			},
			{
				from: 50,
				to: 55,
			},
		],
	};

	await gif.drawImage(pfp, 10, 10, {
		circle: true,
		...options,
	});

	await gif.drawImage(dog, 200, 10, options);

	const result = await gif.render();
	const endTime = performance.now();
	console.log(`Finished in ${endTime - startTime}ms!`);

	fs.writeFileSync(path.resolve(__dirname, 'drawImage.gif'), result);
}

doStuff();
