import fetch from 'node-fetch';

/**
 * Converts a full address string into lat/lng using Google Maps Geocoding API
 * @param {string} address - Full address string to geocode
 * @returns {{ lat: number, lng: number }} Latitude and longitude
 */
export async function geocodeAddress(address) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) throw new Error('Missing GOOGLE_MAPS_API_KEY in .env');

  const encoded = encodeURIComponent(address);
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encoded}&key=${apiKey}`;

  const res = await fetch(url);
  const data = await res.json();

  if (
    data.status === 'OK' &&
    data.results &&
    data.results.length > 0 &&
    data.results[0].geometry
  ) {
    return {
      lat: data.results[0].geometry.location.lat,
      lng: data.results[0].geometry.location.lng
    };
  } else {
    throw new Error(`Failed to geocode address: ${data.status}`);
  }
}
