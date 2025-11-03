export const calculateBilling = (inputs: {
  energyConsumed: number;
  selfConsumption: number;
  totalProduction: number;
  startDate: Date;
  endDate: Date;
  energyExported: number;
  belcodisc: number;  
  export_rate: number;
  price: number;       //Customer rate
  belcoRate: number;
  scaling: number;
}) => {
  const {
    energyConsumed, 
    selfConsumption,
    totalProduction,
    scaling,
    startDate,  
    endDate,
    energyExported,
    price,           //Customer rate
    belcodisc,   
    export_rate,
    belcoRate,
  } = inputs;

  // Calculate the number of days between the start and end dates
  const start = new Date(startDate);
  const end = new Date(endDate);
  const numberOfDays = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)); // Use floor like C# (int) cast

  if (numberOfDays < 0) {
    throw new Error("Invalid date range: End date must be after start date.");
  };


      const scaledEnergyConsumed = energyConsumed * scaling;
      const scaledSelfConsumption = selfConsumption * scaling;
    

      //Rack Rate Calculation
      const rackRate = totalProduction*price;
   
      //25% off Belco Discount
      const AfterBelcoDisc = (scaledSelfConsumption * belcoRate * (1 - belcodisc));

      //feed in credit
      const feedInCredit = energyExported*export_rate;

      //Max Bill
      const MaxBill = feedInCredit + AfterBelcoDisc;

      //Total Revenue Calculation
      const finalRevenue = Math.min(rackRate, MaxBill);
   
      //Effective Rate Calculation i.e. Per KWh
      const effectiveRate = finalRevenue/totalProduction;

  return {
    numberOfDays,
    scaledEnergyConsumed,
    scaledSelfConsumption,
    totalProduction,
    energyExported,
    belcodisc,
    export_rate,
    price,    //Customer rate
    rackRate,
    AfterBelcoDisc,
    feedInCredit,
    MaxBill,
    effectiveRate,
    finalRevenue
  };
};