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

const {width, height} = Dimensions.get('window');

const CANVAS_CENTER = {
  x: width / 2,
  y: height / 2,
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

const points: Array<PointProps> = [
  {
    x: CANVAS_CENTER.x - 50 - pointDimensionStyle.borderRadius!,
    y: CANVAS_CENTER.y - 50 - pointDimensionStyle.borderRadius!,
    z: 0,
  },
  // {
  //   x: CANVAS_CENTER.x + 50 - pointDimensionStyle.borderRadius!,
  //   y: CANVAS_CENTER.y - 50 - pointDimensionStyle.borderRadius!,
  //   z: 0,
  // },
  // {
  //   x: CANVAS_CENTER.x - 50 - pointDimensionStyle.borderRadius!,
  //   y: CANVAS_CENTER.y + 50 - pointDimensionStyle.borderRadius!,
  //   z: 0,
  // },
  // {
  //   x: CANVAS_CENTER.x + 50 - pointDimensionStyle.borderRadius!,
  //   y: CANVAS_CENTER.y + 50 - pointDimensionStyle.borderRadius!,
  //   z: 0,
  // },
];

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

const PointComponent = ({...rest}: ViewProps) => <Animated.View {...rest} />;

const createIdentityMatrix = () => {
  'worklet';
  return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
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

export default () => {
  const rotate = useSharedValue(0);
  // const matrix = useSharedValue<number[]>(createIdentityMatrix());

  useEffect(() => {
    rotate.value = withRepeat(
      withTiming(Math.PI, {duration: 5000, easing: Easing.ease}),
      -1,
      true,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const style = useAnimatedStyle(() => {
    const m = createIdentityMatrix();

    reuseRotateXCommand(m, rotate.value);
    // reuseRotateYCommand(m, rotate.value);
    // reuseRotateZCommand(m, rotate.value);

    console.log(m);
    // matrix.value = m;
    // reuseTranslate2dCommand(m, CANVAS_CENTER.x, CANVAS_CENTER.y);

    return {
      transform: [{matrix: m}],
    };
  });

  return (
    <View style={styles.container}>
      {points.map((p, i) => {
        return (
          <PointComponent
            key={i.toString()}
            style={[
              {
                ...pointDimensionStyle,
                position: 'absolute',
                backgroundColor: '#f4b5b5',
                left: p.x,
                top: p.y,
              },
              style,
            ]}
          />
        );
      })}
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
