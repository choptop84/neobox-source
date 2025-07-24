/*!
Copyright (c) 2012-2022 John Nesky and contributing authors

Permission is hereby granted, free of charge, to any person obtaining a copy of 
this software and associated documentation files (the "Software"), to deal in 
the Software without restriction, including without limitation the rights to 
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies 
of the Software, and to permit persons to whom the Software is furnished to do 
so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all 
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR 
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, 
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE 
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER 
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, 
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE 
SOFTWARE.
*/

import { inverseRealFourierTransform, scaleElementsByFactor } from "./FFT";

export interface Dictionary<T> {
	[K: string]: T;
}

export interface DictionaryArray<T> extends ReadonlyArray<T> {
	dictionary: Dictionary<T>;
}

export interface BeepBoxOption {
	readonly index: number;
	readonly name: string;
}

export const enum EnvelopeType {
	custom,
	steady,
	punch,
	flare,
	pluck,
	tremolo,
	flute,
}

export const enum InstrumentType {
	chip = 0,
	fm = 1,
	noise = 2,
	pwm = 3,
}

export interface Scale extends BeepBoxOption {
	readonly flags: ReadonlyArray<boolean>;
	readonly realName: string;
}

export interface Key extends BeepBoxOption {
	readonly isWhiteKey: boolean;
	readonly basePitch: number;
}

