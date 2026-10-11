# ADR 005: Payment Gateway Integration

## Status
Accepted

## Context
Selecting payment gateway providers for the DALLI e-commerce platform.

## Decision
Use **Stripe** as primary payment processor with **crypto payments** (BTC, ETH, USDT, USDC) as alternative.

## Reasoning

### Stripe
- **Global coverage**: 135+ currencies, 47+ countries
- **Serbian market**: Supported (Stripe launched in Serbia 2023)
- **Features**:
  - Cards (Visa, Mastercard, Maestro, Amex)
  - Digital wallets (Apple Pay, Google Pay)
  - Local methods (future: DinaCard, Yettel Pay)
  - Subscriptions & billing
  - Radar fraud prevention
  - Connect for marketplace (future)
- **Developer experience**: Excellent docs, SDKs, webhooks
- **Compliance**: PCI DSS Level 1, GDPR, PSD2/SCA ready
- **Pricing**: 1.4% + 25 RSD (domestic), 2.9% + 25 RSD (international)

### Crypto Payments (Differentiator)
- **BTC**: Lightning Network + On-chain
- **ETH**: ERC-20 (USDC, USDT)
- **USDT**: TRC20 (Tron) + ERC20
- **USDC**: Native USDC
- **15% discount** for crypto payments (marketing differentiator)
- **Implementation**: Coinbase Commerce / Coinbase Pay / Custom integration
- **Settlement**: Auto-convert to RSD or keep crypto

### Cash on Delivery
- Still popular in Serbia (~40% of orders)
- No gateway fees
- Higher return rate (~15%)
- Cash handling logistics

### Bank Transfer
- Local bank transfers (NBS RTGS)
- Instant payments (NBS IPS)
- Manual verification needed

## Implementation

### Stripe Integration
```typescript
// Frontend
const stripe = Stripe('pk_live_...');
const elements = stripe.elements();
const card = elements.create('card');
card.mount('#card-element');

// Payment Intent
const { paymentIntent } = await api.post('/payments/intent', {
  amount: 129000, // in minor units (RSD)
  currency: 'RSD',
  payment_method_types: ['card', 'cash_on_delivery'],
  metadata: { orderId: 'ORD-123' }
});
```

### Webhook Handling
```typescript
// stripe-webhook.ts
app.post('/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  switch (event.type) {
    case 'payment_intent.succeeded':
      await handlePaymentSuccess(event.data.object);
      break;
    case 'payment_intent.payment_failed':
      await handlePaymentFailed(event.data.object);
      break;
    case 'charge.refunded':
      await handleRefund(event.data.object);
      break;
  }
  
  res.json({ received: true });
});
```

### Refund Handling
```typescript
async function handleRefund(paymentIntent) {
  const refund = await stripe.refunds.create({
    payment_intent: paymentIntent.id,
    amount: amount, // partial or full
    reason: 'requested_by_customer'
  });
  
  await notifyCustomer(paymentIntent.customer_email, {
    type: 'refund',
    amount: refund.amount,
    reference: refund.id
  });
}
```

## Crypto Payments

### Coinbase Commerce Integration
```typescript
// Create charge
const charge = await coinbaseCommerce.charges.create({
  name: 'DALLI Order #12345',
  description: 'Premium Cotton T-Shirt',
  local_price: {
    amount: '1090.00',
    currency: 'RSD'
  },
  pricing_type: 'fixed_price',
  metadata: {
    order_id: 'ORD-12345'
  }
});

// Redirect user
return redirect(charge.hosted_url);
```

### Webhook Handling
```typescript
app.post('/webhooks/crypto', express.raw({ type: 'application/json' }), async (req, res) => {
  const signature = req.headers['x-cc-webhook-signature'];
  const event = coinbaseCommerce.verifyWebhookSignature(
    req.body,
    signature,
    process.env.COINBASE_WEBHOOK_SECRET
  );
  
  if (event.type === 'charge:confirmed') {
    await confirmOrder(event.data.metadata.order_id);
  }
});
```

### Fallback: Manual Crypto
```typescript
// Manual address generation
const addresses = {
  BTC: process.env.BTC_ADDRESS,
  ETH: process.env.ETH_ADDRESS,
  USDT_TRC20: process.env.USDT_TRC20,
  USDT_ERC20: process.env.USDT_ERC20,
  USDC: process.env.USDC_ADDRESS
};

// Manual verification via blockchain explorer
// Admin dashboard for verification
```

## Cash on Delivery
```typescript
// COD Order
{
  paymentMethod: 'cash_on_delivery',
  shippingMethod: 'post_express',
  codFee: 150 // RSD
}
```

## Security Considerations

### PCI-DSS
- [x] SAQ A (Stripe handles card data)
- [x] No card data touches our servers
- [x] CSP prevents card data exfiltration
- [x] CSP nonce for Stripe.js
- [x] CSP report-only for monitoring

### Fraud Prevention
- Stripe Radar (ML-based)
- Custom rules:
  - Block high-risk countries
  - Velocity checks
  - AVS/CVV verification
  - 3D Secure 2.0

### Refunds
```typescript
async function processRefund(orderId, amount, reason) {
  const refund = await stripe.refunds.create({
    payment_intent: order.paymentIntentId,
    amount: amountInCents,
    reason: 'requested_by_customer',
    metadata: { reason }
  });
  
  await notifyCustomer(order.customerEmail, {
    type: 'refund',
    amount: refund.amount,
    reference: refund.id
  });
}
```

## Testing

### Test Cards
```javascript
// Stripe Test Cards
const testCards = {
  visa: '4242424242424242',
  visa_debit: '4000056655665556',
  mastercard: '5555555555554444',
  mastercard_debit: '5200828282828210',
  amex: '378282246310005',
  declined: '4000000000000002',
  insufficient_funds: '4000000000009995',
  expired: '4000000000000069',
  cvc_fail: '4000000000000127',
  avs_fail: '4000000000000135'
};

// 3D Secure
const threeDSecure = {
  required: '4000000000003220',
  optional: '4000000000003212'
};
```

## Compliance Checklist
- [x] PCI DSS SAQ A (Stripe handles card data)
- [x] GDPR compliant (no card data stored)
- [x] PSD2/SCA ready (3D Secure 2.0)
- [x] PCI DSS Level 1 (Stripe)
- [x] GDPR Article 25 (Data Protection by Design)
- [x] PCI DSS Requirement 3 (Protect Stored Data) - N/A (no storage)
- [x] PCI DSS Requirement 4 (Encrypt Transmission) - TLS 1.3