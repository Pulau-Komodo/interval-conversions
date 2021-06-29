# interval-conversions

Parses user strings into ms intervals, and makes configurable user-friendly strings out of ms intervals.

It is faithful with regards to the variable durations of years and months. For example, starting from 2000-01-02 (February of a leap year), 1 month means 29 days, and -1 month means -31 days.

This is an ESM package. If your project is ESM as well, there will be no issues. But it cannot be used with CommonJS's `require()`. [This write-up](https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c) goes into some ways to deal with this, and some problems you might run into. Note that option 3 does not apply, since this package has always been ESM.

Since this package is so simple, I am open to regressing to CommonJS for compatibility, but I don't know how to do this while ensuring I don't break any existing usage.

## Parse interval
```ts
parseInterval(text: string, startDate?: Date): number | undefined
const milliseconds = parseInterval("5d"); // 432000000
```
Parses user input like "5y6mo" and "3.5 minutes" into ms intervals. It is fairly flexible, but still expects the user to follow its formatting rules. It makes no attempt at interpreting malformed strings. It will return undefined if it could not parse the text. 

The actual format is as follows:

`<number> years <number> months <number> weeks <number> days <number> hours <number> minutes <number> seconds`

Each unit is optional, but all present units need to be in order. All units are case insensitive. All spaces are optional. Numbers for years and months can't have decimals, but those for the other units can. The combination of units does not need to make sense, e.g. "1 week 20 days" will simply be 27 days, and ".5d12h" will simply be 1 day.

* `years` can also be written as `year` or `y`
* `months` can also be written as `month` or `mo`
* `weeks` can also be written as `week` or `w`
* `days` can also be written as `day` or `d`
* `hours` can also be written as `hour`, `hrs`, `hr` or `h`
* `minutes` can also be written as `minute`, `mins`, `min` or `m`
* `seconds` can also be written as `second`, `secs`, `sec` or `s`

A `-` can be inserted before any number to subtract all the units that follow it. Another `-` will make the following units additive again (as if subtracting from the previous subtraction). For example, "1d - 10m 30s" describes an interval 10.5 minutes short of a day. "1d - 10m -30s" describes an interval 9.5 minutes short of a day. Intervals can be negative as a whole, resulting in a negative number output.

Because years and months vary in their exact ms duration, a Date object can optionally be passed to be used as a starting point. If no Date object is provided, it will make one representing the now.

## Stringify interval
```ts
stringifyInterval(interval: number, options?: Date | StringifyOptions): string
const text = stringifyInterval(50000000000); // "578 days, 16 hours and 53 minutes"
const text2 = stringifyInterval(50000000000, new Date("1950")); // "1 year, 7 months, 1 day, 16 hours and 53 minutes"
```
Generates a user-friendly interval description from a ms interval. It is formatted like "1 day, 5 hours and 20 minutes". By default, if the total duration is under 10 minutes, it will say seconds too. The second argument can be either a `Date`, or a `StringifyOptions` object. The `StringifyOptions` object has an optional `startDate` property that is a `Date`. If a date is supplied by either means, it will by default say years and months, if appropriate, using the date as a starting point. Negative intervals will go backwards from the starting point, positive ones forwards. Without the date, it will not say months or years, no matter the interval or the options. A `NaN` will result in an empty string.

The full `StringifyOptions` with all values explicitly set to their defaults is as follows:
```ts
{
	startDate: undefined,
	thresholds: {
		years: [0, Infinity], // On
		months: [0, Infinity], // On
		weeks: [Infinity, 0], // Off
		days: [0, Infinity], // On
		hours: [0, Infinity], // On
		minutes: [0, Infinity], // On
		seconds: [0, 600] // On until number exceeds 600 seconds (10 minutes)
	},
	pad: {
		years: false,
		months: false,
		weeks: false,
		days: false,
		hours: false,
		minutes: false,
		seconds: false,
	},
	displayZero: {
		years: false,
		months: false,
		weeks: false,
		days: false,
		hours: false,
		minutes: false,
		seconds: false,
	},
	strings: {
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
	},
}
```
Each property is optional, and so is each property of of those properties. Below each property is explained.

### Avoiding re-processing options

Processing provided `StringifyOptions` is a relatively expensive operation. In general, the more types of options set, the longer it takes to process. Under some circumstances it can be more than half of the total time stringifying the interval. That is why there is a class `Stringifier`. To avoid unnecessary re-processing, `Stringifier` can be instantiated with a `StringifierOptions` object. `StringifierOptions` is just `StringifyOptions` minus `startDate`. The resulting object has a `stringify` method that optionally takes a `Date` as starting date. When sticking to the defaults, this should be unnecessary.

Note that here, a `NaN` interval will throw an error instead of returning an empty string.

```ts
for (let i = 0; i < 10; i++) { // Wasteful, processing options 10 times in a row
	const text = stringifyInterval(500000, {
		startDate: new Date(),
		pad: true,
		strings: { minutes: "mins", seconds: "secs" },
	}); // 08 mins and 20 secs
}
const stringifier = new IntervalStringifier({
	pad: true,
	strings: { minutes: "mins", seconds: "secs" },
});
for (let i = 0; i < 10; i++) { // Efficient, processing options only once, then using it 10 times
	const text = stringifier.stringify(500000, new Date()); // 08 mins and 20 secs
}
```

### Custom thresholds

