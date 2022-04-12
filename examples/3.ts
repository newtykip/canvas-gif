import { performance } from 'perf_hooks';
import canvasGif from '../src';
import fs from 'fs';
import path from 'path';

const background = fs.readFileSync(path.resolve(__dirname, 'output2.gif'));
const foreground = fs.readFileSync(path.resolve(__dirname, 'output.gif'));
const startTime = performance.now();

canvasGif(
	background,
	(ctx, { width, height, totalFrames, currentFrame }) => {
		ctx.drawGif(foreground, 0, 0);
		console.log(`Frame Dimensons: ${width}x${height}px`); // Logs the frame's dimensions
		console.log(`Current Frame: ${currentFrame}/${totalFrames}`);
		const framesLeft = totalFrames - currentFrame;
		console.log(`Frames Left: ${framesLeft}`); // Logs the amount of frames left to process
	},
	{
		coalesce: false, // whether the gif should be coalesced first (requires graphicsmagick), default: false
		delay: 0, // the delay between each frame in ms, default: 0
		repeat: 0, // how many times the GIF should repeat, default: 0 (runs forever)
		algorithm: 'neuquant', // the algorithm the encoder should use, default: 'neuquant',
		optimiser: true, // whether the encoder should use the in-built optimiser, default: true,
		fps: 60, // the amount of frames to render per second, default: 60
		quality: 10, // the quality of the gif, a value between 1 and 100, default: 100
	}
).then((buffer) => {
	const endTime = performance.now();
	console.log(`Finished in ${endTime - startTime}ms!`);

	fs.writeFileSync(path.resolve(__dirname, 'output3.gif'), buffer);
});
