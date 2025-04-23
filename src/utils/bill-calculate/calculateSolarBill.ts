interface BillCalculationResult {
  baseCost: number;
  facilityCharge: number;
  regulatoryFee: number;
  fuelFee: number;
  exportCredit: number;
  totalBelcoCost: number;
  effectiveRate: number;
  revenue: number;
  greenlightRevenue: number;
  savings: number;
  belcoPrice: number;
}

export const calculateSolarBill = (params: {
  consumption: number;
  selfConsumption: number;
  export: number;
  production: number;
  price: number;
  feedInPrice: number;
  scaling: number;
  fixedFeeSaving: number;
  startDate: Date;
  endDate: Date;
  fuelRate?: number;
}): BillCalculationResult => {
  const {
    consumption,
    selfConsumption,
    export: exportKwh,
    production,
    price,
    feedInPrice,
    scaling,
    fixedFeeSaving,
    startDate,
    endDate,
    fuelRate = 0.14304,
  } = params;

  // Calculate scaled consumption for Belco calculation
  const scaledConsumption = consumption * scaling;

  // Calculate base rate tiers
  let baseCost = 0;
  let remainingConsumption = scaledConsumption;

  // First tier: 0-250 kWh
  baseCost += Math.min(remainingConsumption, 250) * 0.13333;
  remainingConsumption = Math.max(0, remainingConsumption - 250);

  // Second tier: 251-700 kWh
  baseCost += Math.min(remainingConsumption, 450) * 0.2259;
  remainingConsumption = Math.max(0, remainingConsumption - 450);

  // Third tier: >700 kWh
  baseCost += remainingConsumption * 0.3337;

  // Calculate facility charge based on daily average
  const days = Math.ceil(
    (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
  );
  const dailyAverage = scaledConsumption / days;

  let facilityCharge = 0;
  if (dailyAverage <= 10) facilityCharge = 21.33;
  else if (dailyAverage <= 15) facilityCharge = 32.0;
  else if (dailyAverage <= 25) facilityCharge = 42.61;
  else if (dailyAverage <= 50) facilityCharge = 66.66;
  else facilityCharge = 101.33;

  // Calculate additional fees
  const regulatoryFee = scaledConsumption * 0.00635;
  const fuelFee = scaledConsumption * fuelRate;
  const exportCredit = -exportKwh * 0.2265;

  // Calculate total Belco cost
  const totalBelcoCost = baseCost + facilityCharge + regulatoryFee + fuelFee;
  const belcoPrice = totalBelcoCost / consumption;

  // Calculate Greenlight revenue
  let revenue: number;
  if (belcoPrice * 0.75 < price) {
    revenue = price * selfConsumption + exportKwh * feedInPrice;
  } else {
    revenue = belcoPrice * 0.75 * selfConsumption + exportKwh * feedInPrice;
  }

  // Adjust effective rate if needed
  let effectiveRate: number;
  if (revenue / production > price) {
    effectiveRate = price;
    revenue = production * price;
  } else {
    effectiveRate = revenue / production;
  }

  // Calculate final costs
  const greenlightRevenue = selfConsumption * effectiveRate;

  // Calculate savings (including fixed fee saving and remaining consumption cost)
  const remainingConsumptionCost = calculateBelcoCost(
    (consumption - selfConsumption) * scaling,
    startDate,
    endDate,
    fuelRate,
  );

  const savings =
    totalBelcoCost -
    greenlightRevenue +
    fixedFeeSaving -
    remainingConsumptionCost;

  return {
    baseCost,
    facilityCharge,
    regulatoryFee,
    fuelFee,
    exportCredit,
    totalBelcoCost,
    effectiveRate,
    revenue,
    greenlightRevenue,
    savings,
    belcoPrice,
  };
};

// Helper function to calculate Belco cost for remaining consumption
function calculateBelcoCost(
  consumption: number,
  startDate: Date,
  endDate: Date,
  fuelRate: number,
): number {
  let cost = 0;
  let remaining = consumption;

  // Base rate tiers
  cost += Math.min(remaining, 250) * 0.13333;
  remaining = Math.max(0, remaining - 250);

  cost += Math.min(remaining, 450) * 0.2259;
  remaining = Math.max(0, remaining - 450);

  cost += remaining * 0.3337;

  // Facility charge
  const days = Math.ceil(
    (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
  );
  const dailyAverage = consumption / days;

  if (dailyAverage <= 10) cost += 21.33;
  else if (dailyAverage <= 15) cost += 32.0;
  else if (dailyAverage <= 25) cost += 42.61;
  else if (dailyAverage <= 50) cost += 66.66;
  else cost += 101.33;

  // Additional fees
  cost += consumption * 0.00635; // Regulatory fee
  cost += consumption * fuelRate; // Fuel fee

  return cost;
}
