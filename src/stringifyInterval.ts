const MINUTE_S = 60;
const HOUR_S = MINUTE_S * 60;
const DAY_S = HOUR_S * 24;
const WEEK_S = DAY_S * 7;

/** Processes the options (without startDate) once, which is a relatively expensive operation, then stores the processed configuration for future stringifier calls. */
export class IntervalStringifier {
	settings: StringifySettings;
	constructor(options: StringifierOptions = {}) {
		const { settings } = processStringifyOptions(options);
		this.settings = settings;
	}
	/**
	 * Stringifies a ms interval like "1 day, 5 hours and 20 minutes". If a date is supplied, it is capable of outputting years and months.
	 * 
	 * Behaves the same as stringifyInterval, except that all options (except startDate) were already processed by the constructor.
	 * 
	 * This one throws an error if the number is NaN, because that seems like a more proper outcome, and I got the opportunity to do that without changing existing API.
	 */
	stringify(interval: number, startDate?: Date): string {
		if (isNaN(interval))
			throw new RangeError("Cannot stringify NaN interval");
	
		return stringifyIntervalInternal(interval, this.settings, startDate);
	}
}

/** Stringifies a ms interval like "1 day, 5 hours and 20 minutes". If a starting date is supplied, it is capable of outputting years and months. */
export const stringifyInterval = (interval: number, options: Date | StringifyOptions = {}): string => {
	if (isNaN(interval))
		return "";

	const { settings, startDate } = processStringifyOptions(options);
	return stringifyIntervalInternal(interval, settings, startDate);
};

