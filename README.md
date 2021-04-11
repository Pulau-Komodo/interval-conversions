# interval-conversions

Interprets user strings into ms intervals, and makes user-friendly strings out of ms intervals.

## Parse interval
```js
const milliseconds = parseInterval(text, startDate);
```
Parses user input like "5y6mo" and "3.5 minutes" into ms intervals. It is fairly flexible, but still expects the user to follow its formatting rules. It makes no attempt at interpreting malformed strings. It will return undefined if it could not parse the text. 

The actual format is as follows:

`<number> years <number> months <number> weeks <number> days <number> hours <number> minutes <number> seconds`

Each unit is optional, but all present units need to be in order. All units are case insensitive. All spaces are optional. Numbers can have decimals. The combination of units does not need to make sense, e.g. `1 week 20 days` will simply be 27 days, and `.5d12h` will simply be 1 day.

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
```js
const text = stringifyInterval(interval);
```
Generates a user-friendly interval description from a ms interval. It is formatted like `1 day, 5 hours and 20 minutes`. If the total duration is under 10 minutes, it will say seconds too. It will not say months or years, no matter how many days there are.

```js
const text = stringifyIntervalShort(interval);
const text2 = stringifyIntervalShort(interval, true);
console.log(`The interval is somewhere between ${text} and ${text2}.`);
```
Generates a user-friendly rough description of a ms interval, with only a single unit mentioned. It will pick the largest unit that contains the interval at least once, and then the smallest number that contains the interval. It is meant to be used in descriptions like "That event is within 2 years" or "The ban will expire in under 20 hours". It will use minutes, hours, days, months and years, but months and years are estimates based on average duration. It will prefix the number with `~` when it's not sure.

With the second argument as true, it will instead pick the largest number contained by the interval, to be used like "That event is at least 1 year away" or "The ban will last for at least 19 hours more".