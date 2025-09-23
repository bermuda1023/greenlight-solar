export const calculateBilling = (inputs: {
  energyConsumed: number;
  selfConsumption: number;
  totalProduction: number;
  startDate: Date;
  endDate: Date;
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
  scaling: number;
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
    feedInPrice,
    price,
    fixedFeeSaving,
    belcodisc,
    ra_fee,
    export_rate,
    tier1,
    tier2,
    tier3,
    basePrice,
  } = inputs;

  // Calculate the number of days between the start and end dates
  const start = new Date(startDate);
  const end = new Date(endDate);
  const numberOfDays = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)); // Use floor like C# (int) cast

  if (numberOfDays < 0) {
    throw new Error("Invalid date range: End date must be after start date.");
  }

  const scaledEnergyConsumed = energyConsumed * scaling;
  const scaledSelfConsumption = selfConsumption * scaling;

  const dayRateKwH = scaledEnergyConsumed / numberOfDays;

  // **Belco Calculation**
  let belcoTotal = 0;

  const tier1Amount = Math.min(scaledEnergyConsumed, 250) * tier1;
  const tier2Amount = Math.max(Math.min(scaledEnergyConsumed - 250, 450), 0) * tier2;
  const tier3Amount = Math.max(scaledEnergyConsumed - 700, 0) * tier3;

  belcoTotal += tier1Amount;
  belcoTotal += tier2Amount;
  belcoTotal += tier3Amount;

  // console.log('Tier calculations:');
  // console.log('  scaledEnergyConsumed:', scaledEnergyConsumed);
  // console.log('  tier1Amount (min(', scaledEnergyConsumed, ', 250) * 0.17193):', tier1Amount);
  // console.log('  tier2Amount (max(min(', scaledEnergyConsumed - 250, ', 450), 0) * 0.30698):', tier2Amount);
  // console.log('  tier3Amount (max(', scaledEnergyConsumed - 700, ', 0) * 0.48350):', tier3Amount);
  // console.log('  belcoTotal after tiers:', belcoTotal);

  // **Facility Charges**
  let facilityCharge = 0;
  if (dayRateKwH > 0 && dayRateKwH <= 10) facilityCharge = 28.47;
  else if (dayRateKwH > 10 && dayRateKwH <= 15) facilityCharge = 42.71;
  else if (dayRateKwH > 15 && dayRateKwH <= 25) facilityCharge = 56.88;
  else if (dayRateKwH > 25 && dayRateKwH <= 50) facilityCharge = 88.98;
  else if (dayRateKwH > 50) facilityCharge = 135.25;

  belcoTotal += facilityCharge;
  console.log('  facilityCharge (dayRateKwH:', dayRateKwH, '):', facilityCharge);
  console.log('  belcoTotal after facility:', belcoTotal);

  // **Additional Fees**
  const raFeeAmount = ra_fee * scaledEnergyConsumed;
  const fuelFeeAmount = scaledEnergyConsumed * fuelRate;
  const exportRateAmount = -export_rate * 0; // C# passes 0 for export in BelcoCalc

  belcoTotal += raFeeAmount;
  belcoTotal += fuelFeeAmount;
  belcoTotal += exportRateAmount;

  // console.log('Additional fees:');
  // console.log('  raFeeAmount (0.00545 *', scaledEnergyConsumed, '):', raFeeAmount);
  // console.log('  fuelFeeAmount (', scaledEnergyConsumed, '*', fuelRate, '):', fuelFeeAmount);
  // console.log('  exportRateAmount (-0.1055 *', energyExported, '):', exportRateAmount);
  // console.log('  belcoTotal final:', belcoTotal);


  const belcoPerKwh = belcoTotal / energyConsumed;

  // **Revenue Calculation
  let revenue;
  if ((belcoPerKwh * belcodisc) < price) {
    // Case 1: (Belco Per kWh * belcodisc) is less than Price
    revenue = price * scaledSelfConsumption + energyExported * feedInPrice;
  } else {
    // Case 2: (Belco Per kWh * belcodisc) is greater than or equal to Price
    revenue = (belcoPerKwh * belcodisc) * scaledSelfConsumption + energyExported * feedInPrice;
  }

  // Additional check: if revenue/production > price, cap at price
  let effectiveRate;
  if ((revenue / totalProduction) > price) {
    effectiveRate = price;
    revenue = totalProduction * effectiveRate;
  } else {
    effectiveRate = revenue / totalProduction;
  }

  // **Calculate revenues for display**
  const belcoRevenue = scaledEnergyConsumed * belcoPerKwh;
  const greenlightRevenue = scaledSelfConsumption * effectiveRate;
  
  const remainingConsumption = (energyConsumed - selfConsumption) * scaling;
  let remainingBelcoTotal = 0;

  // Calculate belco cost for remaining consumption using the same BelcoCalc logic
  remainingBelcoTotal += Math.min(remainingConsumption, 250) * tier1;
  remainingBelcoTotal += Math.max(Math.min(remainingConsumption - 250, 450), 0) * tier2;
  remainingBelcoTotal += Math.max(remainingConsumption - 700, 0) * tier3;

  // Add facility charges for remaining consumption
  const remainingDayRate = remainingConsumption / numberOfDays;
  if (remainingDayRate > 0 && remainingDayRate <= 10) remainingBelcoTotal += 28.47;
  else if (remainingDayRate > 10 && remainingDayRate <= 15) remainingBelcoTotal += 42.71;
  else if (remainingDayRate > 15 && remainingDayRate <= 25) remainingBelcoTotal += 56.88;
  else if (remainingDayRate > 25 && remainingDayRate <= 50) remainingBelcoTotal += 88.98;
  else if (remainingDayRate > 50) remainingBelcoTotal += 135.25;

  remainingBelcoTotal += ra_fee * remainingConsumption;
  remainingBelcoTotal += remainingConsumption * fuelRate;

  const savings = belcoRevenue - greenlightRevenue + fixedFeeSaving - remainingBelcoTotal;

  return {
    totalpts: scaledEnergyConsumed + energyExported,
    numberOfDays,
    belcoPerKwh: parseFloat(belcoPerKwh.toFixed(3)),
    belcoTotal: parseFloat(belcoTotal.toFixed(2)),
    finalRevenue: parseFloat(revenue.toFixed(2)),
    belcoRevenue: parseFloat(belcoRevenue.toFixed(2)),
    greenlightRevenue: parseFloat(greenlightRevenue.toFixed(2)),
    savings: parseFloat(savings.toFixed(2)),
  };
};
