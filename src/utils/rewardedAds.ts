import { Capacitor, registerPlugin } from '@capacitor/core';

interface RewardedResult {
    rewarded: boolean;
    amount?: number;
    type?: string;
}

interface BasiraRewardedAdsPlugin {
    initialize(): Promise<{ ready: boolean }>;
    showRewarded(): Promise<RewardedResult>;
    privacyOptionsStatus(): Promise<{ required: boolean }>;
    showPrivacyOptions(): Promise<void>;
}

const nativeAds = registerPlugin<BasiraRewardedAdsPlugin>('BasiraRewardedAds');
let initialization: Promise<{ ready: boolean }> | null = null;

export function isRewardedAdsSupported(): boolean {
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
}

export async function initializeRewardedAds(): Promise<void> {
    if (!isRewardedAdsSupported()) return;
    initialization ||= nativeAds.initialize();
    const result = await initialization;
    if (!result.ready) throw new Error('Rewarded ads are not ready');
}

export async function showBasiraRewardedAd(): Promise<RewardedResult> {
    if (!isRewardedAdsSupported()) {
        throw new Error('Rewarded ads are available in the Android app only');
    }
    await initializeRewardedAds();
    const result = await nativeAds.showRewarded();
    if (!result.rewarded) throw new Error('Reward was not earned');
    return result;
}

export async function isPrivacyOptionsRequired(): Promise<boolean> {
    if (!isRewardedAdsSupported()) return false;
    await initializeRewardedAds();
    return (await nativeAds.privacyOptionsStatus()).required;
}

export async function showAdPrivacyOptions(): Promise<void> {
    if (!isRewardedAdsSupported()) return;
    await initializeRewardedAds();
    await nativeAds.showPrivacyOptions();
}
