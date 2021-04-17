# interval-conversions

Interprets user strings into ms intervals, and makes user-friendly strings out of ms intervals.

## Parse interval
```ts
parseInterval(text: string, startDate?: Date): number | undefined
const milliseconds = parseInterval("5d"); // 432000000
```
Parses user input like "5y6mo" and "3.5 minutes" into ms intervals. It is fairly flexible, but still expects the user to follow its formatting rules. It makes no attempt at interpreting malformed strings. It will return undefined if it could not parse the text. 

The actual format is as follows:

`<number> years <number> months <number> weeks <number> days <number> hours <number> minutes <number> seconds`

Each unit is optional, but all present units need to be in order. All units are case insensitive. All spaces are optional. Numbers for years and months can't have decimals, but those for the other units can. The combination of units does not need to make sense, e.g. `1 week 20 days` will simply be 27 days, and `.5d12h` will simply be 1 day.

* `years` can also be written as `year` or `y`
* `months` can also be written as `month` or `mo`
* `weeks` can also be written as `week` or `w`
* `days` can also be written as `day` or `d`
* `hours` can also be written as `hour` or `h`
* `minutes` can also be written as `minute`, `mins`, `min` or `m`
* `seconds` can also be written as `second`, `secs`, `sec` or `s`

A `-` can be inserted before any number to subtract all the units that follow it. Another `-` will make the following units additive again (as if subtracting from the previous subtraction). For example, `1d - 10m 30s` describes an interval 10.5 minutes short of a day. `1d - 10m -30s` describes an interval 9.5 minutes short of a day.

Because years and months vary in their exact ms duration, a Date object can optionally be passed to be used as a starting point. If no Date object is provided, it will make one representing the now.

## Stringify interval
```ts
stringifyInterval(interval: number, options?: Date | StringifyOptions): string
const text = stringifyInterval(50000000000); // "578 days, 16 hours and 53 minutes"
const text2 = stringifyInterval(50000000000, new Date("1950")); // "1 year, 7 months, 1 day, 16 hours and 53 minutes"
```
Generates a user-friendly interval description from a ms interval. It is formatted like `1 day, 5 hours and 20 minutes`. If the total duration is under 10 minutes, it will say seconds too. The second argument can be either a `Date`, or an `options` object. The `options` object has an optional `startDate` property that is a `Date`. If a date is supplied by either means, it will by default say years and months, if appropriate, using the date as a starting point. Negative intervals will go backwards from the starting point, positive ones forwards. Without the date, it will not say months or years, no matter the interval or the options.

The `options` can also have a property `thresholds`. `thresholds` is an object with optional properties `years`, `months`, `weeks`, `days`, `hours`, `minutes` and `seconds`. Each property, when it exists, needs to be `[number, number]` or a boolean. If it is `[number, number]`, the first number is the lower threshold (expressed in that unit) for the unit to appear, and the second number is the upper threshold beyond which it no longer appears. If it is `true`, it will be treated like `[0, Infinity]`, and if it is `false`, it will be treated like `[Infinity, 0]` (although technically the upper threshold does not matter when the lower is `Infinity`). `Infinity` as a lower threshold makes a unit never appear, and as an upper threshold makes the threshold infinite.

Fractional parts of thresholds for years and months do nothing.

Even at a lower threshold of 0, a unit will not appear if there are zero of that unit. But if smaller units are disabled, the interval may be rounded up to have 1 of that unit.

Note that it is possible and easy to provide settings that don't produce a sensible result. For example, some ranges of inputs could end up without units at all (resulting in an empty string), or years could disappear and be converted to months when there are too many. It is up to whoever configures the thresholds to make sure they make sense.

These are the default thresholds:
```ts
{
	years: [Infinity, 0], // Off, or [0, Infinity] (on) if a date is provided
	months: [Infinity, 0], // Off, or [0, Infinity] (on) if a date is provided
	weeks: [Infinity, 0], // Off
	days: [0, Infinity], // On
	hours: [0, Infinity], // On
	minutes: [0, Infinity], // On
	seconds: [0, 600] // On until number exceeds 600 seconds (10 minutes)
};
```

`stringifyOptions` has another optional property, `strings`. This property allows overriding the strings used to construct the output, for localization or whatever other reason. The time unit properties can be passed strings instead of arrays, in which case it will use the same string for the singular and the plural.

These are the default strings:
```ts
{
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
```

## Stringify interval with single unit output

```ts
stringifyIntervalShort(interval: number, atLeast?: boolean): string
const text = stringifyIntervalShort(50000000000); // "2 years"
const text2 = stringifyIntervalShort(50000000000, true); // "1 year"
console.log(`The interval is somewhere between ${text2} and ${text}.`); // "The interval is somewhere between 1 year and 2 years."
```
Generates a user-friendly rough description of a ms interval, with only a single unit mentioned. It will pick the largest unit that contains the interval at least once, and then the smallest number that contains the interval. It is meant to be used in descriptions like "That event is within 2 years" or "The ban will expire in under 20 hours". It will use minutes, hours, days, months and years, but months and years are estimates based on average duration. It will prefix the number with `~` when it's not sure.

With the second argument as true, it will instead pick the largest number contained by the interval, to be used like "That event is at least 1 year away" or "The ban will last for at least 19 hours more".