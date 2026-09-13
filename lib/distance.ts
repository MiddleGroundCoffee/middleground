type Coordinate = {
  latitude: number;
  longitude: number;
};

export function calculateDistanceKm(
  pointA: Coordinate,
  pointB: Coordinate
) {
  const earthRadiusKm = 6371;

  const lat1 =
    degreesToRadians(
      pointA.latitude
    );

  const lat2 =
    degreesToRadians(
      pointB.latitude
    );

  const deltaLat =
    degreesToRadians(
      pointB.latitude -
        pointA.latitude
    );

  const deltaLng =
    degreesToRadians(
      pointB.longitude -
        pointA.longitude
    );

  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(deltaLng / 2) **
        2;

  const c =
    2 *
    Math.atan2(
      Math.sqrt(a),
      Math.sqrt(1 - a)
    );

  return earthRadiusKm * c;
}

function degreesToRadians(
  degrees: number
) {
  return (
    degrees *
    (Math.PI / 180)
  );
}
