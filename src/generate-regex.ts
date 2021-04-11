const timeSymbols = ["y(?:ears?)?", "mo(?:nths?)?", "w(?:eeks?)?", "d(?:ays?)?", "h(?:ours?)?", "m(?:in(?:ute)?s?)?", "s(?:ec(?:ond)?s?)?"];
const regexIntervalInner = timeSymbols.map(symbol => `(?:(?:(-) ?)?(\\d*\\.?\\d+) ?${symbol}\\s?)?`).join(``);
const regexDuration = new RegExp(`^${regexIntervalInner}$`, "i");

console.log(`/${regexDuration.source}/${regexDuration.flags}`);