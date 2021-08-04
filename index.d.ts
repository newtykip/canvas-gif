import { NodeCanvasRenderingContext2D } from 'canvas';
import GIFEncoder from 'gif-encoder-2';

export namespace CanvasGif {
	export type EditFrame = (
		ctx: NodeCanvasRenderingContext2D,
		width: number,
		height: number,
		totalFrames: number,
		currentFrame: number,
		encoder: GIFEncoder
	) => any;
	export type Algorithm = 'neuquant' | 'octree';

	export interface Options {
		coalesce?: boolean;
		delay?: number;
		repeat?: number;
		algorithm?: Algorithm;
		optimiser?: boolean;
		fps?: number;
		quality?: number;
	}
}

export function canvasGif(
	input: string | Buffer,
	editFrame: CanvasGif.EditFrame,
	options?: CanvasGif.Options
): Promise<Buffer>;
export default canvasGif;
