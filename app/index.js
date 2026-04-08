import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, FlatList, Keyboard, PanResponder, Platform, SafeAreaView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import * as Location from 'expo-location';
import MapView, { Circle, Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { GOOGLE_PLACES_API_KEY } from '@env';

const GOOGLE_PLACES_NEARBY_URL = 'https://maps.googleapis.com/maps/api/place/nearbysearch/json';
const GOOGLE_PLACES_DETAILS_URL = 'https://maps.googleapis.com/maps/api/place/details/json';
const MIN_RADIUS = 200;
const MAX_RADIUS = 1000;
const SLIDER_HEIGHT = 240;
const SHEET_COLLAPSED_Y = 240;
const SHEET_HEIGHT = 420;
const SHEET_OPEN_Y = -(SHEET_HEIGHT - 80);

const fetchNearbyRestaurants = async (location) => {
  if (!location) return [];
  if (!GOOGLE_PLACES_API_KEY) {
    throw new Error('請在 GOOGLE_PLACES_API_KEY 設定您的 Google Places API Key');
  }

  const url = `${GOOGLE_PLACES_NEARBY_URL}?location=${location.latitude},${location.longitude}&radius=1000&type=restaurant&key=${GOOGLE_PLACES_API_KEY}`;
  const response = await fetch(url);
  const data = await response.json();

  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    throw new Error(data.error_message || `Google Places API 錯誤：${data.status}`);
  }

  if (!Array.isArray(data.results)) {
    return [];
  }

  return data.results.map((item, index) => ({
    id: item.place_id || `restaurant-${index}`,
    name: item.name || '未知餐廳',
    description: item.vicinity || item.types?.join(', ') || '附近餐廳',
    coordinate: {
      latitude: item.geometry?.location?.lat || location.latitude,
      longitude: item.geometry?.location?.lng || location.longitude,
    },
  }));
};

