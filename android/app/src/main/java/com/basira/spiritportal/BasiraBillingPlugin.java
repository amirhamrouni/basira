package com.basira.spiritportal;

import android.app.Activity;

import com.android.billingclient.api.BillingClient;
import com.android.billingclient.api.BillingClientStateListener;
import com.android.billingclient.api.BillingFlowParams;
import com.android.billingclient.api.BillingResult;
import com.android.billingclient.api.PendingPurchasesParams;
import com.android.billingclient.api.ProductDetails;
import com.android.billingclient.api.Purchase;
import com.android.billingclient.api.PurchasesUpdatedListener;
import com.android.billingclient.api.QueryProductDetailsParams;
import com.android.billingclient.api.QueryProductDetailsResult;
import com.android.billingclient.api.QueryPurchasesParams;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.PluginMethod;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@CapacitorPlugin(name = "BasiraBilling")
public class BasiraBillingPlugin extends Plugin implements PurchasesUpdatedListener {
    private BillingClient billingClient;
    private PluginCall pendingPurchaseCall;
    private String pendingProductId;

    @Override
    public void load() {
        billingClient = BillingClient.newBuilder(getContext())
            .setListener(this)
            .enablePendingPurchases(
                PendingPurchasesParams.newBuilder()
                    .enableOneTimeProducts()
                    .build()
            )
            .enableAutoServiceReconnection()
            .build();
    }

    private interface ReadyAction {
        void run();
    }

