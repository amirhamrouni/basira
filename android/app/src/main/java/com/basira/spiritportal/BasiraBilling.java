package com.basira.spiritportal;

import android.app.Activity;
import androidx.annotation.NonNull;
import com.android.billingclient.api.BillingClient;
import com.android.billingclient.api.BillingClientStateListener;
import com.android.billingclient.api.BillingFlowParams;
import com.android.billingclient.api.BillingResult;
import com.android.billingclient.api.PendingPurchasesParams;
import com.android.billingclient.api.ProductDetails;
import com.android.billingclient.api.Purchase;
import com.android.billingclient.api.PurchasesUpdatedListener;
import com.android.billingclient.api.QueryProductDetailsParams;
import com.android.billingclient.api.QueryPurchasesParams;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@CapacitorPlugin(name = "BasiraBilling")
public class BasiraBilling extends Plugin implements PurchasesUpdatedListener {
    private BillingClient billingClient;
    private final Map<String, ProductDetails> productCache = new HashMap<>();
    private PluginCall pendingPurchaseCall;
    private String pendingProductId;

    private interface ProductCallback {
        void complete(ProductDetails productDetails, String error);
    }

    @PluginMethod
    public void connect(PluginCall call) {
        withConnected(call, () -> {
            JSObject result = new JSObject();
            result.put("ready", true);
            call.resolve(result);
        });
    }

    @PluginMethod
    public void querySubscription(PluginCall call) {
        String productId = clean(call.getString("productId"));
        if (productId == null) {
            call.reject("productId is required");
            return;
        }
        withConnected(call, () -> loadProduct(productId, (details, error) -> {
            if (error != null) {
                call.reject(error);
                return;
            }
            call.resolve(serializeProduct(details));
        }));
    }

    @PluginMethod
    public void purchaseSubscription(PluginCall call) {
        String productId = clean(call.getString("productId"));
        String offerToken = clean(call.getString("offerToken"));
        if (productId == null || offerToken == null) {
            call.reject("productId and offerToken are required");
            return;
        }
        Activity activity = getActivity();
        if (activity == null) {
            call.reject("Android activity is unavailable");
            return;
        }
        synchronized (this) {
            if (pendingPurchaseCall != null) {
                call.reject("Another billing flow is already active");
                return;
            }
        }

        withConnected(call, () -> loadProduct(productId, (details, error) -> {
            if (error != null) {
                call.reject(error);
                return;
            }
            if (!containsOffer(details, offerToken)) {
                call.reject("Selected subscription offer is no longer available");
                return;
            }

            BillingFlowParams.ProductDetailsParams productParams =
                BillingFlowParams.ProductDetailsParams.newBuilder()
                    .setProductDetails(details)
                    .setOfferToken(offerToken)
                    .build();
            BillingFlowParams.Builder flowBuilder = BillingFlowParams.newBuilder()
                .setProductDetailsParamsList(Collections.singletonList(productParams));

            String obfuscatedAccountId = clean(call.getString("obfuscatedAccountId"));
            if (obfuscatedAccountId != null) {
                if (obfuscatedAccountId.length() > 64) {
                    call.reject("obfuscatedAccountId must be 64 characters or fewer");
                    return;
                }
                flowBuilder.setObfuscatedAccountId(obfuscatedAccountId);
            }

            synchronized (this) {
                pendingPurchaseCall = call;
                pendingProductId = productId;
            }
            BillingResult launchResult = billingClient.launchBillingFlow(activity, flowBuilder.build());
            if (launchResult.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                clearPendingPurchase();
                call.reject(billingMessage("Could not launch billing flow", launchResult));
            }
        }));
    }

    @PluginMethod
    public void restoreSubscriptions(PluginCall call) {
        withConnected(call, () -> {
            QueryPurchasesParams params = QueryPurchasesParams.newBuilder()
                .setProductType(BillingClient.ProductType.SUBS)
                .build();
            billingClient.queryPurchasesAsync(params, (billingResult, purchases) -> {
                if (billingResult.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                    call.reject(billingMessage("Could not restore subscriptions", billingResult));
                    return;
                }
                JSObject result = new JSObject();
                JSArray items = new JSArray();
                for (Purchase purchase : purchases) items.put(serializePurchase(purchase));
                result.put("purchases", items);
                call.resolve(result);
            });
        });
    }

    @Override
    public void onPurchasesUpdated(@NonNull BillingResult billingResult, List<Purchase> purchases) {
        PluginCall call;
        String expectedProduct;
        synchronized (this) {
            call = pendingPurchaseCall;
            expectedProduct = pendingProductId;
        }
        if (call == null) return;

        if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.USER_CANCELED) {
            clearPendingPurchase();
            JSObject result = new JSObject();
            result.put("status", "cancelled");
            call.resolve(result);
            return;
        }

        if (billingResult.getResponseCode() != BillingClient.BillingResponseCode.OK || purchases == null) {
            clearPendingPurchase();
            call.reject(billingMessage("Google Play purchase failed", billingResult));
            return;
        }

        Purchase match = null;
        for (Purchase purchase : purchases) {
            if (expectedProduct == null || purchase.getProducts().contains(expectedProduct)) {
                match = purchase;
                break;
            }
        }
        if (match == null) {
            clearPendingPurchase();
            call.reject("Google Play returned a purchase for a different product");
            return;
        }