export class Config {
	public static readonly scales: DictionaryArray<Scale> = toNameMap([
		{name: "easy :)",            realName: "pentatonic major",      flags: [true, false,  true, false,  true, false, false,  true, false,  true, false, false]},
		{name: "easy :(",            realName: "pentatonic minor",      flags: [true, false, false,  true, false,  true, false,  true, false, false,  true, false]},
		{name: "island :)",          realName: "ryukyu",                flags: [true, false, false, false,  true,  true, false,  true, false, false, false,  true]},
		{name: "island :(",          realName: "pelog selisir",         flags: [true,  true, false,  true, false, false, false,  true,  true, false, false, false]},
		{name: "blues :)",           realName: "blues major",           flags: [true, false,  true,  true,  true, false, false,  true, false,  true, false, false]},
		{name: "blues :(",           realName: "blues",                 flags: [true, false, false,  true, false,  true,  true,  true, false, false,  true, false]},
		{name: "normal :)",          realName: "ionian",                flags: [true, false,  true, false,  true,  true, false,  true, false,  true, false,  true]},
		{name: "normal :(",          realName: "aeolian",               flags: [true, false,  true,  true, false,  true, false,  true,  true, false,  true, false]},
		{name: "dbl harmonic :)", 	 realName: "double harmonic major", flags: [true,  true, false, false,  true,  true, false,  true,  true, false, false,  true]},
		{name: "dbl harmonic :(",    realName: "double harmonic minor", flags: [true, false,  true,  true, false, false,  true,  true,  true, false, false,  true]},
		{name: "enigma",             realName: "whole tone",            flags: [true, false,  true, false,  true, false,  true, false,  true, false,  true, false]},
		{name: "expert",             realName: "chromatic",             flags: [true,  true,  true,  true,  true,  true,  true,  true,  true,  true,  true,  true]},
		{name: "monotonic",          realName: "monotonic",             flags: [true, false, false, false, false, false, false, false, false, false, false, false]},
		{name: "no dabbing",         realName: "no dabbing",            flags: [true,  true, false,  true,  true,  true,  true,  true,  true, false,  true, false]},
	]);
	static readonly blackKeyNameParents: ReadonlyArray<number> = [-1, 1, -1, 1, -1, 1, -1, -1, 1, -1, 1, -1];
	static readonly pitchNames: ReadonlyArray<string | null> = ["C", null, "D", null, "E", "F", null, "G", null, "A", null, "B"];
	public static readonly oldKeys: ReadonlyArray<string | null> = ["B", "A♯", "A", "G♯", "F♯", "F", "E", "D♯", "D", "C♯", "C"];
	public static readonly keys: DictionaryArray<Key> = toNameMap([
		{name: "C",  isWhiteKey:  true, basePitch: 12}, // C0 has index 12 on the MIDI scale. C7 is 96, and C9 is 120. C10 is barely in the audible range.
		{name: "C♯", isWhiteKey: false, basePitch: 13},
		{name: "D",  isWhiteKey:  true, basePitch: 14},
		{name: "D♯", isWhiteKey: false, basePitch: 15},
		{name: "E",  isWhiteKey:  true, basePitch: 16},
		{name: "F",  isWhiteKey:  true, basePitch: 17},
		{name: "F♯", isWhiteKey: false, basePitch: 18},
		{name: "G",  isWhiteKey:  true, basePitch: 19},
		{name: "G♯", isWhiteKey: false, basePitch: 20},
		{name: "A",  isWhiteKey:  true, basePitch: 21},
		{name: "A♯", isWhiteKey: false, basePitch: 22},
		{name: "B",  isWhiteKey:  true, basePitch: 23},
	]);
	static readonly mixNames: ReadonlyArray<string> = ["Type A (B & S)", "Type B (M)", "Type C"];
	static readonly sampleRateNames: ReadonlyArray<string> = ["44100kHz", "48000kHz", "default", "×4", "×2", "÷2", "÷4", "÷8", "÷16"];
	static readonly tempoMin: number = 1;
	static readonly tempoMax: number = 500;
	static readonly reverbRange: number = 5;
	static readonly blendRange: number = 4;
	static readonly riffRange: number = 11;
	static readonly detuneRange: number = 24;
	static readonly muffRange: number = 24;
	static readonly beatsPerBarMin: number = 1;
	static readonly beatsPerBarMax: number = 24;
	static readonly barCountMin: number = 1;
	static readonly barCountMax: number = 256;
	static readonly patternsPerChannelMin: number = 1;
	static readonly patternsPerChannelMax: number = 64;
	static readonly instrumentsPerChannelMin: number = 1;
	static readonly instrumentsPerChannelMax: number = 64;
	static readonly pitchesPerOctave: number = 12; // TODO: Use this for converting pitch to frequency.
	static readonly drumCount: number = 12;
	static readonly pitchOctaves: number = 7;
	static readonly partNames: ReadonlyArray<string> = ["÷3 (triplets)", "÷4 (standard)", "÷6", "÷8", "÷16 (arpfest)", "÷12", "÷9", "÷5", "÷50", "÷24"];
	static readonly partCounts: ReadonlyArray<number> = [3, 4, 6, 8, 16, 12, 9, 5, 50, 24];
	static readonly waveNames: ReadonlyArray<string> = ["triangle", "square", "pulse wide", "pulse narrow", "sawtooth", "double saw", "double pulse", "spiky", "plateau", "glitch", "10% pulse", "sunsoft bass", "loud pulse", "sax", "guitar", "sine", "atari bass", "atari pulse", "1% pulse", "curved sawtooth", "viola", "brass", "acoustic bass", "lyre", "ramp pulse", "piccolo", "squaretooth", "flatline", "pnryshk a (u5)", "pnryshk b (riff)"];
	static readonly waveVolumes: ReadonlyArray<number> = [1.0,        0.5,      0.5,          0.5,            0.65,       0.5,          0.4,            0.4,     0.94,      0.5,      0.5,         1.0,            0.6,          0.1,   0.25,     1.0,    1.0,          1.0,           1.0,        1.0,               1.0,     1.0,     1.0,             0.2,    0.2,          0.9,       0.9,           1.0,        0.4,                 0.5];
	static readonly drumNames: ReadonlyArray<string> = ["retro", "white", "periodic", "detuned periodic", "shine", "hollow", "deep", "cutter", "metallic", "snare"/*, "tom-tom", "cymbal", "bass"*/];
	static readonly drumVolumes: ReadonlyArray<number> = [0.25, 1.0, 0.4, 0.3, 0.3, 1.5, 1.5, 0.25, 1.0, 1.0/*, 1.5, 1.5, 1.5*/];
	static readonly drumBasePitches: ReadonlyArray<number> = [69, 69, 69, 69, 69, 96, 120, 96, 96, 69/*, 96, 90, 126*/];
	static readonly drumPitchFilterMult: ReadonlyArray<number> = [100.0, 8.0, 100.0, 100.0, 100.0, 1.0, 100.0, 100.0, 100.0, 100.0/*, 1.0, 1.0, 1.0*/];
	static readonly drumWaveIsSoft: ReadonlyArray<boolean> = [false, true, false, false, false, true, true, false, false, false/*, true, true, true*/];
	// Noise waves have too many samples to write by hand, they're generated on-demand by getDrumWave instead.
	private static readonly _drumWaves: Array<Float32Array | null> = [null, null, null, null, null, null, null, null, null, null/*, null, null, null*/];
	static readonly pwmwaveNames: ReadonlyArray<string> = ["5%", "10%", "15%", "20%", "25%", "30%", "35%", "40%", "45%", "50%"];
	static readonly pwmwaveVolumes: ReadonlyArray<number> = [1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0];
	static readonly filterNames: ReadonlyArray<string> = ["none", "sustain sharp", "sustain medium", "sustain soft", "decay sharp", "decay medium", "decay soft", "decay drawn", "fade sharp", "fade medium", "fade soft", "ring", "muffled", "submerged", "shift", "overtone", "woosh", "undertone"];
	static readonly filterBases: ReadonlyArray<number> = [0.0, 2.0, 3.5, 5.0, 1.0, 2.5, 4.0, 1.0, 5.0, 7.5, 10.0, -1.0, 4.0, 6.0, 0.0, 1.0, 2.0, 5.0];
	static readonly filterDecays: ReadonlyArray<number> = [0.0, 0.0, 0.0, 0.0, 10.0, 7.0, 4.0, 0.5, -10.0, -7.0, -4.0, 0.2, 0.2, 0.3, 0.0, 0.0, -6.0, 0.0];
	static readonly filterVolumes: ReadonlyArray<number> = [0.2, 0.4, 0.7, 1.0, 0.5, 0.75, 1.0, 0.5, 0.4, 0.7, 1.0, 0.5, 0.75, 0.4, 0.4, 1.0, 0.5, 1.75];
	static readonly transitionNames: ReadonlyArray<string> = ["seamless", "sudden", "smooth", "slide", "trill", "click", "bow", "blip"];
	static readonly effectNames: ReadonlyArray<string> = ["none", "vibrato light", "vibrato delayed", "vibrato heavy", "tremolo light", "tremolo heavy", "alien", "stutter", "strum"];
	static readonly effectVibratos: ReadonlyArray<number> = [0.0, 0.15, 0.3, 0.45, 0.0, 0.0, 1.0, 0.0, 0.05];
	static readonly effectTremolos: ReadonlyArray<number> = [0.0, 0.0, 0.0, 0.0, 0.25, 0.5, 0.0, 1.0, 0.025];
	static readonly effectVibratoDelays: ReadonlyArray<number> = [0, 0, 3, 0, 0, 0, 0, 0];
	static readonly chorusNames: ReadonlyArray<string> = ["union", "shimmer", "hum", "honky tonk", "dissonant", "fifths", "octaves", "spinner", "detune", "bowed", "rising", "vibrate", "fourths", "bass", "dirty", "stationary", "harmonic (legacy)", "recurve", "voiced", "fluctuate"];
	static readonly chorusIntervals: ReadonlyArray<number> = [0.0, 0.02, 0.05, 0.1, 0.25, 3.5, 6, 0.02, 0.0, 0.02, 1.0, 3.5, 4, 0, 0.0, 3.5, 0.0, 0.005, 0.25, 12];
	static readonly chorusOffsets: ReadonlyArray<number> = [0.0, 0.0, 0.0, 0.0, 0.0, 3.5, 6, 0.0, 0.25, 0.0, 0.7, 7, 4, -7, 0.1, 0.0, 0.0, 0.0, 3.0, 0.0];
	static readonly chorusVolumes: ReadonlyArray<number> = [0.9, 0.9, 1.0, 1.0, 0.95, 0.95, 0.9, 1.0, 1.0, 1.0, 0.95, 0.975, 0.95, 1.0, 0.975, 0.9, 1.0, 1.0, 0.9, 1.0];
	static readonly chorusSigns: ReadonlyArray<number> = [1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, -1.0, 1.0, 1.0, 1.0, 1.0, 1.0, -1.0, 1.0, -1.0, 1.0, 1.0];
	static readonly chorusRiffApp: ReadonlyArray<number> = [0.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 0.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0];
	static readonly chorusHarmonizes: ReadonlyArray<boolean> = [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false];
	static readonly harmDisplay: ReadonlyArray<string> = ["arpeggio", "duet", "chord", "seventh", "half arpeggio", "arp-chord"];
	static readonly harmNames: ReadonlyArray<number> = [0, 1, 2, 3, 4, 5];
	static readonly fmChorusDisplay: ReadonlyArray<string> = ["none", "default", "detune", "honky tonk", "consecutive", "alt. major thirds", "alt. minor thirds", "fifths", "octaves"];
	static readonly fmChorusNames: ReadonlyArray<number> = [0, 1, 2, 3, 4, 5, 6, 7, 8];
	static readonly imuteNames: ReadonlyArray<string> = ["◉", "◎"];
	static readonly imuteValues: ReadonlyArray<number> = [1, 0];
	static readonly octoffNames: ReadonlyArray<string> = ["none", "+2 (2 octaves)",  "+1 1/2 (octave and fifth)",  "+1 (octave)",  "+1/2 (fifth)", "-1/2 (fifth)", "-1 (octave)", "-1 1/2 (octave and fifth)", "-2 (2 octaves"];
	static readonly octoffValues: ReadonlyArray<number> = [0.0, 24.0, 19.0, 12.0, 7.0, -7.0, -12.0, -19.0, -24.0];
	static readonly volumeNames: ReadonlyArray<string> = ["loudest", "loud", "medium", "quiet", "quietest", "mute", "i", "couldnt", "be", "bothered"];
	static readonly volumeValues: ReadonlyArray<number> = [0.0, 0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0, -1.0];
	static readonly volumeMValues: ReadonlyArray<number> = [0.0, 0.5, 1.0, 1.5, 2.0, -1.0];
	static readonly ipanValues: ReadonlyArray<number> = [-1.0, -0.75, -0.5, -0.25, 0.0, 0.25, 0.5, 0.75, 1.0];
	static readonly operatorCount: number = 4;
	static readonly operatorAlgorithmNames: ReadonlyArray<string> = [
		"1←(2 3 4)",
		"1←(2 3←4)",
		"1←2←(3 4)",
		"1←(2 3)←4",
		"1←2←3←4",
		"1←3 2←4",
		"1 2←(3 4)",
		"1 2←3←4",
		"(1 2)←3←4",
		"(1 2)←(3 4)",
		"1 2 3←4",
		"(1 2 3)←4",
		"1 2 3 4",
	];
	static readonly midiAlgorithmNames: ReadonlyArray<string> = ["1<(2 3 4)", "1<(2 3<4)", "1<2<(3 4)", "1<(2 3)<4", "1<2<3<4", "1<3 2<4", "1 2<(3 4)", "1 2<3<4", "(1 2)<3<4", "(1 2)<(3 4)", "1 2 3<4", "(1 2 3)<4", "1 2 3 4"];
	static readonly operatorModulatedBy: ReadonlyArray<ReadonlyArray<ReadonlyArray<number>>> = [
		[[2, 3, 4], [],     [],  []],
		[[2, 3],    [],     [4], []],
		[[2],       [3, 4], [],  []],
		[[2, 3],    [4],    [4], []],
		[[2],       [3],    [4], []],
		[[3],       [4],    [],  []],
		[[],        [3, 4], [],  []],
		[[],        [3],    [4], []],
		[[3],       [3],    [4], []],
		[[3, 4],    [3, 4], [],  []],
		[[],        [],     [4], []],
		[[4],       [4],    [4], []],
		[[],        [],     [],  []],
	];
	static readonly operatorAssociatedCarrier: ReadonlyArray<ReadonlyArray<number>> = [
		[1, 1, 1, 1],
		[1, 1, 1, 1],
		[1, 1, 1, 1],
		[1, 1, 1, 1],
		[1, 1, 1, 1],
		[1, 2, 1, 2],
		[1, 2, 2, 2],
		[1, 2, 2, 2],
		[1, 2, 2, 2],
		[1, 2, 2, 2],
		[1, 2, 3, 3],
		[1, 2, 3, 3],
		[1, 2, 3, 4],
	];
	static readonly operatorCarrierCounts: ReadonlyArray<number> = [1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 3, 3, 4];
	static readonly operatorCarrierChorus: ReadonlyArray<ReadonlyArray<number>> = [
		[0.0, 0.0, 0.0, 0.0],
		[0.0, 0.04, -0.073, 0.091],
		[0.5, 0.54, 0.427, 0.591],
		[0.0, 0.26, -0.45, 0.67],
		[0.0, 1.0, 2.0, 3.0],
		[0.0, 4.0, 7.0, 11.0],
		[0.0, 3.0, 7.0, 10.0],
		[0.0, 7.0, 14.0, 21.0],
		[0.0, 12.0, 24.0, 36.0],
	];
	static readonly operatorAmplitudeMax: number = 15;
	static readonly operatorFrequencyNames: ReadonlyArray<string> = ["1×", "~1×", "2×", "~2×", "3×", "4×", "5×", "6×", "7×", "8×", "9×", "10×", "11×", "13×", "16×", "20×"];
	static readonly midiFrequencyNames: ReadonlyArray<string> = ["1x", "~1x", "2x", "~2x", "3x", "4x", "5x", "6x", "7x", "8x", "9x", "10x", "11x", "13x", "16x", "20x"];
	static readonly operatorFrequencies: ReadonlyArray<number> =    [1.0, 1.0, 2.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 13.0, 16.0, 20.0];
	static readonly operatorHzOffsets: ReadonlyArray<number> =      [0.0, 1.5, 0.0, -1.3, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0];
	static readonly operatorAmplitudeSigns: ReadonlyArray<number> = [1.0, -1.0, 1.0, -1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0];
	static readonly operatorEnvelopeNames: ReadonlyArray<string> = ["custom", "steady", "punch", "flare 1", "flare 2", "flare 3", "pluck 1", "pluck 2", "pluck 3", "swell 1", "swell 2", "swell 3", "tremolo1", "tremolo2", "tremolo3", "custom flare", "custom tremolo", "flute 1", "flute 2", "flute 3"];
	static readonly operatorEnvelopeType: ReadonlyArray<EnvelopeType> = [EnvelopeType.custom, EnvelopeType.steady, EnvelopeType.punch, EnvelopeType.flare, EnvelopeType.flare, EnvelopeType.flare, EnvelopeType.pluck, EnvelopeType.pluck, EnvelopeType.pluck, EnvelopeType.pluck, EnvelopeType.pluck, EnvelopeType.pluck, EnvelopeType.tremolo, EnvelopeType.tremolo, EnvelopeType.tremolo, EnvelopeType.flare, EnvelopeType.tremolo, EnvelopeType.flute, EnvelopeType.flute, EnvelopeType.flute];
	static readonly operatorSpecialCustomVolume: ReadonlyArray<boolean> = [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, true, true, false, false, false];
	static readonly operatorEnvelopeSpeed: ReadonlyArray<number> = [0.0, 0.0, 0.0, 32.0, 8.0, 2.0, 32.0, 8.0, 2.0, 32.0, 8.0, 2.0, 4.0, 2.0, 1.0, 8.0, 0.0, 16.0, 8.0, 4.0];
	static readonly operatorEnvelopeInverted: ReadonlyArray<boolean> = [false, false, false, false, false, false, false, false, false, true, true, true, false, false, false, false, false, false, false, false];
	static readonly operatorFeedbackNames: ReadonlyArray<string> = [
		"1⟲",
		"2⟲",
		"3⟲",
		"4⟲",
		"1⟲ 2⟲",
		"3⟲ 4⟲",
		"1⟲ 2⟲ 3⟲ ",
		"2⟲ 3⟲ 4⟲ ",
		"1⟲ 2⟲ 3⟲ 4⟲ ",
		"1→2",
		"1→3",
		"1→4",
		"2→3",
		"2→4",
		"3→4",
		"1→3 2→4",
		"1→4 2→3",
		"1→2→3→4",
		"1🗘2",
		"1🗘3",
		"1🗘4",
		"2🗘3",
		"2🗘4",
		"3🗘4",
	];
	static readonly midiFeedbackNames: ReadonlyArray<string> = [
		"1",
		"2",
		"3",
		"4",
		"1 2",
		"3 4",
		"1 2 3",
		"2 3 4",
		"1 2 3 4",
		"1>2",
		"1>3",
		"1>4",
		"2>3",
		"2>4",
		"3>4",
		"1>3 2>4",
		"1>4 2>3",
		"1>2>3>4",
		"1-2",
		"1-3",
		"1-4",
		"2-3",
		"2-4",
		"3-4",
	];
	static readonly operatorFeedbackIndices: ReadonlyArray<ReadonlyArray<ReadonlyArray<number>>> = [
		[[1], [], [], []],
		[[], [2], [], []],
		[[], [], [3], []],
		[[], [], [], [4]],
		[[1], [2], [], []],
		[[], [], [3], [4]],
		[[1], [2], [3], []],
		[[], [2], [3], [4]],
		[[1], [2], [3], [4]],
		[[], [1], [], []],
		[[], [], [1], []],
		[[], [], [], [1]],
		[[], [], [2], []],
		[[], [], [], [2]],
		[[], [], [], [3]],
		[[], [], [1], [2]],
		[[], [], [2], [1]],
		[[], [1], [2], [3]],
		[[2], [1], [],  []  ],
		[[3], [],  [1], []  ],
		[[4], [],  [],  [1] ],
		[[],  [3], [2], []  ],
		[[],  [4], [],  [2] ],
		[[],  [],  [4], [3] ],
	];
	static readonly pitchChannelTypeNames: ReadonlyArray<string> = ["chip", "FM (expert)", "PWM (beta)"];
	static readonly pitchChannelTypeValues: ReadonlyArray<number> = [InstrumentType.chip, InstrumentType.fm, InstrumentType.pwm];
	static readonly drumChannelTypeNames: ReadonlyArray<string> = ["noise"];
	static readonly instrumentTypeNames: ReadonlyArray<string> = ["chip", "FM", "noise", "PWM"];

