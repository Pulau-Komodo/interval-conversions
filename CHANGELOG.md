## 1.1.0

- `stringifyInterval` can now be passed a `Date` object as the second argument, to get months and years in the output. The date will be used as a starting point, and negative or positive input matters.
- `stringifyInterval` no longer allows fractional digits in years or months. These already weren't working, but it quietly truncated them.
- `NaN` passed to `stringifyInterval` or `stringifyIntervalShort` will return an empty string. In a future version this will probably throw an error instead.


## 1.0.2

- A space between `-` and the following number is now allowed.