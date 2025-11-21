import { Haptics, ImpactStyle } from '@capacitor/haptics';

export const triggerHaptic = async (duration: number = 15) => {
  await Haptics.vibrate({ duration });
};

export const triggerErrorHaptic = async () => {
  for (let i = 0; i < 3; i++) {
    await Haptics.vibrate({ duration: 15 });
    await new Promise(resolve => setTimeout(resolve, 50));
  }
};