	static readonly oldThemeNames: ReadonlyArray<string> = ["Default", "ModBox 2.0", "Artic", "Cinnamon Roll [!]", "Ocean", "Rainbow [!]", "Float [!]", "Windows", "Grassland", "Dessert", "Kahootiest", "Beam to the Bit [!]", "Pretty Egg", "Poniryoshka", "Gameboy [!]", "Woodkid", "Midnight", "Snedbox", "unnamed", "Piano [!] [↻]", "Halloween", "FrozenOver❄️"];

	static readonly channelOneBrightColorPallet: string      = "#25f3ff";
	static readonly channelTwoBrightColorPallet: string      = "#44ff44";
	static readonly channelThreeBrightColorPallet: string    = "#ffff25";
	static readonly channelFourBrightColorPallet: string     = "#ff9752";
	static readonly channelFiveBrightColorPallet: string     = "#ff90ff";
	static readonly channelSixBrightColorPallet: string      = "#9f31ea";
	static readonly channelSevenBrightColorPallet: string    = "#2b6aff";
	static readonly channelEightBrightColorPallet: string    = "#00ff9f";
	static readonly channelNineBrightColorPallet: string     = "#ffbf00";
	static readonly channelTenBrightColorPallet: string      = "#d85d00";
	static readonly channelElevenBrightColorPallet: string   = "#ff00a1";
	static readonly channelTwelveBrightColorPallet: string   = "#c26afc";
	static readonly channelThirteenBrightColorPallet: string = "#ff1616";
	static readonly channelFourteenBrightColorPallet: string = "#ffffff";
	static readonly channelFifteenBrightColorPallet: string  = "#768dfc";
	static readonly channelSixteenBrightColorPallet: string  = "#a5ff00";

