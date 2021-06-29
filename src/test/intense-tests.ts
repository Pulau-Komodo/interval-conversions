import { stringifyInterval, StringifyOptions, StringifyThresholds, StringSettings } from "../stringifyInterval.js";

/*const oneUnit: StringifyThresholds = {
	years: [0, Infinity],
	months: [0, 11],
	weeks: false,
	days: [0, 28],
	hours: [0, 24],
	minutes: [0, 60],
	seconds: [0, 60]
};
const stepSize = -1000;


let lastOutcome = "";
let i = 0;
while (true) {
	const outcome = stringifyInterval(i, { startDate: new Date("2000"), thresholds: oneUnit });
	if (outcome !== lastOutcome) {
		console.log(`${outcome} from ${i}ms`);
		if (outcome.includes("2 years")) break;
		lastOutcome = outcome;
	}
	i += stepSize;
}*/

const possiblyExpensiveSettings: StringifyOptions = {
	startDate: new Date("2000"),
	thresholds: {
		years: false,
		months: false,
		weeks: false,
		days: true,
		seconds: true,
	},
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
};
const stepSize = -1000;

let lastOutcome = "";
let i = 0;
while (true) {
	const outcome = stringifyInterval(i, possiblyExpensiveSettings);
	if (outcome.slice(0, -8) !== lastOutcome.slice(0, -8)) {
		console.log(`${outcome} from ${i}ms`);
		if (outcome.startsWith("365 days")) break;
		lastOutcome = outcome;
	}
	i += stepSize;
}