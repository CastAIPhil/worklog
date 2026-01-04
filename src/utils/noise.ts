export interface NoiseFilterableWorkItem {
	title: string;
	description?: string | undefined;
}

const REQUEST_INTERRUPTED_BY_USER = /request interrupted by user/i;

export function isNoiseWorkItem(item: NoiseFilterableWorkItem): boolean {
	if (REQUEST_INTERRUPTED_BY_USER.test(item.title)) {
		return true;
	}

	if (item.description && REQUEST_INTERRUPTED_BY_USER.test(item.description)) {
		return true;
	}

	return false;
}

export function filterNoiseWorkItems<T extends NoiseFilterableWorkItem>(items: readonly T[]): T[] {
	return items.filter((item) => !isNoiseWorkItem(item));
}
