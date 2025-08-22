import React from 'react'
import { YStack, Card, H3, Button } from 'tamagui'
import Dropzone from 'react-dropzone'
import { CloudUpload } from '@tamagui/lucide-icons'
import { VectorMap } from "@react-jvectormap/core"
import { worldMill } from "@react-jvectormap/world"

interface Marker {
  latLng: [number, number]; // [latitude, longitude]
  name: string;
  value: number;
  style?: { fill: string };
}

const countryNames: { [key: string]: string } = {
  AR: "Argentina",
  AU: "Australia",
  BH: "Bahrain",
  BR: "Brazil",
  CM: "Cameroon",
  CA: "Canada",
  CN: "China",
  CO: "Colombia",
  CU: "Cuba",
  FR: "France",
  GL: "Greenland",
  GU: "Guam",
  HK: "Hong Kong",
  IN: "India",
  ID: "Indonesia",
  IL: "Israel",
  IT: "Italy",
  JP: "Japan",
  MO: "Macau",
  MV: "Maldives",
  MX: "Mexico",
  NZ: "New Zealand",
  NO: "Norway",
  PY: "Paraguay",
  PE: "Peru",
  QA: "Qatar",
  RU: "Russia",
  SN: "Senegal",
  SG: "Singapore",
  ZA: "South Africa",
  ES: "Spain",
  TW: "Taiwan",
  TZ: "Tanzania",
  GB: "United Kingdom",
  // US: "United States",
  UZ: "Uzbekistan",
  VN: "Vietnam",
}

const markers: Marker[] = [
  { latLng: [48.8566, 2.3522], name: "Paris", value: 10, style: { fill: "#66586d" } }, // France
  { latLng: [40.7128, -74.006], name: "New York", value: 20, style: { fill: "#66586d" } }, // USA
  { latLng: [35.6895, 139.6917], name: "Tokyo", value: 15, style: { fill: "#66586d" } }, // Japan
  { latLng: [-33.8688, 151.2093], name: "Sydney", value: 8, style: { fill: "#868991" } }, // Australia
  { latLng: [55.7558, 37.6173], name: "Moscow", value: 12, style: { fill: "#66586d" } }, // Russia
  { latLng: [51.5074, -0.1278], name: "London", value: 14, style: { fill: "#66586d" } }, // UK
  { latLng: [-23.5505, -46.6333], name: "São Paulo", value: 9, style: { fill: "#868991" } }, // Brazil
  { latLng: [39.9042, 116.4074], name: "Beijing", value: 18, style: { fill: "#66586d" } }, // China
  { latLng: [28.6139, 77.209], name: "New Delhi", value: 7, style: { fill: "#868991" } }, // India
  { latLng: [-26.2041, 28.0473], name: "Johannesburg", value: 11, style: { fill: "#66586d" } }, // South Africa
  { latLng: [25.2769, 55.2962], name: "Dubai", value: 13, style: { fill: "#66586d" } }, // UAE
  { latLng: [43.6532, -79.3832], name: "Toronto", value: 6, style: { fill: "#868991" } }, // Canada
  { latLng: [1.3521, 103.8198], name: "Singapore", value: 16, style: { fill: "#66586d" } }, // Singapore
  { latLng: [37.7749, -122.4194], name: "San Francisco", value: 17, style: { fill: "#66586d" } }, // USA
  { latLng: [19.4326, -99.1332], name: "Mexico City", value: 8, style: { fill: "#868991" } }, // Mexico
  { latLng: [41.9028, 12.4964], name: "Rome", value: 10, style: { fill: "#66586d" } }, // Italy
  { latLng: [-34.6037, -58.3816], name: "Buenos Aires", value: 5, style: { fill: "#868991" } }, // Argentina
  { latLng: [30.0444, 31.2357], name: "Cairo", value: 12, style: { fill: "#66586d" } }, // Egypt
  { latLng: [13.7563, 100.5018], name: "Bangkok", value: 9, style: { fill: "#868991" } }, // Thailand
  { latLng: [59.9139, 10.7522], name: "Oslo", value: 11, style: { fill: "#66586d" } }, // Norway
];

const Map: React.FC = () => {
  return (
    <div style={{ width: "100%", height: "500px" }}>
      <VectorMap
        map={worldMill}
        backgroundColor="#151d29"
        zoomOnScroll={true}
        zoomMax={8}
        regionStyle={{
          initial: {
            fill: "#0e1420",
            stroke: "none",
          },
          hover: {
            cursor: "pointer",
          },
        }}
        regionLabelStyle={{
          initial: {
            fill: "#373c44",
            fontSize: 12,
            fontWeight: "bold",
          },
          hover: {
            fill: "#373c44",
          },
        }}
        labels={{
          regions: {
            render: (code: string) => countryNames[code] || '',
            // @ts-ignore
            offsets: (code) => {
              return [0, 0];
            },
          },
        }}
        series={{
          markers: [
            {
              attribute: "r",
              scale: [5, 20],
              values: markers.reduce((acc, marker) => {
                acc[marker.name] = marker.value;
                return acc;
              }, {} as { [key: string]: number }),
            },
          ],
        }}
        markers={markers}
        onMarkerClick={(event: Event, code: string) => {
          console.log("onMarkerClick:", code);
        }}
      />
    </div>
  );
};

export const CascadeScreen = () => {
  return (
    <YStack flex={1} alignItems="center" justifyContent="center" gap="$2">
      <div className="flex justify-between gap-6 w-full">
        <Card elevate size="$4" bordered className='cascade-top-left'>
          <Card.Header padded>
            <H3 className='text-white'>Network Storage</H3>
            <div className='text-[40px] font-bold text-lumera-blue-light'>
              25 TB
            </div>
            <div className='text-lumera-label'>Total data stored across all supernodes.</div>
          </Card.Header>
        </Card>
        <Card elevate size="$4" bordered className='cascade-top-right'>
          <Card.Header padded>
            <H3 className='text-white'>Your Usage</H3>
            <div className='text-[40px] font-bold text-white'>
              156.83 MB
            </div>
            <div className='text-lumera-label'>Your contribution to the network.</div>
          </Card.Header>
        </Card>
      </div>
      <div className='mt-6 w-full'>
        <Card elevate size="$4" bordered className='w-full'>
          <Map />
        </Card>
      </div>
      <div className='mt-6 w-full'>
        <Dropzone onDrop={acceptedFiles => console.log(acceptedFiles)}>
          {({getRootProps, getInputProps}) => (
            <div {...getRootProps()} className='dropzone-wrapper flex flex-col justify-center items-center'>
              <input {...getInputProps()} />
              <div className='text-center'>
                <div className='upload-icon flex justify-center'>
                  <CloudUpload />
                </div>
                <div className='mt-2'>Drag & drop files here</div>
                <div className='text-sm text-lumera-label mt-3'>or</div>
                <div className='mt-2 flex justify-center btn-blue'>
                  <Button className='font-bold'>Browse Files</Button>
                </div>
              </div>
            </div>
          )}
        </Dropzone>
      </div>
    </YStack>
  )
}