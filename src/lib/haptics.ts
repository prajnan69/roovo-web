import { Haptics } from '@capacitor/haptics';

export const triggerHaptic = async (duration: number = 15) => {
  try {
    await Haptics.vibrate({ duration });
  } catch (e) {
    // Silently fail - haptics not available on this platform
  }
};

export const triggerErrorHaptic = async () => {
  try {
    for (let i = 0; i < 3; i++) {
      await Haptics.vibrate({ duration: 15 });
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  } catch (e) {
    // Silently fail
  }
};
