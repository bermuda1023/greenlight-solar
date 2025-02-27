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

  // **Log Before Belco Calculation**
  console.log("Before Belco Calculation:💕💕💕😘😉😉");
  console.log("Scaled Energy Consumed:", scalledenergyConsumed);
  console.log("Scaled Self Consumed 😢😢😢😢:", scalledSelfConsumed);
  console.log("Number of Days:", numberOfDays);
  console.log("Day Rate kWh:", dayRateKwH);
  console.log(
    "Total PTS (Consumed + Exported) 🎂🎂🐱‍👤🐱‍👤🤳🤳🎉🎉👏:",
    totalpts,
  );

  // Belco Calculation
  let belcoTotal = 0;
  if (scalledSelfConsumed > 0) {
    belcoTotal += Math.min(scalledSelfConsumed, 250) * tier1; //tier1 variable
    belcoTotal += Math.max(Math.min(scalledSelfConsumed - 250, 450), 0) * tier2; //tier2 variable
    belcoTotal += Math.max(scalledSelfConsumed - 700, 0) * tier3; //tier3 variable
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

  console.log("After Belco Calculation 🐱‍🏍🐱‍🏍😜😜💖💖😢😢🎶:");
  console.log("Belco Total:", belcoTotal);

  // Additional Fees
  belcoTotal += ra_fee * scalledenergyConsumed; // RA Fee variable
  belcoTotal += scalledenergyConsumed * fuelRate; // Fuel Fee
  belcoTotal -= export_rate * energyExported; // Export Rate variable

  const belcoPerKwhh = belcoTotal / scalledenergyConsumed;

  console.log("After Belco Calculation Additional Fee:");
  console.log("Belco Total:", belcoTotal);
  console.log("Belco Per kWh:", belcoPerKwhh);

  // Calculate final revenue
  const effectivePrice = Math.max(belcoPerKwhh * belcodisc, basePrice); //belcomultiplier variable
  const consumptionRevenue = effectivePrice * scalledenergyConsumed;
  const exportRevenue = feedInPrice * energyExported;
  const totalRevenue = consumptionRevenue + exportRevenue;

  // Calculate energy rate per kWh
  const belcoPerKwh = totalRevenue / scalledenergyConsumed;

  // Savings Calculation
  const belcoRevenue = scalledenergyConsumed * belcoPerKwhh;
  const greenlightRevenue = scalledSelfConsumed * effectivePrice;
  const savings =
    belcoRevenue - greenlightRevenue + fixedFeeSaving - belcoTotal;

  console.log("✅ Savings Calculation:");
  console.log("   🔹 Belco Revenue:", belcoRevenue);
  console.log("   🔹 Greenlight Revenue:", greenlightRevenue);
  console.log("   🔹 Fixed Fee Saving:", fixedFeeSaving);
  console.log("   🔹 Total Savings:", savings);

  return {
    totalpts,
    numberOfDays,
    belcoPerKwh,
    belcoTotal: parseFloat(belcoTotal.toFixed(2)),
    finalRevenue: parseFloat(totalRevenue.toFixed(2)),
    belcoRevenue: parseFloat(belcoRevenue.toFixed(2)), // ✅ Added this
    greenlightRevenue: parseFloat(greenlightRevenue.toFixed(2)), // ✅ Added this
    savings: parseFloat(savings.toFixed(2)), // ✅ Added this
  };
};
