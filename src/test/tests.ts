/* eslint-disable @typescript-eslint/restrict-template-expressions */
import { stringifyInterval, stringifyIntervalShort, parseInterval } from "../index.js";
import { IntervalStringifier, StringifyThresholds } from "../stringifyInterval.js";

const stringifyInput = (element: unknown): string => {
	if (typeof element === "string") {
		return `"${element}"`;
	} else if (typeof element === "number") {
		return element.toString();
	} else if (Array.isArray(element)) {
		return `[${element.map(stringifyInput)}]`;
	} else if (typeof element === "object") {
		return "[some object]";
	} else {
		const string = `${element}`;
		if (string.length > 30) {
			return `${string.slice(0, 30)}…`;
		}
		return string;
	}
};

let successCount = 0;
let failureCount = 0;
let testCount = 0;

const test = <I extends ReadonlyArray<unknown>, O>(func: (...arg0: I) => O, input: I, expected: O | Error) => {
	testCount++;
	const inputText = input.map(stringifyInput);
	try {
		const result = func(...input);
		const resultText = typeof result === "string" ? `"${result}"` : `${result}`;
		if (result === expected) {
			successCount++;
			console.log(`✔\ufe0f ${func.name}(${inputText}) successfully returned ${resultText}`);
		} else {
			failureCount++;
			const expectedText =
				expected instanceof Error ? `throwing ${expected}` :
					typeof expected === "string" ? `"${expected}"` :
						`${expected}`;
			console.error(`❌ ${func.name}(${inputText}) returned ${resultText} instead of ${expectedText}`);
		}
	} catch (error) {
		if (
			expected instanceof Error && error instanceof Error
			&& expected.constructor === error.constructor
			&& expected.message === error.message
			&& expected.name === expected.name
		) {
			successCount++;
			console.log(`✔\ufe0f ${func.name}(${inputText}) successfully threw ${expected.name}`);
		} else {
			failureCount++;
			const expectedText =
				expected instanceof Error ? `throwing ${expected}` :
					typeof expected === "string" ? `returning "${expected}"` :
						`returning ${expected}`;
			console.error(`❌ ${func.name}(${inputText}) threw ${error} instead of instead of ${expectedText}`);
			console.error(error);
		}
	}
};

// Parser

test(parseInterval, [""], undefined);
test(parseInterval, ["5d"], 432000000);
test(parseInterval, ["100y -10s", new Date("1900")], 3155673590000);
test(parseInterval, ["5a"], undefined);
test(parseInterval, [".5s"], 500);
test(parseInterval, [" 1 YEAR 4 mo -4 h -30.5 min 100s ", new Date("1900")], 41891530000);
test(parseInterval, [" 3 y 1 months - 4 hour 15 mins -100s ", new Date("1950")], 97357600000);
test(parseInterval, ["1 week -8 days"], -86400000);
test(parseInterval, ["0.5 year -6 months", new Date("2000")], undefined);
test(parseInterval, ["2.9 months", new Date("2000")], undefined);
test(parseInterval, ["-2.9 months", new Date("2000")], undefined);
test(parseInterval, ["578 days 16 hours 53 minutes 20 seconds"], 50000000000);

// Stringifier

const date1950 = new Date("1950");
const date2000 = new Date("2000");
const date2020 = new Date("2020");

const stringifierDefault = new IntervalStringifier();
const stringifyDefault = stringifierDefault.stringify.bind(stringifierDefault);
test(stringifyInterval, [500000], "8 minutes and 20 seconds");
test(stringifyDefault, [500000], "8 minutes and 20 seconds");
test(stringifyInterval, [-5000000], "1 hour and 23 minutes");
test(stringifyDefault, [-5000000], "1 hour and 23 minutes");
test(stringifyInterval, [50000000], "13 hours and 53 minutes");
test(stringifyDefault, [50000000], "13 hours and 53 minutes");
test(stringifyInterval, [-500000000], "5 days, 18 hours and 53 minutes");
test(stringifyDefault, [-500000000], "5 days, 18 hours and 53 minutes");
test(stringifyInterval, [5000000000], "57 days, 20 hours and 53 minutes");
test(stringifyDefault, [5000000000], "57 days, 20 hours and 53 minutes");

const thresholdsWeeksAndSeconds: StringifyThresholds = {
	years: [Infinity, 0],
	months: [Infinity, 0],
	weeks: [0, Infinity],
	days: [Infinity, 0],
	hours: [Infinity, 0],
	minutes: [Infinity, 0],
	seconds: [0, Infinity]
};
const stringifierWeeksAndSeconds = new IntervalStringifier({ thresholds: thresholdsWeeksAndSeconds });
const stringifyWeeksAndSeconds = stringifierWeeksAndSeconds.stringify.bind(stringifierWeeksAndSeconds);
test(stringifyInterval, [-500000000, { thresholds: thresholdsWeeksAndSeconds }], "500000 seconds");
test(stringifyWeeksAndSeconds, [-500000000], "500000 seconds");

