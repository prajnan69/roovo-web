// Witty success messages for listing import
export const IMPORT_SUCCESS_MESSAGES = [
    "Listing secured! It's giving luxury ✨",
    "Imported! This place is a whole vibe 💅",
    "Done! Your listing is looking fire 🔥",
    "Success! Main character energy activated 🌟",
    "Boom! Listing imported. No cap. 🧢",
    "Sheesh! That import was smooth 🧊",
    "Listing acquired! Time to secure the bag 💰",
    "Imported! This spot is going to pop off 🚀",
    "Done and dusted! It's giving host of the year 👑",
    "W! Listing is live and looking fresh 🍃"
];

// Witty failure messages
export const IMPORT_FAILURE_MESSAGES = [
    "Oof! The import took an L. Try again? 💀",
    "Big yikes! Something went wrong. 😬",
    "Bruh... the import failed. One more time? 🔄",
    "Glitch in the matrix! Let's retry that. 👾",
    "Not the vibe. Import failed. 🛑"
];

export const getRandomImportMessage = (type: 'success' | 'error'): string => {
    const messages = type === 'success' ? IMPORT_SUCCESS_MESSAGES : IMPORT_FAILURE_MESSAGES;
    return messages[Math.floor(Math.random() * messages.length)];
};