	static readonly channelOneDimColorPallet: string      = "#0099a1";
	static readonly channelTwoDimColorPallet: string      = "#439143";
	static readonly channelThreeDimColorPallet: string    = "#a1a100";
	static readonly channelFourDimColorPallet: string     = "#c75000";
	static readonly channelFiveDimColorPallet: string     = "#d020d0";
	static readonly channelSixDimColorPallet: string      = "#552377";
	static readonly channelSevenDimColorPallet: string    = "#221b89";
	static readonly channelEightDimColorPallet: string    = "#00995f";
	static readonly channelNineDimColorPallet: string     = "#d6b03e";
	static readonly channelTenDimColorPallet: string      = "#b25915";
	static readonly channelElevenDimColorPallet: string   = "#891a60";
	static readonly channelTwelveDimColorPallet: string   = "#965cbc";
	static readonly channelThirteenDimColorPallet: string = "#991010";
	static readonly channelFourteenDimColorPallet: string = "#aaaaaa";
	static readonly channelFifteenDimColorPallet: string  = "#5869BD";
	static readonly channelSixteenDimColorPallet: string  = "#7c9b42";

	static readonly pitchChannelColorsDim: ReadonlyArray<string>    = [Config.channelOneDimColorPallet, Config.channelTwoDimColorPallet, Config.channelThreeDimColorPallet, Config.channelFourDimColorPallet, Config.channelFiveDimColorPallet, Config.channelSixDimColorPallet, Config.channelSevenDimColorPallet, Config.channelEightDimColorPallet, Config.channelNineDimColorPallet, Config.channelTenDimColorPallet, Config.channelElevenDimColorPallet, Config.channelTwelveDimColorPallet];
	static readonly pitchChannelColorsBright: ReadonlyArray<string> = [Config.channelOneBrightColorPallet, Config.channelTwoBrightColorPallet, Config.channelThreeBrightColorPallet, Config.channelFourBrightColorPallet, Config.channelFiveBrightColorPallet, Config.channelSixBrightColorPallet, Config.channelSevenBrightColorPallet, Config.channelEightBrightColorPallet, Config.channelNineBrightColorPallet, Config.channelTenBrightColorPallet, Config.channelElevenBrightColorPallet, Config.channelTwelveBrightColorPallet];
	static readonly pitchNoteColorsDim: ReadonlyArray<string>       = [Config.channelOneDimColorPallet, Config.channelTwoDimColorPallet, Config.channelThreeDimColorPallet, Config.channelFourDimColorPallet, Config.channelFiveDimColorPallet, Config.channelSixDimColorPallet, Config.channelSevenDimColorPallet, Config.channelEightDimColorPallet, Config.channelNineDimColorPallet, Config.channelTenDimColorPallet, Config.channelElevenDimColorPallet, Config.channelTwelveDimColorPallet];
	static readonly pitchNoteColorsBright: ReadonlyArray<string>    = [Config.channelOneBrightColorPallet, Config.channelTwoBrightColorPallet, Config.channelThreeBrightColorPallet, Config.channelFourBrightColorPallet, Config.channelFiveBrightColorPallet, Config.channelSixBrightColorPallet, Config.channelSevenBrightColorPallet, Config.channelEightBrightColorPallet, Config.channelNineBrightColorPallet, Config.channelTenBrightColorPallet, Config.channelElevenBrightColorPallet, Config.channelTwelveBrightColorPallet];
	static readonly drumChannelColorsDim: ReadonlyArray<string>    = [Config.channelThirteenDimColorPallet, Config.channelFourteenDimColorPallet, Config.channelFifteenDimColorPallet, Config.channelSixteenDimColorPallet];
	static readonly drumChannelColorsBright: ReadonlyArray<string> = [Config.channelThirteenBrightColorPallet, Config.channelFourteenBrightColorPallet, Config.channelFifteenBrightColorPallet, Config.channelSixteenBrightColorPallet];
	static readonly drumNoteColorsDim: ReadonlyArray<string>       = [Config.channelThirteenDimColorPallet, Config.channelFourteenDimColorPallet, Config.channelFifteenDimColorPallet, Config.channelSixteenDimColorPallet];
	static readonly drumNoteColorsBright: ReadonlyArray<string>    = [Config.channelThirteenBrightColorPallet, Config.channelFourteenBrightColorPallet, Config.channelFifteenBrightColorPallet, Config.channelSixteenBrightColorPallet];

