type Choice = { text: string; weight: number };

export interface ProcessPromptOptions {
    /**
     * Optional RNG for deterministic tests. Must return a float in [0, 1).
     * Defaults to Math.random.
     */
    rng?: () => number;

    /**
     * If true, throws on malformed weights (e.g. ":abc" or negative).
     * If false, treats malformed weights as default weight=1.
     * Defaults to true.
     */
    strictWeights?: boolean;
}

/**
 * Template syntax:
 *   - Groups: {optionA|optionB|optionC}
 *   - Optional weights: {cat:2|dog:1|mouse}
 *   - Single option with probability: {red:0.25} (25% chance of "red", 75% chance of empty string)
 *   - Multiple options with probabilities: {red:0.25|blue:0.25} (25% red, 25% blue, 50% empty)
 *
 * Example:
 *   Create {a|b:2|c:1} on a {chair|sidewalk}
 *   Create a {red:0.25} ball
 *   Create a {red:0.25|blue:0.25} ball
 */
export function processPromptTemplate(
    template: string,
    options: ProcessPromptOptions = {}
): string {
    const rng = options.rng ?? Math.random;
    const strictWeights = options.strictWeights ?? true;

    let result = template;

    // Find and replace all groups from left to right
    const groupRegex = /\{([^{}]+)\}/g;

    result = result.replace(groupRegex, (_, content) => {
        return evaluateGroup(content, rng, strictWeights);
    });

    return result;
}

/**
 * Evaluate the content inside a single "{...}" group.
 */
function evaluateGroup(
    content: string,
    rng: () => number,
    strictWeights: boolean
): string {
    const options = content.split("|")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

    if (options.length === 0) return "";

    const choices: Choice[] = options.map((option) =>
        parseWeightedOption(option, strictWeights)
    );

    const total = choices.reduce((sum, c) => sum + c.weight, 0);

    // If total weight <= 0 (e.g. all 0), fall back to uniform choice
    if (total <= 0) {
        const idx = Math.floor(rng() * choices.length);
        return choices[Math.min(idx, choices.length - 1)].text;
    }

    // If total weight < 1, there's a chance of returning empty string
    const r = rng();
    if (total < 1 && r >= total) {
        return "";
    }

    // Scale random value to total weight range
    const scaledR = r * total;

    // Select from weighted choices
    let accumulator = 0;
    for (const c of choices) {
        accumulator += c.weight;
        if (scaledR < accumulator) return c.text;
    }

    // Floating point safety net
    return choices[choices.length - 1].text;
}

/**
 * Parse an option that may have a trailing ":weight".
 */
function parseWeightedOption(option: string, strictWeights: boolean): Choice {
    const colonIndex = option.lastIndexOf(":");

    // No weight delimiter
    if (colonIndex === -1) {
        return { text: option.trim(), weight: 1 };
    }

    const textPart = option.slice(0, colonIndex).trim();
    const weightPart = option.slice(colonIndex + 1).trim();

    const weight = Number(weightPart);

    const valid = Number.isFinite(weight) && weight >= 0;

    if (!valid) {
        if (strictWeights) {
            throw new Error(`Invalid weight "${weightPart}" in option "${option}"`);
        }
        // Treat malformed weights as literal text (no weight)
        return { text: option.trim(), weight: 1 };
    }

    return { text: textPart, weight };
}