The `thresholds` property is an object with optional time unit properties. Each property needs to be `[number, number]`, a number, a boolean, or left undefined. If it is `[number, number]`, the first number is the lower threshold (expressed in that unit) for the unit to appear, and the second number is the upper threshold beyond which it no longer appears. If it is a number, it will be treated as the upper threshold, with the lower threshold set to 0. If it is `true`, it will be treated like `[0, Infinity]`, and if it is `false`, it will be treated like `[Infinity, 0]` (technically there are countless ways to express an unreachable threshold, I picked this one). `Infinity` as a lower threshold makes a unit never appear, and as an upper threshold makes the threshold infinite.

Fractional parts of thresholds for years and months do nothing.

Even at a lower threshold of 0, a unit will by default not appear if there are zero of that unit. But if smaller units are disabled, the interval may be rounded up to have 1 of that unit.

Note that it is possible and easy to provide settings that don't produce a sensible result. For example, some ranges of inputs could end up without units at all (resulting in an empty string), or years could disappear and be converted to months when there are too many. It is up to whoever configures the thresholds to make sure they make sense.

#### Example: single unit

The following configuration will make it only ever output one unit. Weeks could also be enabled with `[0, 4]` with days set to `[0, 7]`. Note that due to the variability of months, it is not currently possible to make days go to 29 and 30, without also making it sometimes output something like "1 month and 1 day". Also note that the upper limit of months has to be 11, rather than 12, due to the different way rounding works for variable duration units (years and months).
```ts
const oneUnit: StringifyThresholds = {
	years: [0, Infinity],
	months: [0, 11],
	weeks: false,
	days: [0, 28],
	hours: [0, 24],
	minutes: [0, 60],
	seconds: [0, 60]
};
const text = stringifyInterval(interval, { thresholds: oneUnit });
```

### Padding with 0s and displaying even when 0

The `pad` property controls whether to pad unit values. Unit values will be padded with 0s at the start to ensure they are at least 2 characters, except for year values, where it will pad to at least 4 characters.

The `displayZero` property controls whether a unit shows up when it falls within the threshold, even when the value is 0.

Both of these can set to `true`, meaning all enabled, or `false` meaning all disabled (which is also the default). But they can also be passed an object with individual time units (like in `thresholds`) set to `true` or `false`.

#### Example: displaying 0 values
```ts
const text1 = stringifyInterval(parseInterval("10m"), { displayZero: true }); // "0 years, 0 months, 0 days, 0 hours, 10 minutes and 0 seconds"
const text2 = stringifyInterval(parseInterval("3d2h1s"), { displayZero: true }); // "0 years, 0 months, 3 days, 2 hours, 0 minutes" (seconds were still omitted for exceeding the default upper threshold)
```

#### Example: a digital clock-like display

The following will implement an hh:mm:ss display. The first one has hours go potentially infinitely high, the second one displays days separately. The latter gets a little hacky with the strings, but it works.
```ts
const stringifierCompact = new IntervalStringifier({
	thresholds: { years: false, months: false, weeks: false, days: false, seconds: true },
	strings: { hours: "", minutes: "", seconds: "", joiner: ":", finalJoiner: ":", spacer: "" },
	pad: true,
	displayZero: true,
});
const text1 = stringifierCompact.stringify(parseInterval("3d2h1s")); // "74:00:01"
const text2 = stringifierCompact.stringify(parseInterval("1m")); // "00:01:00"
const stringifierCompact2 = new IntervalStringifier({
	thresholds: { years: false, months: false, weeks: false, days: true, seconds: true },
	strings: { days: [" day ", " days "], hours: ":", minutes: ":", seconds: "", joiner: "", finalJoiner: "", spacer: "" },
	pad: { hours: true, minutes: true, seconds: true },
	displayZero: { hours: true, minutes: true, seconds: true },
});
const text3 = stringifierCompact2.stringify(parseInterval("3d2h1s")); // "3 days 02:00:01"
const text4 = stringifierCompact2.stringify(parseInterval("1d12h34m56s")); // "1 day 12:34:56"
const text5 = stringifierCompact2.stringify(parseInterval("1y", new Date("2020")), new Date("2020")); // "366 days 00:00:00"
const text6 = stringifierCompact2.stringify(parseInterval("1m")); // "00:01:00"
```

### Custom strings

The `strings` property allows overriding the strings used to construct the output, for localization or whatever other reason. The time unit properties can be passed strings instead of arrays, in which case it will use the same string for the singular and the plural.

#### Example: condensed output
```ts
const shortStrings = {
	years: "y", months: "mo", weeks: "w", days: "d", hours: "h", minutes: "m", seconds: "s",
	spacer: "", joiner: " ", finalJoiner: " "
};
const text = stringifyInterval(-500000000, { strings: shortStrings }); // "5d 18h 53m"
```

### Typescript types

`StringifyOptions`, `StringifierOptions`, `StringifyThresholds`, `TimeUnitBooleans` and `StringSettings` are types exported to help construct those options objects in Typescript in a type safe way. They are relevant when wanting to construct the objects before passing them to the function or constructor.

## Stringify interval with single unit output

```ts
stringifyIntervalShort(interval: number, atLeast?: boolean): string
const text = stringifyIntervalShort(50000000000); // "2 years"
const text2 = stringifyIntervalShort(50000000000, true); // "1 year"
console.log(`The interval is somewhere between ${text2} and ${text}.`); // "The interval is somewhere between 1 year and 2 years."
```
Generates a user-friendly rough description of a ms interval, with only a single unit mentioned. It will pick the largest unit that contains the interval at least once, and then the smallest number that contains the interval. It is meant to be used in descriptions like "That event is within 2 years" or "The ban will expire in under 20 hours". It will use minutes, hours, days, months and years, but months and years are estimates based on average duration. It will prefix the number with `~` when it's not sure.

With the second argument as true, it will instead pick the largest number contained by the interval, to be used like "That event is at least 1 year away" or "The ban will last for at least 19 hours more".