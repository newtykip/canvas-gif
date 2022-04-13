import decodeGif from './decodeGif';
import { Options } from './types';
import Gif from './Gif';
import { FrameData } from './Frame';

/**
 * Creates an instance of the GIF canvas!
 * @param input Can be either a file path or Buffer!
 */
export = async function canvasGif<T extends number>(
	gif: string | Buffer,
	options?: Options<T>
) {
	const { frames, fps, width, height, channels } = await decodeGif(
		gif,
		options?.coalesce ?? true
	);

	// If the fps has not already been set, set it to the fps we just found from the source GIF
	options.fps ??= fps;
	options.verbose ??= false;

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
