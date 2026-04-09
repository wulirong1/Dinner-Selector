import { View, StyleSheet, TouchableOpacity, Text,Vibration } from 'react-native';
import * as Location from 'expo-location';
import { useEffect, useState } from 'react';
import MapView, { Marker, Circle } from 'react-native-maps';
import Slider from '@react-native-community/slider';

export default function App() {

  const [location, setLocation] = useState(null);
  const [restaurants, setRestaurants] = useState([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [radius, setRadius] = useState(500); // 預設500m
  const [isPicking, setIsPicking] = useState(false);

  const [region, setRegion] = useState({
    latitude: 25.033,
    longitude: 121.565,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,

  });

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      let loc = await Location.getCurrentPositionAsync({});

      setLocation(loc.coords);

      // ✅ 在這裡用 loc（正確‼️）
      setRegion({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });

    })();
  }, []);


  const fetchRestaurants = async (lat, lng) => {
    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&type=restaurant&opennow=true&key=${process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY}`;

    const res = await fetch(url);
    const data = await res.json();

    setRestaurants(data.results);
  };

  const pickRandom = () => {
    if (restaurants.length === 0) return;

    setIsPicking(true);

    let count = 0;
    let delay = 80; // ⭐ 一開始很快

    const run = () => {
      const index = Math.floor(Math.random() * restaurants.length);
      const randomRestaurant = restaurants[index];

      setSelectedRestaurant(randomRestaurant);
  

      count++;

      // ⭐ 每次變慢
      delay += 30;

      // ⭐ 大約跑 12 次
      if (count < 12) {
        setTimeout(run, delay);
      } else {
        // ⭐ 最終結果
        const finalIndex = Math.floor(Math.random() * restaurants.length);
        const finalRestaurant = restaurants[finalIndex];

        setSelectedRestaurant(finalRestaurant);

        setIsPicking(false);

        // ⭐ 地圖移到最終餐廳
        setRegion({
          latitude: finalRestaurant.geometry.location.lat,
          longitude: finalRestaurant.geometry.location.lng,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        });
      }
    };

    run();
  };

  return (
    <View style={{ flex: 1 }}>
      <MapView
        style={StyleSheet.absoluteFillObject}
        showsUserLocation={true}
        region={region}
      >
        {location && (
          <Circle
            center={{
              latitude: location.latitude,
              longitude: location.longitude,
            }}
            radius={radius}
            strokeColor="rgba(0,122,255,0.8)"
            fillColor="rgba(0,122,255,0.15)"
            strokeWidth={2}
          />
        )}
        {selectedRestaurant && (
          <Marker
            coordinate={{
              latitude: selectedRestaurant.geometry.location.lat,
              longitude: selectedRestaurant.geometry.location.lng,
            }}
            title={selectedRestaurant.name}
          />
        )}
      </MapView>
      <View style={styles.sliderContainer}>
        <Slider
          style={styles.slider}
          minimumValue={500}
          maximumValue={1000}
          step={100}
          value={radius}
          onValueChange={(value) => setRadius(value)}
        />

      </View>
      <TouchableOpacity
        disabled={isPicking}
        onPress={async () => {
          if (!location) return;

          // ⭐ 先抓資料（但不等）
          fetchRestaurants(location.latitude, location.longitude);

          // ⭐ 直接開始動畫
          pickRandom();
        }}
        style={styles.button}
      >
        <Text style={styles.buttonText}>抽晚餐</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  map: {
    ...StyleSheet.absoluteFillObject,
  },

  button: {
    position: 'absolute',
    bottom: 120,
    alignSelf: 'center',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: '#8FAE9D',
    justifyContent: 'center',
    alignItems: 'center',
  },

  buttonText: {
    color: '#fff',
    fontSize: 18,
  },

  sliderContainer: {
    position: 'absolute',
    right: 10,
    top: '50%',
    transform: [{ translateY: -150 }],
    height: 300, // ⭐ 控制整體高度
    justifyContent: 'space-between', // ⭐ 上下分開
    alignItems: 'center',
  },



  slider: {
    width: 300,
    height: 40,
    transform: [
      { rotate: '-90deg' },
      { translateY: 130 },
      { translateX: -100 },
    ],
  },


});