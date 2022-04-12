import extractFrames from 'gif-extract-frames';
import chunk from 'lodash.chunk';
import { Options } from './types';
import Gif from './Gif';
import { FrameData } from './Frame';

/**
 * Creates an instance of the GIF canvas!
 * @param input Can be either a file path to a GIF or
 */
export = async function canvasGif<T extends number>(
	input: string | Buffer,
	options?: Options<T>
) {
	// Extract all of the frames and read the data
	const result = await extractFrames({
		input,
		coalesce: options?.coalesce ?? true,
	});
	const [fps, width, height, channels] = result.shape;
	const frames = chunk(result.data, height * width * channels).map(
		(a: any[]) => new Uint8ClampedArray(a)
	);

	// If the fps has not already been set, set it to the fps we just found from the source GIF
	options.fps ??= fps;

	// Return the newly made GIF instance!
	return new Gif(
		frames.map((data, i): FrameData => {
			return {
				data,
				height,
				width,
				channels,
				frameNumber: i + 1,
			};
		}),
		options
	);
};
