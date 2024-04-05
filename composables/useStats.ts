type Feature = {
  type: string;
  properties: {
    id?: string;
    line: number;
    name: string;
    status: 'done' | 'wip' | 'planned' | 'postponed' | 'unknown' | 'variante' | 'variante-postponed';
    doneAt?: string;
  };
  geometry: {
    type: string;
    coordinates: number[][];
  };
};

type Geojson = {
  type: string;
  features: Feature[];
};

export const useStats = () => {
  function getAllUniqLineStrings(voies: Geojson[]) {
    return voies
      .map(voie => voie.features)
      .flat()
      .filter(feature => feature.geometry.type === 'LineString')
      .filter((feature, index, sections) => {
        if (feature.properties.id === undefined) {
          return true;
        }
        if (feature.properties.id === 'variante2') {
          return false;
        }

        return index === sections.findIndex(section => section.properties.id === feature.properties.id);
      });
  }

  /**
   * distance is in meters
   */
  function getDistance({ features }: { features: Feature[] }): number {
    return features.reduce((acc: number, feature: Feature) => {
      return acc + getLineStringDistance(feature);
    }, 0);
  }

  function getLineStringDistance(feature: Feature) {
    if (feature.geometry.type !== 'LineString') {
      throw new Error('[getLineStringDistance] Feature must be a LineString');
    }

    let distance = 0;
    const coordinates = feature.geometry.coordinates;

    for (let i = 0; i < coordinates.length - 1; i++) {
      const [lon1, lat1] = coordinates[i];
      const [lon2, lat2] = coordinates[i + 1];
      distance += haversine(lat1, lon1, lat2, lon2);
    }

    return distance;
  }

  function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
    // Convert latitude and longitude from degrees to radians
    const toRadians = (angle: number) => (angle * Math.PI) / 180;
    lat1 = toRadians(lat1);
    lon1 = toRadians(lon1);
    lat2 = toRadians(lat2);
    lon2 = toRadians(lon2);

    // Haversine formula
    const dLat = lat2 - lat1;
    const dLon = lon2 - lon1;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.asin(Math.sqrt(a));

    // Radius of the Earth in meters
    const radius = 6371000;

    // Calculate the distance in meters
    return Math.round(radius * c);
  }

  function displayDistanceInKm(distance: number) {
    if (distance === 0) {
      return '0 km';
    }
    const distanceInKm = distance / 1000;
    return `${distanceInKm.toFixed(2)} km`;
  }

  function displayPercent(percent: number) {
    return `${percent}%`;
  }

  function getStats(voies: Geojson[]) {
    const features = getAllUniqLineStrings(voies);
    const doneFeatures = features.filter(feature => feature.properties.status === 'done');
    const wipFeatures = features.filter(feature => feature.properties.status === 'wip');
    const plannedFeatures = features.filter(feature =>
      ['planned', 'unknown', 'variante'].includes(feature.properties.status)
    );
    const postponedFeatures = features.filter(feature =>
      ['postponed', 'variante-postponed'].includes(feature.properties.status)
    );

    const totalDistance = getDistance({ features });
    const doneDistance = getDistance({ features: doneFeatures });
    const wipDistance = getDistance({ features: wipFeatures });
    const plannedDistance = getDistance({ features: plannedFeatures });
    const postponedDistance = getDistance({ features: postponedFeatures });

    function getPercent(distance: number) {
      return Math.round((distance / totalDistance) * 100);
    }

    return {
      done: {
        name: 'Réalisés',
        distance: doneDistance,
        percent: getPercent(doneDistance),
        class: 'text-lvv-blue-600 font-semibold'
      },
      wip: {
        name: 'En travaux',
        distance: wipDistance,
        percent: getPercent(wipDistance),
        class: 'text-lvv-blue-600 font-normal'
      },
      planned: {
        name: 'Prévus',
        distance: plannedDistance,
        percent: getPercent(plannedDistance),
        class: 'text-black font-semibold'
      },
      postponed: {
        name: 'Reportés',
        distance: postponedDistance,
        percent: getPercent(postponedDistance),
        class: 'text-lvv-pink font-semibold'
      }
    };
  }

  return { getAllUniqLineStrings, getDistance, getStats, displayDistanceInKm, displayPercent };
};
