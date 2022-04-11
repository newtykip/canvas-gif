import decodeGif from 'decode-gif';
import fs from 'fs';
import { createCanvas, createImageData } from 'canvas';
import GIFEncoder from 'gif-encoder-2';
import parseBuffer from './parseBuffer';

/**
 * Renders a new GIF after manipulating every frame using node-canvas
 * @param input Can be either a file path to a GIF or
 */
export = function canvasGif(
	input: string | Buffer,
	editFrame: EditFrame,
	options?: Options
) {
	return new Promise<Buffer>(async (resolve, reject) => {
		if (
			typeof input === 'string' &&
			(!fs.existsSync(input) || !input.toLowerCase().endsWith('.gif'))
		)
			return reject(
				new Error(
					'Please ensure that the file path you inputted resolves to a GIF.'
				)
			);

		// Decode the gif and prepare the encoder
		parseBuffer(
			typeof input === 'string' ? fs.readFileSync(input) : input,
			options?.coalesce
		)
			.then((buffer) => {
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
				for (
					let currentFrame = 1;
					currentFrame <= frames.length;
					currentFrame++
				) {
					const { data: frameData } = frames[currentFrame - 1];
					const canvas = createCanvas(width, height);
					const ctx = canvas.getContext('2d');
					const frame = createImageData(frameData, width, height);

					ctx.putImageData(frame, 0, 0);
					editFrame(
						ctx,
						{
							width,
							height,
							totalFrames: frames.length,
							currentFrame,
						},
						gif
					);

					gif.addFrame(ctx);
				}

				// Finish encoding and return the result
				gif.finish();
				resolve(gif.out.getData() as Buffer);
			})
			.catch((error) => {
				reject(error);
			});
	});
};

type EditFrame = (
	ctx: CanvasRenderingContext2D,
	frameData: {
		width: number;
		height: number;
		totalFrames: number;
		currentFrame: number;
	},
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
