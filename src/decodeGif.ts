import { GifReader } from 'omggif';
import ndarray from 'ndarray';
import fs from 'fs';
import chunk from 'lodash.chunk';

function getGifPixels(buffer: Buffer) {
	return new Promise<ndarray.NdArray<Uint8Array>>((resolve, reject) => {
		let reader: GifReader,
			nshape: number[],
			ndata: Uint8Array,
			result: ndarray.NdArray;

		try {
			reader = new GifReader(buffer);
		} catch (err) {
			reject(err);
		}

		if (reader.numFrames() > 0) {
			nshape = [reader.numFrames(), reader.height, reader.width, 4];

			ndata = new Uint8Array(
				nshape[0] * nshape[1] * nshape[2] * nshape[3]
			);

			result = ndarray(ndata, nshape);

			try {
				for (var i = 0; i < reader.numFrames(); ++i) {
					reader.decodeAndBlitFrameRGBA(
						i,
						ndata.subarray(
							result.index(i, 0, 0, 0),
							result.index(i + 1, 0, 0, 0)
						)
					);
				}
			} catch (err) {
				reject(err);
			}

			// @ts-expect-error
			resolve(result.transpose(0, 2, 1));
		} else {
			nshape = [reader.height, reader.width, 4];
			ndata = new Uint8Array(nshape[0] * nshape[1] * nshape[2]);
			result = ndarray(ndata, nshape);
			try {
				reader.decodeAndBlitFrameRGBA(0, ndata);
			} catch (err) {
				reject(err);
			}

			// @ts-expect-error
			resolve(result.transpose(1, 0));
		}
	});
}

export default async function decodeGif(
	gif: string | Buffer,
	coalesce: boolean = true
) {
	if (typeof gif === 'string') {
		gif = fs.readFileSync(gif);
	}

	const results = await getGifPixels(gif);
	const { shape } = results;

	// Coalesce animated GIF
	if (shape.length === 4) {
		const [frames, width, height, channels] = shape;
		const numPixelsInFrame = width * height;

		for (let i = 0; i < frames; ++i) {
			if (i > 0 && coalesce) {
				const currIndex = results.index(i, 0, 0, 0);
				const prevIndex = results.index(i - 1, 0, 0, 0);

				for (let j = 0; j < numPixelsInFrame; ++j) {
					const curr = currIndex + j * channels;

					if (results.data[curr + channels - 1] === 0) {
						const prev = prevIndex + j * channels;

						for (let k = 0; k < channels; ++k) {
							results.data[curr + k] = results.data[prev + k];
						}
					}
				}
			}
		}
	}

	const [fps, width, height, channels] = shape;

	return {
		fps,
		width,
		height,
		channels,
		frames: chunk(results.data, height * width * channels).map(
			(a: any[]) => new Uint8ClampedArray(a)
		),
	};
}
