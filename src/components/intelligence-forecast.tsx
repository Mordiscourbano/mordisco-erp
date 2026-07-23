'use client';

type Forecast = {
  forecast_date: string;
  expected_orders: number;
  expected_revenue: number;
};

const money = (value: number) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

export function IntelligenceForecast({ data }: { data: Forecast[] }) {
  const maxRevenue = Math.max(...data.map((x) => Number(x.expected_revenue)), 1);

  return (
    <div className="intel-forecast">
      {data.map((day) => {
        const height = Math.max((Number(day.expected_revenue) / maxRevenue) * 150, 5);
        return (
          <div className="intel-forecast-day" key={day.forecast_date}>
            <div className="intel-forecast-value">
              <strong>{money(day.expected_revenue)}</strong>
              <span>{Number(day.expected_orders).toFixed(1)} pedidos</span>
            </div>
            <div className="intel-bar" style={{ height }} />
            <span>
              {new Date(`${day.forecast_date}T12:00:00`).toLocaleDateString("es-AR", {
                weekday: "short",
                day: "2-digit",
              })}
            </span>
          </div>
        );
      })}
    </div>
  );
}
