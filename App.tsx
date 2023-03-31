import React, {useEffect} from 'react';
import {StyleSheet, View} from 'react-native';

import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  SlideInUp,
  withDelay,
} from 'react-native-reanimated';

const createIdentityMatrix = () => {
  'worklet';
  return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
};

const reuseTranslate3dCommand = (
  matrixCommand: Array<number>,
  x: number,
  y: number,
  z: number,
) => {
  'worklet';
  matrixCommand[12] = x;
  matrixCommand[13] = y;
  matrixCommand[14] = z;
};

const reuseRotateXCommand = (matrixCommand: Array<number>, radians: number) => {
  'worklet';
  matrixCommand[5] = Math.cos(radians);
  matrixCommand[6] = Math.sin(radians);
  matrixCommand[9] = -Math.sin(radians);
  matrixCommand[10] = Math.cos(radians);
};

const reuseRotateYCommand = (matrixCommand: Array<number>, amount: number) => {
  'worklet';
  matrixCommand[0] = Math.cos(amount);
  matrixCommand[2] = -Math.sin(amount);
  matrixCommand[8] = Math.sin(amount);
  matrixCommand[10] = Math.cos(amount);
};

// http://www.w3.org/TR/css3-transforms/#recomposing-to-a-2d-matrix
const reuseRotateZCommand = (matrixCommand: Array<number>, radians: number) => {
  'worklet';
  matrixCommand[0] = Math.cos(radians);
  matrixCommand[1] = Math.sin(radians);
  matrixCommand[4] = -Math.sin(radians);
  matrixCommand[5] = Math.cos(radians);
};

const multiplyInto = (
  out: Array<number>,
  a: Array<number>,
  b: Array<number>,
) => {
  'worklet';
  const a00 = a[0],
    a01 = a[1],
    a02 = a[2],
    a03 = a[3],
    a10 = a[4],
    a11 = a[5],
    a12 = a[6],
    a13 = a[7],
    a20 = a[8],
    a21 = a[9],
    a22 = a[10],
    a23 = a[11],
    a30 = a[12],
    a31 = a[13],
    a32 = a[14],
    a33 = a[15];

  let b0 = b[0],
    b1 = b[1],
    b2 = b[2],
    b3 = b[3];
  out[0] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
  out[1] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
  out[2] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
  out[3] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

  b0 = b[4];
  b1 = b[5];
  b2 = b[6];
  b3 = b[7];
  out[4] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
  out[5] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
  out[6] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
  out[7] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

  b0 = b[8];
  b1 = b[9];
  b2 = b[10];
  b3 = b[11];
  out[8] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
  out[9] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
  out[10] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
  out[11] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

  b0 = b[12];
  b1 = b[13];
  b2 = b[14];
  b3 = b[15];
  out[12] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
  out[13] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
  out[14] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
  out[15] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
};

const transformWithOrigin = (
  transformMatrix: Array<number>,
  origin: {x: number; y: number; z: number},
) => {
  'worklet';
  const {x, y, z} = origin;
  const translateToOrigin = createIdentityMatrix();
  reuseTranslate3dCommand(translateToOrigin, -x, -y, -z);
  multiplyInto(transformMatrix, translateToOrigin, transformMatrix);
  const translateBack = createIdentityMatrix();
  reuseTranslate3dCommand(translateBack, x, y, z);
  multiplyInto(transformMatrix, transformMatrix, translateBack);
};

const rotateXYZ = (amountX: number, amountY: number, amountZ: number) => {
  'worklet';

  let rotX = createIdentityMatrix();
  reuseRotateXCommand(rotX, amountX);

  let rotY = createIdentityMatrix();
  reuseRotateYCommand(rotY, amountY);

  let rotZ = createIdentityMatrix();
  reuseRotateZCommand(rotZ, amountZ);

  // rotXYZ = Z * Y * X
  // matrices are multiplied from right to left
  let result = createIdentityMatrix();
  // result = Y * X
  multiplyInto(result, rotX, rotY);
  // result = Z * (Y * X)
  multiplyInto(result, result, rotZ);

  return result;
};

