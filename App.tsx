import React, {useEffect} from 'react';
import {Dimensions, StyleSheet, View, ViewProps, ViewStyle} from 'react-native';

import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import {multiply2D} from './matrix';

import MatrixMath from 'react-native/Libraries/Utilities/MatrixMath';

const {width: SCREEN_WIDTH, height: SCREEN_HEIGHT} = Dimensions.get('window');

const CANVAS_CENTER = {
  x: SCREEN_WIDTH / 2,
  y: SCREEN_HEIGHT / 2,
};

type PointProps = {
  x: number;
  y: number;
  z: number;
};

const theta = 30;

const SIZE = 30;

const pointDimensionStyle: ViewStyle = {
  width: SIZE,
  height: SIZE,
  borderRadius: SIZE / 2,
};

const projectionMatrix: Array<Array<number>> = [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 0],
];

const translateBackMatrix: Array<Array<number>> = [
  [1, 0, -CANVAS_CENTER.x],
  [0, 1, -CANVAS_CENTER.y],
  [0, 0, 0],
];

const translateForwardMatrix: Array<Array<number>> = [
  [1, 0, CANVAS_CENTER.x],
  [0, 1, CANVAS_CENTER.y],
  [0, 0, 0],
];

const rotationXMatrix: Array<Array<number>> = [
  [1, 0, 0],
  [0, Math.cos(theta), -Math.sin(theta)],
  [0, Math.sin(theta), Math.cos(theta)],
];

const rotationYMatrix: Array<Array<number>> = [
  [Math.cos(theta), 0, Math.sin(theta)],
  [0, 1, 0],
  [-Math.sin(theta), 0, Math.cos(theta)],
];

const rotationZMatrix: Array<Array<number>> = [
  [Math.cos(theta), -Math.sin(theta), 0],
  [Math.sin(theta), Math.cos(theta), 0],
  [0, 0, 1],
];

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

const reuseTranslate2dCommand = (
  matrixCommand: Array<number>,
  x: number,
  y: number,
) => {
  'worklet';
  matrixCommand[12] = x;
  matrixCommand[13] = y;
};

