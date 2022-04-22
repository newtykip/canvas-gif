import { performance } from 'perf_hooks';
import Gif from '../src';
import fs from 'fs';
import path from 'path';

const startTime = performance.now();

async function doStuff() {
	const rubiksCube = await Gif.fromPath(
		path.resolve(__dirname, 'input2.gif'),
		{
			coalesce: false, // whether the gif should be coalesced first, default: true
			repeat: 'forever', // how many times the GIF should repeat, default: 'forever'
			fps: 30, // the amount of frames to render per second, default: source gif frame count!,
			verbose: true, // whether it should log about its rendering process, default: false
		}
	);

	const taiga = await Gif.fromPath(path.resolve(__dirname, 'taiga.gif'));
	taiga.resize(150, 150);

	await rubiksCube.drawGif(taiga, 25, 100, {
		round: true,
	});

	await rubiksCube.drawGif(taiga, rubiksCube.width - taiga.width - 25, 100, {
		round: true,
		fps: taiga.fps / 4,
	});

	const result = await rubiksCube.render();
	const endTime = performance.now();
	console.log(`Finished in ${endTime - startTime}ms!`);

	fs.writeFileSync(path.resolve(__dirname, 'drawGif.gif'), result);
}

doStuff();
