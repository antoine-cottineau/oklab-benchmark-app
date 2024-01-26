import { StatusBar } from 'expo-status-bar';
import { useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

const { benchmark } = require("./benchmark");
const { interpolateColor } = require("./interpolate");

export default function App() {
  useEffect(() => {
    benchmark.addMark("Calibration (start)");
    benchmark.addMark("Calibration (end)");
    benchmark.addMark("Begin");
    benchmark.addMark("c1 rgb to oklab begin");
    benchmark.addMark("c1 rgb to oklab end");
    benchmark.addMark("c2 rgb to oklab begin");
    benchmark.addMark("c2 rgb to oklab end");
    benchmark.addMark("Interpolation begin");
    benchmark.addMark("Interpolation end");
    benchmark.addMark("Gamut mapping before loop begin");
    benchmark.addMark("Gamut mapping before loop end");
    benchmark.addMark("Gamut mapping loop begin");
    benchmark.addMark("Gamut mapping loop end");
    benchmark.addMark("Gamut mapping after loop begin");
    benchmark.addMark("Gamut mapping after loop end");
    benchmark.addMark("End");

    benchmark.addFlow(
      "Calibration",
      "Calibration (start)",
      "Calibration (end)"
    );
    benchmark.addFlow(
      "c1 rgb to oklab",
      "c1 rgb to oklab begin",
      "c1 rgb to oklab end"
    );
    benchmark.addFlow(
      "c2 rgb to oklab",
      "c2 rgb to oklab begin",
      "c2 rgb to oklab end"
    );
    benchmark.addFlow(
      "Interpolation",
      "Interpolation begin",
      "Interpolation end"
    );
    benchmark.addFlow(
      "Gamut mapping before loop",
      "Gamut mapping before loop begin",
      "Gamut mapping before loop end"
    );
    benchmark.addFlow(
      "Gamut mapping loop",
      "Gamut mapping loop begin",
      "Gamut mapping loop end"
    );
    benchmark.addFlow(
      "Gamut mapping after loop",
      "Gamut mapping after loop begin",
      "Gamut mapping after loop end"
    );
    benchmark.addFlow("Full", "Begin", "End");
  }, []);

  return (
    <View style={styles.container}>
      <Pressable
        onPress={() => {
          bench;
        }}
      >
        <Text>Open up App.js to start working on your app!</Text>
      </Pressable>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
