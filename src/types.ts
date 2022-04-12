import Frame from './Frame';

export type EditFrame = (
	frame: Frame,
	frameData: {
		width: number;
		height: number;
		totalFrames: number;
	}
) => void;

export type Repeat<T extends number> = Positive<T> | 'forever';

export type Positive<T extends number> = number extends T
	? never
	: `${T}` extends `-${string}` | `${string}.${string}`
	? never
	: T;

export interface Options<T extends number> {
	/**
	 * Whether the gif should first be coalesced
	 * @default true
	 */
	coalesce?: boolean;

	/**
	 * How many times the GIF should repeat
	 * @default 'forever'
	 */
	repeat?: Repeat<T>;

	/**
	 * How many frames to render per second
	 * @default Source GIF frame count
	 */
	fps?: number;
}
