export interface DBPricingConfig {
  basePricePerBotMonthlyINR: number;
  inrToUsdRate: number;
  taxRatePercent: number;
  customSlidersEnabled?: boolean;
  couponsEnabled?: boolean;
  botPricingTiers?: Array<{
    count: number;
    label: string;
    monthlyPriceINR: number;
    enabled?: boolean;
    isPopular?: boolean;
  }>;
  botTierDiscounts: Array<{
    minBots: number;
    maxBots: number;
    discountPercent: number;
    label: string;
    enabled?: boolean;
  }>;
  fileSizeTierCostsINR: Array<{
    sizeMB: number;
    label: string;
    monthlyCostINR: number;
    enabled?: boolean;
  }>;
  storageTiersINR: Array<{
    storageMB: number;
    label: string;
    monthlyCostINR: number;
    enabled?: boolean;
  }>;
  customStorageCostPerGBMonthlyINR: number;
  durationDiscounts: Array<{
    days: number;
    label: string;
    discountPercent: number;
    isDefault?: boolean;
    enabled?: boolean;
  }>;
}

export interface CalculatePlanInput {
  activeBotCount: number;
  maxPythonFileSizeMB: number;
  dbStorageMB: number;
  durationDays: number;
  couponCode?: string;
}

export interface PricingCalculationResult {
  activeBotCount: number;
  totalBotSlots: number; // Formula: activeBotCount * 3
  maxPythonFileSizeMB: number;
  dbStorageMB: number;
  durationDays: number;

  // Breakdown
  baseBotRateMonthlyINR: number;
  botTierDiscountPercent: number;
  effectiveBotRateMonthlyINR: number;
  botsMonthlySubtotalINR: number;

  fileSizeMonthlyCostINR: number;
  storageMonthlyCostINR: number;

  baseMonthlyTotalINR: number;
  durationMultiplier: number;
  durationDiscountPercent: number;
  durationDiscountAmountINR: number;

  subtotalINR: number;
  couponDiscountINR: number;
  taxRatePercent: number;
  taxAmountINR: number;
  finalPriceINR: number;

  // USD
  finalPriceUSD: number;
  subtotalUSD: number;
  taxUSD: number;
  savingsTotalINR: number;
}

export const DEFAULT_PRICING_CONFIG: DBPricingConfig = {
  basePricePerBotMonthlyINR: 49,
  inrToUsdRate: 83.5,
  taxRatePercent: 0, // Simplified inclusive / transparent pricing for Rs 49
  customSlidersEnabled: true,
  couponsEnabled: true,
  botPricingTiers: [
    { count: 1, label: '1 Bot', monthlyPriceINR: 49, enabled: true },
    { count: 2, label: '2 Bots', monthlyPriceINR: 98, enabled: true },
    { count: 3, label: '3 Bots', monthlyPriceINR: 147, isPopular: true, enabled: true },
    { count: 5, label: '5 Bots', monthlyPriceINR: 245, enabled: true },
  ],
  botTierDiscounts: [
    { minBots: 1, maxBots: 9999, discountPercent: 0, label: 'Flat Rs 49/bot', enabled: true },
  ],
  fileSizeTierCostsINR: [
    { sizeMB: 200, label: '200 MB (Default Included)', monthlyCostINR: 0, enabled: true },
  ],
  storageTiersINR: [
    { storageMB: 200, label: '200 MB (Included in Rs 49/mo)', monthlyCostINR: 0, enabled: true },
    { storageMB: 500, label: '500 MB (+Rs 30/mo)', monthlyCostINR: 30, enabled: true },
    { storageMB: 1024, label: '1 GB (+Rs 70/mo)', monthlyCostINR: 70, enabled: true },
    { storageMB: 2048, label: '2 GB (+Rs 150/mo)', monthlyCostINR: 150, enabled: true },
    { storageMB: 5120, label: '5 GB (+Rs 350/mo)', monthlyCostINR: 350, enabled: true },
  ],
  customStorageCostPerGBMonthlyINR: 45,
  durationDiscounts: [
    { days: 30, label: '1 Month (Rs 49/mo)', discountPercent: 0, isDefault: true, enabled: true },
    { days: 90, label: '3 Months (Save 10%)', discountPercent: 10, enabled: true },
    { days: 180, label: '6 Months (Save 15%)', discountPercent: 15, enabled: true },
    { days: 365, label: '1 Year (Save 25%)', discountPercent: 25, enabled: true },
  ],
};

