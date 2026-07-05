// Paylaşılan fiyatlandırma mantığı (client + server).
// Base fiyat (oda tipi) + kanal kuralı → kanala özel satış fiyatı.

export type PricingMode = 'offset_commission' | 'percent' | 'amount' | 'manual' | 'base'

export interface ChannelRule {
  pricing_mode: PricingMode
  commission_pct: number   // %
  markup_value: number     // percent modunda %, amount modunda mutlak tutar
}

/**
 * Bir kanal + oda tipi için satış fiyatını hesaplar.
 * @param basePrice   room_types.base_price (net hedef / direkt fiyat)
 * @param rule        kanalın fiyatlandırma kuralı
 * @param override    channel_rates.price_override (doluysa her şeyi ezer)
 */
export function computeChannelPrice(
  basePrice: number,
  rule: ChannelRule,
  override?: number | null,
): number {
  if (override != null && override > 0) return Math.round(override)

  switch (rule.pricing_mode) {
    case 'base':
      return Math.round(basePrice)

    case 'offset_commission': {
      // Komisyon kesildikten sonra elimize base kalsın:
      // satış = base / (1 - komisyon/100)
      const c = Math.min(Math.max(rule.commission_pct, 0), 95) / 100
      return Math.round(basePrice / (1 - c))
    }

    case 'percent':
      return Math.round(basePrice * (1 + rule.markup_value / 100))

    case 'amount':
      return Math.round(basePrice + rule.markup_value)

    case 'manual':
      // manual modda override yoksa base'e düş (güvenli varsayılan)
      return Math.round(basePrice)

    default:
      return Math.round(basePrice)
  }
}
