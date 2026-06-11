import ExchangeRateComponent from "./_components/exchange-rate-component";

/**
 * หน้ารายการ Exchange Rate ของโมดูล Configuration ใช้เป็น route entry point
 * @returns React element ของหน้ารายการ Exchange Rate
 * @example
 * // route: /config/exchange-rate
 * export default function ExchangeRatePage()
 */
export default function ExchangeRatePage() {
  return <ExchangeRateComponent />;
}

export const Component = ExchangeRatePage;
