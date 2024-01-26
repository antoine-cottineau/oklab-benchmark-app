// @ts-check

//const fs = require("fs");
import * as FileSystem from "expo-file-system";

const hdr = require("hdr-histogram-js");

/**
 * @param {boolean} condition
 * @param {string | undefined} message
 */
function invariant(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const UNIT_FACTOR = 1_000_000;
const DISPLAY_UNIT_FACTOR = 1_000;

class Benchmark {
  /**
   * @type {Benchmark}
   */
  static __instance;

  /**
   * @type {"empty" | "building" | "warming" | "recording"}
   */
  __state = "empty";

  /**
   * @type {Set<string>}
   */
  __marks = new Set();
  /**
   * @type {Array<{ name: string; startMark: string; endMark: string; histogram: hdr.Histogram }>}
   */
  __flows = [];

  /**
   * @type {Map<string, number>}
   */
  __timings = new Map();

  constructor() {}

  static getInstance() {
    if (!Benchmark.__instance) {
      Benchmark.__instance = new Benchmark();
    }
    return Benchmark.__instance;
  }

  /**
   * @param {() => void} fn
   * @param {number} warmupExamples
   * @param {number} recordingExamples
   */
  benchmark(fn, warmupExamples, recordingExamples) {
    console.log("Starting benchmark");
    this.__startWarmingUp();
    for (let i = 0; i < warmupExamples; i++) {
      this.__startExample();
      fn();
    }

    this.__startRecording();
    for (let i = 0; i < recordingExamples; i++) {
      this.__startExample();
      fn();
    }
    console.log("Finishing Benchmark");

    //return this.__getResults();
  }

  /**
   * @param {string} name
   */
  addMark(name) {
    if (this.__state === "empty") {
      this.__state = "building";
    }
    invariant(
      this.__state === "building",
      "Cannot add mark while warming or recording"
    );
    this.__marks.add(name);
  }

  __buildHistogram() {
    const histogram = hdr.build({
      bitBucketSize: 32, // may be 8, 16, 32, 64 or 'packed'
      autoResize: true, // default value is true
      lowestDiscernibleValue: 1, // default value is also 1
      highestTrackableValue: 100000, // can increase up to Number.MAX_SAFE_INTEGER
      numberOfSignificantValueDigits: 3, // Number between 1 and 5 (inclusive)
      useWebAssembly: false, // default value is false, see WebAssembly section for details });
    });
    console.log(histogram.estimatedFootprintInBytes);
    return histogram;
  }

  /**
   * @param {string} name
   * @param {string} startMark
   * @param {string} endMark
   */
  addFlow(name, startMark, endMark) {
    invariant(
      this.__state === "building",
      "Cannot add flow while warming or recording"
    );

    if (!this.__marks.has(startMark)) {
      throw new Error(`Mark ${startMark} not found`);
    }

    invariant(this.__marks.has(startMark), `Mark ${startMark} not found`);
    invariant(this.__marks.has(endMark), `Mark ${endMark} not found`);

    invariant(
      this.__flows.find(
        (f) => f.startMark === startMark && f.endMark === endMark
      ) === undefined,
      `Flow ${startMark} -> ${endMark} already exists`
    );

    const histogram = this.__buildHistogram();

    this.__flows.push({
      name: name,
      startMark: startMark,
      endMark: endMark,
      histogram,
    });
  }

  __startWarmingUp() {
    this.__state = "warming";

    invariant(this.__marks.size > 0, "No marks added");
    invariant(this.__flows.length > 0, "No flows added");

    const connectedMarks = new Set();
    for (const flow of this.__flows) {
      connectedMarks.add(flow.startMark);
      connectedMarks.add(flow.endMark);
    }

    const unconnectedMarks = [...this.__marks].filter(
      (m) => !connectedMarks.has(m)
    );
    invariant(
      unconnectedMarks.length === 0,
      "Unconnected marks: " + unconnectedMarks.join(", ")
    );
  }

  __startRecording() {
    this.__state = "recording";
  }

  __startExample() {
    invariant(this.__state !== "building", "Cannot add example while building");
    for (const mark of this.__marks) {
      this.__timings.set(mark, 0);
    }
  }

  __time() {
    return global.performance.now();
  }

  /**
   * @param {string} name
   */
  recordMark(name) {
    if (this.__state === "empty") {
      return;
    }

    invariant(this.__state !== "building", "Cannot add mark while building");
    invariant(this.__marks.has(name), `Mark ${name} not found`);

    if (this.__state === "warming") {
      return;
    }

    this.__timings.set(name, this.__time());

    const finishedFlows = this.__flows.filter((f) => f.endMark === name);
    if (finishedFlows.length > 0) {
      for (const flow of finishedFlows) {
        const start = this.__timings.get(flow.startMark);
        const end = this.__timings.get(flow.endMark);

        // @ts-ignore
        let duration = Math.max(end * UNIT_FACTOR - start * UNIT_FACTOR, 0);

        flow.histogram.recordValue(duration);
      }
    }
  }

  // @ts-ignore
  __getInterestingFlows() {
    invariant(this.__state !== "building", "Cannot get results while building");
    let calibrationFlow = this.__flows.find((f) => f.name === "Calibration");
    // @ts-ignore
    const meanCalibration = calibrationFlow.histogram.mean;

    console.log("Nb Flow", this.__flows.length);

    let interestingFlows = this.__flows.filter((flow) => {
      if (flow.histogram.totalCount < 0) return false;
      if (flow.name === "Calibration") return true;
      if (flow.histogram.mean < meanCalibration) return false;
      return true;
    });

    return interestingFlows;
  }

  // @ts-ignore
  __getResults() {
    invariant(this.__state !== "building", "Cannot get results while building");

    const interestingFlows = this.__getInterestingFlows();

    // @ts-ignore
    const results = [];
    for (const flow of interestingFlows) {
      results.push(flow.name);
      results.push(flow.histogram.toString());
      results.push(flow.histogram.outputPercentileDistribution());
    }

    console.log(results);

    return results.join("\n");
  }

  /**
   */
  async saveResults() {
    invariant(
      this.__state !== "building",
      "Cannot save results while building"
    );

    const interestingFlows = this.__getInterestingFlows();

    for (const flow of interestingFlows) {
      console.log("Flow: " + flow.name + "-> building distribution");
      let percentileDistrtibution = flow.histogram.outputPercentileDistribution(
        5,
        DISPLAY_UNIT_FACTOR,
        // @ts-ignore
        true
      );
      console.log("Flow: " + flow.name + "-> writing file");
      // // @ts-ignore
      try {
        const file = FileSystem.documentDirectory + flow.name + ".csv";
        await FileSystem.writeAsStringAsync(file, percentileDistrtibution);
      } catch (e) {
        console.warn(e);
      }
      console.log("Flow: " + flow.name + "-> done");
    }
  }
}

let benchmark = Benchmark.getInstance();

module.exports = {
  benchmark: benchmark,
};