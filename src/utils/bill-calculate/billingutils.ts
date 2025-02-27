export const calculateBilling = (inputs: {
  energyConsumed: number;
  selfConsumption: number;
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

  // Calculate number of days from start and end dates
  const start = new Date(startDate);
  const end = new Date(endDate);
  const numberOfDays =
    (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);

  if (numberOfDays < 0) {
    throw new Error("Invalid date range: End date must be after start date.");
  }

  const scalledenergyConsumed = energyConsumed * scaling;
  const scalledSelfConsumed = selfConsumption * scaling;

  const dayRateKwH = scalledenergyConsumed / numberOfDays;
  const totalpts = scalledenergyConsumed + energyExported;

  // **Belco Calculation**
  let belcoTotal = 0;
  if (scalledenergyConsumed) {
    belcoTotal += Math.min(scalledenergyConsumed) * tier1;
    belcoTotal += Math.max(Math.min(scalledenergyConsumed, 450), 0) * tier2;
    belcoTotal += Math.max(scalledenergyConsumed, 0) * tier3;
  }

  // **Facility Charges**
  if (dayRateKwH > 0 && dayRateKwH <= 10) belcoTotal += 21.33;
  else if (dayRateKwH <= 15) belcoTotal += 32.0;
  else if (dayRateKwH <= 25) belcoTotal += 42.61;
  else if (dayRateKwH <= 50) belcoTotal += 66.66;
  else if (dayRateKwH > 50) belcoTotal += 101.33;

  // **Additional Fees**
  belcoTotal += ra_fee * scalledenergyConsumed;
  belcoTotal += scalledenergyConsumed * fuelRate;
  belcoTotal -= export_rate * energyExported;

  const belcoPerKwhh = belcoTotal / scalledenergyConsumed;

  // **Updated Revenue Calculation (Using scalledSelfConsumed in the condition only)**
  let consumptionRevenue;
  if (belcoPerKwhh * belcodisc < basePrice) {
    // Case 1: (Belco Total * 0.8) < Base Price
    consumptionRevenue = basePrice * scalledSelfConsumed; // Used scaled self-consumption
  } else {
    // Case 2: (Belco Total * 0.8) > Base Price
    consumptionRevenue = belcoPerKwhh * belcodisc * scalledSelfConsumed; // Used scaled self-consumption
  }

  const exportRevenue = feedInPrice * energyExported;
  const totalRevenue = consumptionRevenue + exportRevenue;

  // **Energy Rate Calculation remains unchanged**
  const belcoPerKwh = totalRevenue / scalledenergyConsumed;

  // **Savings Calculation remains unchanged**
  const belcoRevenue = scalledenergyConsumed * belcoPerKwhh;
  const greenlightRevenue = scalledSelfConsumed * Math.max(belcoPerKwhh * belcodisc, basePrice);
  const savings =
    belcoRevenue - greenlightRevenue + fixedFeeSaving - belcoTotal;

  return {
    totalpts,
    numberOfDays,
    belcoPerKwh,
    belcoTotal: parseFloat(belcoTotal.toFixed(2)),
    finalRevenue: parseFloat(totalRevenue.toFixed(2)),
    belcoRevenue: parseFloat(belcoRevenue.toFixed(2)),
    greenlightRevenue: parseFloat(greenlightRevenue.toFixed(2)),
    savings: parseFloat(savings.toFixed(2)),
  };
};