export default function App() {
  const [location, setLocation] = useState(null);
  const [viewRegion, setViewRegion] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [restaurants, setRestaurants] = useState([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [selectedRestaurantDetails, setSelectedRestaurantDetails] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [radius, setRadius] = useState(500);
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState({});
  const [editingReview, setEditingReview] = useState(false);
  const [draftReview, setDraftReview] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);
  const sheetTranslateY = useRef(new Animated.Value(SHEET_COLLAPSED_Y)).current;
  const sheetCurrentY = useRef(SHEET_COLLAPSED_Y);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > 5,
      onPanResponderGrant: () => Keyboard.dismiss(),
      onPanResponderMove: (_, gestureState) => {
        const nextY = Math.min(Math.max(sheetCurrentY.current + gestureState.dy * 0.6, SHEET_OPEN_Y), SHEET_COLLAPSED_Y);
        sheetTranslateY.setValue(nextY);
      },
      onPanResponderRelease: (_, gestureState) => {
        const shouldOpen = gestureState.dy < -20;
        const targetY = shouldOpen ? SHEET_OPEN_Y : SHEET_COLLAPSED_Y;
        Animated.spring(sheetTranslateY, {
          toValue: targetY,
          useNativeDriver: true,
          bounciness: 8,
        }).start(() => {
          sheetCurrentY.current = targetY;
          setSheetOpen(shouldOpen);
        });
      },
    })
  ).current;

  const animateSheet = (open) => {
    const targetY = open ? SHEET_OPEN_Y : SHEET_COLLAPSED_Y;
    Animated.spring(sheetTranslateY, {
      toValue: targetY,
      useNativeDriver: true,
      bounciness: 8,
    }).start(() => {
      sheetCurrentY.current = targetY;
      setSheetOpen(open);
    });
  };

  const initialRegion = useMemo(() => {
    if (!location) return null;
    return {
      ...location,
      latitudeDelta: 0.015,
      longitudeDelta: 0.015,
    };
  }, [location]);

  const mapRegion = viewRegion || initialRegion;
  const useRedMarkers = mapRegion ? mapRegion.latitudeDelta > 0.03 || mapRegion.longitudeDelta > 0.03 : false;

  const filteredRestaurants = useMemo(() => {
    if (!searchQuery.trim()) return restaurants;
    return restaurants.filter((restaurant) =>
      restaurant.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
    );
  }, [restaurants, searchQuery]);

  const getDistanceMeters = (from, to) => {
    const rad = Math.PI / 180;
    const lat1 = from.latitude * rad;
    const lat2 = to.latitude * rad;
    const lon1 = from.longitude * rad;
    const lon2 = to.longitude * rad;
    const dLat = lat2 - lat1;
    const dLon = lon2 - lon1;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return 6371000 * c;
  };

  const formatDistanceLabel = (meters) => {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(1)} km`;
    }
    return `${meters} m`;
  };

  const fetchPlaceDetails = async (placeId) => {
    if (!placeId) return null;
    const url = `${GOOGLE_PLACES_DETAILS_URL}?place_id=${placeId}&fields=name,formatted_address,opening_hours&key=${GOOGLE_PLACES_API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK') {
      return null;
    }

    return data.result || null;
  };

  const restaurantsInRange = useMemo(() => {
    if (!location) return [];
    return restaurants.filter((restaurant) => {
      const distance = getDistanceMeters(location, restaurant.coordinate);
      return distance <= radius;
    });
  }, [location, restaurants, radius]);

  const filteredRestaurantsInRange = useMemo(() => {
    const source = searchQuery.trim() ? filteredRestaurants : restaurantsInRange;
    return source.filter((restaurant) => {
      const distance = location ? getDistanceMeters(location, restaurant.coordinate) : 0;
      return distance <= radius;
    });
  }, [filteredRestaurants, restaurantsInRange, location, radius, searchQuery]);

  const updateRadiusFromTouch = (evt) => {
    const y = evt.nativeEvent.locationY;
    const ratio = 1 - Math.min(Math.max(y / SLIDER_HEIGHT, 0), 1);
    const nextRadius = Math.round((MIN_RADIUS + ratio * (MAX_RADIUS - MIN_RADIUS)) / 50) * 50;
    setRadius(Math.min(Math.max(nextRadius, MIN_RADIUS), MAX_RADIUS));
  };

  useEffect(() => {
    const requestLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setErrorMsg('需要定位權限才能顯示附近餐廳');
          setLoading(false);
          return;
        }

        const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest });
        const coords = {
          latitude: current.coords.latitude,
          longitude: current.coords.longitude,
        };

        setLocation(coords);
        setViewRegion({
          ...coords,
          latitudeDelta: 0.015,
          longitudeDelta: 0.015,
        });
        const nearby = await fetchNearbyRestaurants(coords);
        setRestaurants(nearby);
      } catch (error) {
        setErrorMsg('定位失敗，請稍後再試');
      } finally {
        setLoading(false);
      }
    };

    requestLocation();
  }, []);

  const handleSelectRestaurant = async (restaurant) => {
    setSelectedRestaurant(restaurant);
    setSelectedRestaurantDetails(null);
    setEditingReview(false);
    setDraftReview('');
    setViewRegion((current) => ({
      ...(current || initialRegion),
      latitude: restaurant.coordinate.latitude,
      longitude: restaurant.coordinate.longitude,
    }));
    const details = await fetchPlaceDetails(restaurant.id);
    setSelectedRestaurantDetails(details);
  };

  const handleRandomPick = () => {
    if (restaurantsInRange.length === 0) return;
    const randomIndex = Math.floor(Math.random() * restaurantsInRange.length);
    handleSelectRestaurant(restaurantsInRange[randomIndex]);
  };

  const handleStartReview = () => {
    if (!selectedRestaurant) return;
    setEditingReview(true);
    setDraftReview(reviews[selectedRestaurant.id] || '');
  };

  const handleClearSelection = () => {
    setSelectedRestaurant(null);
    setSelectedRestaurantDetails(null);
    setEditingReview(false);
    setDraftReview('');
    animateSheet(false);
  };

  const handleSaveReview = () => {
    if (!selectedRestaurant) return;
    setReviews((prev) => ({
      ...prev,
      [selectedRestaurant.id]: draftReview.trim() || '尚未留下評價',
    }));
    setEditingReview(false);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2f8f6a" />
        <Text style={styles.loadingText}>正在定位並搜尋附近餐廳…</Text>
      </SafeAreaView>
    );
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" translucent={true} backgroundColor="transparent" />

        {mapRegion ? (
        <MapView
          style={styles.map}
          provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
          region={mapRegion}
          showsUserLocation
          showsMyLocationButton={false}
          loadingEnabled
          onRegionChangeComplete={setViewRegion}
          onTouchStart={Keyboard.dismiss}
        >
          <Circle
            center={location}
            radius={radius}
            strokeColor="rgba(47,143,106,0.8)"
            fillColor="rgba(47,143,106,0.18)"
            strokeWidth={2}
          />
          {filteredRestaurants.map((restaurant) => {
            const distance = location ? getDistanceMeters(location, restaurant.coordinate) : 0;
            const isInRange = distance <= radius;
            const isSelected = selectedRestaurant?.id === restaurant.id;
            const pinColor = isSelected
              ? '#ff6b00'
              : useRedMarkers
              ? 'red'
              : isInRange
              ? '#ff6b00'
              : '#bbbbbb';

            return (
              <Marker
                key={restaurant.id}
                coordinate={restaurant.coordinate}
                onPress={() => handleSelectRestaurant(restaurant)}
              >
                {isSelected ? (
                  <View style={styles.selectedMarkerOuter}>
                    <View style={styles.selectedMarkerInner} />
                  </View>
                ) : (
                  <View style={[styles.defaultMarker, { backgroundColor: pinColor }]} />
                )}
              </Marker>
            );
          })}
        </MapView>
      ) : (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{errorMsg || '無法載入地圖'}</Text>
        </View>
      )}

      <View style={styles.overlayTop}>
        <View style={styles.searchRow}>
          <TextInput
            style={styles.searchInput}
            placeholder="搜尋餐廳"
            placeholderTextColor="#8f8f8f"
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            onSubmitEditing={Keyboard.dismiss}
          />
        </View>
      </View>
      <Animated.View style={[styles.sheetOverlay, { opacity: sheetTranslateY.interpolate({
          inputRange: [SHEET_OPEN_Y, SHEET_COLLAPSED_Y],
          outputRange: [0.45, 0],
          extrapolate: 'clamp',
        }) }]} pointerEvents="none" />
      <View style={styles.rightSliderContainer} pointerEvents="box-none">
        <View style={styles.sliderInfo}>
          <Text style={styles.sliderLabel}>{formatDistanceLabel(radius)}</Text>
          <Text style={styles.sliderSub}>抽選範圍</Text>
        </View>
        <View
          style={styles.rangeSliderContainer}
          onStartShouldSetResponder={() => true}
          onResponderGrant={updateRadiusFromTouch}
          onResponderMove={updateRadiusFromTouch}
        >
          <View style={styles.rangeSliderTrack} />
          <View style={[styles.rangeSliderFill, { height: ((radius - MIN_RADIUS) / (MAX_RADIUS - MIN_RADIUS)) * SLIDER_HEIGHT }]} />
          <View style={[styles.rangeSliderHandle, { bottom: ((radius - MIN_RADIUS) / (MAX_RADIUS - MIN_RADIUS)) * SLIDER_HEIGHT }]} />
        </View>
      </View>

      <Animated.View
        style={[styles.bottomSheet, { transform: [{ translateY: sheetTranslateY }] }]}
        {...panResponder.panHandlers}
      >
        <View style={styles.bottomSheetHandle} />
        <View style={styles.bottomSheetContent}>
          <View style={styles.panelHeader}>
            <Text style={styles.panelTitle}>{selectedRestaurant?.name || '範圍內餐廳'}</Text>
            <View style={styles.panelHeaderButtons}>
              <TouchableOpacity style={styles.wheelButton} onPress={handleRandomPick} activeOpacity={0.8}>
                <Text style={styles.wheelButtonText}>轉盤</Text>
              </TouchableOpacity>
              {selectedRestaurant ? (
                <TouchableOpacity style={styles.closeButton} onPress={handleClearSelection} activeOpacity={0.8}>
                  <Text style={styles.closeButtonText}>✕</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
          {selectedRestaurant ? (
            <>
              <View style={styles.infoBlock}>
                <Text style={styles.infoBlockLabel}>地址</Text>
                <Text style={styles.infoBlockText}>{selectedRestaurantDetails?.formatted_address || selectedRestaurant.description || '地址資訊暫無'}</Text>
              </View>
              <View style={styles.infoBlock}>
                <Text style={styles.infoBlockLabel}>營業時間</Text>
                <Text style={styles.infoBlockText}>
                  {selectedRestaurantDetails?.opening_hours?.weekday_text
                    ? selectedRestaurantDetails.opening_hours.weekday_text.join('\n')
                    : '營業時間暫無資料'}
                </Text>
              </View>
              <View style={styles.infoBlock}>
                <Text style={styles.infoBlockLabel}>我的評價</Text>
                {editingReview ? (
                  <View style={styles.reviewInputBox}>
                    <TextInput
                      style={styles.reviewInput}
                      placeholder="留下你的評價..."
                      placeholderTextColor="#a0a0a0"
                      value={draftReview}
                      onChangeText={setDraftReview}
                      multiline
                    />
                    <TouchableOpacity style={styles.saveReviewButton} onPress={handleSaveReview} activeOpacity={0.8}>
                      <Text style={styles.saveReviewButtonText}>儲存</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <Text style={styles.infoBlockText}>{reviews[selectedRestaurant.id] || '尚未留下評價'}</Text>
                )}
              </View>
            </>
          ) : (
            <>
              <Text style={styles.panelTitle}>範圍內餐廳</Text>
              <FlatList
                data={filteredRestaurantsInRange}
                keyExtractor={(item) => item.id}
                style={styles.restaurantList}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => {
                  const distance = location ? getDistanceMeters(location, item.coordinate) : 0;
                  return (
                    <TouchableOpacity style={styles.listItem} onPress={() => handleSelectRestaurant(item)} activeOpacity={0.8}>
                      <Text style={styles.listItemTitle}>{item.name}</Text>
                      <Text style={styles.listItemSubtitle}>{Math.round(distance)}m · {item.description}</Text>
                    </TouchableOpacity>
                  );
                }}
                ListEmptyComponent={<Text style={styles.emptyText}>目前範圍內沒有餐廳</Text>}
              />
            </>
          )}
        </View>
        {selectedRestaurant ? (
          <TouchableOpacity style={styles.addPillButton} onPress={editingReview ? handleSaveReview : handleStartReview} activeOpacity={0.8}>
            <Text style={styles.addPillText}>+ 加入評價</Text>
          </TouchableOpacity>
        ) : null}
      </Animated.View>
    </SafeAreaView>
  </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#444',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    color: '#cc0000',
    fontSize: 16,
    textAlign: 'center',
  },
  overlayTop: {
    position: 'absolute',
    top: 24,
    left: 16,
    right: 16,
    padding: 16,
    backgroundColor: '#FFF0DE',
    borderRadius: 16,
    shadowColor: '#871c1c',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  screenTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    color: '#222',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: '#f3f7f2',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 24,
    marginRight: 8,
    marginBottom: 6,
  },
  chipText: {
    color: '#4a4a4a',
    fontSize: 12,
    fontWeight: '600',
  },
  rightSliderContainer: {
    position: 'absolute',
    top: 130,
    right: 8,
    width: 72,
    alignItems: 'center',
    zIndex: 10,
  },
  sliderInfo: {
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  sliderLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#222',
  },
  sliderSub: {
    fontSize: 10,
    color: '#666',
  },
  searchRow: {
    marginBottom: 10,
  },
  searchInput: {
    width: '100%',
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FFF0DE',
    paddingHorizontal: 14,
    fontSize: 14,
    color: '#222',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  centerMarkerContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -16,
    marginTop: -40,
    alignItems: 'center',
  },
  centerMarkerOuter: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFF0DE',
    borderWidth: 2,
    borderColor: '#2f8f6a',
  },
  centerMarkerInner: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#2f8f6a',
  },
  rangeSliderContainer: {
    width: 42,
    height: SLIDER_HEIGHT,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.84)',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 12,
    paddingTop: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  rangeSliderTrack: {
    position: 'absolute',
    width: 8,
    top: 12,
    bottom: 12,
    borderRadius: 4,
    backgroundColor: '#e6e6e6',
  },
  rangeSliderFill: {
    position: 'absolute',
    bottom: 12,
    width: 8,
    borderRadius: 4,
    backgroundColor: '#2f8f6a',
  },
  rangeSliderHandle: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#2f8f6a',
    borderWidth: 3,
    borderColor: '#ffffff',
    left: 7,
  },
  sheetOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000',
  },
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SHEET_HEIGHT,
    backgroundColor: '#FFF0DE',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingBottom: 24,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -16 },
    elevation: 20,
  },
  bottomSheetHandle: {
    width: 64,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'center',
    marginBottom: 14,
  },
  bottomSheetContent: {
    flex: 1,
  },
  panelTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1f2937',
    marginBottom: 8,
  },
  panelMeta: {
    fontSize: 14,
    color: '#cbd5e1',
    lineHeight: 20,
    marginBottom: 16,
  },
  section: {
    marginBottom: 14,
  },
  sectionLabel: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionValue: {
    fontSize: 14,
    color: '#e2e8f0',
    lineHeight: 20,
  },
  infoBlock: {
    backgroundColor: '#f8fafc',
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
  },
  infoBlockLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 6,
  },
  infoBlockText: {
    fontSize: 14,
    color: '#0f172a',
    lineHeight: 20,
  },
  reviewInputBox: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  reviewInput: {
    minHeight: 68,
    maxHeight: 120,
    color: '#0f172a',
    fontSize: 14,
    textAlignVertical: 'top',
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  panelHeaderButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  wheelButton: {
    backgroundColor: '#2f8f6a',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginRight: 10,
  },
  wheelButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(15,23,42,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#0f172a',
    fontSize: 18,
    fontWeight: '700',
  },
  selectedMarkerOuter: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#ffedd5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fb923c',
  },
  selectedMarkerInner: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fb923c',
  },
  defaultMarker: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  saveReviewButton: {
    marginTop: 12,
    alignSelf: 'flex-end',
    backgroundColor: '#2f8f6a',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 16,
  },
  saveReviewButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  addPillButton: {
    position: 'absolute',
    bottom: 18,
    left: 20,
    right: 20,
    height: 54,
    borderRadius: 28,
    backgroundColor: '#94a79a',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#94a79a',
    shadowOpacity: 0.32,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 12,
  },
  addPillText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  restaurantList: {
    maxHeight: 260,
  },
  listItem: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
  },
  listItemTitle: {
    fontSize: 16,
    color: '#0f172a',
    fontWeight: '700',
    marginBottom: 4,
  },
  listItemSubtitle: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 18,
  },
  emptyText: {
    color: '#cbd5e1',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 12,
  },
});
