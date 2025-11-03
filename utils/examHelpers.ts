// Seeded random shuffle for consistent question ordering
export const shuffleArrayWithSeed = (array: any[], seed: number) => {
    const seededRandom = (seed: number) => {
        const x = Math.sin(seed) * 10000;
        return x - Math.floor(x);
    };

    const shuffled = [...array];
    let currentSeed = seed;

    for (let i = shuffled.length - 1; i > 0; i--) {
        currentSeed = (currentSeed * 9301 + 49297) % 233280;
        const j = Math.floor(seededRandom(currentSeed) * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    return shuffled;
};

// SWR fetcher function
export const fetcher = (url: string) => fetch(url).then(res => res.json());

// Declare global window screen info interface
declare global {
    interface Window {
        initialScreenInfo?: {
            width: number;
            height: number;
            availWidth: number;
            availHeight: number;
        };
    }
}