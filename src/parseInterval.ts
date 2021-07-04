const regexInterval = /^(?:(?:(-) ?)?(\d+) ?y(?:ears?)?\s?)?(?:(?:(-) ?)?(\d+) ?mo(?:nths?)?\s?)?(?:(?:(-) ?)?(\d+(?:\.\d+)?|\.\d+) ?w(?:eeks?)?\s?)?(?:(?:(-) ?)?(\d+(?:\.\d+)?|\.\d+) ?d(?:ays?)?\s?)?(?:(?:(-) ?)?(\d+(?:\.\d+)?|\.\d+) ?h(?:(?:ou)?rs?)?\s?)?(?:(?:(-) ?)?(\d+(?:\.\d+)?|\.\d+) ?m(?:in(?:ute)?s?)?\s?)?(?:(?:(-) ?)?(\d+(?:\.\d+)?|\.\d+) ?s(?:ec(?:ond)?s?)?\s?)?$/i;

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