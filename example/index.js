const canvasGif = require('../index');
const fs = require('fs');
const path = require('path')

canvasGif(
	path.resolve(__dirname, 'input.gif'),
	(ctx, width, height, totalFrames, currentFrame) => {
		console.log(`Frame Dimensons: ${width}x${height}px`); // Logs the frame's dimensions
		console.log(`Current Frame: ${currentFrame}/${totalFrames}`)
		const framesLeft = totalFrames - currentFrame;
		console.log(`Frames Left: ${framesLeft}`); // Logs the amount of frames left to process

		// Edit the frame
		ctx.fillStyle = '#fff';
		ctx.font = '30px "Fira Code Retina"';
		ctx.fillText('this is epic!?!', 50, 100);
		ctx.fillText(`Frame ${currentFrame}/${totalFrames}`, 50, 300)

		// Log when the last frame has been processed
		if (framesLeft === 0) {
			console.log('Done!')
		}
	},
	{
		coalesce: true, // whether the gif should be coalesced first, default: false
		delay: 0, // the delay between each frame in ms, default: 0
		repeat: 1, // how many times the GIF should repeat, default: 0 (runs forever)
		algorithm: 'octree', // the algorithm the encoder should use, default: 'nequant',
		optimiser: true // whether the encoder should use the in-built optimiser, default: false
	}
).then((buffer) => fs.writeFileSync('./output.gif', buffer));