	static readonly midiPitchChannelNames: ReadonlyArray<string> = ["cyan channel", "yellow channel", "orange channel", "green channel", "purple channel", "blue channel"];
	static readonly midiDrumChannelNames: ReadonlyArray<string> = ["gray channel", "brown channel", "indigo channel"];
	static readonly midiSustainInstruments: number[] = [
		0x47, // triangle -> clarinet
		0x50, // square -> square wave
		0x46, // pulse wide -> bassoon
		0x44, // pulse narrow -> oboe
		0x51, // sawtooth -> sawtooth wave
		0x51, // double saw -> sawtooth wave
		0x51, // double pulse -> sawtooth wave
		0x51, // spiky -> sawtooth wave
		0x4A, // plateau -> recorder
	];
	static readonly midiDecayInstruments: number[] = [
		0x2E, // triangle -> harp
		0x2E, // square -> harp
		0x06, // pulse wide -> harpsichord
		0x18, // pulse narrow -> nylon guitar
		0x19, // sawtooth -> steel guitar
		0x19, // double saw -> steel guitar
		0x6A, // double pulse -> shamisen
		0x6A, // spiky -> shamisen
		0x21, // plateau -> fingered bass
	];
	static readonly drumInterval: number = 6;
	static readonly pitchCount: number = 37;
	static readonly maxPitch: number = 84;
	static readonly pitchChannelCountMin: number = 0;
	static readonly pitchChannelCountMax: number = 12;
	static readonly drumChannelCountMin: number = 0;
	static readonly drumChannelCountMax: number = 4;
	static readonly waves: ReadonlyArray<Float64Array> = [
		Config._centerWave([1.0/15.0, 3.0/15.0, 5.0/15.0, 7.0/15.0, 9.0/15.0, 11.0/15.0, 13.0/15.0, 15.0/15.0, 15.0/15.0, 13.0/15.0, 11.0/15.0, 9.0/15.0, 7.0/15.0, 5.0/15.0, 3.0/15.0, 1.0/15.0, -1.0/15.0, -3.0/15.0, -5.0/15.0, -7.0/15.0, -9.0/15.0, -11.0/15.0, -13.0/15.0, -15.0/15.0, -15.0/15.0, -13.0/15.0, -11.0/15.0, -9.0/15.0, -7.0/15.0, -5.0/15.0, -3.0/15.0, -1.0/15.0]),
		Config._centerWave([1.0, -1.0]),
		Config._centerWave([1.0, -1.0, -1.0, -1.0]),
		Config._centerWave([1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0]),
		Config._centerWave([1.0/31.0, 3.0/31.0, 5.0/31.0, 7.0/31.0, 9.0/31.0, 11.0/31.0, 13.0/31.0, 15.0/31.0, 17.0/31.0, 19.0/31.0, 21.0/31.0, 23.0/31.0, 25.0/31.0, 27.0/31.0, 29.0/31.0, 31.0/31.0, -31.0/31.0, -29.0/31.0, -27.0/31.0, -25.0/31.0, -23.0/31.0, -21.0/31.0, -19.0/31.0, -17.0/31.0, -15.0/31.0, -13.0/31.0, -11.0/31.0, -9.0/31.0, -7.0/31.0, -5.0/31.0, -3.0/31.0, -1.0/31.0]),
		Config._centerWave([0.0, -0.2, -0.4, -0.6, -0.8, -1.0, 1.0, -0.8, -0.6, -0.4, -0.2, 1.0, 0.8, 0.6, 0.4, 0.2]),
		Config._centerWave([1.0, 1.0, 1.0, 1.0, 1.0, -1.0, -1.0, -1.0, 1.0, 1.0, 1.0, 1.0, -1.0, -1.0, -1.0, -1.0]),
		Config._centerWave([1.0, -1.0, 1.0, -1.0, 1.0, 0.0]),
		Config._centerWave([0.0, 0.2, 0.4, 0.5, 0.6, 0.7, 0.8, 0.85, 0.9, 0.95, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 0.95, 0.9, 0.85, 0.8, 0.7, 0.6, 0.5, 0.4, 0.2, 0.0, -0.2, -0.4, -0.5, -0.6, -0.7, -0.8, -0.85, -0.9, -0.95, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -0.95, -0.9, -0.85, -0.8, -0.7, -0.6, -0.5, -0.4, -0.2]),
		Config._centerWave([1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, -1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, -1.0, -1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, -1.0, -1.0, -1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, -1.0, -1.0, -1.0, -1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, -1.0, -1.0, -1.0, -1.0, -1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, -1.0, -1.0, -1.0, -1.0, -1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, -1.0, -1.0, -1.0, -1.0,1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, -1.0, -1.0, -1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, -1.0, -1.0]),
		Config._centerWave([1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0]),
		Config._centerWave([0.0, 0.1875, 0.3125, 0.5625, 0.5, 0.75, 0.875, 1.0, 1.0, 0.6875, 0.5, 0.625, 0.625, 0.5, 0.375, 0.5625, 0.4375, 0.5625, 0.4375, 0.4375, 0.3125, 0.1875, 0.1875, 0.375, 0.5625, 0.5625, 0.5625, 0.5625, 0.5625, 0.4375, 0.25, 0.0]),
		Config._centerWave([1.0, 0.7, 0.1, 0.1, 0, 0, 0, 0, 0, 0.1, 0.2, 0.15, 0.25, 0.125, 0.215, 0.345, 4.0]),
		Config._centerWave([1.0 / 15.0, 3.0 / 15.0, 5.0 / 15.0, 9.0, 0.06]),
		Config._centerWave([-0.5, 3.5, 3.0, -0.5, -0.25, -1.0]),
		Config._centerWave([0.0, 0.05, 0.125, 0.2, 0.25, 0.3, 0.425, 0.475, 0.525, 0.625, 0.675, 0.725, 0.775, 0.8, 0.825, 0.875, 0.9, 0.925, 0.95, 0.975, 0.98, 0.99, 0.995, 1, 0.995, 0.99, 0.98, 0.975, 0.95, 0.925, 0.9, 0.875, 0.825, 0.8, 0.775, 0.725, 0.675, 0.625, 0.525, 0.475, 0.425, 0.3, 0.25, 0.2, 0.125, 0.05, 0.0, -0.05, -0.125, -0.2, -0.25, -0.3, -0.425, -0.475, -0.525, -0.625, -0.675, -0.725, -0.775, -0.8, -0.825, -0.875, -0.9, -0.925, -0.95, -0.975, -0.98, -0.99, -0.995, -1, -0.995, -0.99, -0.98, -0.975, -0.95, -0.925, -0.9, -0.875, -0.825, -0.8, -0.775, -0.725, -0.675, -0.625, -0.525, -0.475, -0.425, -0.3, -0.25, -0.2, -0.125, -0.05]),
		Config._centerWave([1.0, 1.0, 1.0, 1.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0]),
		Config._centerWave([0.0, 0.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0]),
		Config._centerWave([1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0]),
		Config._centerWave([1.0, 1.0 / 2.0, 1.0 / 3.0, 1.0 / 4.0]),
		Config._centerWave([-0.9, -1.0, -0.85, -0.775, -0.7, -0.6, -0.5, -0.4, -0.325, -0.225, -0.2, -0.125, -0.1, -0.11, -0.125, -0.15, -0.175, -0.18, -0.2, -0.21, -0.22, -0.21, -0.2, -0.175, -0.15, -0.1, -0.5, 0.75, 0.11, 0.175, 0.2, 0.25, 0.26, 0.275, 0.26, 0.25, 0.225, 0.2, 0.19, 0.18, 0.19, 0.2, 0.21, 0.22, 0.23, 0.24, 0.25, 0.26, 0.275, 0.28, 0.29, 0.3, 0.29, 0.28, 0.27, 0.26, 0.25, 0.225, 0.2, 0.175, 0.15, 0.1, 0.075, 0.0, -0.01, -0.025, 0.025, 0.075, 0.2, 0.3, 0.475, 0.6, 0.75, 0.85, 0.85, 1.0, 0.99, 0.95, 0.8, 0.675, 0.475, 0.275, 0.01, -0.15, -0.3, -0.475, -0.5, -0.6, -0.71, -0.81, -0.9, -1.0, -0.9]),
		Config._centerWave([-1.0, -0.95, -0.975, -0.9, -0.85, -0.8, -0.775, -0.65, -0.6, -0.5, -0.475, -0.35, -0.275, -0.2, -0.125, -0.05, 0.0, 0.075, 0.125, 0.15, 0.20, 0.21, 0.225, 0.25, 0.225, 0.21, 0.20, 0.19, 0.175, 0.125, 0.10, 0.075, 0.06, 0.05, 0.04, 0.025, 0.04, 0.05, 0.10, 0.15, 0.225, 0.325, 0.425, 0.575, 0.70, 0.85, 0.95, 1.0, 0.9, 0.675, 0.375, 0.2, 0.275, 0.4, 0.5, 0.55, 0.6, 0.625, 0.65, 0.65, 0.65, 0.65, 0.64, 0.6, 0.55, 0.5, 0.4, 0.325, 0.25, 0.15, 0.05, -0.05, -0.15, -0.275, -0.35, -0.45, -0.55, -0.65, -0.7, -0.78, -0.825, -0.9, -0.925, -0.95, -0.975]),
		Config._centerWave([1.0, 0.0, 0.1, -0.1, -0.2, -0.4, -0.3, -1.0]),
		Config._centerWave([1.0, -1.0, 4.0, 2.15, 4.13, 5.15, 0.0, -0.05, 1.0]),
		Config._centerWave([6.1, -2.9, 1.4, -2.9]),
		Config._centerWave([1, 4, 2, 1, -0.1, -1, -0.12]),
		Config._centerWave([0.2, 1.0, 2.6, 1.0, 0.0, -2.4]),
		Config._centerWave([1.0, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1, 0.0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9]),
		Config._centerWave([1.0, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1, 0.0]),
		Config._centerWave([1.0, -0.9, 0.8, -0.7, 0.6, -0.5, 0.4, -0.3, 0.2, -0.1, 0.0, -0.1, 0.2, -0.3, 0.4, -0.5, 0.6, -0.7, 0.8, -0.9, 1.0]),
	];
	static readonly wavesMixC: ReadonlyArray<Float64Array> = [
		Config._centerWave([1.0 / 15.0, 3.0 / 15.0, 5.0 / 15.0, 7.0 / 15.0, 9.0 / 15.0, 11.0 / 15.0, 13.0 / 15.0, 15.0 / 15.0, 15.0 / 15.0, 13.0 / 15.0, 11.0 / 15.0, 9.0 / 15.0, 7.0 / 15.0, 5.0 / 15.0, 3.0 / 15.0, 1.0 / 15.0, -1.0 / 15.0, -3.0 / 15.0, -5.0 / 15.0, -7.0 / 15.0, -9.0 / 15.0, -11.0 / 15.0, -13.0 / 15.0, -15.0 / 15.0, -15.0 / 15.0, -13.0 / 15.0, -11.0 / 15.0, -9.0 / 15.0, -7.0 / 15.0, -5.0 / 15.0, -3.0 / 15.0, -1.0 / 15.0]),
		Config._centerWave([1.0, -1.0]),
		Config._centerWave([1.0, -1.0, -1.0, -1.0]),
		Config._centerWave([1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0]),
		Config._centerWave([1.0 / 31.0, 3.0 / 31.0, 5.0 / 31.0, 7.0 / 31.0, 9.0 / 31.0, 11.0 / 31.0, 13.0 / 31.0, 15.0 / 31.0, 17.0 / 31.0, 19.0 / 31.0, 21.0 / 31.0, 23.0 / 31.0, 25.0 / 31.0, 27.0 / 31.0, 29.0 / 31.0, 31.0 / 31.0, -31.0 / 31.0, -29.0 / 31.0, -27.0 / 31.0, -25.0 / 31.0, -23.0 / 31.0, -21.0 / 31.0, -19.0 / 31.0, -17.0 / 31.0, -15.0 / 31.0, -13.0 / 31.0, -11.0 / 31.0, -9.0 / 31.0, -7.0 / 31.0, -5.0 / 31.0, -3.0 / 31.0, -1.0 / 31.0]),
		Config._centerWave([0.0, -0.2, -0.4, -0.6, -0.8, -1.0, 1.0, -0.8, -0.6, -0.4, -0.2, 1.0, 0.8, 0.6, 0.4, 0.2]),
		Config._centerWave([1.0, 1.0, 1.0, 1.0, 1.0, -1.0, -1.0, -1.0, 1.0, 1.0, 1.0, 1.0, -1.0, -1.0, -1.0, -1.0]),
		Config._centerWave([1.0, -1.0, 1.0, -1.0, 1.0, 0.0]),
		Config._centerWave([0.0, 0.2, 0.4, 0.5, 0.6, 0.7, 0.8, 0.85, 0.9, 0.95, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 0.95, 0.9, 0.85, 0.8, 0.7, 0.6, 0.5, 0.4, 0.2, 0.0, -0.2, -0.4, -0.5, -0.6, -0.7, -0.8, -0.85, -0.9, -0.95, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -0.95, -0.9, -0.85, -0.8, -0.7, -0.6, -0.5, -0.4, -0.2]),
		Config._centerWave([1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, -1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, -1.0, -1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, -1.0, -1.0, -1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, -1.0, -1.0, -1.0, -1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, -1.0, -1.0, -1.0, -1.0, -1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, -1.0, -1.0, -1.0, -1.0, -1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, -1.0, -1.0, -1.0, -1.0,1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, -1.0, -1.0, -1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, -1.0, -1.0]),
		Config._centerWave([1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0]),
		Config._centerWave([0.0, 0.1875, 0.3125, 0.5625, 0.5, 0.75, 0.875, 1.0, 1.0, 0.6875, 0.5, 0.625, 0.625, 0.5, 0.375, 0.5625, 0.4375, 0.5625, 0.4375, 0.4375, 0.3125, 0.1875, 0.1875, 0.375, 0.5625, 0.5625, 0.5625, 0.5625, 0.5625, 0.4375, 0.25, 0.0]),
		Config._centerWave([1.0, 0.7, 0.1, 0.1, 0, 0, 0, 0, 0, 0.1, 0.2, 0.15, 0.25, 0.125, 0.215, 0.345, 4.0]),
		Config._centerWave([1.0 / 15.0, 3.0 / 15.0, 5.0 / 15.0, 9.0, 0.06]),
		Config._centerWave([-0.5, 3.5, 3.0, -0.5, -0.25, -1.0]),
		Config._centerWave([0.0, 0.05, 0.125, 0.2, 0.25, 0.3, 0.425, 0.475, 0.525, 0.625, 0.675, 0.725, 0.775, 0.8, 0.825, 0.875, 0.9, 0.925, 0.95, 0.975, 0.98, 0.99, 0.995, 1, 0.995, 0.99, 0.98, 0.975, 0.95, 0.925, 0.9, 0.875, 0.825, 0.8, 0.775, 0.725, 0.675, 0.625, 0.525, 0.475, 0.425, 0.3, 0.25, 0.2, 0.125, 0.05, 0.0, -0.05, -0.125, -0.2, -0.25, -0.3, -0.425, -0.475, -0.525, -0.625, -0.675, -0.725, -0.775, -0.8, -0.825, -0.875, -0.9, -0.925, -0.95, -0.975, -0.98, -0.99, -0.995, -1, -0.995, -0.99, -0.98, -0.975, -0.95, -0.925, -0.9, -0.875, -0.825, -0.8, -0.775, -0.725, -0.675, -0.625, -0.525, -0.475, -0.425, -0.3, -0.25, -0.2, -0.125, -0.05]),
		Config._centerWave([1.0, 1.0, 1.0, 1.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0]),
		Config._centerWave([0.0, 0.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0]),
		Config._centerWave([1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0]),
		Config._centerWave([1.0, 1.0 / 2.0, 1.0 / 3.0, 1.0 / 4.0]),
		Config._centerWave([-0.9, -1.0, -0.85, -0.775, -0.7, -0.6, -0.5, -0.4, -0.325, -0.225, -0.2, -0.125, -0.1, -0.11, -0.125, -0.15, -0.175, -0.18, -0.2, -0.21, -0.22, -0.21, -0.2, -0.175, -0.15, -0.1, -0.5, 0.75, 0.11, 0.175, 0.2, 0.25, 0.26, 0.275, 0.26, 0.25, 0.225, 0.2, 0.19, 0.18, 0.19, 0.2, 0.21, 0.22, 0.23, 0.24, 0.25, 0.26, 0.275, 0.28, 0.29, 0.3, 0.29, 0.28, 0.27, 0.26, 0.25, 0.225, 0.2, 0.175, 0.15, 0.1, 0.075, 0.0, -0.01, -0.025, 0.025, 0.075, 0.2, 0.3, 0.475, 0.6, 0.75, 0.85, 0.85, 1.0, 0.99, 0.95, 0.8, 0.675, 0.475, 0.275, 0.01, -0.15, -0.3, -0.475, -0.5, -0.6, -0.71, -0.81, -0.9, -1.0, -0.9]),
		Config._centerWave([-1.0, -0.95, -0.975, -0.9, -0.85, -0.8, -0.775, -0.65, -0.6, -0.5, -0.475, -0.35, -0.275, -0.2, -0.125, -0.05, 0.0, 0.075, 0.125, 0.15, 0.20, 0.21, 0.225, 0.25, 0.225, 0.21, 0.20, 0.19, 0.175, 0.125, 0.10, 0.075, 0.06, 0.05, 0.04, 0.025, 0.04, 0.05, 0.10, 0.15, 0.225, 0.325, 0.425, 0.575, 0.70, 0.85, 0.95, 1.0, 0.9, 0.675, 0.375, 0.2, 0.275, 0.4, 0.5, 0.55, 0.6, 0.625, 0.65, 0.65, 0.65, 0.65, 0.64, 0.6, 0.55, 0.5, 0.4, 0.325, 0.25, 0.15, 0.05, -0.05, -0.15, -0.275, -0.35, -0.45, -0.55, -0.65, -0.7, -0.78, -0.825, -0.9, -0.925, -0.95, -0.975]),
		Config._centerWave([0.7, 0.0, 0.1, -0.1, -0.2, -0.4, -0.3, -0.7]),
		Config._centerWave([1.0, -1.0, 4.0, 2.15, 4.1, 5.05, 0.0, -0.05, 1.0]),
		Config._centerWave([4.5, -1.7, 1.0, -1.7]),
		Config._centerWave([0.1, 0.4, 0.2, 0.1, -0.1, -1, -0.12]),
		Config._centerWave([.03, .13, .30, 1.0, 0.0, -.26]),
		Config._centerWave([2, 1.75, 1.5, 1.25, 1, .75, .5, .25, 0.0, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75]),
		Config._centerWave([1.0, 1.9, 1.8, 1.7, 1.6, 1.5, 1.4, 1.3, 1.2, 1.1, 1.0]),
		Config._centerWave([-1.0, -0.9, 0.8, -0.7, 0.6, -0.5, 0.4, -0.3, 0.2, -0.1, 0.0, -0.1, 0.2, -0.3, 0.4, -0.5, 0.6, -0.7, 0.8, -0.9, -1.0]),
	];
	static readonly pwmwaves: ReadonlyArray<Float64Array> = [
		Config._centerWave([1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0]),
		Config._centerWave([1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0]),
		Config._centerWave([1.0, 1.0, 1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0]),
		Config._centerWave([1.0, 1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0]),
		Config._centerWave([1.0, 1.0, 1.0, 1.0, 1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0]),
		Config._centerWave([1.0, 1.0, 1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0]),
		Config._centerWave([1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0]),
		Config._centerWave([1.0, 1.0, 1.0, 1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0]),
		Config._centerWave([1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0]),
		Config._centerWave([1.0, 1.0, 1.0, 1.0, 1.0, -1.0, -1.0, -1.0, -1.0, -1.0]),
	];
	static readonly sineWaveLength: number = 1 << 8; // 256
	static readonly sineWaveMask: number = Config.sineWaveLength - 1;
	static readonly sineWave: Float64Array = Config.generateSineWave();
	
