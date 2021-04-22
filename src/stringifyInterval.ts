const MINUTE_S = 60;
const HOUR_S = MINUTE_S * 60;
const DAY_S = HOUR_S * 24;
const WEEK_S = DAY_S * 7;

/** Stringifies a ms interval like "1 day, 5 hours and 20 minutes". It says seconds only if the interval is under 10 minutes. If a date is supplied, it may say years and months as well. */
export const stringifyInterval = (interval: number, options: Date | StringifyOptions = {}): string => {
	if (isNaN(interval))
		return "";

	interval = Math.round(interval / 1000);

	let inPast = false;
	if (interval < 0) {
		interval = -1 * interval;
		inPast = true;
	}

	const { startDate, thresholds, strings } = processStringifyOptions(options);
	const enabled: Record<TimeUnit, boolean> = {
		years: false,
		months: false,
		weeks: interval >= thresholds.weeks[0] * WEEK_S && interval <= thresholds.weeks[1] * WEEK_S,
		days: interval >= thresholds.days[0] * DAY_S && interval <= thresholds.days[1] * DAY_S,
		hours: interval >= thresholds.hours[0] * HOUR_S && interval <= thresholds.hours[1] * HOUR_S,
		minutes: interval >= thresholds.minutes[0] * HOUR_S && interval <= thresholds.minutes[1] * MINUTE_S,
		seconds: interval >= thresholds.seconds[0] && interval <= thresholds.seconds[1]
	};

	let outputElements = 0;
	/** Inserts a comma or "and" (or nothing) as appropriate */
	const joiner = () => {
		outputElements--;
		if (outputElements > 1)
			return strings.joiner;
		if (outputElements === 1)
			return strings.finalJoiner;
		return "";
	};

	let shouldRoundToMonthsOrYears = false;
	[interval, shouldRoundToMonthsOrYears = false] = roundToSmallest(interval, enabled);

	let years = 0;
	let months = 0;
	let weeks = 0;
	let days = 0;
	let hours = 0;
	let minutes = 0;
	let seconds = 0;

	if (startDate && (thresholds.years[0] < Infinity || thresholds.months[0] < Infinity)) {
		[years, months, interval] = getYearsMonthsRemainder(startDate, interval, inPast, shouldRoundToMonthsOrYears, thresholds);
	}

	enabled.years = years >= thresholds.years[0] && years <= thresholds.years[1];
	enabled.months = months + years * 12 >= thresholds.months[0] && months + years * 12 <= thresholds.months[1];

	if (enabled.weeks) {
		weeks = Math.floor(interval / WEEK_S);
		interval -= weeks * WEEK_S;
	}
	if (enabled.days) {
		days = Math.floor(interval / DAY_S);
		interval -= days * DAY_S;
	}
	if (enabled.hours) {
		hours = Math.floor(interval / HOUR_S);
		interval -= hours * HOUR_S;
	}
	if (enabled.minutes) {
		minutes = Math.floor(interval / MINUTE_S);
		interval -= minutes * MINUTE_S;
	}
	if (enabled.seconds) {
		seconds = interval;
	} else {
		if (interval > 0 && (years > 0 || months > 0 || enabled.weeks || enabled.days || enabled.hours || enabled.minutes))
			console.log("Some problem with the rounding in stringifyInterval");
	}

	const timeElements: [TimeUnit, number][] = [
		["years", years],
		["months", months],
		["weeks", weeks],
		["days", days],
		["hours", hours],
		["minutes", minutes],
		["seconds", seconds]
	];
	// Calculate number of text elements to be joined with comma/and
	for (const [, value] of timeElements) {
		if (value > 0) outputElements++;
	}

	if (outputElements === 0) { // No elements, output 0 of smallest enabled
		for (const [element] of timeElements.reverse()) {
			if (enabled[element]) {
				return `0${strings.spacer}${strings[element][1]}`;
			}
		}
		console.log(`stringifyInterval ended up with no enabled elements`);
		return ""; // Nothing enabled
	}

	let text = "";
	for (const [element, value] of timeElements) {
		if (value > 0) {
			const elementString = value === 1 ? strings[element][0] : strings[element][1];
			text += `${value}${strings.spacer}${elementString}${joiner()}`;
		}
	}

	return text;
};

/**
 * For a given starting date and interval (and direction the interval should be interpreted as), returns the number of years and months, and the interval remaining after removing these years and months.
 * 
 * With shouldRound true, it also rounds to the smallest, enabled unit.
 * 
 * thresholds is used to determine which elements are enabled between the two.
 */