export class PricingEngine {
  /**
   * Server-authoritative dynamic calculation for any configuration.
   * Strict validation rules applied.
   */
  public static calculate(
    input: CalculatePlanInput,
    config: DBPricingConfig = DEFAULT_PRICING_CONFIG
  ): PricingCalculationResult {
    // 1. Sanitize active bot count (Minimum 1)
    const activeBotCount = Math.max(1, Math.floor(Number(input.activeBotCount) || 1));
    
    // Formula requirement: Total bot slots = Active bot count * 3
    const totalBotSlots = activeBotCount * 3;

    // 2. Max file size defaults to 200 MB included
    let maxPythonFileSizeMB = Number(input.maxPythonFileSizeMB) || 200;

    // 3. Total Storage MB defaults to 200 MB
    const dbStorageMB = Math.max(200, Math.floor(Number(input.dbStorageMB) || 200));

    // 4. Validate duration (Minimum 7 days)
    const durationDays = Math.max(7, Math.floor(Number(input.durationDays) || 30));

    // 5. Bot Tier Discount Calculation (Encourages larger purchases naturally)
    const matchedBotTier = config.botTierDiscounts.find(
      (t) => activeBotCount >= t.minBots && activeBotCount <= t.maxBots
    ) || config.botTierDiscounts[config.botTierDiscounts.length - 1];

    const botTierDiscountPercent = matchedBotTier ? matchedBotTier.discountPercent : 0;
    const baseBotRateMonthlyINR = config.basePricePerBotMonthlyINR;
    const effectiveBotRateMonthlyINR = Math.round(
      baseBotRateMonthlyINR * (1 - botTierDiscountPercent / 100) * 100
    ) / 100;
    const botsMonthlySubtotalINR = Math.round(effectiveBotRateMonthlyINR * activeBotCount * 100) / 100;

    // 6. Python File Size Tier Cost
    let fileSizeMonthlyCostINR = 0;
    const exactFileTier = config.fileSizeTierCostsINR.find(
      (f) => Math.abs(f.sizeMB - maxPythonFileSizeMB) < 0.05
    );
    if (exactFileTier) {
      fileSizeMonthlyCostINR = exactFileTier.monthlyCostINR;
    } else {
      // Interpolate or take highest matching tier
      const sortedTiers = [...config.fileSizeTierCostsINR].sort((a, b) => a.sizeMB - b.sizeMB);
      const higher = sortedTiers.find((t) => t.sizeMB >= maxPythonFileSizeMB);
      fileSizeMonthlyCostINR = higher ? higher.monthlyCostINR : 80;
    }

    // 7. Database / Storage Cost
    let storageMonthlyCostINR = 0;
    const exactStorageTier = config.storageTiersINR.find((s) => s.storageMB === dbStorageMB);
    if (exactStorageTier) {
      storageMonthlyCostINR = exactStorageTier.monthlyCostINR;
    } else {
      // Custom storage calculation
      const storageGB = dbStorageMB / 1024;
      storageMonthlyCostINR = Math.round(storageGB * config.customStorageCostPerGBMonthlyINR);
    }

    // 8. 30-Day Monthly Base Total
    const baseMonthlyTotalINR = botsMonthlySubtotalINR + fileSizeMonthlyCostINR + storageMonthlyCostINR;

    // 9. Duration Calculation & Duration Discount
    const durationMultiplier = durationDays / 30;
    const matchedDuration = config.durationDiscounts.find((d) => d.days === durationDays);
    let durationDiscountPercent = 0;
    if (matchedDuration) {
      durationDiscountPercent = matchedDuration.discountPercent;
    } else {
      // Custom duration scaling
      if (durationDays >= 365) durationDiscountPercent = 28;
      else if (durationDays >= 180) durationDiscountPercent = 18;
      else if (durationDays >= 90) durationDiscountPercent = 12;
      else if (durationDays >= 30) durationDiscountPercent = 5;
      else durationDiscountPercent = 0;
    }

    const unscaledDurationSubtotal = baseMonthlyTotalINR * durationMultiplier;
    const durationDiscountAmountINR = Math.round(
      unscaledDurationSubtotal * (durationDiscountPercent / 100) * 100
    ) / 100;
    const subtotalINR = Math.max(10, Math.round((unscaledDurationSubtotal - durationDiscountAmountINR) * 100) / 100);

    // 10. Promotional Coupons
    let couponDiscountINR = 0;
    if (input.couponCode) {
      const code = input.couponCode.trim().toUpperCase();
      if (code === 'TELEHOST20') {
        couponDiscountINR = Math.round(subtotalINR * 0.2 * 100) / 100;
      } else if (code === 'FIRSTBOT') {
        couponDiscountINR = Math.round(subtotalINR * 0.15 * 100) / 100;
      } else if (code === 'UPGRADE50') {
        couponDiscountINR = Math.round(subtotalINR * 0.5 * 100) / 100;
      }
    }

    const discountedSubtotalINR = Math.max(0, subtotalINR - couponDiscountINR);

    // 11. GST / Tax calculation (18%)
    const taxRatePercent = config.taxRatePercent || 18;
    const taxAmountINR = Math.round(discountedSubtotalINR * (taxRatePercent / 100) * 100) / 100;
    const finalPriceINR = Math.round((discountedSubtotalINR + taxAmountINR) * 100) / 100;

    // 12. USD Conversion
    const inrToUsdRate = config.inrToUsdRate || 83.5;
    const finalPriceUSD = parseFloat((finalPriceINR / inrToUsdRate).toFixed(2));
    const subtotalUSD = parseFloat((discountedSubtotalINR / inrToUsdRate).toFixed(2));
    const taxUSD = parseFloat((taxAmountINR / inrToUsdRate).toFixed(2));

    const standardUndiscountedPrice = (baseBotRateMonthlyINR * activeBotCount + fileSizeMonthlyCostINR + storageMonthlyCostINR) * durationMultiplier;
    const savingsTotalINR = Math.max(0, Math.round((standardUndiscountedPrice - discountedSubtotalINR) * 100) / 100);

    return {
      activeBotCount,
      totalBotSlots,
      maxPythonFileSizeMB,
      dbStorageMB,
      durationDays,

      baseBotRateMonthlyINR,
      botTierDiscountPercent,
      effectiveBotRateMonthlyINR,
      botsMonthlySubtotalINR,

      fileSizeMonthlyCostINR,
      storageMonthlyCostINR,

      baseMonthlyTotalINR: Math.round(baseMonthlyTotalINR * 100) / 100,
      durationMultiplier: Math.round(durationMultiplier * 100) / 100,
      durationDiscountPercent,
      durationDiscountAmountINR,

      subtotalINR,
      couponDiscountINR,
      taxRatePercent,
      taxAmountINR,
      finalPriceINR,

      finalPriceUSD,
      subtotalUSD,
      taxUSD,
      savingsTotalINR,
    };
  }
}
