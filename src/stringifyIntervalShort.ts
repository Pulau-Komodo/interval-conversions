const MINUTE_S = 60;
const HOUR_S = MINUTE_S * 60;
const DAY_S = HOUR_S * 24;

const YEAR_S = 365.25 * DAY_S;
const YEAR_S_LOWER = 365 * DAY_S;
const YEAR_S_UPPER = 366 * DAY_S;
const MONTH_S = YEAR_S / 12;
const MONTH_S_LOWER = 28 * DAY_S;
const MONTH_S_UPPER = 31 * DAY_S;

/** Stringifies a ms interval to the smallest number of the largest suitable unit (between minutes, hours days, months and years) that contains it, like "5 days", "5 months" or "~5 years". To be used with "within" or "under" etc. A tilde is added if using the lower or upper bound of a month or year makes a difference. If atLeast is true, it will round down instead, and it should be used with "at least" etc. */
export const stringifyIntervalShort = (interval: number, atLeast = false): string => {
	if (isNaN(interval))
		return "";
	interval = interval / 1000;
	const round = atLeast ? Math.floor : Math.ceil;
	let inPast = false;
	if (interval < 0) {
		interval = -1 * interval;
		inPast = true;
	}

	if (interval < HOUR_S) {
		const minutes = round(interval / MINUTE_S);
		if (minutes !== 60) {
			const s = minutes === 1 ? "" : "s";
			return `${minutes} minute${s}`;
		}
	}

	if (interval < DAY_S) {
		const hours = round(interval / HOUR_S);
		if (hours !== 24) {
			const s = hours === 1 ? "" : "s";
			return `${hours} hour${s}`;
		}
	}

	if (interval < MONTH_S_UPPER) {
		const days = round(interval / DAY_S);
		const s = days === 1 ? "" : "s";
		return `${days} day${s}`;
	}

	if (interval < YEAR_S) {
		const months = round(interval / MONTH_S);
		if (months !== 12) {
			const s = months === 1 ? "" : "s";
			const tilde = round(interval / MONTH_S_LOWER) === round(interval / MONTH_S_UPPER) ? "" : "~";
			return `${tilde}${months} month${s}`;
		}
	}

	const years = round(interval / YEAR_S);
	const s = years === 1 ? "" : "s";
	const tilde = round(interval / YEAR_S_LOWER) === round(interval / YEAR_S_UPPER) ? "" : "~";
	return `${tilde}${years} year${s}`;
};
// Tildes could be applied more intelligently. There is no risk of 4 leap years or 5 28-day months in a row.