const getYearsMonthsRemainder = (startDate: Date, interval: number, inPast: boolean, shouldRound: boolean, thresholds: {
	years: [number, number];
	months: [number, number];
}): [number, number, number] => {
	const changingDate = new Date(startDate);
	const targetDate = new Date(changingDate.getTime() + interval * 1000 * (inPast ? -1 : 1)); // Date interval in the past or future

	const largerDate = inPast ? changingDate : targetDate;
	const smallerDate = inPast ? targetDate : changingDate;

	let years = largerDate.getUTCFullYear() - smallerDate.getUTCFullYear(); // Year difference
	let months = largerDate.getUTCMonth() - smallerDate.getUTCMonth(); // Month difference

	changingDate.setUTCFullYear(
		changingDate.getUTCFullYear() + (inPast ? -years : years),
		changingDate.getUTCMonth() + (inPast ? -months : months)
	); // Remove year and month difference
	if (largerDate.getTime() < smallerDate.getTime()) { // Went too far
		changingDate.setUTCMonth(changingDate.getUTCMonth() + (inPast ? 1 : -1));
		months--;
	}
	let remainingInterval = (largerDate.getTime() - smallerDate.getTime()) / 1000;
	if (months < 0) {
		months += 12;
		years--;
	} else if (months >= 12) {
		months -= 12;
		years++;
	}

	const enableYears = years >= thresholds.years[0] && years <= thresholds.years[1];
	const enableMonths = months + years * 12 >= thresholds.months[0] && months + years * 12 <= thresholds.months[1];

	if (!enableYears && !enableMonths) // Years and months ended up outside the threshold so it's simple
		return [0, 0, interval];

	if (!shouldRound) { // No rounding required, so still quite simple
		if (!enableYears) { // No years but there must still be months, so just push them into those
			months += years * 12;
			years = 0;
		} else if (!enableMonths) { // No months but there must still be years, so put the months back into interval
			const firstTime = changingDate.getTime();
			changingDate.setUTCMonth(changingDate.getUTCMonth() + (inPast ? months : -months));
			months = 0;
			remainingInterval += Math.abs(firstTime - changingDate.getTime()) / 1000;
		}
		return [years, months, remainingInterval];
	}

	if (!enableYears) { // No years but there must still be months
		const firstTime = changingDate.getTime();
		changingDate.setUTCMonth(changingDate.getUTCMonth() + (inPast ? -1 : 1));
		const monthDuration = Math.abs(firstTime - changingDate.getTime()) / 1000;
		if (remainingInterval >= monthDuration / 2) {
			months++;
		}
		months += years * 12;
		years = 0;
	} else if (!enableMonths) { // No months but there must still be years, so put the months back into interval
		const beforeMonths = changingDate.getTime();
		changingDate.setUTCMonth(changingDate.getUTCMonth() + (inPast ? months : -months));
		months = 0;
		remainingInterval += Math.abs(beforeMonths - changingDate.getTime()) / 1000;
		const firstTime = changingDate.getTime();
		changingDate.setUTCFullYear(changingDate.getUTCFullYear() + (inPast ? -1 : 1));
		const yearDuration = Math.abs(firstTime - changingDate.getTime()) / 1000;
		if (remainingInterval >= yearDuration / 2) {
			years++;
		}
	} else { // Both months and years, so round months
		const firstTime = changingDate.getTime();
		changingDate.setUTCMonth(changingDate.getUTCMonth() + (inPast ? -1 : 1));
		const monthDuration = Math.abs(firstTime - changingDate.getTime()) / 1000;
		if (remainingInterval >= monthDuration / 2) {
			months++;
			if (months >= 12) {
				months -= 12;
				years++;
			}
		}
	}
	return [years, months, 0];
};

type TimeUnit = "years" | "months" | "weeks" | "days" | "hours" | "minutes" | "seconds";
type StringifyThresholdsFull = { [K in TimeUnit]: [number, number] };
export type StringifyThresholds = Partial<{ [K in TimeUnit]: StringifyThresholdsFull[K] | boolean }>;
type StringifyThresholds2 = Record<TimeUnit, [number, number] | boolean>;

const thresholdDefaults: StringifyThresholdsFull = {
	years: [Infinity, 0],
	months: [Infinity, 0],
	weeks: [Infinity, 0],
	days: [0, Infinity],
	hours: [0, Infinity],
	minutes: [0, Infinity],
	seconds: [0, 10 * MINUTE_S]
};

