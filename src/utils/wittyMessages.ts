// Witty toast messages for when a host tries to reserve their own property

export const HOST_SELF_RESERVATION_MESSAGES = [
    "😂 Nice try! You already own this place, remember?",
    "🤔 Trying to pay yourself? That's not how it works!",
    "🏠 Plot twist: You're already the host here!",
    "💡 Pro tip: You don't need to book your own property!",
    "🎭 Identity crisis? You can't be both host AND guest!",
    "🤷‍♂️ Booking your own place? That's like buying your own house... wait.",
    "😅 Awkward! You'd be paying yourself. Tax nightmare!",
    "🔄 Infinite loop detected: Host booking host's property!",
    "🎪 This isn't a magic trick - you can't reserve from yourself!",
    "🤓 Error 404: Logic not found. You're the host!",
    "🎯 Close, but you're aiming at the wrong target - this is YOUR listing!",
    "🌟 You're so good at hosting, you want to be your own guest?",
    "🎨 Creative thinking, but you can't Airbnb yourself!",
    "🚀 Houston, we have a problem: Host trying to book own property!",
    "🎵 You can check out any time you like... because you already live here!",
    "🧠 Big brain move: Trying to create passive income from yourself?",
    "🎪 The circus called - they want their clown back! (You own this!)",
    "🔮 Fortune teller says: You're already the owner of this property!",
    "🎬 Director's cut: In this scene, you realize you're the host!",
    "🍕 You can't order pizza from your own kitchen, and you can't book your own place!"
];

/**
 * Returns a random witty message for when a host tries to reserve their own property
 */
export const getRandomHostSelfReservationMessage = (): string => {
    const randomIndex = Math.floor(Math.random() * HOST_SELF_RESERVATION_MESSAGES.length);
    return HOST_SELF_RESERVATION_MESSAGES[randomIndex];
};
