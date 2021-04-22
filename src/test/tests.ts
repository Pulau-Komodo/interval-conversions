/* eslint-disable @typescript-eslint/restrict-template-expressions */
import { stringifyInterval, stringifyIntervalShort, parseInterval } from "../index.js";

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
test(stringifyInterval, [500000], "8 minutes and 20 seconds");
test(stringifyInterval, [-5000000], "1 hour and 23 minutes");
test(stringifyInterval, [50000000], "13 hours and 53 minutes");
test(stringifyInterval, [-500000000], "5 days, 18 hours and 53 minutes");
test(stringifyInterval, [5000000000], "57 days, 20 hours and 53 minutes");
test(stringifyInterval, [-500000000, {
	thresholds: {
		years: [Infinity, 0],
		months: [Infinity, 0],
		weeks: [0, Infinity],
		days: [Infinity, 0],
		hours: [Infinity, 0],
		minutes: [Infinity, 0],
		seconds: [0, Infinity]
	}
}], "500000 seconds");
test(stringifyInterval, [5000000000, {
	thresholds: {
		years: [Infinity, 0],
		months: [Infinity, 0],
		weeks: [0, Infinity],
		days: [Infinity, 0],
		hours: [Infinity, 0],
		minutes: [0, Infinity],
		seconds: [0, Infinity]
	}
}], "8 weeks, 2693 minutes and 20 seconds");
test(stringifyInterval, [50000000000], "578 days, 16 hours and 53 minutes");
test(stringifyInterval, [-50000000000], "578 days, 16 hours and 53 minutes");
test(stringifyInterval, [50000000000, {
	thresholds: { days: false, hours: false, minutes: false, seconds: true },
	strings: { seconds: "secs" }
}], "50000000 secs"); // Only seconds, with custom string
test(stringifyInterval, [50000000000, new Date("1950")], "1 year, 7 months, 1 day, 16 hours and 53 minutes");
test(stringifyInterval, [-50000000000, new Date("1950")], "1 year, 6 months, 29 days, 16 hours and 53 minutes");
const yearsAndSeconds = {
	months: false,
	days: false,
	hours: false,
	minutes: false,
	seconds: true
};
test(stringifyInterval, [50000000000, { startDate: new Date("2020"), thresholds: yearsAndSeconds }], "1 year and 18377600 seconds"); // Weird year and seconds combination (over leap year)
test(stringifyInterval, [-50000000000, { startDate: new Date("2020"), thresholds: yearsAndSeconds }], "1 year and 18464000 seconds"); // Weird year and seconds combination but negative (over non-leap years)
const monthsOnly: Record<string, [number, number]> = {
	years: [Infinity, 0],
	months: [0, Infinity],
	days: [Infinity, 0],
	hours: [Infinity, 0],
	minutes: [Infinity, 0],
	seconds: [Infinity, 0,]
};
test(stringifyInterval, [50000000000, { startDate: new Date("2020"), thresholds: monthsOnly }], "19 months"); // Bunch of time with months only
test(stringifyInterval, [-50000000000, { startDate: new Date("2020"), thresholds: monthsOnly }], "19 months"); // Bunch of negative time with months only
test(stringifyInterval, [-50000000000, {
	startDate: new Date("2020"), thresholds: {
		years: [Infinity, 0],
		months: [Infinity, 0],
		weeks: [Infinity, 0],
		days: [Infinity, 0],
		hours: [Infinity, 0],
		minutes: [Infinity, 0],
		seconds: [Infinity, 0,]
	}
}], ""); // Bunch of time but nothing enabled
const yearsAndMonths = {
	years: true,
	months: true,
	weeks: false,
	days: false,
	hours: false,
	minutes: false,
	seconds: false
};
test(stringifyInterval, [1234567890123, { startDate: new Date("2000"), thresholds: yearsAndMonths }], "39 years and 1 month"); // Bunch of time with only years and months
test(stringifyInterval, [-1234567890123, { startDate: new Date("2000"), thresholds: yearsAndMonths }], "39 years and 1 month"); // Bunch of negative time with only years and months
test(stringifyInterval, [123, { startDate: new Date("2000"), thresholds: yearsAndMonths }], "0 months"); // Little time with only years and months
test(stringifyInterval, [-123, { startDate: new Date("2000"), thresholds: yearsAndMonths }], "0 months"); // Little negative time with only years and months
test(stringifyInterval, [2505600000, new Date("2020-01-15")], "29 days"); // 29 days into middle of February
test(stringifyInterval, [-2505600000, new Date("2020-01-15")], "29 days"); // -29 days into middle of December
test(stringifyInterval, [2505600000, new Date("2020-02-01")], "1 month"); // 29 days but it's start of leap year February
test(stringifyInterval, [-2505600000, new Date("2020-03-01")], "1 month"); // -29 days but it's right after leap year February
test(stringifyInterval, [2678399000, new Date("2021-01-01")], "1 month"); // 1 second short of 1 month, being rounded up
test(stringifyInterval, [parseInterval("1y 10min", new Date("1949-01-15 00:00:00")) ?? 0, new Date("1950-01-15 00:10:00")], "1 year and 10 minutes");
test(stringifyInterval, [parseInterval("-1y 10min 59s", new Date("1951-03-01 10:59")) ?? 0, new Date("1950-03-01 00:00:00")], "1 year and 11 minutes");
const shortStrings =  {
	years: "y", months: "mo", weeks: "w", days: "d", hours: "h", minutes: "m", seconds: "s",
	spacer: "", joiner: " ", finalJoiner: " "
};
test(stringifyInterval, [1234567890123, {
	startDate: new Date("2000"), strings: shortStrings
}], "39y 1mo 12d 23h 32m"); // String overrides
test(stringifyInterval, [NaN], "");
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

console.log(`${successCount} succeeded and ${failureCount} failed out of ${testCount}`);