const thresholdWithDateDefaults: StringifyThresholdsFull = {
	years: [0, Infinity],
	months: [0, Infinity],
	weeks: [Infinity, 0],
	days: [0, Infinity],
	hours: [0, Infinity],
	minutes: [0, Infinity],
	seconds: [0, 10 * MINUTE_S]
};

type StringSettingsFull = Record<TimeUnit, [string, string]> & Record<"spacer" | "joiner" | "finalJoiner", string>;
export type StringSettings = Partial<Record<TimeUnit, [string, string] | string> & Record<"spacer" | "joiner" | "finalJoiner", string>>;

const stringDefaults: StringSettingsFull = {
	years: ["year", "years"],
	months: ["month", "months"],
	weeks: ["week", "weeks"],
	days: ["day", "days"],
	hours: ["hour", "hours"],
	minutes: ["minute", "minutes"],
	seconds: ["second", "seconds"],
	spacer: " ",
	joiner: ", ",
	finalJoiner: " and "
};

export interface StringifyOptions {
	startDate?: Date;
	thresholds?: StringifyThresholds;
	strings?: StringSettings;
}

type Entry<O, K extends keyof O> = [K, O[K]]
type Entries<O> = Entry<O, keyof O>[]

/** Processes a date or StringifyOptions into a StringifyOptions with all the defaults filled in */
const processStringifyOptions = (options: Date | StringifyOptions): {
	startDate?: Date;
	thresholds: StringifyThresholdsFull;
	strings: StringSettingsFull;
} => {
	if (options instanceof Date) {
		const startDate = options;
		return {
			startDate,
			thresholds: thresholdWithDateDefaults,
			strings: stringDefaults
		};
	}
	const { startDate, thresholds, strings } = options;
	const outputThresholds = processThresholdSettings(thresholds, startDate !== undefined);
	const outputStrings = processStringSettings(strings);
	return { startDate, thresholds: outputThresholds, strings: outputStrings };
};

const timeElements: TimeUnit[] = ["years", "months", "weeks", "days", "hours", "minutes", "seconds"];

const processThresholdSettings = (settings: StringifyThresholds | undefined, date: boolean): StringifyThresholdsFull => {
	if (!settings)
		return date ? thresholdWithDateDefaults : thresholdDefaults;
	const {
		years = date ? [0, Infinity] : [Infinity, 0],
		months = date ? [0, Infinity] : [Infinity, 0],
		weeks = [Infinity, 0],
		days = [0, Infinity],
		hours = [0, Infinity],
		minutes = [0, Infinity],
		seconds = [0, 10 * MINUTE_S]
	} = settings;
	const finalSettings = { years, months, weeks, days, hours, minutes, seconds };
	for (const element of timeElements)
		finalSettings[element] = booleanToTuple(finalSettings[element]);
	return finalSettings as StringifyThresholdsFull;
};

const booleanToTuple = (booleanOrTuple: boolean | [number, number]): [number, number] => {
	if (booleanOrTuple === false)
		return [Infinity, 0];
	if (booleanOrTuple === true)
		return [0, Infinity];
	return booleanOrTuple;
};

const processStringSettings = (settings: StringSettings | undefined): StringSettingsFull => {
	if (!settings)
		return stringDefaults;
	const {
		years = ["year", "years"],
		months = ["month", "months"],
		weeks = ["week", "weeks"],
		days = ["day", "days"],
		hours = ["hour", "hours"],
		minutes = ["minute", "minutes"],
		seconds = ["second", "seconds"],
		spacer = " ",
		joiner = ", ",
		finalJoiner = " and "
	} = settings;
	const finalSettings = { years, months, weeks, days, hours, minutes, seconds, spacer, joiner, finalJoiner };
	for (const element of timeElements)
		finalSettings[element] = stringToTuple(finalSettings[element]);
	return finalSettings as StringSettingsFull;
};

const stringToTuple = (stringOrTuple: string | [string, string]): [string, string] => {
	return typeof stringOrTuple === "string" ? [stringOrTuple, stringOrTuple] : stringOrTuple;
};

/** Finds the smallest enabled constant unit to round interval to, and true if none were enabled */
const roundToSmallest = (interval: number, enabled: Record<TimeUnit, boolean>): [number, boolean?] => {
	if (enabled.seconds)
		return [interval];
	if (enabled.minutes)
		return [Math.round(interval / MINUTE_S) * MINUTE_S];
	if (enabled.hours)
		return [Math.round(interval / HOUR_S) * HOUR_S];
	if (enabled.days)
		return [Math.round(interval / DAY_S) * DAY_S];
	if (enabled.weeks)
		return [Math.round(interval / WEEK_S) * WEEK_S];
	return [interval, true];
};