	private static _centerWave(wave: Array<number>): Float64Array {
		let sum: number = 0.0;
		for (let i: number = 0; i < wave.length; i++) sum += wave[i];
		const average: number = sum / wave.length;
		for (let i: number = 0; i < wave.length; i++) wave[i] -= average;
		return new Float64Array(wave);
	}
	
	static getDrumWave(index: number): Float32Array {
		let wave: Float32Array | null = Config._drumWaves[index];
		if (wave == null) {
			wave = new Float32Array(32768);
			Config._drumWaves[index] = wave;
			
			if (index == 0) {
				// The "retro" drum uses a "Linear Feedback Shift Register" similar to the NES noise channel.
				let drumBuffer: number = 1;
				for (let i: number = 0; i < 32768; i++) {
					wave[i] = (drumBuffer & 1) * 2.0 - 1.0;
					let newBuffer: number = drumBuffer >> 1;
					if (((drumBuffer + newBuffer) & 1) == 1) {
						newBuffer += 1 << 14;
					}
					drumBuffer = newBuffer;
				}
			} else if (index == 1) {
				// White noise is just random values for each sample.
				for (let i: number = 0; i < 32768; i++) {
					wave[i] = Math.random() * 2.0 - 1.0;
				}
			} else if (index == 2) {
				// "periodic" drum.
				let drumBuffer: number = 1;
				for (let i: number = 0; i < 32768; i++) {
					wave[i] = (drumBuffer & 1) * 2.0 - 1.0;
					let newBuffer: number = drumBuffer >> 1;
					if (((drumBuffer + newBuffer) & 1) == 1) {
						newBuffer += 2 << 14;
					}
					drumBuffer = newBuffer;
				}
			} else if (index == 3) {
				// "detuned periodic" drum.
				let drumBuffer: number = 1;
				for (let i: number = 0; i < 32767; i++) {
					wave[i] = (drumBuffer & 1) * 2.0 - 1.0;
					let newBuffer: number = drumBuffer >> 2;
					if (((drumBuffer + newBuffer) & 1) == 1) {
						newBuffer += 4 << 14;
					}
					drumBuffer = newBuffer;
				}
			} else if (index == 4) {
				// "shine" drum.
				let drumBuffer: number = 1;
				for (let i: number = 0; i < 32768; i++) {
					wave[i] = (drumBuffer & 1) * 2.0 - 1.0;
					let newBuffer: number = drumBuffer >> 1;
					if (((drumBuffer + newBuffer) & 1) == 1) {
						newBuffer += 10 << 2;
					}
					drumBuffer = newBuffer;
				}
			} else if (index == 5) {
				// "hollow" drums, designed in frequency space and then converted via FFT:
				Config.drawNoiseSpectrum(wave, 10, 11, 1, 1, 0);
				Config.drawNoiseSpectrum(wave, 11, 14, -2, -2, 0);
				inverseRealFourierTransform(wave);
				scaleElementsByFactor(wave, 1.0 / Math.sqrt(wave.length));
			} else if (index == 6) {
				// "deep" drum, designed in frequency space and then converted via FFT:
				Config.drawNoiseSpectrum(wave, 1, 10, 1, 1, 0);
				Config.drawNoiseSpectrum(wave, 20, 14, -2, -2, 0);
				inverseRealFourierTransform(wave);
				scaleElementsByFactor(wave, 1.0 / Math.sqrt(wave.length));
			} else if (index == 7) {
				// "cutter" drum.
				let drumBuffer: number = 1;
				for (let i: number = 0; i < 32768; i++) {
					wave[i] = (drumBuffer & 1) * 4.0 * Math.random();
					let newBuffer: number = drumBuffer >> 1;
					if (((drumBuffer + newBuffer) & 1) == 1) {
						newBuffer += 15 << 2;
					}
					drumBuffer = newBuffer;
				}
			} else if (index == 8) {
				// "metallic" drum.
				let drumBuffer: number = 1;
				for (let i: number = 0; i < 32768; i++) {
					wave[i] = (drumBuffer & 1) / 2.0 + 0.5;
					let newBuffer: number = drumBuffer >> 1;
					if (((drumBuffer + newBuffer) & 1) == 1) {
						newBuffer -= 10 << 2;
					}
					drumBuffer = newBuffer;
				}
			} else if (index == 9) {
				// "snare" drum.
				for (let i: number = 0; i < 32768; i++) {
					wave[i] = Math.random() * 2.0 - 1.0;
				}
			/*
			} else if (index == 10) {
				// "tom-tom" drums, designed in frequency space and then converted via FFT:
				Config.drawNoiseSpectrum(wave, 10, 14, 0, -4, 0);
				inverseRealFourierTransform(wave);
				scaleElementsByFactor(wave, 1.0 / Math.sqrt(wave.length));
			} else if (index == 11) {
				// "cymbal" drums, designed in frequency space and then converted via FFT:
				Config.drawNoiseSpectrum(wave, 9, 9.4, -1, -1, -0.5);
				Config.drawNoiseSpectrum(wave, 9.7, 10, -1, -1, -0.5);
				Config.drawNoiseSpectrum(wave, 10.3, 10.6, -1, -1, -0.5);
				Config.drawNoiseSpectrum(wave, 10.9, 11.1, -1, -1, -0.5);
				Config.drawNoiseSpectrum(wave, 11.3, 11.4, 0, 0, -0.5);
				Config.drawNoiseSpectrum(wave, 11.5, 11.7, 1.5, 1.5, -0.5);
				Config.drawNoiseSpectrum(wave, 11.7, 12, -1, -1, -0.5);
				Config.drawNoiseSpectrum(wave, 12, 12.1, 2, 2, -0.5);
				Config.drawNoiseSpectrum(wave, 12.1, 12.6, 0, 2, -0.5);
				Config.drawNoiseSpectrum(wave, 12.6, 13, 0, 0, -0.5);
				Config.drawNoiseSpectrum(wave, 13, 14, 1, -3, -0.5);
				inverseRealFourierTransform(wave);
				scaleElementsByFactor(wave, 1.0 / Math.sqrt(wave.length));
			} else if (index == 12) {
				// "bass" drums, designed in frequency space and then converted via FFT:
				Config.drawNoiseSpectrum(wave, 7, 8, -2, 4, 0);
				Config.drawNoiseSpectrum(wave, 8, 9, 4, -2, 0);
				Config.drawNoiseSpectrum(wave, 9, 14, -2, -6, 0);
				inverseRealFourierTransform(wave);
				scaleElementsByFactor(wave, 1.0 / Math.sqrt(wave.length));
			*/
			} else {
				throw new Error("Unrecognized drum index: " + index);
			}
		}
		
		return wave;
	}
	
