import { NodeCanvasRenderingContext2D } from 'canvas';

export namespace CanvasGif {
	export type EditFrame = (
		ctx: NodeCanvasRenderingContext2D,
		width: number,
		height: number,
		totalFrames: number,
		currentFrame: number
	) => any;
	export type Algorithm = 'nequant' | 'octree';

	export interface Options {
		coalesce?: boolean;
		delay?: number;
		repeat?: number;
		algorithm?: Algorithm;
		optimiser?: boolean;
	}
}

export function canvasGif(
	input: string | Buffer,
	editFrame: CanvasGif.EditFrame,
	options?: CanvasGif.Options
): Promise<Buffer>;
export default canvasGif;
