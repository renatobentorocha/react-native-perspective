import React, {useEffect} from 'react';
import {Dimensions, StyleSheet, View} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

const {width, height} = Dimensions.get('window');

const center = {
  x: width / 2,
  y: height / 2,
};

export default () => {
  const rotate = useSharedValue(0);

  useEffect(() => {
    rotate.value = withRepeat(
      withTiming(80, {duration: 1000, easing: Easing.ease}),
      -1,
      true,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const style = useAnimatedStyle(() => {
    return {
      transform: [{rotateY: `${rotate.value}deg`}],
    };
  });

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.circle, style]} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#1a1818',
  },
  circle: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#ae6161',
    left: center.x - 40,
    top: center.y - 40,
  },
});
