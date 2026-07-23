'use client';

type Reward = {
  id: string;
  name: string;
  description: string | null;
  reward_type: string;
  points_cost: number;
  product_id: string | null;
  discount_value: number;
};

export function LoyaltyRedemptionPicker({
  rewards,
  availablePoints,
  selectedRewardId,
  onSelect,
}: {
  rewards: Reward[];
  availablePoints: number;
  selectedRewardId: string;
  onSelect: (rewardId: string) => void;
}) {
  return (
    <section className="loyalty-picker">
      <div className="loyalty-picker-heading">
        <strong>Canjear puntos</strong>
        <span>{availablePoints} puntos disponibles</span>
      </div>

      <select
        value={selectedRewardId}
        onChange={(event) => onSelect(event.target.value)}
      >
        <option value="">Sin canje</option>

        {rewards.map((reward) => (
          <option
            key={reward.id}
            value={reward.id}
            disabled={availablePoints < reward.points_cost}
          >
            {reward.name} — {reward.points_cost} puntos
            {availablePoints < reward.points_cost
              ? " (insuficientes)"
              : ""}
          </option>
        ))}
      </select>

      {selectedRewardId && (
        <button
          type="button"
          className="loyalty-clear"
          onClick={() => onSelect("")}
        >
          Quitar canje
        </button>
      )}
    </section>
  );
}
