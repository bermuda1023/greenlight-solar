export const calculateBilling = (inputs: {
  energyConsumed: number;
  selfConsumption: number;
  totalProduction: number;
  startDate: Date; // Expecting ISO date string format (e.g., "2025-01-01")
  endDate: Date; // Expecting ISO date string format (e.g., "2025-01-10")
  fuelRate: number;
  energyExported: number;
  basePrice: number;
  feedInPrice: number;
  belcodisc: number;
  ra_fee: number;
  export_rate: number;
  tier1: number;
  tier2: number;
  tier3: number;
  scaling: number; // Scaling factor for energy consumption, default is 1.0
  price: number;
  fixedFeeSaving: number;
}) => {
  const {
    energyConsumed,
    selfConsumption,
    totalProduction,
    scaling,
    startDate,
    endDate,
    fuelRate,
    energyExported,
    basePrice,
    feedInPrice,
    belcodisc,
    ra_fee,
    export_rate,
    tier1,
    tier2,
    tier3,
    fixedFeeSaving,
  } = inputs;

  // Calculate the number of days between the start and end dates
  const start = new Date(startDate);
  const end = new Date(endDate);
  const numberOfDays =Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

  if (numberOfDays < 0) {
    throw new Error("Invalid date range: End date must be after start date.");
  }

  const scaledEnergyConsumed = energyConsumed * scaling;
  const scaledSelfConsumed = selfConsumption * scaling;

  const dayRateKwH = scaledEnergyConsumed / numberOfDays;
  const totalpts = scaledEnergyConsumed + energyExported;

  // **Belco Calculation**
  let belcoTotal = 0;
  if (scaledEnergyConsumed > 0) {
    belcoTotal += Math.min(scaledEnergyConsumed, 250) * tier1;
    belcoTotal +=
      Math.max(Math.min(scaledEnergyConsumed - 250, 450), 0) * tier2;
    belcoTotal += Math.max(scaledEnergyConsumed - 700, 0) * tier3;
  }

  // **Facility Charges** - Based on daily average
  if (dayRateKwH > 0 && dayRateKwH <= 10) belcoTotal += 21.33;
  else if (dayRateKwH > 10 && dayRateKwH <= 15) belcoTotal += 32.0;
  else if (dayRateKwH > 15 && dayRateKwH <= 25) belcoTotal += 42.61;
  else if (dayRateKwH > 25 && dayRateKwH <= 50) belcoTotal += 66.66;
  else if (dayRateKwH > 50) belcoTotal += 101.33;

  // **Additional Fees**
  belcoTotal += ra_fee * scaledEnergyConsumed;
  belcoTotal += scaledEnergyConsumed * fuelRate;

  // **Export Credit** - Subtract export credits from Belco bill
  belcoTotal -= export_rate * energyExported;

  const belcoPerKwh = scaledEnergyConsumed > 0 ? belcoTotal / scaledEnergyConsumed : 0;

  // **Revenue Calculation**
  let consumptionRevenue;
  const effectiveBelcoRate = belcoPerKwh * belcodisc;

  if (effectiveBelcoRate < basePrice) {
    // Case 1: Effective Belco rate is less than Base Price
    consumptionRevenue = basePrice * scaledSelfConsumed;
  } else {
    // Case 2: Effective Belco rate is greater than or equal to Base Price
    consumptionRevenue = effectiveBelcoRate * scaledSelfConsumed;
  }

  const exportRevenue = feedInPrice * energyExported;
  const totalRevenue = consumptionRevenue + exportRevenue;

  // **Calculate what customer would pay Belco (without export credit)**
  const belcoRevenue = scaledEnergyConsumed * belcoPerKwh;

  // **GreenLight Revenue (what GreenLight gets from customer)**
  const greenlightRevenue = (scaledSelfConsumed * totalRevenue) / totalProduction;

  // **Savings Calculation**
  const savings = belcoRevenue - greenlightRevenue + fixedFeeSaving;

  return {
    totalpts,
    numberOfDays,
    belcoPerKwh: parseFloat(belcoPerKwh.toFixed(4)),
    belcoTotal: parseFloat(belcoTotal.toFixed(2)),
    finalRevenue: parseFloat(totalRevenue.toFixed(2)),
    belcoRevenue: parseFloat(belcoRevenue.toFixed(2)),
    greenlightRevenue: parseFloat(greenlightRevenue.toFixed(2)),
    savings: parseFloat(savings.toFixed(2)),
  };
};
