// @ts-ignore
import * as nsfwjs from 'https://cdn.jsdelivr.net/npm/@nsfw-filter/nsfwjs@2.0.0/+esm';

let model: any = null;

// Preload the model so it's ready when the user snaps a photo
export const preloadSafetyModel = async () => {
    if (!model) {
        try {
            console.log("Loading Safety Model...");
            model = await nsfwjs.load();
            console.log("Safety Model loaded");
        } catch (e) {
            console.error("Failed to load NSFW model", e);
        }
    }
};

// Helper to convert base64 to Blob
const base64ToBlob = async (base64: string): Promise<Blob> => {
    const res = await fetch(base64);
    return await res.blob();
};

export const isImageSafe = async (base64Image: string): Promise<boolean> => {
    try {
        // 1. Convert Base64 to Blob for efficient byte reading
        const blob = await base64ToBlob(base64Image);

        // 2. Magic Byte Check (Real MIME type verification)
        const arr = new Uint8Array(await blob.slice(0, 4).arrayBuffer());
        const header = Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
        
        // Acceptable signatures:
        // ffd8ffe0, ffd8ffee, ffd8ffdb (JPEG variations)
        // 89504e47 (PNG)
        // RetroCamera outputs JPEG, so we strictly look for 'ffd8' start or png signature
        const isJpeg = header.startsWith('ffd8');
        const isPng = header === '89504e47';

        if (!isJpeg && !isPng) {
            console.warn(`Safety Check Failed: Invalid file signature (${header})`);
            return false;
        }

        // 3. NSFW Content Check
        if (!model) {
            await preloadSafetyModel();
        }

        if (model) {
            const img = new Image();
            img.src = base64Image;
            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
            });

            const predictions = await model.classify(img);
            // Check for Porn or Hentai with high confidence (> 70%)
            const nsfwScore = predictions.find((p: any) => 
                (p.className === 'Porn' || p.className === 'Hentai') && p.probability > 0.7
            );

            if (nsfwScore) {
                console.warn(`Safety Check Failed: Inappropriate content detected (${nsfwScore.className}: ${(nsfwScore.probability * 100).toFixed(1)}%)`);
                return false;
            }
        }

        return true;
    } catch (error) {
        console.error("Safety check encountered an error:", error);
        // Fail-safe: If check crashes, prevent upload to be safe, 
        // OR return true to allow if you prefer usability over strictness.
        // Returning false is safer for a public app.
        return false;
    }
};

// Start loading immediately
preloadSafetyModel();
