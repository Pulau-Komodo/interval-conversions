## 1.3.3

- Added "hrs" and "hr" as ways to specify the hours.

## 1.3.2

- Fixed an error in types that was causing some string options to incorrectly not be optional.
- Optimized a bit.

## 1.3.1

- Now exporting types `StringifyOptions`, `StringifyThresholds` and `StringSettings`, for help constructing named options objects in Typescript in a type safe way.

## 1.3.0

- `stringifyInterval`'s `stringifyOptions` can now have a `strings` property, allowing string overrides.

## 1.2.0

- `stringifyInterval` can now be passed a `stringifyOptions` object as the second argument. This can have a `startDate` property, which behaves the same as passing a `Date` object, and a `thresholds` property, which is an object with properties, all optional, to set the lower and upper thresholds between which each unit should be used.
- Fixed some rounding logic in `stringifyInterval` that could lead to things like `1 month and 31 days`.

## 1.1.0

- `stringifyInterval` can now be passed a `Date` object as the second argument, to get months and years in the output. The date will be used as a starting point, and negative or positive input matters.
- `stringifyInterval` no longer allows fractional digits in years or months. These already weren't working, but it quietly truncated them.
- `NaN` passed to `stringifyInterval` or `stringifyIntervalShort` will return an empty string. In a future version this will probably throw an error instead.


## 1.0.2

- A space between `-` and the following number is now allowed.