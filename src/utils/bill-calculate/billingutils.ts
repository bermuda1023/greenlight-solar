export const calculateBilling = (inputs: {
  energyConsumed: number;
  startDate: Date; // Expecting ISO date string format (e.g., "2025-01-01")
  endDate: Date; // Expecting ISO date string format (e.g., "2025-01-10")
  fuelRate: number;
  energyExported: number;
  basePrice: number;
  feedInPrice: number;
}) => {
  const {
    energyConsumed,
    startDate,
    endDate,
    fuelRate,
    energyExported,
    basePrice,
    feedInPrice,
  } = inputs;

  // Calculate number of days from start and end dates
  const start = new Date(startDate);
  const end = new Date(endDate);
  const numberOfDays =
    (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);

  if (numberOfDays < 0) {
    throw new Error("Invalid date range: End date must be after start date.");
  }

  const dayRateKwH = energyConsumed / numberOfDays;
  const totalpts = energyConsumed + energyExported;
  // Belco Calculation
  let belcoTotal = 0;
  if (energyConsumed > 0) {
    belcoTotal += Math.min(energyConsumed, 250) * 0.13333;
    belcoTotal += Math.max(Math.min(energyConsumed - 250, 450), 0) * 0.2259;
    belcoTotal += Math.max(energyConsumed - 700, 0) * 0.3337;
  }

  // Facility Charges
  if (dayRateKwH > 0 && dayRateKwH <= 10) belcoTotal += 21.33;
  else if (dayRateKwH <= 15) belcoTotal += 32.0;
  else if (dayRateKwH <= 25) belcoTotal += 42.61;
  else if (dayRateKwH <= 50) belcoTotal += 66.66;
  else if (dayRateKwH > 50) belcoTotal += 101.33;

  // Additional Fees
  belcoTotal += 0.00635 * energyConsumed; // RA Fee
  belcoTotal += energyConsumed * fuelRate; // Fuel Fee
  belcoTotal -= 0.2265 * energyExported; // Export Rate

  const belcoPerKwhh = belcoTotal / energyConsumed;


  // Calculate final revenue
  const effectivePrice = Math.max(belcoPerKwhh * 0.8, basePrice);
  const consumptionRevenue = effectivePrice * energyConsumed;
  const exportRevenue = feedInPrice * energyExported;
  const totalRevenue = consumptionRevenue + exportRevenue;


  // Calculate energy rate per kWh
  const belcoPerKwh = totalRevenue / energyConsumed;
  return {
    totalpts,
    numberOfDays,
    belcoPerKwh,
    belcoTotal: parseFloat(belcoTotal.toFixed(2)),
    finalRevenue: parseFloat(totalRevenue.toFixed(2)),
  };
};
