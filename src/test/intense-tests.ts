import { stringifyInterval, StringifyThresholds } from "../stringifyInterval";

const oneUnit: StringifyThresholds = {
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
while (!lastOutcome.includes("2 years")) {
	const outcome = stringifyInterval(i, { startDate: new Date("2000"), thresholds: oneUnit });
	if (outcome !== lastOutcome) {
		console.log(`${outcome} from ${i}ms`);
		lastOutcome = outcome;
	}
	i += stepSize;
}