export type GeorefPoint = { lat: number; lon: number };

export type GeorefProvince = { id: string; name: string };
export type GeorefDepartment = { id: string; name: string; category?: string };
export type GeorefLocality = { id: string; name: string };
export type GeorefLocalityResolution = { localityId: string; departmentId: string };

export type GeorefAddress = {
  id: string;
  formattedAddress: string;
  street: string;
  streetNumber: string;
  province: GeorefProvince;
  department: GeorefDepartment | null;
  locality: GeorefLocality | null;
  location: GeorefPoint;
};

export type GeorefTerritoryResponse = {
  provinces?: GeorefProvince[];
  departments?: GeorefDepartment[];
  localities?: GeorefLocality[];
};
