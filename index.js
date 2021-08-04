const gm = require('gm');
const decodeGif = require('decode-gif');
const fs = require('fs');
const { createCanvas, createImageData } = require('canvas');
const GIFEncoder = require('gif-encoder-2');

/**
 * Coalesces a GIF using GraphicsMagick
 * @param {string | Buffer} input The GIF to coalesce
 * @returns A buffer of the coalesced GIF
 */
function coalesce(input) {
	var coalesced = null;
	var error;

	// Coalesce the input GIF
	gm(input)
		.coalesce()
		.toBuffer(async (err, buffer) => {
			if (err) error = err;
			coalesced = buffer ? buffer : undefined;
		});

	// Promise a coalesced Buffer
	return new Promise(waitForCoalesced);

	// Ensure that the coalesced Buffer is resolved
	function waitForCoalesced(resolve, reject) {
		if (coalesced && coalesced.length > 0) resolve(coalesced);
		else if (coalesced === undefined) reject(new Error(`There was an error during coalescing: ${error.message}. Reverting to file buffer!`))
		else setTimeout(waitForCoalesced.bind(this, resolve, reject), 30);
	}
}

/**
 * Renders a new GIF after manipulating every frame using node-canvas
 * @param {string | Buffer} input The file path to or a buffer of the original GIF
 * @param {CanvasGif.EditFrame} editFrame The function to run for every frame
 * @param {CanvasGif.Options} [options]
 * @returns 
 */
module.exports = async function canvasGif(input, editFrame, options) {
	var buffer;

	// Parse options
	const coalesceEnabled = options && options.coalesce; 
	var algorithm = options && options.algorithm ? options.algorithm.toLowerCase() : 'neuquant';
	const optimiserEnabled = options && options.optimiserEnabled;
	const delay = options && options.delay ? options.delay : 0;
	const repeat = options && options.repeat ? options.repeat : 0;
	const fps = options && options.fps ? options.fps : 60;
	const quality = options && options.quality ? options.quality / 100 : 1;

	// Get the buffer from the input
	if (coalesceEnabled) {
		await coalesce(input)
			.then(res => {
				buffer = res;
			})
			.catch(err => {
				console.log(err)
				buffer = typeof input === 'string' ? fs.readFileSync(input) : input
			});
	} else {
		buffer = typeof input === 'string' ? fs.readFileSync(input) : input;
	}

	// Validate the algorithm
	if (!['neuquant', 'octree'].includes(algorithm)) {
		console.error(new Error(`${algorithm} is not a valid algorithm! Using neuquant as a substitute.`));
		algorithm = 'neuquant';
	}

	// Decode the gif and begin the encoder
	const { width, height, frames } = decodeGif(buffer);
	const encoder = new GIFEncoder(width, height, algorithm, optimiserEnabled, frames.length);

	encoder.on('readable', () => encoder.read());
	encoder.setDelay(delay);
	encoder.setRepeat(repeat);
	encoder.setFrameRate(fps);
	encoder.setQuality(quality);
	encoder.start();

	// Render each frame and add it to the encoder
	for (const i in frames) {
		const frame = frames[i];
		
		// Create the frame's canvas
		const canvas = createCanvas(width, height);
		const ctx = canvas.getContext('2d');
		
		// Create image data from the frame's data and put it on the canvas
		const data = createImageData(frame.data, width, height);
		ctx.putImageData(data, 0, 0);

		// Run the user's custom edit function, and add the frame
		editFrame(ctx, width, height, frames.length, parseInt(i) + 1, encoder);
		encoder.addFrame(ctx);
	}

	// Finish encoding and return the result
	encoder.finish();
	return encoder.out.getData();
};
