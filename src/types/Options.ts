type Positive<T extends number> = number extends T
	? never
	: `${T}` extends `-${string}` | `${string}.${string}`
	? never
	: T;

export type Repeat<T extends number = number> = Positive<T> | 'forever';

export interface Options {
	/**
	 * Whether the gif should first be coalesced
	 * @default true
	 */
	coalesce?: boolean;

	/**
	 * How many times the GIF should repeat
	 * @default 'forever'
	 */
	repeat?: Repeat;

	/**
	 * How many frames to render per second
	 * @default the fps of the source GIF (or 30)
	 */
	fps?: number;

	/**
	 * Whether the libary should log about its process when rendering GIFs
	 * @default false
	 */
	verbose?: boolean;
}
