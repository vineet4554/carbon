const GRID_EMISSION_FACTOR = 0.40;

const TRANSPORT_FACTORS = {
  ev: 0.05,
  petrol: 0.18,
  diesel: 0.20,
  public: 0.04,
  flight: 0.25,
  bicycle: 0.0,
  none: 0.0
};

const FOOD_FACTORS = {
  vegan: 2.0,
  vegetarian: 3.5,
  omnivore: 5.0,
  high_meat: 8.0
};
const DEFAULT_FOOD_FACTOR = 5.0;

const WASTE_RECYCLED_FACTOR = 0.10;
const WASTE_NON_RECYCLED_FACTOR = 0.50;

const calculateEnergy = (kwh) => {
  return kwh * GRID_EMISSION_FACTOR;
};

const calculateTransport = (distanceKm, vehicleType) => {
  const factor = TRANSPORT_FACTORS[(vehicleType || '').toLowerCase()] ?? 0.0;
  return distanceKm * factor;
};

const calculateFood = (dietType, days = 1.0) => {
  const factor = FOOD_FACTORS[(dietType || '').toLowerCase()] ?? DEFAULT_FOOD_FACTOR;
  return factor * days;
};

const calculateWaste = (weightKg, recycled) => {
  const factor = recycled ? WASTE_RECYCLED_FACTOR : WASTE_NON_RECYCLED_FACTOR;
  return weightKg * factor;
};

module.exports = {
  calculateEnergy,
  calculateTransport,
  calculateFood,
  calculateWaste
};
