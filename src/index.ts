import decodeGif from 'decode-gif';
import fs from 'fs';
import { createCanvas, createImageData } from 'canvas';
import GIFEncoder from 'gif-encoder-2';
import parseBuffer from './parseBuffer';

type EditFrame = (
	ctx: CanvasRenderingContext2D,
	width: number,
	height: number,
	totalFrames: number,
	currentFrame: number,
	encoder: GIFEncoder
) => void;

type Algorithm = 'neuquant' | 'octree';

interface Options {
	coalesce?: boolean;
	delay?: number;
	repeat?: number;
	algorithm?: Algorithm;
	optimiser?: boolean;
	fps?: number;
	quality?: number;
}

/**
 * Renders a new GIF after manipulating every frame using node-canvas
 * @param input The file path to or a buffer of the original GIF
 * @param editFrame The function to run for every frame
 * @param options
 * @returns
 */
export = async function canvasGif(
	input: string | Buffer,
	editFrame: EditFrame,
	options?: Options
) {
	const buffer = await parseBuffer(
		typeof input === 'string' ? fs.readFileSync(input) : input,
		options?.coalesce
	);

	// Decode the gif and begin the encoder
	const { width, height, frames } = decodeGif(buffer);

	const gif = new GIFEncoder(
		width,
		height,
		options?.algorithm.toLowerCase() ?? 'neququant',
		options?.optimiser ?? true,
		frames.length
	);

	gif.on('readable', () => gif.read());
	gif.setDelay(options?.delay ?? 0);
	gif.setRepeat(options?.repeat ?? 0);
	gif.setFrameRate(options?.fps ?? 60);
	gif.setQuality(options?.quality / 100 ?? 1);
	gif.start();

	// Render each frame and add it to the encoder
	for (let currentFrame = 1; currentFrame <= frames.length; currentFrame++) {
		const { data: frameData } = frames[currentFrame - 1];
		const canvas = createCanvas(width, height);
		const ctx = canvas.getContext('2d');
		const frame = createImageData(frameData, width, height);

		ctx.putImageData(frame, 0, 0);
		editFrame(ctx, width, height, frames.length, currentFrame, gif);

		gif.addFrame(ctx);
	}

	// Finish encoding and return the result
	gif.finish();

	return gif.out.getData() as Buffer;
};
