// Razorpay Checkout loader.
//
// The script is fetched on demand rather than sitting in index.html, so pages
// that never take a payment don't pay for it — and a network problem surfaces
// as a clear message at the moment of paying instead of a silent failure.

const SDK_URL = 'https://checkout.razorpay.com/v1/checkout.js';

let loading: Promise<boolean> | null = null;

/** Injects the Checkout script once; repeat calls reuse the same promise. */
export function loadRazorpay(): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);
  if ((window as any).Razorpay) return Promise.resolve(true);
  if (loading) return loading;

  loading = new Promise<boolean>((resolve) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SDK_URL}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve(true));
      existing.addEventListener('error', () => resolve(false));
      return;
    }
    const s = document.createElement('script');
    s.src = SDK_URL;
    s.async = true;
    s.onload = () => resolve(true);
    s.onerror = () => { loading = null; resolve(false); };
    document.body.appendChild(s);
  });

  return loading;
}

export interface CheckoutOrder {
  orderId: string;
  amount: number;          // paise
  currency: string;
  keyId: string;
  counselorName?: string;
  testMode?: boolean;
}

export interface CheckoutResult {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

/**
 * Opens the payment sheet.
 *
 * Resolves with Razorpay's signed response on success, or `null` when the
 * customer closes the sheet. Rejects only when the payment itself fails.
 *
 * The returned fields are NOT proof of payment on their own — the server
 * re-computes the signature before anything is booked.
 */
export function openCheckout(
  order: CheckoutOrder,
  prefill: { name?: string; email?: string; contact?: string } = {}
): Promise<CheckoutResult | null> {
  return new Promise((resolve, reject) => {
    const Razorpay = (window as any).Razorpay;
    if (!Razorpay) {
      reject(new Error('Payment window could not be loaded. Check your internet connection.'));
      return;
    }

    let settled = false;
    const finish = (fn: () => void) => { if (!settled) { settled = true; fn(); } };

    const rzp = new Razorpay({
      key: order.keyId,
      order_id: order.orderId,
      amount: order.amount,
      currency: order.currency,
      name: 'CounselConnect',
      description: order.counselorName
        ? `Counseling session with ${order.counselorName}`
        : 'Counseling session',
      image: '/favicon.ico',
      prefill,
      theme: { color: '#355C4D' },
      // Fired when the customer dismisses the sheet without paying.
      modal: {
        ondismiss: () => finish(() => resolve(null)),
        escape: true,
      },
      handler: (res: CheckoutResult) => finish(() => resolve(res)),
    });

    // Card declined, UPI rejected, bank error…
    rzp.on('payment.failed', (resp: any) => {
      finish(() => reject(new Error(
        resp?.error?.description || 'The payment did not go through. Please try again.'
      )));
    });

    rzp.open();
  });
}
