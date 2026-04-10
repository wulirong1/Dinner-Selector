import { View, StyleSheet, TouchableOpacity, Text, Animated } from 'react-native';
import * as Location from 'expo-location';
import { useEffect, useState, useRef } from 'react';
import MapView, { Marker, Circle } from 'react-native-maps';
import Slider from '@react-native-community/slider';
import Svg, { Circle as SvgCircle } from 'react-native-svg';

const AnimatedCircle = Animated.createAnimatedComponent(SvgCircle);
export default function App() {

  const [location, setLocation] = useState(null);
  const [restaurants, setRestaurants] = useState([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [radius, setRadius] = useState(500); // 預設500m
  const [isPicking, setIsPicking] = useState(false);
  const progress = useState(new Animated.Value(0))[0];
  const [isHolding, setIsHolding] = useState(false);
  const scale = useState(new Animated.Value(1))[0];
  const mapRef = useRef(null);

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

    setIsPicking(false);

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
      if (count < 18) {
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
  const recenterMap = () => {
    if (!location || !mapRef.current) return;

    mapRef.current.animateToRegion({
      latitude: location.latitude,
      longitude: location.longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    }, 500); // ⭐ 500ms 滑動
  };


  const handlePick = async () => {
    if (!location) return;

    await fetchRestaurants(location.latitude, location.longitude);
    pickRandom();
  };

  const stopHolding = () => {
    setIsHolding(false);

    // ⭐ 停止動畫（如果有需要）
    progress.setValue(0);
  };




  return (
    <View style={{ flex: 1 }}>
      <MapView
        ref={mapRef}
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
      <View style={styles.progressWrapper}>
        <View style={styles.buttonBackground} />

        <Animated.View style={{ transform: [{ scale }] }}>
          <TouchableOpacity
            activeOpacity={1}
            onPressIn={() => {
              if (isPicking) return;

              setIsHolding(true);

              // ⭐ 按下縮小
              Animated.spring(scale, {
                toValue: 0.9,
                useNativeDriver: true,
              }).start();

              Animated.timing(progress, {
                toValue: 1,
                duration: 2000,
                useNativeDriver: false,
              }).start(({ finished }) => {
                if (finished) {
                  recenterMap();
                  handlePick();
                  stopHolding();
                }
              });
            }}
            onPressOut={() => {
              stopHolding();

              // ⭐ 彈回原本大小
              Animated.spring(scale, {
                toValue: 1,
                useNativeDriver: true,
              }).start();
            }}
            style={styles.button}
          >
            <Text style={styles.buttonText}>Press{"\n"}to{"\n"}Start</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* ⭐ 進度條 */}
        <Svg
          width={180}
          height={180}
          style={styles.progressSvg}
          pointerEvents="none">
          <Circle
            cx="90"
            cy="90"
            r="80"
            stroke="#FFF0DE"
            strokeWidth={6}
            fill="none"
          />

          <AnimatedCircle
            cx="90"
            cy="90"
            r="80"
            rotation="-90"
            origin="90,90"
            stroke="#FFF0DE"
            strokeWidth={6}
            fill="none"
            strokeDasharray={2 * Math.PI * 80}
            strokeDashoffset={progress.interpolate({
              inputRange: [0, 1],
              outputRange: [2 * Math.PI * 80, 0],
            })}
          />
        </Svg>

      </View>
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
    height: 50,
    transform: [
      { rotate: '-90deg' },
      { translateY: 130 },
      { translateX: -100 },
    ],
  },

  progressWrapper: {
    position: 'absolute',
    bottom: 110,
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
  },

  buttonBackground: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(143,174,157,0.3)',
  },

  button: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: '#8FAE9D',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1, // ⭐ 保證在背景上面
  },

  buttonText: {
    textAlign: 'center',
    fontSize: 24,
    fontWeight: "bold",
    color: '#FFF0DE',
  },

  progressSvg: {
    position: 'absolute',
    zIndex: 2, // ⭐ 最上層
  },
});