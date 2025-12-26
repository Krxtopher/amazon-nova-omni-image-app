/**
 * Exponential rise curve mapped to an arbitrary range,
 * with ergonomic defaults.
 *
 * Defaults:
 * - k = 4
 * - input range = [0, 1]
 * - output range = [0, 1]
 */

export function expRiseMapped(
    x: number,
    k: number = 4,
    inMin: number = 0,
    inMax: number = 1,
    outMin: number = 0,
    outMax: number = 1
): number {
    if (k <= 0) {
        throw new Error("k must be > 0");
    }
    if (inMax === inMin) {
        throw new Error("inMax must not equal inMin");
    }

    // Normalize input to [0, 1]
    const t = (x - inMin) / (inMax - inMin);

    // Clamp to [0, 1]
    const clampedT = Math.min(Math.max(t, 0), 1);

    // Exponential rise in [0, 1]
    const y01 = 1 - Math.exp(-k * clampedT);

    // Map to output range
    return outMin + (outMax - outMin) * y01;
}
