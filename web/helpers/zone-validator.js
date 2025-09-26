/**
 * Validates if coordinates are within Nashville delivery zone
 * Uses local distance calculation
 */
export async function validateDeliveryZone(lat, lng) {
  return isInNashvilleArea(lat, lng);
}

/**
 * Local validation using distance from Nashville center
 * This is the fallback that always works
 */
function isInNashvilleArea(lat, lng) {
  // Nashville city center
  const nashvilleCenter = { lat: 36.1627, lng: -86.7816 };

  // Define delivery radius in kilometers
  const maxDistanceKm = 30; // Approximately 18.6 miles

  // Calculate distance using Haversine formula
  const distance = calculateDistance(
    nashvilleCenter.lat,
    nashvilleCenter.lng,
    lat,
    lng
  );

  console.log(`Distance from Nashville center: ${distance.toFixed(2)}km (max: ${maxDistanceKm}km)`);

  return distance <= maxDistanceKm;
}

/**
 * Haversine formula to calculate distance between two coordinates
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon/2) * Math.sin(dLon/2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

/**
 * Convert degrees to radians
 */
function toRad(deg) {
  return deg * (Math.PI / 180);
}