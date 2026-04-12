import { View, Text, StyleSheet, Animated, TouchableOpacity, ScrollView, Image, TextInput } from 'react-native';
import { useEffect, useRef, useState } from 'react';
import AddComment from './addcomment';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function Card({ restaurant, onClose }) {
  const translateY = useRef(new Animated.Value(300)).current;
  const [showAddComment, setShowAddComment] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [selectedReview, setSelectedReview] = useState(null);

  const openingHours =
    restaurant?.details?.opening_hours?.weekday_text;

  useEffect(() => {
    Animated.timing(translateY, {
      toValue: restaurant ? 0 : 300,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [restaurant]);

  useEffect(() => {
    loadReviews();
  }, []);


  const saveReviews = async (data) => {
    try {
      await AsyncStorage.setItem('reviews', JSON.stringify(data));
    } catch (e) {
      console.log('儲存失敗', e);
    }
  };

  const loadReviews = async () => {
    try {
      const data = await AsyncStorage.getItem('reviews');
      if (data) {
        setReviews(JSON.parse(data));
      }
    } catch (e) {
      console.log('讀取失敗', e);
    }
  };

  if (!restaurant) return null;

  return (
    <Animated.View
      pointerEvents={restaurant ? 'auto' : 'none'}
      style={[
        styles.card,
        {
          transform: [{ translateY }]
        }
      ]}
    >
      {showAddComment ? (
        <AddComment
          restaurant={restaurant}
          review={selectedReview}   // ⭐ 傳進去（關鍵）

          onClose={() => {
            setShowAddComment(false);
            setSelectedReview(null);
          }}

          onSubmit={(data) => {
            if (selectedReview) {
              // ⭐ 編輯
              const updated = reviews.map(r =>
                r.id === selectedReview.id ? { ...r, ...data } : r
              );

              setReviews(updated);
              saveReviews(updated);

            } else {
              const newReview = {
                id: Date.now().toString(),
                restaurantId: restaurant.id,
                ...data,              // ⭐ 這行最重要（你漏掉了）
                images: data.images || [], // ⭐ 防呆
                date: new Date().toISOString().slice(0, 10).replace(/-/g, "/"),
              };

              const updatedReviews = [newReview, ...reviews];

              setReviews(updatedReviews);
              saveReviews(updatedReviews);
            }

            setShowAddComment(false);
            setSelectedReview(null);
          }}

          onDelete={() => {
            const filtered = reviews.filter(r => r.id !== selectedReview.id);

            setReviews(filtered);
            saveReviews(filtered);


            setShowAddComment(false);
            setSelectedReview(null);
          }}
        />
      ) : (
        <>
          <View style={styles.cardtop}>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>

            <View style={styles.titleContainer}>
              <Text style={styles.title}>
                {restaurant?.name || ''}
              </Text>
            </View>
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.Info}>
              <Text style={styles.address}>
                {restaurant?.vicinity || restaurant?.formatted_address || ''}
              </Text>

              {openingHours ? (
                openingHours.map((day, index) => (
                  <Text key={index}>🕒 {day}</Text>
                ))
              ) : (
                <Text>🕒 無營業時間資料</Text>
              )}
            </View>

            {reviews.length > 0 && (
              <Text style={styles.sectionTitle}>評論</Text>
            )}

            {reviews
              .filter(r => r.restaurantId === restaurant.id)
              .map((r) => (
                <TouchableOpacity
                  key={r.id}
                  style={styles.reviewSection}
                  onPress={() => {
                    setSelectedReview(r);
                    setShowAddComment(true);
                  }}
                >
                  <View style={styles.reviewHeader}>
                    <Text style={styles.date}>{r.date}</Text>
                    <View style={styles.likeIcon}>
                      <MaterialIcons
                        name={r.like === 'like' ? 'thumb-up' : 'thumb-up-off-alt'}
                        size={22}
                        color={r.like === 'like' ? '#8FA89E' : '#555'}
                      />

                      <MaterialIcons
                        name={r.like === 'dislike' ? 'thumb-down' : 'thumb-down-off-alt'}
                        size={22}
                        color={r.like === 'dislike' ? '#8FA89E' : '#555'}
                        style={{ marginLeft: 10 }}
                      />
                    </View>
                  </View>
                  <Text style={styles.reviewText}>{r.text}</Text>

                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.reviewImagesRow}>
                    {(r.images || []).map((img, idx) => (
                      <Image key={idx} source={{ uri: img }} style={styles.reviewImage} />
                    ))}
                  </ScrollView>
                </TouchableOpacity>
              ))}
          </ScrollView>

          <TouchableOpacity
            style={styles.fixedBtn}
            onPress={() => setShowAddComment(true)}
          >
            <Text style={styles.fixedBtnText}>新增評論</Text>
          </TouchableOpacity>
        </>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    bottom: 0,
    width: '100%',

    backgroundColor: '#FFF0DE',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    padding: 20,
  },

  titleContainer: {
    width: '90%',
    marginBottom: 10,
    padding: 10,
  },

  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },

  Info: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
  },

  address: {
    fontSize: 16,
    fontWeight: '600',
  },

  closeBtn: {
    position: "absolute",
    right: 10,
    zIndex: 10,
  },

  closeText: {
    fontSize: 18,
    fontWeight: "bold",
  },

  cardtop: {
    alignItems: 'stretch'
  },

  // ⭐ 評論區
  reviewSection: {
    marginTop: 15,
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 15,
  },



  reviewTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },

  date: {
    fontSize: 12,
    color: "#888",
  },

  reviewText: {
    marginTop: 5,
    fontSize: 14,
  },

  reviewImage: {
    width: 80,
    height: 80,
    borderRadius: 10,
    marginRight: 10,
    marginTop: 10,
  },

  fixedBtn: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: '#8FA89E',
    padding: 15,
    borderRadius: 25,
    alignItems: 'center',
  },

  fixedBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },

  likeIcon: {
    position: 'absolute',
    right: 10,
    top: 10,
    flexDirection: 'row',
  },


});