import canvasGif from '../index';
import fs from 'fs';

const file = fs.readFileSync('./input2.gif');

canvasGif(
	file,
	(ctx, width, height, totalFrames, currentFrame) => {
		ctx.fillStyle = 'black'; // Change the fill colour to black
		ctx.font = '20px "Operator Mono Bold"'; // Change the font
		ctx.fillRect(5, 70, 350, 50); // Put a black rectange behind the frames and text
		ctx.fillRect(5, 170, 350, 50); // Put a black rectangle behind the dimensions
		ctx.fillStyle = 'white'; // Change the fill colour to white
		ctx.fillText('en movil 1080p 👀', 10, 100); // Draw funny text
		ctx.fillText(`${currentFrame}/${totalFrames}`, 250, 100); // Frame text
		ctx.fillText(`${width}x${height}`, 10, 200); // Dimensions text
		console.log(`Rendered frame ${currentFrame}`);
	},
	{
		coalesce: true, // whether the gif should be coalesced first, default: false
		delay: 0, // the delay between each frame in ms, default: 0
		repeat: 1, // how many times the GIF should repeat, default: 0 (runs forever)
		algorithm: 'neuquant', // the algorithm the encoder should use, default: 'neuquant',
		optimiser: true, // whether the encoder should use the in-built optimiser, default: false,
		fps: 1, // the amount of frames to render per second, default: 60
		quality: 10, // the quality of the gif, a value between 1 and 100, default: 100
	}
).then((buffer) => fs.writeFileSync('./output2.gif', buffer));
