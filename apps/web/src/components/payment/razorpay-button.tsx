'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { CreditCard, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useCreatePaymentOrder, useVerifyPayment } from '@/hooks/use-payment';

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface RazorpayButtonProps {
  invoice: {
    id: string;
    invoiceNumber: string;
    totalAmount: number | string;
    currency?: string;
  };
  organization: {
    name: string;
  };
  onSuccess?: () => void;
  disabled?: boolean;
  className?: string;
}

export function RazorpayButton({
  invoice,
  organization,
  onSuccess,
  disabled = false,
  className,
}: RazorpayButtonProps) {
  const { toast } = useToast();
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const createOrder = useCreatePaymentOrder();
  const verifyPayment = useVerifyPayment();

  // Load Razorpay script
  useEffect(() => {
    const script = document.getElementById('razorpay-script') as HTMLScriptElement;

    if (script) {
      setScriptLoaded(true);
      return;
    }

    const newScript = document.createElement('script');
    newScript.id = 'razorpay-script';
    newScript.src = 'https://checkout.razorpay.com/v1/checkout.js';
    newScript.async = true;
    newScript.onload = () => setScriptLoaded(true);
    newScript.onerror = () => {
      toast({
        title: 'Error',
        description: 'Failed to load payment gateway. Please refresh and try again.',
        variant: 'destructive',
      });
    };

    document.body.appendChild(newScript);
  }, [toast]);

  const handlePayment = async () => {
    if (!scriptLoaded || !window.Razorpay) {
      toast({
        title: 'Error',
        description: 'Payment gateway not loaded. Please refresh the page.',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);

    try {
      // Create Razorpay order
      const orderData = await createOrder.mutateAsync({
        invoiceId: invoice.id,
        currency: invoice.currency || 'INR',
        notes: {
          invoiceNumber: invoice.invoiceNumber,
          organizationName: organization.name,
        },
      });

      // Configure Razorpay options
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '',
        amount: orderData.amount,
        currency: orderData.currency,
        order_id: orderData.orderId,
        name: 'CSFIRM',
        description: `Payment for ${invoice.invoiceNumber}`,
        prefill: {
          name: organization.name,
        },
        theme: {
          color: '#3b82f6',
        },
        handler: async (response: any) => {
          try {
            // Verify payment
            await verifyPayment.mutateAsync({
              invoiceId: invoice.id,
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
              paymentMethod: response.method,
            });

            toast({
              title: 'Payment Successful',
              description: `Payment for ${invoice.invoiceNumber} completed successfully.`,
            });

            onSuccess?.();
          } catch (error) {
            toast({
              title: 'Payment Verification Failed',
              description: 'Payment received but verification failed. Please contact support.',
              variant: 'destructive',
            });
          } finally {
            setIsProcessing(false);
          }
        },
        modal: {
          ondismiss: () => {
            setIsProcessing(false);
            toast({
              title: 'Payment Cancelled',
              description: 'You cancelled the payment process.',
            });
          },
        },
      };

      // Open Razorpay checkout
      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error: any) {
      setIsProcessing(false);
      toast({
        title: 'Payment Failed',
        description: error?.message || 'Failed to initiate payment. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Button
      onClick={handlePayment}
      disabled={disabled || isProcessing || !scriptLoaded || createOrder.isPending}
      className={className}
    >
      {isProcessing || createOrder.isPending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Processing...
        </>
      ) : (
        <>
          <CreditCard className="mr-2 h-4 w-4" />
          Pay Now
        </>
      )}
    </Button>
  );
}