const thresholdsWeeksMinutesAndSeconds: StringifyThresholds = {
	years: [Infinity, 0],
	months: [Infinity, 0],
	weeks: [0, Infinity],
	days: [Infinity, 0],
	hours: [Infinity, 0],
	minutes: [0, Infinity],
	seconds: [0, Infinity]
};
const stringifierWeeksMinutesAndSeconds = new IntervalStringifier({ thresholds: thresholdsWeeksMinutesAndSeconds });
const stringifyWeeksMinutesAndSeconds = stringifierWeeksMinutesAndSeconds.stringify.bind(stringifierWeeksMinutesAndSeconds);
test(stringifyInterval, [5000000000, { thresholds: thresholdsWeeksMinutesAndSeconds }], "8 weeks, 2693 minutes and 20 seconds");
test(stringifyWeeksMinutesAndSeconds, [5000000000], "8 weeks, 2693 minutes and 20 seconds");

test(stringifyInterval, [50000000000], "578 days, 16 hours and 53 minutes");
test(stringifyInterval, [-50000000000], "578 days, 16 hours and 53 minutes");
test(stringifyInterval, [50000000000, {
	thresholds: { days: false, hours: false, minutes: false, seconds: true },
	strings: { seconds: "secs" }
}], "50000000 secs"); // Only seconds, with custom string
test(stringifyInterval, [50000000000, date1950], "1 year, 7 months, 1 day, 16 hours and 53 minutes");
test(stringifyInterval, [-50000000000, date1950], "1 year, 6 months, 29 days, 16 hours and 53 minutes");

const thesholdsYearsAndSeconds: StringifyThresholds = {
	months: false,
	days: false,
	hours: false,
	minutes: false,
	seconds: true
};
const stringifierYearsAndSeconds = new IntervalStringifier({ thresholds: thesholdsYearsAndSeconds });
const stringifyYearsAndSeconds = stringifierYearsAndSeconds.stringify.bind(stringifierYearsAndSeconds);
test(stringifyInterval, [50000000000, { startDate: date2020, thresholds: thesholdsYearsAndSeconds }], "1 year and 18377600 seconds"); // Weird year and seconds combination (over leap year)
test(stringifyYearsAndSeconds, [50000000000, date2020], "1 year and 18377600 seconds");
test(stringifyInterval, [-50000000000, { startDate: date2020, thresholds: thesholdsYearsAndSeconds }], "1 year and 18464000 seconds"); // Weird year and seconds combination but negative (over non-leap years)
test(stringifyYearsAndSeconds, [-50000000000, date2020], "1 year and 18464000 seconds");

const thresholdsMonthsOnly: StringifyThresholds = {
	years: [Infinity, 0],
	months: [0, Infinity],
	days: [Infinity, 0],
	hours: [Infinity, 0],
	minutes: [Infinity, 0],
	seconds: [Infinity, 0],
};
test(stringifyInterval, [50000000000, { startDate: date2020, thresholds: thresholdsMonthsOnly }], "19 months"); // Bunch of time with months only
test(stringifyInterval, [-50000000000, { startDate: date2020, thresholds: thresholdsMonthsOnly }], "19 months"); // Bunch of negative time with months only

const thresholdsNothing: StringifyThresholds = {
	years: [Infinity, 0],
	months: [Infinity, 0],
	weeks: [Infinity, 0],
	days: [Infinity, 0],
	hours: [Infinity, 0],
	minutes: [Infinity, 0],
	seconds: [Infinity, 0],
};
test(stringifyInterval, [-50000000000, { startDate: date2020, thresholds: thresholdsNothing }], ""); // Bunch of time but nothing enabled

const stringifierWithZeroes = new IntervalStringifier({	displayZero: true });
const stringifyWithZeroes = stringifierWithZeroes.stringify.bind(stringifierWithZeroes);
test(stringifyWithZeroes, [parseInterval("3d2h1s") ?? 0], "3 days, 2 hours and 0 minutes");
test(stringifyWithZeroes, [parseInterval("10m") ?? 0], "0 days, 0 hours, 10 minutes and 0 seconds");
test(stringifyWithZeroes, [parseInterval("15d", date2020) ?? 0, date2020], "0 years, 0 months, 15 days, 0 hours and 0 minutes");
test(stringifyWithZeroes, [parseInterval("1y15d", date2020) ?? 0, date2020], "1 year, 0 months, 15 days, 0 hours and 0 minutes");

