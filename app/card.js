import { View, Text, StyleSheet, Animated, TouchableOpacity, ScrollView, Image, TextInput } from 'react-native';
import { useEffect, useRef, useState } from 'react';
import AddComment from './addcomment';

export default function Card({ restaurant, onClose }) {
  const translateY = useRef(new Animated.Value(300)).current;
  const [showAddComment, setShowAddComment] = useState(false);
  const [reviews, setReviews] = useState([]);

  const openingHours =
    restaurant?.details?.opening_hours?.weekday_text;

  useEffect(() => {
    Animated.timing(translateY, {
      toValue: restaurant ? 0 : 300,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [restaurant]);

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
          onClose={() => setShowAddComment(false)}
          onSubmit={(data) => {
            setReviews([data, ...reviews]);
            setShowAddComment(false);
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
                {restaurant?.vicinity || ''}
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

            {reviews.map((r, i) => (
              <View key={i} style={styles.reviewSection}>
                <View style={styles.reviewHeader}>
                  <Text style={styles.reviewDate}>{r.date}</Text>
                  <Text style={styles.reviewLike}>{r.like === 'like' ? '👍' : '👎'}</Text>
                </View>
                <Text style={styles.reviewText}>{r.text}</Text>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.reviewImagesRow}>
                  {r.images.map((img, idx) => (
                    <Image key={idx} source={{ uri: img }} style={styles.reviewImage} />
                  ))}
                </ScrollView>
              </View>
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
    height: '50%',
    backgroundColor: '#FFF0DE',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    padding: 20,
  },

  titleContainer: {
    width: '60%',
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
    marginTop: 20,
    backgroundColor: '#fff',
    borderRadius: 20,
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
});