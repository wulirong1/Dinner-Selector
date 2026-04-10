import { View, Text, StyleSheet, Animated } from 'react-native';
import { useEffect, useRef } from 'react';

export default function Card({ restaurant }) {
  const translateY = useRef(new Animated.Value(300)).current;

  useEffect(() => {
    if (!restaurant) return;

    // ⭐ 重置位置
    translateY.setValue(300);

    const animation = Animated.timing(translateY, {
      toValue: 0,
      duration: 400,
      useNativeDriver: true,
    });

    animation.start();

    // ⭐ 防止 component unmount 時炸掉
    return () => {
      animation.stop();
    };

  }, [restaurant]);

  if (!restaurant) return null;

  return (
    <Animated.View
      style={[
        styles.card,
        { transform: [{ translateY }] }
      ]}
    >
      <Text style={styles.title}>{restaurant.name}</Text>
      <View style={styles.InfoContainer}>
        <Text style={styles.Info}> {restaurant.vicinity}</Text>
      </View>


      {/* 之後可以加你的評論 */}
      <Text style={styles.comment}>💬 我的評論：好吃！</Text>
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

    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 10,
  },

  title: {

    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },

  InfoContainer: {
    padding: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    fontSize: 24,
    fontWeight: 'bold',
   
  },

  Info: {
    fontSize: 24,
    fontWeight: 'bold',
  },

  comment: {
    marginTop: 10,
    color: '#666',
  },


});