const stringifierCompact = new IntervalStringifier({
	thresholds: {
		years: false,
		months: false,
		weeks: false,
		days: false,
		seconds: true,
	},
	strings: {
		hours: "",
		minutes: "",
		seconds: "",
		joiner: ":",
		finalJoiner: ":",
		spacer: "",
	},
	pad: true,
	displayZero: true,
});
const stringifyCompact = stringifierCompact.stringify.bind(stringifierCompact);
test(stringifyCompact, [parseInterval("3d2h1s") ?? 0], "74:00:01");
test(stringifyCompact, [parseInterval("1m") ?? 0], "00:01:00");
const stringifierCompact2 = new IntervalStringifier({
	thresholds: {
		years: false,
		months: false,
		weeks: false,
		days: true,
		seconds: true,
	},
	// If this looks hacky, it's because it is.
	strings: {
		days: [" day ", " days "],
		hours: ":",
		minutes: ":",
		seconds: "",
		joiner: "",
		finalJoiner: "",
		spacer: "",
	},
	pad: {
		hours: true,
		minutes: true,
		seconds: true,
	},
	displayZero: {
		hours: true,
		minutes: true,
		seconds: true,
	},
});
const stringifyCompact2 = stringifierCompact2.stringify.bind(stringifierCompact2);
test(stringifyCompact2, [parseInterval("3d2h1s") ?? 0], "3 days 02:00:01");
test(stringifyCompact2, [parseInterval("1d12h34m56s") ?? 0], "1 day 12:34:56");
test(stringifyCompact2, [parseInterval("1y", date2020) ?? 0, date2020], "366 days 00:00:00");
test(stringifyCompact2, [parseInterval("1m") ?? 0], "00:01:00");

const thresholdsYearsAndMonths = {
	years: true,
	months: true,
	weeks: false,
	days: false,
	hours: false,
	minutes: false,
	seconds: false
};
test(stringifyInterval, [1234567890123, { startDate: date2000, thresholds: thresholdsYearsAndMonths }], "39 years and 1 month"); // Bunch of time with only years and months
test(stringifyInterval, [-1234567890123, { startDate: date2000, thresholds: thresholdsYearsAndMonths }], "39 years and 1 month"); // Bunch of negative time with only years and months
test(stringifyInterval, [123, { startDate: date2000, thresholds: thresholdsYearsAndMonths }], "0 months"); // Little time with only years and months
test(stringifyInterval, [-123, { startDate: date2000, thresholds: thresholdsYearsAndMonths }], "0 months"); // Little negative time with only years and months
test(stringifyInterval, [2505600000, new Date("2020-01-15")], "29 days"); // 29 days into middle of February
test(stringifyInterval, [-2505600000, new Date("2020-01-15")], "29 days"); // -29 days into middle of December
test(stringifyInterval, [2505600000, new Date("2020-02-01")], "1 month"); // 29 days but it's start of leap year February
test(stringifyInterval, [-2505600000, new Date("2020-03-01")], "1 month"); // -29 days but it's right after leap year February
test(stringifyInterval, [2678399000, new Date("2021-01-01")], "1 month"); // 1 second short of 1 month, being rounded up
test(stringifyInterval, [parseInterval("1y 10min", new Date("1949-01-15 00:00:00")) ?? 0, new Date("1950-01-15 00:10:00")], "1 year and 10 minutes");
test(stringifyInterval, [parseInterval("-1y 10min 59s", new Date("1951-03-01 10:59")) ?? 0, new Date("1950-03-01 00:00:00")], "1 year and 11 minutes");
const shortStrings = {
	years: "y", months: "mo", weeks: "w", days: "d", hours: "h", minutes: "m", seconds: "s",
	spacer: "", joiner: " ", finalJoiner: " "
};
test(stringifyInterval, [1234567890123, {
	startDate: new Date("2000"), strings: shortStrings
}], "39y 1mo 12d 23h 32m"); // String overrides


test(stringifyInterval, [NaN], "");
test(stringifyDefault, [NaN], new RangeError("Cannot stringify NaN interval"));

// Short stringifier

test(stringifyIntervalShort, [500000], "9 minutes");
test(stringifyIntervalShort, [-5000000], "2 hours");
test(stringifyIntervalShort, [50000000], "14 hours");
test(stringifyIntervalShort, [-500000000], "6 days");
test(stringifyIntervalShort, [5000000000], "~2 months");
test(stringifyIntervalShort, [-50000000000], "2 years");
test(stringifyIntervalShort, [500000, true], "8 minutes");
test(stringifyIntervalShort, [-5000000, true], "1 hour");
test(stringifyIntervalShort, [50000000, true], "13 hours");
test(stringifyIntervalShort, [-500000000, true], "5 days");
test(stringifyIntervalShort, [5000000000, true], "~1 month");
test(stringifyIntervalShort, [-50000000000, true], "1 year");
test(stringifyIntervalShort, [NaN], "");

const symbol = failureCount == 0 ? "✔️" : "❌";
console.log(`${successCount} succeeded and ${failureCount} failed out of ${testCount} ${symbol}`);