const origin = {
  x: 0,
  y: 0,
  z: 50,
};

const IndianRed = '#cd5c5c50';
const DarkOrange = '#FF8C0050';
const Gold = '#FFD70050';
const MediumPurple = '#9370DB50';
const SteelBlue = '#4682B450';
const Chocolate = '#D2691E50';

export default () => {
  const x = useSharedValue(0);
  const y = useSharedValue(0);

  useEffect(() => {
    y.value = 0;
    y.value = withDelay(
      6500,
      withRepeat(
        withTiming(Math.PI * 2, {duration: 8000, easing: Easing.linear}),
        -1,
        false,
      ),
    );

    x.value = 0;
    x.value = withDelay(
      6500,
      withRepeat(
        withTiming(Math.PI * 2, {duration: 8000, easing: Easing.linear}),
        -1,
        false,
      ),
    );

    return () => {
      cancelAnimation(x);
      cancelAnimation(y);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animatedStyleFront = useAnimatedStyle(() => {
    const rotationMatrix = rotateXYZ(y.value, x.value, 0);
    transformWithOrigin(rotationMatrix, origin);
    return {
      transform: [{perspective: 1000}, {matrix: rotationMatrix}],
    };
  });

  const animatedStyleLeft = useAnimatedStyle(() => {
    const rotationMatrix = rotateXYZ(y.value, x.value - Math.PI / 2, 0);
    transformWithOrigin(rotationMatrix, origin);
    return {
      transform: [{perspective: 1000}, {matrix: rotationMatrix}],
    };
  });

  const animatedStyleRight = useAnimatedStyle(() => {
    const rotationMatrix = rotateXYZ(y.value, x.value + Math.PI / 2, 0);
    transformWithOrigin(rotationMatrix, origin);
    return {
      transform: [{perspective: 1000}, {matrix: rotationMatrix}],
    };
  });

  const animatedStyleBack = useAnimatedStyle(() => {
    const rotationMatrix = rotateXYZ(y.value, x.value + Math.PI, 0);
    transformWithOrigin(rotationMatrix, origin);
    return {
      transform: [{perspective: 1000}, {matrix: rotationMatrix}],
    };
  });

  const animatedStyleBottom = useAnimatedStyle(() => {
    const rotationMatrix = rotateXYZ(y.value - Math.PI / 2, 0, x.value);
    transformWithOrigin(rotationMatrix, origin);
    return {
      transform: [{perspective: 1000}, {matrix: rotationMatrix}],
    };
  });

  const animatedStyleTop = useAnimatedStyle(() => {
    const rotationMatrix = rotateXYZ(y.value + Math.PI / 2, 0, -x.value);
    transformWithOrigin(rotationMatrix, origin);
    return {
      transform: [{perspective: 1000}, {matrix: rotationMatrix}],
    };
  });

  return (
    <View style={styles.container}>
      <Animated.View
        entering={SlideInUp.duration(1000)}
        style={[styles.square, {backgroundColor: Gold}, animatedStyleBack]}
      />
      <Animated.View
        entering={SlideInUp.duration(2000)}
        style={[styles.square, {backgroundColor: SteelBlue}, animatedStyleLeft]}
      />
      <Animated.View
        entering={SlideInUp.duration(3000)}
        style={[
          styles.square,
          {backgroundColor: MediumPurple},
          animatedStyleRight,
        ]}
      />
      <Animated.View
        entering={SlideInUp.duration(4000)}
        style={[
          styles.square,
          {backgroundColor: DarkOrange},
          animatedStyleBottom,
        ]}
      />
      <Animated.View
        entering={SlideInUp.duration(5000)}
        style={[styles.square, {backgroundColor: IndianRed}, animatedStyleTop]}
      />
      <Animated.View
        entering={SlideInUp.duration(6000)}
        style={[
          styles.square,
          {backgroundColor: Chocolate},
          animatedStyleFront,
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#1a1818',
    alignItems: 'center',
    justifyContent: 'center',
  },
  square: {
    position: 'absolute',
    height: 100,
    width: 100,
  },
});
