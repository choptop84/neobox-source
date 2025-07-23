	export function clamp(min: number, max: number, val: number): number {
		max = max - 1;
		if (val <= max) {
			if (val >= min) return val;
			else return min;
		} else {
			return max;
		}
	}