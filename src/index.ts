const regexInterval = /^(?:(?:(-) ?)?(\d+) ?y(?:ears?)?\s?)?(?:(?:(-) ?)?(\d+) ?mo(?:nths?)?\s?)?(?:(?:(-) ?)?(\d*\.?\d+) ?w(?:eeks?)?\s?)?(?:(?:(-) ?)?(\d*\.?\d+) ?d(?:ays?)?\s?)?(?:(?:(-) ?)?(\d*\.?\d+) ?h(?:ours?)?\s?)?(?:(?:(-) ?)?(\d*\.?\d+) ?m(?:in(?:ute)?s?)?\s?)?(?:(?:(-) ?)?(\d*\.?\d+) ?s(?:ec(?:ond)?s?)?\s?)?$/i

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

/** Parses a user string like "1y 2mo 3w 4d 5h 6m 7s" and returns the duration in ms. If there is a component of variable duration (year or month), it will use the supplied date or now as a starting point. Returns undefined if parsing failed. */
export const parseInterval = (text: string, startDate?: Date): number | undefined => {
	text = text.trim();
	if (!text)
		return; // Empty input
	const result = regexInterval.exec(text);
	if (!result)
		return; // Didn't look like a duration
	let sign = 1;
	const parseNumber = (minus: string, number: string): number => {
		sign *= minus ? -1 : 1;
		return number ? sign * Number(number) : 0;
	};
	const timeElements = [];
	for (let i = 1; i < 15; i += 2) {
		timeElements.push(parseNumber(result[i], result[i + 1]));
	}
	const [y, mo, w, d, h, m, s] = timeElements;
	const invariable = w * WEEK + d * DAY + h * HOUR + m * MINUTE + s * SECOND;
	if (y === 0 && mo === 0) { // No variable elements
		return invariable;
	}
	const date = startDate ? new Date(startDate) : new Date();
	const startingPoint = date.getTime();
	date.setUTCFullYear(
		date.getUTCFullYear() + y,
		date.getUTCMonth() + mo,
	);
	return date.getTime() + invariable - startingPoint;
};

const MINUTE_S = MINUTE / 1000;
const HOUR_S = MINUTE_S * 60;
const DAY_S = HOUR_S * 24;

/** Stringifies a ms interval like "1 day, 5 hours and 20 minutes". It says seconds only if the interval is under 10 minutes. If a date is supplied, it may say years and months as well. */
export const stringifyInterval = (interval: number, startDate?: Date): string => {
	if (isNaN(interval))
		return "";
	interval = Math.round(interval / 1000);
	let inPast = false;
	if (interval < 0) {
		interval = -1 * interval;
		inPast = true;
	}

	let outputElements = 0;
	// Inserts a comma or "and" as appropriate
	const joiner = function () {
		outputElements--;
		if (outputElements > 1)
			return ", ";
		if (outputElements === 1)
			return " and ";
		return "";
	};

	const under10Minutes = interval < 10 * MINUTE_S;

	let years = 0;
	let months = 0;

	if (startDate && interval > 28 * DAY_S) {
		[years, months, interval] = getYearsMonthsRemainder(startDate, interval, inPast);
	}

	let days = Math.floor(interval / (DAY_S));
	interval -= days * DAY_S;
	let hours = Math.floor(interval / (HOUR_S));
	interval -= hours * HOUR_S;
	let minutes = under10Minutes ? Math.floor(interval / MINUTE_S) : Math.round(interval / MINUTE_S);
	const seconds = interval - minutes * MINUTE_S;

	// If minutes got rounded up, make sure it propagates to the other units
	if (minutes === 60) {
		minutes = 0;
		hours++;
		if (hours === 24) {
			hours = 0;
			days++;
		}
	}

	// Calculate number of text elements to be joined with comma/and
	if (years > 0) { outputElements++; }
	if (months > 0) { outputElements++; }
	if (days > 0) { outputElements++; }
	if (hours > 0) { outputElements++; }
	if (minutes > 0) { outputElements++; }
	if (under10Minutes && seconds > 0) { outputElements++; }

	let text = "";
	if (years > 1) {
		text += `${years} years${joiner()}`;
	} else if (years === 1) {
		text += `${years} year${joiner()}`;
	}
	if (months > 1) {
		text += `${months} months${joiner()}`;
	} else if (months === 1) {
		text += `${months} month${joiner()}`;
	}
	if (days > 1) {
		text += `${days} days${joiner()}`;
	} else if (days === 1) {
		text += `1 day${joiner()}`;
	}
	if (hours > 1) {
		text += `${hours} hours${joiner()}`;
	} else if (hours === 1) {
		text += `1 hour${joiner()}`;
	}
	if (minutes > 1) {
		text += `${minutes} minutes${joiner()}`;
	} else if (minutes === 1) {
		text += `1 minute${joiner()}`;
	}
	if (under10Minutes) { // If it's less than 10 minutes, say seconds too
		if (seconds === 1) {
			text += `1 second`;
		} else {
			text += `${seconds} seconds`;
		}
	}

	return text;
};

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
	interval = interval / 1000
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

const getYearsMonthsRemainder = (startDate: Date, interval: number, inPast: boolean): [number, number, number] => {
	let years = 0;
	let months = 0;
	startDate = new Date(startDate);
	if (inPast) {
		const date = new Date(startDate.getTime() - interval * 1000); // Date interval in the past
		years = startDate.getUTCFullYear() - date.getUTCFullYear(); // Year difference
		months = startDate.getUTCMonth() - date.getUTCMonth(); // Month difference
		startDate.setUTCFullYear(startDate.getUTCFullYear() - years, startDate.getUTCMonth() - months) // Remove year and month difference
		if (startDate.getTime() < date.getTime()) { // Went too far
			startDate.setUTCMonth(startDate.getUTCMonth() + 1); // Add one month
			months--;
		}
		interval = (startDate.getTime() - date.getTime()) / 1000;
	} else {
		const date = new Date(startDate.getTime() + interval * 1000); // Date interval in the future
		years = date.getUTCFullYear() - startDate.getUTCFullYear(); // Year difference
		months = date.getUTCMonth() - startDate.getUTCMonth(); // Month difference
		startDate.setUTCFullYear(startDate.getUTCFullYear() + years, startDate.getUTCMonth() + months) // Remove year and month difference
		if (date.getTime() < startDate.getTime()) { // Went too far
			startDate.setUTCMonth(startDate.getUTCMonth() - 1); // Remove one month
			months--;
		}
		interval = (date.getTime() - startDate.getTime()) / 1000;
	}
	if (months < 0) {
		months += 12;
		years--;
	} else if (months >= 12) {
		months -= 12;
		years++;
	}
	return [years, months, interval];
};