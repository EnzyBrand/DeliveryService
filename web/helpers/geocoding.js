/**
 * Converts an address to lat/lng coordinates
 * Uses local ZIP-based coordinate lookup for Nashville area
 */
export async function geocodeAddress(address) {
  // Use local ZIP-based approximation only
  return getApproximateCoordinates(address.zip);
}

/**
 * Fallback: Approximate coordinates for Nashville area ZIP codes
 * This ensures the service works even without external APIs
 */
function getApproximateCoordinates(zip) {
  if (!zip) return null;

  const zipPrefix = zip.substring(0, 5);

  // Nashville area ZIP coordinates (approximate centers)
  const nashvilleZipCoords = {
    // Downtown Nashville
    '37201': { lat: 36.1627, lng: -86.7816 },
    '37202': { lat: 36.1659, lng: -86.7844 },
    '37203': { lat: 36.1398, lng: -86.7689 },
    '37204': { lat: 36.1573, lng: -86.7679 },
    '37205': { lat: 36.1094, lng: -86.8690 },
    '37206': { lat: 36.1826, lng: -86.7426 },
    '37207': { lat: 36.2298, lng: -86.7710 },
    '37208': { lat: 36.1761, lng: -86.8078 },
    '37209': { lat: 36.1296, lng: -86.8137 },
    '37210': { lat: 36.1829, lng: -86.7334 },
    '37211': { lat: 36.0729, lng: -86.7184 },
    '37212': { lat: 36.1357, lng: -86.7897 },
    '37213': { lat: 36.1653, lng: -86.7378 },
    '37214': { lat: 36.1625, lng: -86.6689 },
    '37215': { lat: 36.1027, lng: -86.8147 },
    '37216': { lat: 36.2156, lng: -86.7332 },
    '37217': { lat: 36.1072, lng: -86.6691 },
    '37218': { lat: 36.2088, lng: -86.8355 },
    '37219': { lat: 36.1493, lng: -86.7873 },
    '37220': { lat: 36.0643, lng: -86.8008 },
    '37221': { lat: 36.0667, lng: -86.9553 },

    // Surrounding areas
    '37027': { lat: 36.0656, lng: -86.8992 }, // Brentwood
    '37064': { lat: 36.0339, lng: -86.7903 }, // Franklin
    '37067': { lat: 36.0331, lng: -86.7889 }, // Franklin
    '37115': { lat: 36.3143, lng: -86.6914 }, // Madison
    '37122': { lat: 36.3931, lng: -86.7532 }, // Mount Juliet
    '37138': { lat: 36.2728, lng: -86.5772 }, // Old Hickory
  };

  return nashvilleZipCoords[zipPrefix] || null;
}