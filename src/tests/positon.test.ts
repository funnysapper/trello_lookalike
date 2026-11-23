import { describe, it, expect } from "vitest";
import { calculatePosition } from "./position.ts";

describe('calculatePosition', () => {
    it('returns 1000 for an empty column', () => {
        expect(calculatePosition(null, null)).toBe(1000);
    });

    it('halves the first position when inserting at the top', () => {
        expect(calculatePosition(null, 2000)).toBe(1000);
    });

    it('adds 1000 when inserting at the bottom', () => {
        expect(calculatePosition(3000, null)).toBe(4000);
    });

    it('takes the midpoint between two cards', () => {
        expect(calculatePosition(1000, 2000)).toBe(1500);
    });

    it('floors the result so positions stay integers', () => {
        expect(calculatePosition(1000, 1001)).toBe(1000);
    });
});