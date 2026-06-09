import { API_BASE_URL } from './api';

/**
 * Paytm JS Checkout service
 *
 * Flow:
 *  1. Call createPaytmOrder() → backend calls Paytm initiateTransaction → returns orderId + txnToken
 *  2. Call initiatePaytmCheckout() → loads Paytm JS, opens payment modal
 *  3. After payment, Paytm navigates the WebView to callbackUrl
 *     (= /payment/status?order_id=...) where verification happens.
 */

// ── Types ─────────────────────────────────────────────────────────────────────
export interface PaytmOrderOptions {
  order_amount: number;
  customer_details: {
    customer_id: string;
    customer_phone: string;
    customer_name?: string;
    customer_email?: string;
  };
  order_meta?: {
    return_url?: string;  // defaults to https://roovo.in/payment/status?order_id=<id>
  };
  bookingData?: object;   // stored in payment_intents for webhook fallback
}

export interface PaytmOrderResult {
  order_id:    string;
  txn_token:   string;
  amount:      string;
  mid:         string;
  environment: 'PROD' | 'TEST';
}

// ── Step 1: create order on our backend ───────────────────────────────────────
export async function createPaytmOrder(opts: PaytmOrderOptions): Promise<PaytmOrderResult> {
  const res = await fetch(`${API_BASE_URL}/api/paytm/create-order`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(opts),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? `Paytm order creation failed (${res.status})`);
  }

  return res.json();
}

// ── Step 2: load Paytm JS + open checkout modal ─────────────────────────────────
export async function initiatePaytmCheckout(order: PaytmOrderResult): Promise<void> {
  return new Promise((resolve, reject) => {
    // Remove any stale Paytm script
    document.getElementById('paytm-checkout-script')?.remove();

    const isProd  = order.environment === 'PROD';
    const baseUrl = isProd
      ? 'https://secure.paytmpayments.com'
      : 'https://securestage.paytmpayments.com';

    const config = {
      root: '',
      flow: 'DEFAULT',
      data: {
        orderId:   order.order_id,
        token:     order.txn_token,
        tokenType: 'TXN_TOKEN',
        amount:    order.amount,
      },
      handler: {
        notifyMerchant: (eventName: string, data: any) => {
          console.log('[Paytm] notifyMerchant:', eventName, data);
          if (eventName === 'APP_CLOSED') {
            reject(new Error('Payment cancelled by user'));
          }
        },
      },
    };

    (window as any).onScriptLoad = () => {
      const paytm = (window as any).Paytm;
      if (!paytm?.CheckoutJS) {
        return reject(new Error('Paytm CheckoutJS not available after script load'));
      }
      paytm.CheckoutJS.onLoad(() => {
        paytm.CheckoutJS.init(config)
          .then(() => {
            paytm.CheckoutJS.invoke();
            resolve();
          })
          .catch((err: any) => {
            console.error('[Paytm] CheckoutJS init error:', err);
            reject(err);
          });
      });
    };

    const script = document.createElement('script');
    script.id   = 'paytm-checkout-script';
    script.type = 'application/javascript';
    // Official script URL format from Paytm docs
    script.src  = `${baseUrl}/merchantpgpui/checkoutjs/merchants/${order.mid}.js`;
    script.setAttribute('onload', 'onScriptLoad()');
    script.crossOrigin = 'anonymous';
    script.onerror = () => reject(new Error('Failed to load Paytm checkout script'));

    document.head.appendChild(script);
  });
}

// ── Helper: verify order status (called by PaymentStatus page) ────────────────
export async function verifyPaytmOrder(orderId: string): Promise<'SUCCESS' | 'PENDING' | 'FAILED'> {
  const res = await fetch(`${API_BASE_URL}/api/paytm/orders/${orderId}/status`);
  if (!res.ok) throw new Error(`Paytm status check failed (${res.status})`);
  const data = await res.json();
  return data.status; // 'SUCCESS' | 'PENDING' | 'FAILED'
}
