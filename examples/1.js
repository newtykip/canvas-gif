const canvasGif = require('../dist/index');
const fs = require('fs');
const path = require('path');

canvasGif(
	path.resolve(__dirname, 'input1.gif'),
	(ctx, width, height, totalFrames, currentFrame) => {
		console.log(`Frame Dimensons: ${width}x${height}px`); // Logs the frame's dimensions
		console.log(`Current Frame: ${currentFrame}/${totalFrames}`);
		const framesLeft = totalFrames - currentFrame;
		console.log(`Frames Left: ${framesLeft}`); // Logs the amount of frames left to process

		// Edit the frame
		ctx.fillStyle = '#fff';
		ctx.font = '30px "Fira Code Retina"';
		ctx.fillText('this is epic!?!', 50, 100);
		ctx.fillText(`Frame ${currentFrame}/${totalFrames}`, 50, 300);

		// Log when the last frame has been processed
		if (framesLeft === 0) {
			console.log('Done!');
		}
	},
	{
		coalesce: false, // whether the gif should be coalesced first, default: false
		delay: 0, // the delay between each frame in ms, default: 0
		repeat: 0, // how many times the GIF should repeat, default: 0 (runs forever)
		algorithm: 'octree', // the algorithm the encoder should use, default: 'neuquant',
		optimiser: true, // whether the encoder should use the in-built optimiser, default: false,
		fps: 60, // the amount of frames to render per second, default: 60
		quality: 100, // the quality of the gif, a value between 1 and 100, default: 100
	}
).then((buffer) =>
	fs.writeFileSync(path.resolve(__dirname, 'output1.gif'), buffer)
);
