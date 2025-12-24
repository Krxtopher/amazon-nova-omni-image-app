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
 *
 * Example:
 *   Create {a|b:2|c:1} on a {chair|sidewalk}
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

    console.log("Processing prompt template")

    let groupCount = 0
    result = result.replace(groupRegex, (_, content) => {
        groupCount += 1
        console.log("Found group: ", content)
        return evaluateGroup(content, rng, strictWeights);
    });

    console.log(`Found ${groupCount} groups`)

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

    // If total weight <= 0 (e.g. all 0), fall back to uniform choice
    const total = choices.reduce((sum, c) => sum + c.weight, 0);
    if (total <= 0) {
        const idx = Math.floor(rng() * choices.length);
        return choices[Math.min(idx, choices.length - 1)].text;
    }

    let r = rng() * total;
    for (const c of choices) {
        r -= c.weight;
        if (r < 0) return c.text;
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