const createTranslate2d = (x: number, y: number) => {
  'worklet';
  const mat = createIdentityMatrix();
  reuseTranslate2dCommand(mat, x, y);
  return mat;
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

const createOrthographic = (
  left: number,
  right: number,
  bottom: number,
  top: number,
  near: number,
  far: number,
) => {
  'worklet';
  const a = 2 / (right - left);
  const b = 2 / (top - bottom);
  const c = -2 / (far - near);

  const tx = -(right + left) / (right - left);
  const ty = -(top + bottom) / (top - bottom);
  const tz = -(far + near) / (far - near);

  return [a, 0, 0, 0, 0, b, 0, 0, 0, 0, c, 0, tx, ty, tz, 1];
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

type CustomSquareProps = {
  style: Exclude<ViewStyle, 'width' | 'height'>;
  width: number;
  height: number;
  rotateX: Animated.SharedValue<number>;
};

const BackSquare = ({rotateX, style, width, height}: CustomSquareProps) => {
  const animatedStyle = useAnimatedStyle(() => {
    const m = createIdentityMatrix();

    const x = CANVAS_CENTER.x - width / 2;
    const y = CANVAS_CENTER.y - height / 2;

    const result = Array.from(m);

    reuseTranslate3dCommand(result, x, y, -width);
    reuseRotateYCommand(result, Math.PI / 4);

    const rotate = rotateXYZ(rotateX.value, rotateX.value, rotateX.value);

    transformWithOrigin(rotate, {x: -width / 2, y: -width / 2, z: 150});
    multiplyInto(result, result, rotate);

    return {
      transform: [{perspective: 1000}, {matrix: result}],
    };
  });

  return <Animated.View style={[style, {width, height}, animatedStyle]} />;
};

const FrontSquare = ({rotateX, style, width, height}: CustomSquareProps) => {
  const animatedStyle = useAnimatedStyle(() => {
    const m = createIdentityMatrix();

    const x = CANVAS_CENTER.x - width / 2;
    const y = CANVAS_CENTER.y - height / 2;

    const result = Array.from(m);

    reuseTranslate2dCommand(result, x, y);
    reuseRotateYCommand(result, Math.PI / 4);

    const rotate = rotateXYZ(-rotateX.value, -rotateX.value, -rotateX.value);

    transformWithOrigin(rotate, {x: -width / 2, y: -width / 2, z: 150});
    multiplyInto(result, result, rotate);

    return {
      transform: [{perspective: 1000}, {matrix: result}],
    };
  });

  return <Animated.View style={[style, {width, height}, animatedStyle]} />;
};

const RightSquare = ({rotateX, style, width, height}: CustomSquareProps) => {
  const animatedStyle = useAnimatedStyle(() => {
    const m = createIdentityMatrix();

    const x = CANVAS_CENTER.x - 25;
    const y = CANVAS_CENTER.y - height / 2;

    const result = Array.from(m);

    reuseTranslate3dCommand(result, x, y, -100);
    reuseRotateYCommand(result, (2 * Math.PI) / 4);

    const rotate = rotateXYZ(-rotateX.value, rotateX.value, -rotateX.value);

    transformWithOrigin(rotate, {x: -width / 2, y: -width / 2, z: 150});
    multiplyInto(result, result, rotate);

    return {
      transform: [{perspective: 1000}, {matrix: result}],
    };
  });

  return <Animated.View style={[style, {width, height}, animatedStyle]} />;
};

const LeftSquare = ({rotateX, style, width, height}: CustomSquareProps) => {
  const animatedStyle = useAnimatedStyle(() => {
    const m = createIdentityMatrix();

    const x = CANVAS_CENTER.x - width + 20;
    const y = CANVAS_CENTER.y - height / 2;

    const result = Array.from(m);

    reuseTranslate3dCommand(result, x, y, -10);
    reuseRotateYCommand(result, (2 * Math.PI) / 4);

    const rotate = rotateXYZ(rotateX.value, rotateX.value, rotateX.value);

    transformWithOrigin(rotate, {x: -width / 2, y: -width / 2, z: 150});
    multiplyInto(result, result, rotate);

    return {
      transform: [{perspective: 1000}, {matrix: result}],
    };
  });

  return <Animated.View style={[style, {width, height}, animatedStyle]} />;
};

const BottomSquare = ({rotateX, style, width, height}: CustomSquareProps) => {
  const animatedStyle = useAnimatedStyle(() => {
    const m = createIdentityMatrix();

    const x = CANVAS_CENTER.x - width / 2;
    const y = CANVAS_CENTER.y;

    const result = Array.from(m);

    reuseTranslate3dCommand(result, x, y, -width / 2);

    reuseRotateXCommand(result, Math.PI / 2);
    reuseRotateYCommand(result, Math.PI / 4);

    const rotate = rotateXYZ(-rotateX.value, -rotateX.value, -rotateX.value);

    transformWithOrigin(rotate, {x: -width / 2, y: -width / 2, z: 150});
    multiplyInto(result, result, rotate);

    return {
      transform: [{perspective: 1000}, {matrix: result}],
    };
  });

  return <Animated.View style={[style, {width, height}, animatedStyle]} />;
};

const TopSquare = ({rotateX, style, width, height}: CustomSquareProps) => {
  const animatedStyle = useAnimatedStyle(() => {
    const m = createIdentityMatrix();

    const x = CANVAS_CENTER.x - width / 2;
    const y = CANVAS_CENTER.y - height;

    const result = Array.from(m);

    reuseTranslate3dCommand(result, x, y, -width / 2);

    reuseRotateXCommand(result, Math.PI / 2);
    reuseRotateYCommand(result, Math.PI / 4);

    const rotate = rotateXYZ(rotateX.value, rotateX.value, rotateX.value);

    transformWithOrigin(rotate, {x: -width / 2, y: -width / 2, z: 150});
    multiplyInto(result, result, rotate);

    return {
      transform: [{perspective: 1000}, {matrix: result}],
    };
  });

  return <Animated.View style={[style, {width, height}, animatedStyle]} />;
};

export default () => {
  const rotate = useSharedValue(0);
  // const matrix = useSharedValue<number[]>(createIdentityMatrix());

  useEffect(() => {
    rotate.value = withRepeat(
      withTiming(Math.PI * 2, {duration: 6000, easing: Easing.sin}),
      -1,
      true,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={styles.container}>
      <BackSquare
        style={{position: 'absolute', backgroundColor: '#ffa60037'}}
        width={150}
        height={150}
        rotateX={rotate}
      />
      <FrontSquare
        style={{position: 'absolute', backgroundColor: '#80141462'}}
        width={150}
        height={150}
        rotateX={rotate}
      />
      <RightSquare
        style={{position: 'absolute', backgroundColor: '#360c6261'}}
        width={150}
        height={150}
        rotateX={rotate}
      />
      <LeftSquare
        style={{position: 'absolute', backgroundColor: '#e307075f'}}
        width={150}
        height={150}
        rotateX={rotate}
      />
      <BottomSquare
        style={{position: 'absolute', backgroundColor: '#4e801457'}}
        width={150}
        height={150}
        rotateX={rotate}
      />
      <TopSquare
        style={{position: 'absolute', backgroundColor: '#4e801457'}}
        width={150}
        height={150}
        rotateX={rotate}
      />
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
    left: CANVAS_CENTER.x - 40,
    top: CANVAS_CENTER.y - 40,
  },
});
