import { View, StyleSheet, TouchableOpacity, Text, Animated, TextInput, Keyboard, TouchableWithoutFeedback } from 'react-native';
import * as Location from 'expo-location';
import { useEffect, useState, useRef } from 'react';
import MapView, { Marker, Circle } from 'react-native-maps';
import Slider from '@react-native-community/slider';
import Svg, { Circle as SvgCircle } from 'react-native-svg';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Card from './Card';



const AnimatedCircle = Animated.createAnimatedComponent(SvgCircle);
export default function App() {
  const [finalRestaurant, setFinalRestaurant] = useState(null);
  const [location, setLocation] = useState(null);
  const [restaurants, setRestaurants] = useState([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [radius, setRadius] = useState(500); // 預設500m
  const [isPicking, setIsPicking] = useState(false);
  const progress = useState(new Animated.Value(0))[0];
  const [isHolding, setIsHolding] = useState(false);
  const scale = useState(new Animated.Value(1))[0];
  const mapRef = useRef(null);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const [searchText, setSearchText] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [blink, setBlink] = useState(true);
  const blinkInterval = useRef(null);
  const [showAllMarkers, setShowAllMarkers] = useState(true);

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
  useEffect(() => {
    if (location) {
      fetchRestaurants(location.latitude, location.longitude)
        .then(setRestaurants);
    }
  }, [location]);

  const fetchDetails = async (placeId) => {
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=opening_hours&language=zh-TW&key=${process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY}`;

    const res = await fetch(url);
    const data = await res.json();

    return data.result;
  };

  const fetchRestaurants = async (lat, lng) => {
    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&type=restaurant&opennow=true&language=zh-TW&key=${process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY}`;

    const res = await fetch(url);
    const data = await res.json();

    return data.results; // ⭐ 回傳！！
  };


  const searchPlaces = async (text) => {
    if (!text) {
      setSearchResults([]);
      return;
    }

    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${text}&language=zh-TW&key=${process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY}`;

    const res = await fetch(url);
    const data = await res.json();

    setSearchResults(data.results || []);
  };

  useEffect(() => {
    const delay = setTimeout(() => {
      searchPlaces(searchText);
    }, 300); // 防抖

    return () => clearTimeout(delay);
  }, [searchText]);
  const pickRandom = async (data) => {
    if (!data || data.length === 0) return;

    let count = 0;
    let delay = 80;

    const run = () => {
      const index = Math.floor(Math.random() * data.length);
      const randomRestaurant = data[index];

      setSelectedRestaurant(randomRestaurant);

      // ⭐ 先縮回
      scaleAnim.setValue(0.8);

      // ⭐ 再彈出
      Animated.spring(scaleAnim, {
        toValue: 1.4,
        friction: 3,
        useNativeDriver: true,
      }).start(() => {
        // ⭐ 回正常大小
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
        }).start();
      });
      count++;
      delay += 30;

      if (count < 18) {
        setTimeout(run, delay);
      } else {
        const finalIndex = Math.floor(Math.random() * data.length);
        const final = data[finalIndex];

        setSelectedRestaurant(final);

        // ⭐ 抓詳細資料（營業時間）
        (async () => {
          const details = await fetchDetails(final.place_id);

          setFinalRestaurant({
            ...final,
            id: final.place_id, // ⭐ 統一ID（關鍵）
            details, // ⭐ 加進去
          });
        })();
        clearInterval(blinkInterval.current);
        setBlink(true);
        setIsPicking(false); // ⭐ 超重要

        mapRef.current?.animateToRegion({
          latitude: final.geometry.location.lat,
          longitude: final.geometry.location.lng,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }, 500);
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

    setIsPicking(true);
    setShowAllMarkers(false); // ⭐ 抽的時候隱藏全部
    const interval = setInterval(() => {
      setBlink(prev => !prev);
    }, 200);

    // ⭐ 存起來（很重要）
    blinkInterval.current = interval;

    Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 0.2,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ])
    ).start();
    setIsPicking(true); // ⭐ 加這行
    setFinalRestaurant(null);
    if (!location) return;

    const results = await fetchRestaurants(
      location.latitude,
      location.longitude
    );

    setRestaurants(results); // optional（給地圖用）

    pickRandom(results); // ⭐ 直接傳進去
  };

  const stopHolding = () => {
    setIsHolding(false);

    // ⭐ 停止動畫（如果有需要）
    progress.setValue(0);
  };




  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.container}>
        <MapView
          ref={mapRef}
          style={styles.map}
          showsUserLocation={true}
          region={region}
        >
          {/* 範圍圈 */}
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

          {/* ⭐ 平常：全部餐廳 */}
          {!isPicking && showAllMarkers &&
            restaurants.map((r) => (
              <Marker
                key={r.place_id}
                coordinate={{
                  latitude: r.geometry.location.lat,
                  longitude: r.geometry.location.lng,
                }}
                title={r.name}
                onPress={async () => {
                  setShowAllMarkers(false); // ⭐ 加這行
                  const details = await fetchDetails(r.place_id);

                  const restaurantData = {
                    ...r,
                    id: r.place_id,
                  };

                  setSelectedRestaurant(restaurantData);
                  setFinalRestaurant({
                    ...restaurantData,
                    details,
                  });
                }}
              />
            ))
          }

          {/* ⭐ 抽卡中：只有一顆閃 */}
          {isPicking && selectedRestaurant?.geometry?.location && (
            <Marker
              coordinate={{
                latitude: selectedRestaurant.geometry.location.lat,
                longitude: selectedRestaurant.geometry.location.lng,
              }}
              title={selectedRestaurant.name}
              opacity={blink ? 1 : 0} // ⭐ 這才是真正會閃的
            />
          )}

          {/* ⭐ 抽完：顯示結果 */}
          {!isPicking && finalRestaurant?.geometry?.location && (
            <Marker
              coordinate={{
                latitude: finalRestaurant.geometry.location.lat,
                longitude: finalRestaurant.geometry.location.lng,
              }}
              title={finalRestaurant.name}
            />
          )}
        </MapView>


        <View
          style={StyleSheet.absoluteFillObject}
          pointerEvents="box-none"
        >

          <View style={styles.searchBox}>
            <TextInput
              placeholder="搜尋餐廳..."
              value={searchText}
              onChangeText={setSearchText}
              style={styles.searchInput}
            />

            {searchResults.map((item, i) => (
              <TouchableOpacity
                key={i}
                style={styles.resultItem}
                onPress={async () => {
                  const details = await fetchDetails(item.place_id);

                  const restaurantData = {
                    ...item,
                    id: item.place_id,
                    geometry: item.geometry, // ⭐ 確保有
                  };

                  // ⭐ marker 用
                  setSelectedRestaurant(restaurantData);

                  // ⭐ 卡片用
                  setFinalRestaurant({
                    ...restaurantData,
                    details,
                  });

                  setSearchResults([]);
                  setSearchText('');
                  Keyboard.dismiss();

                  mapRef.current?.animateToRegion({
                    latitude: item.geometry.location.lat,
                    longitude: item.geometry.location.lng,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                  }, 500);
                }}
              >
                <Text>{item.name}</Text>
                <Text style={{ color: '#888' }}>{item.formatted_address}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.sliderContainer}>
            <Slider
              style={styles.slider}
              minimumValue={500}
              maximumValue={1000}
              step={100}
              value={radius}
              onValueChange={(value) => setRadius(value)}
            />

            {/* ⭐ 回到定位按鈕 */}
            <TouchableOpacity
              style={styles.recenterBtn}
              onPress={recenterMap}
            >
              <Icon name="my-location" size={24} color="#fff" />
            </TouchableOpacity>
          </View>


          <View style={styles.progressWrapper}>
            <View style={styles.buttonBackground} />

            <Animated.View
              style={{
                transform: [{ scale }],
                justifyContent: 'center',
                alignItems: 'center', // ⭐ 中心對齊
              }}
            >

              {/* ⭐ 進度條 */}

              <Svg
                width={180}
                height={180}
                style={styles.progressSvg}
                pointerEvents="box-none">

                <Circle
                  cx="90"
                  cy="90"
                  r="80"
                  stroke="#FFF0DE"
                  strokeWidth={10}
                  fill="none"
                />

                <AnimatedCircle
                  cx="90"
                  cy="90"
                  r="80"
                  rotation="-90"
                  origin="90,90"
                  stroke="#FFF0DE"
                  strokeWidth={10}
                  fill="none"
                  strokeDasharray={2 * Math.PI * 80}
                  strokeDashoffset={progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [2 * Math.PI * 80, 0],
                  })}
                />
              </Svg>


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



          </View>
        </View>

        <Card
          restaurant={finalRestaurant}
          onClose={() => {
            setFinalRestaurant(null);
            setSelectedRestaurant(null);
            setShowAllMarkers(true); // ⭐ 加這行
          }}
        />
      </View>
    </TouchableWithoutFeedback>



  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },

  map: {
    ...StyleSheet.absoluteFillObject,
  },




  sliderContainer: {
    position: 'absolute',
    right: 20,
    top: '50%',
    transform: [{ translateY: -150 }],
    height: 300, // ⭐ 控制整體高度
    justifyContent: 'space-between', // ⭐ 上下分開
    alignItems: 'center',
    pointerEvents: 'box-none',

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

  recenterBtn: {
    left: 130,
    bottom:-50,
    marginTop: 20,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#8FAE9D',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
  },

  progressWrapper: {
    position: 'absolute',
    bottom: 110,
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    pointerEvents: 'box-none',
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
    zIndex: 999, // ⭐ 保證在背景上面
    elevation: 10,
  },

  buttonText: {
    textAlign: 'center',
    fontSize: 24,
    fontWeight: "bold",
    color: '#FFF0DE',
  },

  progressSvg: {
    position: 'absolute',

  },

  searchBox: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    zIndex: 999,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 10,
  },

  searchInput: {
    fontSize: 16,
    marginBottom: 5,
  },

  resultItem: {
    padding: 8,
    borderBottomWidth: 1,
    borderColor: '#eee',
  },

});