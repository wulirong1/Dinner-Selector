import { View, Text, StyleSheet, Animated } from 'react-native';
import { useEffect, useRef } from 'react';

export default function Card({ restaurant }) {
  const translateY = useRef(new Animated.Value(300)).current;

  useEffect(() => {
    const animation = Animated.timing(translateY, {
      toValue: restaurant ? 0 : 300,
      duration: 400,
      useNativeDriver: true,
    });

    animation.start();
    return () => animation.stop();
  }, [restaurant]);

  return (
    <Animated.View
      pointerEvents={restaurant ? 'auto' : 'none'}
      style={[
        styles.card,
        { transform: [{ translateY }] }
      ]}
    >
      <Text style={styles.title}>
        {restaurant?.name || ''}
      </Text>

      <Text style={styles.Info}>
        {restaurant?.vicinity || ''}
      </Text>
    </Animated.View>
  );
}

// ⭐ 一定要在外面
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

  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },

  Info: {
    fontSize: 16,
  },
});