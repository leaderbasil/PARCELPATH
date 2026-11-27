import { useUI } from "@/i18n";
import { whatsappUrl } from "@/utils/whatsapp";

interface CourierContactButtonsProps {
  phone: string | null | undefined;
}

export function CourierContactButtons({ phone }: CourierContactButtonsProps) {
  const ui = useUI();
  const whatsappHref = whatsappUrl(phone);
  if (!phone) return null;

  return (
    <div className="flex flex-wrap gap-2">
      <a
        href={`tel:${phone}`}
        aria-label={`${ui.orders.callCourier} ${phone}`}
        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary-soft px-3 py-2 text-sm font-semibold text-primary-strong transition-colors hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-2">
          <path d="M21 16.9v2.6a2 2 0 0 1-2.2 2A18.8 18.8 0 0 1 2.5 5.2 2 2 0 0 1 4.5 3h2.6a2 2 0 0 1 2 1.7l.4 2.5a2 2 0 0 1-.5 1.7L8 10a15 15 0 0 0 6 6l1.1-1a2 2 0 0 1 1.7-.5l2.5.4a2 2 0 0 1 1.7 2Z" />
        </svg>
        <bdi dir="ltr">{phone}</bdi>
        <span>{ui.orders.callCourier}</span>
      </a>

      {whatsappHref ? (
        <a
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${ui.orders.whatsappCourier} - ${ui.checkout.mapNewTab}`}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-success/30 bg-success-soft px-3 py-2 text-sm font-semibold text-success-strong transition-colors hover:bg-success/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-2">
            <path d="M21 12a8.5 8.5 0 0 1-12.5 7.5L3 21l1.5-5.5A8.5 8.5 0 1 1 21 12Z" />
            <path d="M8.5 9.5c0 3.6 2.4 6 6 6l1.5-2-2-1-1 1a5.5 5.5 0 0 1-2.5-2.5l1-1-1-2-2 1.5Z" />
          </svg>
          {ui.orders.whatsappCourier}
        </a>
      ) : null}
    </div>
  );
}
