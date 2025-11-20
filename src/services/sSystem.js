import { mSystem } from "../models/mSystem.js";

let cachedTax = null;
let lastCacheTime = 0;
const CACHE_DURATION = 10 * 60 * 1000;

export const sSystem = {
    async getTaxPercentage() {
        const currentTime = Date.now();
        if (!cachedTax && (currentTime - lastCacheTime) > CACHE_DURATION) {
            const value = await mSystem.getTaxPercentage();
            cachedTax = value ? parseFloat(value) : 0.15;
            lastCacheTime = currentTime;
        }
        return cachedTax;
    }
};