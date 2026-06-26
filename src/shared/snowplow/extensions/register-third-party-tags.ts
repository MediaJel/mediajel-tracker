import { SnowplowTracker } from "src/shared/snowplow/types";
import { RegisterThirdPartyTagsInput } from "src/shared/types";

let thirdPartyTags: RegisterThirdPartyTagsInput = {};

const registerThirdPartyTags = (input: RegisterThirdPartyTagsInput) => {
  thirdPartyTags = input;
};

window.registerThirdPartyTags = registerThirdPartyTags;

const replaceMacros = (tag: string, placeholders: Record<string, string>) =>
  tag.replace(/{\w+}/g, (match) => placeholders[match] || match);

const createElementForTag = (type: string, tagWithMacros: string) => {
  if (type === "script") {
    const script = document.createElement("script");
    script.src = tagWithMacros;
    script.async = true;
    document.body.appendChild(script);
  } else if (type === "image") {
    const img = new Image();
    img.src = tagWithMacros;
    document.body.appendChild(img);
  }
};

const processTags = (tags: Array<{ tag: string; type: string }>, placeholders: Record<string, string>) => {
  tags?.forEach(({ tag, type }) => {
    const tagWithMacros = replaceMacros(tag, placeholders);
    createElementForTag(type, tagWithMacros);
  });
};

const withRegisterThirdPartyTagsExtension = (snowplow: SnowplowTracker) => {
  const { trackTransaction, trackAddToCart, trackRemoveFromCart } = snowplow.ecommerce;
  const { trackSignup } = snowplow;

  snowplow.ecommerce.trackTransaction = (input) => {
    trackTransaction(input);
    processTags(thirdPartyTags.onTransaction, {
      "{transaction_id}": input?.id?.toString() || "null",
      "{transaction_total}": input?.total?.toString() || "0",
      "{transaction_tax}": input?.tax?.toString() || "0",
      "{transaction_shipping}": input?.shipping?.toString() || "0",
      "{transaction_city}": input?.city || "null",
      "{transaction_state}": input?.state || "null",
      "{transaction_country}": input?.country || "null",
      "{transaction_currency}": input?.currency || "null",
      "{transaction_userId}": input?.userId?.toString() || "null",
    });
  };

  snowplow.ecommerce.trackAddToCart = (input) => {
    trackAddToCart(input);
    processTags(thirdPartyTags.onAddToCart, {
      "{cart_id}": input?.sku || "null",
      "{cart_name}": input?.name || "null",
      "{cart_category}": input?.category || "null",
      "{cart_unitPrice}": input?.unitPrice?.toString() || "0",
      "{cart_quantity}": input?.quantity?.toString() || "0",
      "{cart_currency}": input?.currency || "null",
      "{cart_userId}": input?.userId?.toString() || "null",
    });
  };

  snowplow.ecommerce.trackRemoveFromCart = (input) => {
    trackRemoveFromCart(input);
    processTags(thirdPartyTags.onRemoveFromCart, {
      "{cart_id}": input?.sku || "null",
      "{cart_name}": input?.name || "null",
      "{cart_category}": input?.category || "null",
      "{cart_unitPrice}": input?.unitPrice?.toString() || "0",
      "{cart_quantity}": input?.quantity?.toString() || "0",
      "{cart_currency}": input?.currency || "null",
      "{cart_userId}": input?.userId?.toString() || "null",
    });
  };

  snowplow.trackSignup = (input) => {
    trackSignup(input);
    processTags(thirdPartyTags.onSignup, {
      "{signup_firstName}": input?.firstName || "null",
      "{signup_lastName}": input?.lastName || "null",
      "{signup_uuid}": input?.uuid || "null",
      "{signup_email}": input?.emailAddress || "null",
      "{signup_address}": input?.address || "null",
      "{signup_city}": input?.city || "null",
      "{signup_state}": input?.state || "null",
      "{signup_phone}": input?.phoneNumber || "null",
      "{signup_advertiser}": input?.advertiser || "null",
    });
  };

  return snowplow;
};

export default withRegisterThirdPartyTagsExtension;