	private static drawNoiseSpectrum(wave: Float32Array, lowOctave: number, highOctave: number, lowPower: number, highPower: number, overalSlope: number): void {
		const referenceOctave: number = 11;
		const referenceIndex: number = 1 << referenceOctave;
		const lowIndex: number = Math.pow(2, lowOctave) | 0;
		const highIndex: number = Math.pow(2, highOctave) | 0;
		const log2: number = Math.log(2);
		for (let i: number = lowIndex; i < highIndex; i++) {
			let amplitude: number = Math.pow(2, lowPower + (highPower - lowPower) * (Math.log(i) / log2 - lowOctave) / (highOctave - lowOctave));
			amplitude *= Math.pow(i / referenceIndex, overalSlope);
			const radians: number = Math.random() * Math.PI * 2.0;
			wave[i] = Math.cos(radians) * amplitude;
			wave[32768 - i] = Math.sin(radians) * amplitude;
		}
	}
	
	private static generateSineWave(): Float64Array {
		const wave: Float64Array = new Float64Array(Config.sineWaveLength + 1);
		for (let i: number = 0; i < Config.sineWaveLength + 1; i++) {
			wave[i] = Math.sin(i * Math.PI * 2.0 / Config.sineWaveLength);
		}
		return wave;
	}
}

// Pardon the messy type casting. This allows accessing array members by numerical index or string name.
export function toNameMap<T extends BeepBoxOption>(array: Array<Pick<T, Exclude<keyof T, "index">>>): DictionaryArray<T> {
	const dictionary: Dictionary<T> = {};
	for (let i: number = 0; i < array.length; i++) {
		const value: any = array[i];
		value.index = i;
		dictionary[value.name] = <T> value;
	}
	const result: DictionaryArray<T> = <DictionaryArray<T>> <any> array;
	result.dictionary = dictionary;
	return result;
}