        JSObject result = serializePurchase(match);
        if (match.getPurchaseState() == Purchase.PurchaseState.PURCHASED) {
            result.put("status", "purchased");
        } else if (match.getPurchaseState() == Purchase.PurchaseState.PENDING) {
            result.put("status", "pending");
        } else {
            result.put("status", "unspecified");
        }
        clearPendingPurchase();
        call.resolve(result);
    }

    private void withConnected(PluginCall call, Runnable action) {
        Activity activity = getActivity();
        if (activity == null) {
            call.reject("Android activity is unavailable");
            return;
        }
        activity.runOnUiThread(() -> {
            if (billingClient != null && billingClient.isReady()) {
                action.run();
                return;
            }
            if (billingClient == null) {
                PendingPurchasesParams pendingParams = PendingPurchasesParams.newBuilder()
                    .enableOneTimeProducts()
                    .enablePrepaidPlans()
                    .build();
                billingClient = BillingClient.newBuilder(getContext())
                    .setListener(this)
                    .enablePendingPurchases(pendingParams)
                    .build();
            }
            billingClient.startConnection(new BillingClientStateListener() {
                @Override
                public void onBillingSetupFinished(@NonNull BillingResult billingResult) {
                    if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK) {
                        action.run();
                    } else {
                        call.reject(billingMessage("Google Play Billing is unavailable", billingResult));
                    }
                }

                @Override
                public void onBillingServiceDisconnected() {
                    // A later call reconnects. Do not grant or change entitlement here.
                }
            });
        });
    }

    private void loadProduct(String productId, ProductCallback callback) {
        ProductDetails cached = productCache.get(productId);
        if (cached != null) {
            callback.complete(cached, null);
            return;
        }
        QueryProductDetailsParams.Product product = QueryProductDetailsParams.Product.newBuilder()
            .setProductId(productId)
            .setProductType(BillingClient.ProductType.SUBS)
            .build();
        QueryProductDetailsParams params = QueryProductDetailsParams.newBuilder()
            .setProductList(Collections.singletonList(product))
            .build();
        billingClient.queryProductDetailsAsync(params, (billingResult, queryResult) -> {
            if (billingResult.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                callback.complete(null, billingMessage("Could not load subscription", billingResult));
                return;
            }
            List<ProductDetails> detailsList = queryResult.getProductDetailsList();
            if (detailsList == null || detailsList.isEmpty()) {
                callback.complete(null, "Subscription product was not returned by Google Play");
                return;
            }
            ProductDetails details = detailsList.get(0);
            productCache.put(productId, details);
            callback.complete(details, null);
        });
    }

    private JSObject serializeProduct(ProductDetails details) {
        JSObject result = new JSObject();
        result.put("productId", details.getProductId());
        result.put("title", details.getTitle());
        result.put("description", details.getDescription());
        JSArray offers = new JSArray();
        List<ProductDetails.SubscriptionOfferDetails> offerDetails = details.getSubscriptionOfferDetails();
        if (offerDetails != null) {
            for (ProductDetails.SubscriptionOfferDetails offer : offerDetails) {
                JSObject item = new JSObject();
                item.put("basePlanId", offer.getBasePlanId());
                if (offer.getOfferId() != null) item.put("offerId", offer.getOfferId());
                item.put("offerToken", offer.getOfferToken());
                JSArray tags = new JSArray();
                for (String tag : offer.getOfferTags()) tags.put(tag);
                item.put("offerTags", tags);

                JSArray phases = new JSArray();
                for (ProductDetails.PricingPhase phase : offer.getPricingPhases().getPricingPhaseList()) {
                    JSObject p = new JSObject();
                    p.put("formattedPrice", phase.getFormattedPrice());
                    p.put("priceAmountMicros", phase.getPriceAmountMicros());
                    p.put("priceCurrencyCode", phase.getPriceCurrencyCode());
                    p.put("billingPeriod", phase.getBillingPeriod());
                    p.put("billingCycleCount", phase.getBillingCycleCount());
                    p.put("recurrenceMode", phase.getRecurrenceMode());
                    phases.put(p);
                }
                item.put("pricingPhases", phases);
                offers.put(item);
            }
        }
        result.put("offers", offers);
        return result;
    }

    private JSObject serializePurchase(Purchase purchase) {
        JSObject result = new JSObject();
        result.put("purchaseToken", purchase.getPurchaseToken());
        result.put("purchaseTime", purchase.getPurchaseTime());
        result.put("acknowledged", purchase.isAcknowledged());
        result.put("purchaseState", purchase.getPurchaseState());
        JSArray products = new JSArray();
        for (String product : purchase.getProducts()) products.put(product);
        result.put("products", products);
        return result;
    }

    private boolean containsOffer(ProductDetails details, String offerToken) {
        List<ProductDetails.SubscriptionOfferDetails> offers = details.getSubscriptionOfferDetails();
        if (offers == null) return false;
        for (ProductDetails.SubscriptionOfferDetails offer : offers) {
            if (offerToken.equals(offer.getOfferToken())) return true;
        }
        return false;
    }

    private synchronized void clearPendingPurchase() {
        pendingPurchaseCall = null;
        pendingProductId = null;
    }

    private String clean(String value) {
        if (value == null) return null;
        String cleaned = value.trim();
        return cleaned.isEmpty() ? null : cleaned;
    }

    private String billingMessage(String prefix, BillingResult result) {
        String debug = result.getDebugMessage();
        return prefix + " (" + result.getResponseCode() + ")" + (debug == null || debug.isEmpty() ? "" : ": " + debug);
    }
}
