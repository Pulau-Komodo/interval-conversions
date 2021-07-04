const timeSymbols = ["y(?:ears?)?", "mo(?:nths?)?"];
const fractionalTimeSymbols = ["w(?:eeks?)?", "d(?:ays?)?", "h(?:(?:ou)?rs?)?", "m(?:in(?:ute)?s?)?", "s(?:ec(?:ond)?s?)?"];
const minus = "(?:(-) ?)?";
const digit = "(\\d+)";
const fractionalDigit = "(\\d+(?:\\.\\d+)?|\\.\\d+)";
const regexIntervalInner = 
timeSymbols.map(symbol => `(?:${minus}${digit} ?${symbol}\\s?)?`).join(``) +
fractionalTimeSymbols.map(symbol => `(?:${minus}${fractionalDigit} ?${symbol}\\s?)?`).join(``);
const regexDuration = new RegExp(`^${regexIntervalInner}$`, "i");

console.log(`/${regexDuration.source}/${regexDuration.flags}`);