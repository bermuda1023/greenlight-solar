export const calculateBilling = (inputs: {
  energyConsumed: number;
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
}) => {
  const {
    energyConsumed,
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

  const dayRateKwH = scalledenergyConsumed / numberOfDays;
  const totalpts = scalledenergyConsumed + energyExported;
  // Belco Calculation
  let belcoTotal = 0;
  if (scalledenergyConsumed > 0) {
    belcoTotal += Math.min(scalledenergyConsumed, 250) * tier1; //tier1 variable
    belcoTotal +=
      Math.max(Math.min(scalledenergyConsumed - 250, 450), 0) * tier2; //tier2 variable
    belcoTotal += Math.max(scalledenergyConsumed - 700, 0) * tier3; //tier3 variable
  }

  // Facility Charges
  if (dayRateKwH > 0 && dayRateKwH <= 10)
    belcoTotal += 21.33; //dayrate1 variable
  else if (dayRateKwH <= 15)
    belcoTotal += 32.0; //dayrate2 variable
  else if (dayRateKwH <= 25)
    belcoTotal += 42.61; //dayrate3 variable
  else if (dayRateKwH <= 50)
    belcoTotal += 66.66; //dayrate4 variable
  else if (dayRateKwH > 50) belcoTotal += 101.33; //dayrate5 variable

  // Additional Fees
  belcoTotal += ra_fee * scalledenergyConsumed; // RA Fee variable
  belcoTotal += scalledenergyConsumed * fuelRate; // Fuel Fee
  belcoTotal -= export_rate * energyExported; // Export Rate variable

  const belcoPerKwhh = belcoTotal / scalledenergyConsumed;

  // Calculate final revenue
  const effectivePrice = Math.max(belcoPerKwhh * belcodisc, basePrice); //belcomultiplier variable
  const consumptionRevenue = effectivePrice * scalledenergyConsumed;
  const exportRevenue = feedInPrice * energyExported;
  const totalRevenue = consumptionRevenue + exportRevenue;

  // Calculate energy rate per kWh
  const belcoPerKwh = totalRevenue / scalledenergyConsumed;
  return {
    totalpts,
    numberOfDays,
    belcoPerKwh,
    belcoTotal: parseFloat(belcoTotal.toFixed(2)),
    finalRevenue: parseFloat(totalRevenue.toFixed(2)),
  };
};
