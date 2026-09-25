package com.basira.spiritportal;

import android.app.Activity;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import androidx.annotation.NonNull;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.gms.ads.AdError;
import com.google.android.gms.ads.AdRequest;
import com.google.android.gms.ads.FullScreenContentCallback;
import com.google.android.gms.ads.LoadAdError;
import com.google.android.gms.ads.MobileAds;
import com.google.android.gms.ads.rewarded.RewardItem;
import com.google.android.gms.ads.rewarded.RewardedAd;
import com.google.android.gms.ads.rewarded.RewardedAdLoadCallback;
import com.google.android.ump.ConsentInformation;
import com.google.android.ump.ConsentRequestParameters;
import com.google.android.ump.UserMessagingPlatform;
import java.util.concurrent.atomic.AtomicBoolean;

@CapacitorPlugin(name = "BasiraRewardedAds")
public class BasiraRewardedAds extends Plugin {
    private static final String REWARDED_AD_UNIT_META = "com.basira.REWARDED_AD_UNIT_ID";
    private ConsentInformation consentInformation;
    private boolean adsInitialized = false;

    @PluginMethod
    public void initialize(PluginCall call) {
        Activity activity = getActivity();
        if (activity == null) {
            call.reject("Android activity is unavailable");
            return;
        }
        activity.runOnUiThread(() -> requestConsentAndInitialize(activity, call));
    }

    @PluginMethod
    public void showRewarded(PluginCall call) {
        Activity activity = getActivity();
        if (activity == null) {
            call.reject("Android activity is unavailable");
            return;
        }
        activity.runOnUiThread(() -> {
            if (consentInformation == null || !consentInformation.canRequestAds()) {
                call.reject("Ads are unavailable until privacy consent is resolved");
                return;
            }
            if (!adsInitialized) {
                MobileAds.initialize(getContext());
                adsInitialized = true;
            }

            String adUnitId = getRewardedAdUnitId();
            if (adUnitId == null || adUnitId.trim().isEmpty()) {
                call.reject("Rewarded AdMob unit ID is missing");
                return;
            }

            RewardedAd.load(
                activity,
                adUnitId,
                new AdRequest.Builder().build(),
                new RewardedAdLoadCallback() {
                    @Override
                    public void onAdLoaded(@NonNull RewardedAd rewardedAd) {
                        AtomicBoolean earned = new AtomicBoolean(false);
                        AtomicBoolean finished = new AtomicBoolean(false);
                        final int[] rewardAmount = {0};
                        final String[] rewardType = {""};

                        rewardedAd.setFullScreenContentCallback(new FullScreenContentCallback() {
                            @Override
                            public void onAdDismissedFullScreenContent() {
                                if (!finished.compareAndSet(false, true)) return;
                                if (!earned.get()) {
                                    call.reject("Rewarded ad was closed before the reward was earned");
                                    return;
                                }
                                JSObject result = new JSObject();
                                result.put("rewarded", true);
                                result.put("amount", rewardAmount[0]);
                                result.put("type", rewardType[0]);
                                call.resolve(result);
                            }

                            @Override
                            public void onAdFailedToShowFullScreenContent(@NonNull AdError adError) {
                                if (finished.compareAndSet(false, true)) {
                                    call.reject("Rewarded ad failed to show: " + adError.getMessage());
                                }
                            }
                        });

                        rewardedAd.show(activity, (RewardItem rewardItem) -> {
                            earned.set(true);
                            rewardAmount[0] = rewardItem.getAmount();
                            rewardType[0] = rewardItem.getType();
                        });
                    }

                    @Override
                    public void onAdFailedToLoad(@NonNull LoadAdError loadAdError) {
                        call.reject("Rewarded ad failed to load: " + loadAdError.getMessage());
                    }
                }
            );
        });
    }

    @PluginMethod
    public void privacyOptionsStatus(PluginCall call) {
        if (consentInformation == null) {
            consentInformation = UserMessagingPlatform.getConsentInformation(getContext());
        }
        JSObject result = new JSObject();
        result.put(
            "required",
            consentInformation.getPrivacyOptionsRequirementStatus()
                == ConsentInformation.PrivacyOptionsRequirementStatus.REQUIRED
        );
        call.resolve(result);
    }

    @PluginMethod
    public void showPrivacyOptions(PluginCall call) {
        Activity activity = getActivity();
        if (activity == null) {
            call.reject("Android activity is unavailable");
            return;
        }
        activity.runOnUiThread(() -> UserMessagingPlatform.showPrivacyOptionsForm(activity, formError -> {
            if (formError != null) {
                call.reject("Could not show privacy options: " + formError.getMessage());
                return;
            }
            call.resolve();
        }));
    }

    private void requestConsentAndInitialize(Activity activity, PluginCall call) {
        consentInformation = UserMessagingPlatform.getConsentInformation(getContext());
        ConsentRequestParameters params = new ConsentRequestParameters.Builder().build();

        consentInformation.requestConsentInfoUpdate(
            activity,
            params,
            () -> UserMessagingPlatform.loadAndShowConsentFormIfRequired(activity, formError -> {
                if (consentInformation.canRequestAds()) {
                    initializeAdsAndResolve(call);
                    return;
                }
                if (formError != null) {
                    call.reject("Privacy consent form failed: " + formError.getMessage());
                } else {
                    call.reject("Ads are unavailable because consent does not allow ad requests");
                }
            }),
            requestConsentError -> {
                // UMP can fail to refresh while a previously valid consent decision
                // still permits ad requests. In that case we may safely continue.
                if (consentInformation.canRequestAds()) {
                    initializeAdsAndResolve(call);
                } else {
                    call.reject("Privacy consent update failed: " + requestConsentError.getMessage());
                }
            }
        );
    }

    private void initializeAdsAndResolve(PluginCall call) {
        if (!adsInitialized) {
            MobileAds.initialize(getContext());
            adsInitialized = true;
        }
        JSObject result = new JSObject();
        result.put("ready", true);
        call.resolve(result);
    }

    private String getRewardedAdUnitId() {
        try {
            ApplicationInfo appInfo = getContext().getPackageManager().getApplicationInfo(
                getContext().getPackageName(),
                PackageManager.GET_META_DATA
            );
            if (appInfo.metaData == null) return null;
            return appInfo.metaData.getString(REWARDED_AD_UNIT_META);
        } catch (PackageManager.NameNotFoundException error) {
            return null;
        }
    }
}
