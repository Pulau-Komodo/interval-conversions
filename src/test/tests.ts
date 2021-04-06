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
}

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
				`${expected}`
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

test(parseInterval, ["5d"], 432000000);
test(parseInterval, ["100y -10s", new Date("1900")], 3155673590000);
test(parseInterval, ["5a"], undefined);
test(parseInterval, [".5s"], 500);
test(parseInterval, [" 1 YEAR 4 mo -4 h -30.5 min 100s ", new Date("1900")], 41891530000);
test(stringifyInterval, [500000], "8 minutes and 20 seconds");
test(stringifyInterval, [-5000000], "1 hour and 23 minutes");
test(stringifyInterval, [50000000], "13 hours and 53 minutes");
test(stringifyInterval, [-500000000], "5 days, 18 hours and 53 minutes");
test(stringifyInterval, [5000000000], "57 days, 20 hours and 53 minutes");
test(stringifyInterval, [-50000000000], "578 days, 16 hours and 53 minutes");
test(stringifyIntervalShort, [500000], "9 minutes")
test(stringifyIntervalShort, [-5000000], "2 hours");
test(stringifyIntervalShort, [50000000], "14 hours")
test(stringifyIntervalShort, [-500000000], "6 days");
test(stringifyIntervalShort, [5000000000], "~2 months")
test(stringifyIntervalShort, [-50000000000], "2 years");
test(stringifyIntervalShort, [500000, true], "8 minutes")
test(stringifyIntervalShort, [-5000000, true], "1 hour");
test(stringifyIntervalShort, [50000000, true], "13 hours")
test(stringifyIntervalShort, [-500000000, true], "5 days");
test(stringifyIntervalShort, [5000000000, true], "~1 month")
test(stringifyIntervalShort, [-50000000000, true], "1 year");

console.log(`${successCount} succeeded and ${failureCount} failed out of ${testCount}`);