const stringifyIntervalInternal = (interval: number, settings: StringifySettings, startDate: Date | undefined): string => {
	interval = Math.round(interval / 1000);

	let inPast = false;
	if (interval < 0) {
		interval = -1 * interval;
		inPast = true;
	}

	const { thresholds, pad, displayZero, strings } = settings;

	const enabled: Record<TimeUnit, boolean> = {
		years: false,
		months: false,
		weeks: interval >= thresholds.weeks[0] * WEEK_S && interval <= thresholds.weeks[1] * WEEK_S,
		days: interval >= thresholds.days[0] * DAY_S && interval <= thresholds.days[1] * DAY_S,
		hours: interval >= thresholds.hours[0] * HOUR_S && interval <= thresholds.hours[1] * HOUR_S,
		minutes: interval >= thresholds.minutes[0] * HOUR_S && interval <= thresholds.minutes[1] * MINUTE_S,
		seconds: interval >= thresholds.seconds[0] && interval <= thresholds.seconds[1]
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
		enabled.years = years >= thresholds.years[0] && years <= thresholds.years[1];
		enabled.months = months + years * 12 >= thresholds.months[0] && months + years * 12 <= thresholds.months[1];
	}

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
			console.warn("Some problem with the rounding in stringifyInterval");
	}


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
	for (const [element, value] of timeElements) {
		if (enabled[element] && (displayZero[element] || value > 0)) outputElements++;
	}

	if (outputElements === 0) { // No elements, output 0 of smallest enabled
		for (const [element] of timeElements.reverse()) {
			if (enabled[element]) {
				return `0${strings.spacer}${strings[element][1]}`;
			}
		}
		//console.log(`stringifyInterval ended up with no enabled elements`);
		return ""; // Nothing enabled
	}

	let text = "";
	for (const [element, value] of timeElements) {
		if (enabled[element] && (displayZero[element] || value > 0)) {
			let numberPortion = value.toString();
			if (pad[element]) {
				const padCount = element === "years" ? 4 : 2;
				numberPortion = numberPortion.padStart(padCount, "0");
			}
			const elementString = value === 1 ? strings[element][0] : strings[element][1];
			text += `${numberPortion}${strings.spacer}${elementString}${joiner()}`;
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
export type StringifyThresholds = Partial<{ [K in TimeUnit]: StringifyThresholdsFull[K] | number | boolean }>;
type StringifyThresholds2 = Record<TimeUnit, [number, number] | boolean>;

const thresholdDefaults: StringifyThresholdsFull = {
	years: [0, Infinity],
	months: [0, Infinity],
	weeks: [Infinity, 0],
	days: [0, Infinity],
	hours: [0, Infinity],
	minutes: [0, Infinity],
	seconds: [0, 10 * MINUTE_S]
};

type OtherStrings = {
	/** What is put between a number and its unit. Default: " " */
	spacer: string;
	/** What is put between any two units, except the penultimate and ultimate ones. Default: ", " */
	joiner: string;
	/** What is put between the penultimate and ultimate units. Default: " and " */
	finalJoiner: string;
};

type StringSettingsFull = Record<TimeUnit, [string, string]> & OtherStrings;
export type StringSettings = Partial<Record<TimeUnit, [string, string] | string> & OtherStrings>;

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
	finalJoiner: " and ",
};

type TimeUnitBooleansFull = Record<TimeUnit, boolean>;
/** The time units with booleans. Meaning depends on context. */
export type TimeUnitBooleans = Partial<TimeUnitBooleansFull>;

const timeUnitBooleanDefaults: TimeUnitBooleansFull = {
	years: false,
	months: false,
	weeks: false,
	days: false,
	hours: false,
	minutes: false,
	seconds: false,
};
/** All the stringifier options  */
export interface StringifyOptions {
	/** The date to use as a starting point, if months and years are desired */
	startDate?: Date;
	/**
	 * The thresholds for at which total intervals to display each unit.
	 * 
	 * Tuples indicate lower and upper thresholds. A single number will be used as an upper threshold.
	 * 
	 * `true` means `[0, Infinity]` (essentially enabling), and `false` means `[Infinity, 0]` (essentially disabling).
	 */
	thresholds?: StringifyThresholds;
	/**
	 * Whether to pad any given unit's number with 0s, like "5" -> "05".
	 * 
	 * Years will be padded to 4 digits, everything else to 2.
	 * 
	 * `true` enables all, `false` disables all. Default: `false`
	 */
	pad?: TimeUnitBooleans | boolean;
	/**
	 * Whether to still display units with a value of 0.
	 * 
	 * `true` enables all, `false` disables all. Default: `false`
	 */
	displayZero?: TimeUnitBooleans | boolean;
	/**
	 * Overrides for all the strings used in composing the final string.
	 * 
	 * Tuples on time units are used as singular and plural. A string will use the same for both.
	 */
	strings?: StringSettings;
}

/** StringifyOptions, but without startDate */
export type StringifierOptions = Omit<StringifyOptions, "startDate">;

/** All the stringifier options, except startDate, processed into a full set of settings */
interface StringifySettings {
	/**
	 * The thresholds for at which total intervals to display each unit.
	 * 
	 * Tuples indicate lower and upper thresholds.
	 */
	thresholds: StringifyThresholdsFull;
	/**
	 * Whether to pad any given unit's number with 0s, like "5" -> "05".
	 * 
	 * Years will be padded to 4 digits, everything else to 2.
	 */
	pad: TimeUnitBooleansFull;
	/**
	 * Whether to still display units with a value of 0.
	 */
	displayZero: TimeUnitBooleansFull;
	/**
	 * Overrides for all the strings used in composing the final string.
	 * 
	 * Tuples on time units are used as singular and plural.
	 */
	strings: StringSettingsFull;
}

const settingsDefaults: StringifySettings = {
	thresholds: thresholdDefaults,
	pad: timeUnitBooleanDefaults,
	displayZero: timeUnitBooleanDefaults,
	strings: stringDefaults,
};

type Entry<O, K extends keyof O> = [K, O[K]]
type Entries<O> = Entry<O, keyof O>[]

/** Processes a date or StringifyOptions into a StringifyOptions with all the defaults filled in */
const processStringifyOptions = (options: Date | StringifyOptions): { startDate?: Date; settings: StringifySettings } => {
	if (options instanceof Date) {
		const startDate = options;
		const settings = settingsDefaults;
		return { startDate, settings };
	}
	const { startDate, thresholds, pad, displayZero, strings } = options;
	const settings = {
		thresholds: processThresholdSettings(thresholds, startDate !== undefined),
		pad: processTimeUnitBooleans(pad),
		displayZero: processTimeUnitBooleans(displayZero),
		strings: processStringSettings(strings),
	};
	return { startDate, settings };
};

const timeElements: TimeUnit[] = ["years", "months", "weeks", "days", "hours", "minutes", "seconds"];

const processThresholdSettings = (settings: StringifyThresholds | undefined, date: boolean): StringifyThresholdsFull => {
	if (!settings)
		return thresholdDefaults;
	const {
		years = [0, Infinity],
		months = [0, Infinity],
		weeks = [Infinity, 0],
		days = [0, Infinity],
		hours = [0, Infinity],
		minutes = [0, Infinity],
		seconds = [0, 10 * MINUTE_S]
	} = settings;
	const finalSettings = { years, months, weeks, days, hours, minutes, seconds };
	for (const element of timeElements)
		finalSettings[element] = thresholdToTuple(finalSettings[element]);
	return finalSettings as StringifyThresholdsFull;
};

const thresholdToTuple = (input: boolean | number | [number, number]): [number, number] => {
	if (input === false)
		return [Infinity, 0];
	if (input === true)
		return [0, Infinity];
	if (typeof input === "number")
		return [0, input];
	return input;
};

const processTimeUnitBooleans = (booleans: TimeUnitBooleans | boolean | undefined): TimeUnitBooleansFull => {
	if (booleans === undefined || booleans === false)
		return timeUnitBooleanDefaults;
	if (booleans === true)
		return {
			years: true,
			months: true,
			weeks: true,
			days: true,
			hours: true,
			minutes: true,
			seconds: true,
		};
	const output: TimeUnitBooleans = {};
	for (const element of timeElements)
		output[element] = booleans[element] ?? timeUnitBooleanDefaults[element];
	return output as TimeUnitBooleansFull;
};

const processStringSettings = (settings: StringSettings | undefined): StringSettingsFull => {
	if (settings === undefined)
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