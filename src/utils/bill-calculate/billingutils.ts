export const calculateBilling = (inputs: {
  energyConsumed: number;
  startDate: Date; // Expecting ISO date string format (e.g., "2025-01-01")
  endDate: Date; // Expecting ISO date string format (e.g., "2025-01-10")
  fuelRate: number;
  energyExported: number;
  basePrice: number;
  feedInPrice: number;
  scaling: number; // Scaling factor for energy consumption, default is 1.0
  price:number;
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
    belcoTotal += Math.min(scalledenergyConsumed, 250) * 0.13333;  //tier1 variable
    belcoTotal += Math.max(Math.min(scalledenergyConsumed - 250, 450), 0) * 0.2259;  //tier2 variable
    belcoTotal += Math.max(scalledenergyConsumed - 700, 0) * 0.3337;  //tier3 variable
  }

  // Facility Charges
  if (dayRateKwH > 0 && dayRateKwH <= 10) belcoTotal += 21.33; //dayrate1 variable
  else if (dayRateKwH <= 15) belcoTotal += 32.0;  //dayrate2 variable
  else if (dayRateKwH <= 25) belcoTotal += 42.61;  //dayrate3 variable
  else if (dayRateKwH <= 50) belcoTotal += 66.66;  //dayrate4 variable
  else if (dayRateKwH > 50) belcoTotal += 101.33;  //dayrate5 variable

  // Additional Fees
  belcoTotal += 0.00635 * scalledenergyConsumed; // RA Fee variable
  belcoTotal += scalledenergyConsumed * fuelRate; // Fuel Fee
  belcoTotal -= 0.2265 * energyExported; // Export Rate variable

  const belcoPerKwhh = belcoTotal / scalledenergyConsumed;


  // Calculate final revenue
  const effectivePrice = Math.max(belcoPerKwhh * 0.8, basePrice); //belcomultiplier variable
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