    private void whenReady(PluginCall call, ReadyAction action) {
        if (billingClient == null) {
            call.reject("BILLING_NOT_INITIALIZED");
            return;
        }
        if (billingClient.isReady()) {
            action.run();
            return;
        }
        billingClient.startConnection(new BillingClientStateListener() {
            @Override
            public void onBillingSetupFinished(BillingResult billingResult) {
                if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK) {
                    action.run();
                } else {
                    rejectBilling(call, "BILLING_SETUP_FAILED", billingResult);
                }
            }

            @Override
            public void onBillingServiceDisconnected() {
                // Automatic service reconnection is enabled. Do not manually reconnect here.
            }
        });
    }

    private void rejectBilling(PluginCall call, String code, BillingResult result) {
        call.reject(code + ": " + result.getDebugMessage(), String.valueOf(result.getResponseCode()));
    }

    private QueryProductDetailsParams buildProductQuery(String productId) {
        QueryProductDetailsParams.Product product = QueryProductDetailsParams.Product.newBuilder()
            .setProductId(productId)
            .setProductType(BillingClient.ProductType.SUBS)
            .build();
        return QueryProductDetailsParams.newBuilder()
            .setProductList(Collections.singletonList(product))
            .build();
    }

    private ProductDetails.SubscriptionOfferDetails findOffer(ProductDetails details, String basePlanId) {
        List<ProductDetails.SubscriptionOfferDetails> offers = details.getSubscriptionOfferDetails();
        if (offers == null) return null;
        ProductDetails.SubscriptionOfferDetails fallback = null;
        for (ProductDetails.SubscriptionOfferDetails offer : offers) {
            if (!basePlanId.equals(offer.getBasePlanId())) continue;
            if (fallback == null) fallback = offer;
            // Prefer the base-plan offer itself when Play returns it (offerId == null).
            if (offer.getOfferId() == null) return offer;
        }
        return fallback;
    }

    private JSObject offerToJson(ProductDetails details, ProductDetails.SubscriptionOfferDetails offer) {
        JSObject out = new JSObject();
        out.put("productId", details.getProductId());
        out.put("name", details.getName());
        out.put("title", details.getTitle());
        out.put("description", details.getDescription());
        out.put("basePlanId", offer.getBasePlanId());
        out.put("offerId", offer.getOfferId());
        out.put("offerToken", offer.getOfferToken());

        JSArray phases = new JSArray();
        List<ProductDetails.PricingPhase> pricingPhases = offer.getPricingPhases().getPricingPhaseList();
        for (ProductDetails.PricingPhase phase : pricingPhases) {
            JSObject p = new JSObject();
            p.put("formattedPrice", phase.getFormattedPrice());
            p.put("priceAmountMicros", phase.getPriceAmountMicros());
            p.put("priceCurrencyCode", phase.getPriceCurrencyCode());
            p.put("billingPeriod", phase.getBillingPeriod());
            p.put("billingCycleCount", phase.getBillingCycleCount());
            p.put("recurrenceMode", phase.getRecurrenceMode());
            phases.put(p);
        }
        out.put("pricingPhases", phases);
        if (!pricingPhases.isEmpty()) {
            ProductDetails.PricingPhase recurring = pricingPhases.get(pricingPhases.size() - 1);
            out.put("formattedPrice", recurring.getFormattedPrice());
            out.put("billingPeriod", recurring.getBillingPeriod());
        }
        return out;
    }

    private interface ProductOfferCallback {
        void onFound(ProductDetails details, ProductDetails.SubscriptionOfferDetails offer);
    }

    private void queryOffer(PluginCall call, String productId, String basePlanId, ProductOfferCallback callback) {
        billingClient.queryProductDetailsAsync(buildProductQuery(productId), (billingResult, result) -> {
            if (billingResult.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                rejectBilling(call, "PRODUCT_QUERY_FAILED", billingResult);
                return;
            }
            List<ProductDetails> products = result.getProductDetailsList();
            if (products == null || products.isEmpty()) {
                call.reject("SUBSCRIPTION_PRODUCT_NOT_AVAILABLE");
                return;
            }
            ProductDetails details = products.get(0);
            ProductDetails.SubscriptionOfferDetails offer = findOffer(details, basePlanId);
            if (offer == null) {
                call.reject("SUBSCRIPTION_BASE_PLAN_NOT_AVAILABLE");
                return;
            }
            callback.onFound(details, offer);
        });
    }

    @PluginMethod
    public void getSubscriptionOffer(PluginCall call) {
        String productId = call.getString("productId");
        String basePlanId = call.getString("basePlanId");
        if (productId == null || productId.isBlank() || basePlanId == null || basePlanId.isBlank()) {
            call.reject("PRODUCT_AND_BASE_PLAN_REQUIRED");
            return;
        }
        whenReady(call, () -> queryOffer(call, productId, basePlanId,
            (details, offer) -> call.resolve(offerToJson(details, offer))));
    }

    @PluginMethod
    public void purchaseSubscription(PluginCall call) {
        String productId = call.getString("productId");
        String basePlanId = call.getString("basePlanId");
        String obfuscatedAccountId = call.getString("obfuscatedAccountId");
        if (productId == null || productId.isBlank() || basePlanId == null || basePlanId.isBlank()) {
            call.reject("PRODUCT_AND_BASE_PLAN_REQUIRED");
            return;
        }
        if (pendingPurchaseCall != null) {
            call.reject("PURCHASE_ALREADY_IN_PROGRESS");
            return;
        }

        whenReady(call, () -> queryOffer(call, productId, basePlanId, (details, offer) -> {
            BillingFlowParams.ProductDetailsParams productParams = BillingFlowParams.ProductDetailsParams.newBuilder()
                .setProductDetails(details)
                .setOfferToken(offer.getOfferToken())
                .build();
            BillingFlowParams.Builder flowBuilder = BillingFlowParams.newBuilder()
                .setProductDetailsParamsList(Collections.singletonList(productParams));
            if (obfuscatedAccountId != null && !obfuscatedAccountId.isBlank() && obfuscatedAccountId.length() <= 64) {
                flowBuilder.setObfuscatedAccountId(obfuscatedAccountId);
            }

            Activity activity = getActivity();
            if (activity == null) {
                call.reject("ACTIVITY_NOT_AVAILABLE");
                return;
            }

            pendingPurchaseCall = call;
            pendingProductId = productId;
            BillingResult launch = billingClient.launchBillingFlow(activity, flowBuilder.build());
            if (launch.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                pendingPurchaseCall = null;
                pendingProductId = null;
                rejectBilling(call, "PURCHASE_LAUNCH_FAILED", launch);
            }
        }));
    }

    @Override
    public void onPurchasesUpdated(BillingResult billingResult, List<Purchase> purchases) {
        PluginCall call = pendingPurchaseCall;
        if (call == null) return;

        if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.USER_CANCELED) {
            JSObject out = new JSObject();
            out.put("cancelled", true);
            call.resolve(out);
            pendingPurchaseCall = null;
            pendingProductId = null;
            return;
        }

        if (billingResult.getResponseCode() != BillingClient.BillingResponseCode.OK || purchases == null) {
            rejectBilling(call, "PURCHASE_FAILED", billingResult);
            pendingPurchaseCall = null;
            pendingProductId = null;
            return;
        }

        for (Purchase purchase : purchases) {
            if (pendingProductId != null && purchase.getProducts().contains(pendingProductId)) {
                call.resolve(purchaseToJson(purchase));
                pendingPurchaseCall = null;
                pendingProductId = null;
                return;
            }
        }
        call.reject("PURCHASE_RESULT_MISSING_PRODUCT");
        pendingPurchaseCall = null;
        pendingProductId = null;
    }

    private JSObject purchaseToJson(Purchase purchase) {
        JSObject out = new JSObject();
        out.put("purchaseToken", purchase.getPurchaseToken());
        out.put("orderId", purchase.getOrderId());
        out.put("purchaseTime", purchase.getPurchaseTime());
        out.put("purchaseState", purchase.getPurchaseState());
        out.put("acknowledged", purchase.isAcknowledged());
        out.put("autoRenewing", purchase.isAutoRenewing());
        out.put("products", new JSArray(purchase.getProducts()));
        out.put("pending", purchase.getPurchaseState() == Purchase.PurchaseState.PENDING);
        return out;
    }

    @PluginMethod
    public void restoreSubscriptions(PluginCall call) {
        whenReady(call, () -> {
            QueryPurchasesParams params = QueryPurchasesParams.newBuilder()
                .setProductType(BillingClient.ProductType.SUBS)
                .build();
            billingClient.queryPurchasesAsync(params, (billingResult, purchases) -> {
                if (billingResult.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                    rejectBilling(call, "RESTORE_FAILED", billingResult);
                    return;
                }
                JSArray items = new JSArray();
                for (Purchase purchase : purchases) items.put(purchaseToJson(purchase));
                JSObject out = new JSObject();
                out.put("purchases", items);
                call.resolve(out);
            });
        });
    }

    @Override
    protected void handleOnDestroy() {
        if (billingClient != null && billingClient.isReady()) billingClient.endConnection();
        billingClient = null;
        pendingPurchaseCall = null;
        pendingProductId = null;
        super.handleOnDestroy();
    }
}
