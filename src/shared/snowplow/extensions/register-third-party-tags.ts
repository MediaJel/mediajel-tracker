import { SnowplowTracker } from 'src/shared/snowplow/types';
import {
  RegisterThirdPartyTagsInput
} from 'src/shared/types';

let thirdPartyTags: RegisterThirdPartyTagsInput = {}

const registerThirdPartyTags = (input: RegisterThirdPartyTagsInput) => {
  thirdPartyTags = input;
};

window.registerThirdPartyTags = registerThirdPartyTags;

const replaceMacros = (tag: string, placeholders: Record<string, string>) =>
  tag.replace(/{\w+}/g, (match) => placeholders[match] || match);

const createElementForTag = (type: string, tagWithMacros: string) => {
  if (type === "script") {
    const script = document.createElement('script');
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
      "{transaction_id}": input.id,
      "{transaction_total}": input.total.toString(),
      "{transaction_tax}": input.tax.toString(),
      "{transaction_shipping}": input.shipping.toString(),
      "{transaction_city}": input.city,
      "{transaction_state}": input.state,
      "{transaction_country}": input.country,
      "{transaction_currency}": input.currency,
      "{transaction_userId}": input.userId,
    });
  };

  snowplow.ecommerce.trackAddToCart = (input) => {
    trackAddToCart(input);
    processTags(thirdPartyTags.onAddToCart, {
      "{cart_id}": input.sku,
      "{cart_name}": input.name,
      "{cart_category}": input.category,
      "{cart_unitPrice}": input.unitPrice.toString(),
      "{cart_quantity}": input.quantity.toString(),
      "{cart_currency}": input.currency,
      "{cart_userId}": input.userId,
    });
  };

  snowplow.ecommerce.trackRemoveFromCart = (input) => {
    trackRemoveFromCart(input);
    processTags(thirdPartyTags.onRemoveFromCart, {
      "{cart_id}": input.sku,
      "{cart_name}": input.name,
      "{cart_category}": input.category,
      "{cart_unitPrice}": input.unitPrice.toString(),
      "{cart_quantity}": input.quantity.toString(),
      "{cart_currency}": input.currency,
      "{cart_userId}": input.userId,
    });
  };

  snowplow.trackSignup = (input) => {
    trackSignup(input);
    processTags(thirdPartyTags.onSignup, {
      "{signup_firstName}": input.firstName,
      "{signup_lastName}": input.lastName,
      "{signup_uuid}": input.uuid,
      "{signup_email}": input.emailAddress,
      "{signup_hashedEmailAddress}": input.hashedEmailAddress,
      "{signup_address}": input.address,
      "{signup_city}": input.city,
      "{signup_state}": input.state,
      "{signup_phone}": input.phoneNumber,
      "{signup_advertiser}": input.advertiser,
    });
  }

  return snowplow;
};

export default withRegisterThirdPartyTagsExtension