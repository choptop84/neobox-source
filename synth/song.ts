	import { Config, Dictionary, InstrumentType } from "./SynthConfig";
	import { clamp } from "./usefulFunctions";
    
    export class BitFieldReader {
        private _bits: number[] = [];
        private _readIndex: number = 0;
        
        constructor(base64CharCodeToInt: ReadonlyArray<number>, source: string, startIndex: number, stopIndex: number) {
            for (let i: number = startIndex; i < stopIndex; i++) {
                const value: number = base64CharCodeToInt[source.charCodeAt(i)];
                this._bits.push((value >> 5) & 0x1);
                this._bits.push((value >> 4) & 0x1);
                this._bits.push((value >> 3) & 0x1);
                this._bits.push((value >> 2) & 0x1);
                this._bits.push((value >> 1) & 0x1);
                this._bits.push( value       & 0x1);
            }
        }
        
        public read(bitCount: number): number {
            let result: number = 0;
            while (bitCount > 0) {
                result = result << 1;
                result += this._bits[this._readIndex++];
                bitCount--;
            }
            return result;
        }
        
        public readLongTail(minValue: number, minBits: number): number {
            let result: number = minValue;
            let numBits: number = minBits;
            while (this._bits[this._readIndex++]) {
                result += 1 << numBits;
                numBits++;
            }
            while (numBits > 0) {
                numBits--;
                if (this._bits[this._readIndex++]) {
                    result += 1 << numBits;
                }
            }
            return result;
        }
        
        public readPartDuration(): number {
            return this.readLongTail(1, 2);
        }
        
        public readPinCount(): number {
            return this.readLongTail(1, 0);
        }
        
        public readPitchInterval(): number {
            if (this.read(1)) {
                return -this.readLongTail(1, 3);
            } else {
                return this.readLongTail(1, 3);
            }
        }
    }
    
    export class BitFieldWriter {
        private _bits: number[] = [];
        
        public write(bitCount: number, value: number): void {
            bitCount--;
            while (bitCount >= 0) {
                this._bits.push((value >>> bitCount) & 1);
                bitCount--;
            }
        }
        
        public writeLongTail(minValue: number, minBits: number, value: number): void {
            if (value < minValue) throw new Error("value out of bounds");
            value -= minValue;
            let numBits: number = minBits;
            while (value >= (1 << numBits)) {
                this._bits.push(1);
                value -= 1 << numBits;
                numBits++;
            }
            this._bits.push(0);
            while (numBits > 0) {
                numBits--;
                this._bits.push((value >>> numBits) & 1);
            }
        }
        
        public writePartDuration(value: number): void {
            this.writeLongTail(1, 2, value);
        }
        
        public writePinCount(value: number): void {
            this.writeLongTail(1, 0, value);
        }
        
        public writePitchInterval(value: number): void {
            if (value < 0) {
                this.write(1, 1); // sign
                this.writeLongTail(1, 3, -value);
            } else {
                this.write(1, 0); // sign
                this.writeLongTail(1, 3, value);
            }
        }
        
        public concat(other: BitFieldWriter): void {
            this._bits = this._bits.concat(other._bits);
        }
        
        public encodeBase64(base64IntToCharCode: ReadonlyArray<number>, buffer: number[]): number[] {
            for (let i: number = 0; i < this._bits.length; i += 6) {
                const value: number = (this._bits[i] << 5) | (this._bits[i+1] << 4) | (this._bits[i+2] << 3) | (this._bits[i+3] << 2) | (this._bits[i+4] << 1) | this._bits[i+5];
                buffer.push(base64IntToCharCode[value]);
            }
            return buffer;
        }
        
        public lengthBase64(): number {
            return Math.ceil(this._bits.length / 6);
        }
    }

	export class Operator {
		public frequency: number = 0;
		public amplitude: number = 0;
		public envelope: number = 0;
		
		constructor(index: number) {
			this.reset(index);
		}
		
		public reset(index: number): void {
			this.frequency = 0;
			this.amplitude = (index <= 1) ? Config.operatorAmplitudeMax : 0;
			this.envelope = 1;
		}
		
		public copy(other: Operator): void {
			this.frequency = other.frequency;
			this.amplitude = other.amplitude;
			this.envelope = other.envelope;
		}
	}   

    export interface NotePin {
		interval: number;
		time: number;
		volume: number;
	}
	
	export function makeNotePin(interval: number, time: number, volume: number): NotePin {
		return {interval: interval, time: time, volume: volume};
	}
	
	export interface Note {
		pitches: number[];
		pins: NotePin[];
		start: number;
		end: number;
	}
	
	export function makeNote(pitch: number, start: number, end: number, volume: number, fadeout: boolean = false) {
		return {
			pitches: [pitch],
			pins: [makeNotePin(0, 0, volume), makeNotePin(0, end - start, fadeout ? 0 : volume)],
			start: start,
			end: end,
		};
	}

export class Instrument {
		public type: InstrumentType = 0;
		public wave: number = 1;
		public filter: number = 1;
		public transition: number = 1;
		public effect: number = 0;
		public harm: number = 0;
		public fmChorus: number = 1;
		public imute: number = 0;
		public octoff: number = 0;
		public chorus: number = 0;
		public volume: number = 0;
		public ipan: number = 4;
		public algorithm: number = 0;
		public feedbackType: number = 0;
		public feedbackAmplitude: number = 0;
		public feedbackEnvelope: number = 1;
		public readonly operators: Operator[] = [];
		
		constructor() {
			for (let i = 0; i < Config.operatorCount; i++) {
				this.operators.push(new Operator(i));
			}
		}
		
		public reset(): void {
			this.type = 0;
			this.wave = 1;
			this.filter = 1;
			this.transition = 1;
			this.effect = 0;
			this.harm = 0;
			this.fmChorus = 1;
			this.imute = 0;
			this.ipan = 4;
			this.octoff = 0;
			this.chorus = 0;
			this.volume = 0;
			this.algorithm = 0;
			this.feedbackType = 0;
			this.feedbackAmplitude = 0;
			this.feedbackEnvelope = 1;
			for (let i: number = 0; i < this.operators.length; i++) {
				this.operators[i].reset(i);
			}
		}
		
		public setTypeAndReset(type: InstrumentType): void {
			this.type = type;
			switch (type) {
				case InstrumentType.chip:
					this.wave = 1;
					this.filter = 1;
					this.transition = 1;
					this.effect = 0;
					this.harm = 0;
					this.imute = 0;
					this.ipan = 4;
					this.octoff = 0;
					this.chorus = 0;
					this.volume = 0;
					break;
				// @TODO: Investigate whether this being incorrect leads to
				// any observable issues.
				case InstrumentType.fm:
					this.wave = 1;
					this.transition = 1;
					this.volume = 0;
					this.imute = 0;
					this.ipan = 4;
					this.harm = 0;
					this.octoff = 0;
					break;
				case InstrumentType.noise:
					this.transition = 1;
					this.octoff = 0;
					this.fmChorus = 1;
					this.ipan = 4;
					this.effect = 0;
					this.algorithm = 0;
					this.feedbackType = 0;
					this.feedbackAmplitude = 0;
					this.feedbackEnvelope = 1;
					this.volume = 0;
					for (let i: number = 0; i < this.operators.length; i++) {
						this.operators[i].reset(i);
					}
					break;
				case InstrumentType.pwm:
					this.wave = 1;
					this.filter = 1;
					this.transition = 1;
					this.effect = 0;
					this.harm = 0;
					this.imute = 0;
					this.ipan = 4;
					this.octoff = 0;
					this.chorus = 0;
					this.volume = 0;
					break;
			}
		}
		
		public copy(other: Instrument): void {
			this.type = other.type;
			this.wave = other.wave;
			this.filter = other.filter;
			this.transition = other.transition;
			this.effect = other.effect;
			this.chorus = other.chorus;
			this.volume = other.volume;
			this.harm = other.harm;
			this.fmChorus = other.fmChorus;
			this.imute = other.imute;
			this.ipan = other.ipan;
			this.octoff = other.octoff;
			this.algorithm = other.algorithm;
			this.feedbackType = other.feedbackType;
			this.feedbackAmplitude = other.feedbackAmplitude;
			this.feedbackEnvelope = other.feedbackEnvelope;
			for (let i: number = 0; i < this.operators.length; i++) {
				this.operators[i].copy(other.operators[i]);
			}
		}

		/*public getChord(): Chord {
			return this.type == InstrumentType.noise ? Config.harmDisplay[2] : Config.harmDisplay[this.harm];
		}*/
	}

    export class Channel {
		public octave: number = 0;
		public readonly instruments: Instrument[] = [];
		public readonly patterns: Pattern[] = [];
		public readonly bars: number[] = [];
	}
	
	export class Pattern {
		public notes: Note[] = [];
		public instrument: number = 0;
		
		public cloneNotes(): Note[] {
			const result: Note[] = [];
			for (const oldNote of this.notes) {
				const newNote: Note = makeNote(-1, oldNote.start, oldNote.end, 3);
				newNote.pitches = oldNote.pitches.concat();
				newNote.pins = [];
				for (const oldPin of oldNote.pins) {
					newNote.pins.push(makeNotePin(oldPin.interval, oldPin.time, oldPin.volume));
				}
				result.push(newNote);
			}
			return result;
		}
		
		public reset(): void {
			this.notes.length = 0;
			this.instrument = 0;
		}
	}

    export class Song {
		private static readonly _format: string = "NepBox";

		static readonly _oldestNepBoxVersion: number = 1;
		static readonly _latestNepBoxVersion: number = 1;

		public scale: number;
		public setSongTheme: string;
		public key: number;
		public mix: number;
		public sampleRate: number;
		public tempo: number;
		public reverb: number;
		public blend: number;
		public riff: number;
		public detune: number;
		public muff: number;
		public beatsPerBar: number;
		public barCount: number;
		public patternsPerChannel: number;
		public partsPerBeat: number;
		public instrumentsPerChannel: number;
		public loopStart: number;
		public loopLength: number;
		public pitchChannelCount: number;
		public drumChannelCount: number;
		public readonly channels: Channel[] = [];
		
		constructor(string?: string) {

		}
		
		public getChannelCount(): number {
			return this.pitchChannelCount + this.drumChannelCount;
		}

		public getChannelUnusedCount(): number {
			return (Config.pitchChannelCountMax + Config.drumChannelCountMax) - (this.pitchChannelCount + this.drumChannelCount);
		}

		public getTimeSig(): string {
			return this.beatsPerBar + "/" + this.partsPerBeat + " with " + this.barCount + " bars.";
		}

		public getScaleNKey(): string {
			return ' "' + Config.scales[this.scale].name + '" and your key is ' + Config.keys[this.key].name;
		}
		
		public getChannelIsDrum(channel: number): boolean {
			return (channel >= this.pitchChannelCount);
		}
		
		public getChannelColorDim(channel: number): string {
			return channel < this.pitchChannelCount ? Config.pitchChannelColorsDim[channel] : Config.drumChannelColorsDim[channel - this.pitchChannelCount];
		}
		public getChannelColorBright(channel: number): string {
			return channel < this.pitchChannelCount ? Config.pitchChannelColorsBright[channel] : Config.drumChannelColorsBright[channel - this.pitchChannelCount];
		}
		public getNoteColorDim(channel: number): string {
			return channel < this.pitchChannelCount ? Config.pitchNoteColorsDim[channel] : Config.drumNoteColorsDim[channel - this.pitchChannelCount];
		}
		public getNoteColorBright(channel: number): string {
			return channel < this.pitchChannelCount ? Config.pitchNoteColorsBright[channel] : Config.drumNoteColorsBright[channel - this.pitchChannelCount];
		}
		
		public initToDefault(andResetChannels: boolean = true): void {
			this.scale = 0;
			this.setSongTheme = "none";
			this.key = Config.keys.map(key=>key.name).indexOf("C");
			this.mix = 1;
			this.sampleRate = 2;
			this.loopStart = 0;
			this.loopLength = 4;
			this.tempo = 151;
			this.reverb = 0;
			this.blend = 0;
			this.riff = 0;
			this.detune = 0;
			this.muff = 0;
			this.beatsPerBar = 8;
			this.barCount = 16;
			this.patternsPerChannel = 8;
			this.partsPerBeat = 4;
			this.instrumentsPerChannel = 1;
			
			if (andResetChannels) {
				this.pitchChannelCount = 4;
				this.drumChannelCount = 1;
				for (let channelIndex = 0; channelIndex < this.getChannelCount(); channelIndex++) {
					if (this.channels.length <= channelIndex) {
						this.channels[channelIndex] = new Channel();
					}
					const channel: Channel = this.channels[channelIndex];
					channel.octave = 4 - channelIndex; // [4, 3, 2, 1, 0]; Descending octaves with drums at zero in last channel.
				
					for (let pattern = 0; pattern < this.patternsPerChannel; pattern++) {
						if (channel.patterns.length <= pattern) {
							channel.patterns[pattern] = new Pattern();
						} else {
							channel.patterns[pattern].reset();
						}
					}
					channel.patterns.length = this.patternsPerChannel;
				
					for (let instrument = 0; instrument < this.instrumentsPerChannel; instrument++) {
						if (channel.instruments.length <= instrument) {
							channel.instruments[instrument] = new Instrument();
						} else {
							channel.instruments[instrument].reset();
						}
					}
					channel.instruments.length = this.instrumentsPerChannel;
				
					for (let bar = 0; bar < this.barCount; bar++) {
						channel.bars[bar] = bar < 4 ? 1 : 0;
					}
					channel.bars.length = this.barCount;
				}
				this.channels.length = this.getChannelCount();
			}
		}
		
		public toJsonObject(enableIntro: boolean = true, loopCount: number = 1, enableOutro: boolean = true): Object {
			const channelArray: Object[] = [];
			for (let channel: number = 0; channel < this.getChannelCount(); channel++) {
				const instrumentArray: Object[] = [];
				const isDrum: boolean = this.getChannelIsDrum(channel);
				for (let i: number = 0; i < this.instrumentsPerChannel; i++) {
					const instrument: Instrument = this.channels[channel].instruments[i];
					if (isDrum) {
						instrumentArray.push({
							type: Config.instrumentTypeNames[InstrumentType.noise],
							volume: (5 - instrument.volume) * 20,
							imute: Config.imuteNames[instrument.imute],
							wave: Config.drumNames[instrument.wave],
							transition: Config.transitionNames[instrument.transition],
							octoff: Config.octoffNames[instrument.octoff],
							ipan: Config.ipanValues[instrument.ipan],
						});
					} else {
						if (instrument.type == InstrumentType.chip) {
							instrumentArray.push({
								type: Config.instrumentTypeNames[instrument.type],
								volume: (5 - instrument.volume) * 20,
								wave: Config.waveNames[instrument.wave],
								transition: Config.transitionNames[instrument.transition],
								filter: Config.filterNames[instrument.filter],
								chorus: Config.chorusNames[instrument.chorus],
								effect: Config.effectNames[instrument.effect],
								harm: Config.harmNames[instrument.harm],
								imute: Config.imuteNames[instrument.imute],
								octoff: Config.octoffNames[instrument.octoff],
								ipan: Config.ipanValues[instrument.ipan],
							});
						} else if (instrument.type == InstrumentType.fm) {
							const operatorArray: Object[] = [];
							for (const operator of instrument.operators) {
								operatorArray.push({
									frequency: Config.operatorFrequencyNames[operator.frequency],
									amplitude: operator.amplitude,
									envelope: Config.operatorEnvelopeNames[operator.envelope],
								});
							}
							instrumentArray.push({
								type: Config.instrumentTypeNames[instrument.type],
								volume: (5 - instrument.volume) * 20,
								transition: Config.transitionNames[instrument.transition],
								effect: Config.effectNames[instrument.effect],
								octoff: Config.octoffNames[instrument.octoff],
								fmChorus: Config.fmChorusNames[instrument.fmChorus],
								algorithm: Config.operatorAlgorithmNames[instrument.algorithm],
								feedbackType: Config.operatorFeedbackNames[instrument.feedbackType],
								feedbackAmplitude: instrument.feedbackAmplitude,
								feedbackEnvelope: Config.operatorEnvelopeNames[instrument.feedbackEnvelope],
								operators: operatorArray,
								ipan: Config.ipanValues[instrument.ipan],
								imute: Config.imuteNames[instrument.imute],
							});
						} else if (instrument.type == InstrumentType.pwm) {
							instrumentArray.push({
								// This uses the wrong instrument type in order
								// to make JSON exports compatible with
								// https://thestarworld.github.io/modboxfixed/
								type: Config.instrumentTypeNames[InstrumentType.noise],
								volume: (5 - instrument.volume) * 20,
								wave: Config.pwmwaveNames[instrument.wave],
								transition: Config.transitionNames[instrument.transition],
								filter: Config.filterNames[instrument.filter],
								chorus: Config.chorusNames[instrument.chorus],
								effect: Config.effectNames[instrument.effect],
								harm: Config.harmNames[instrument.harm],
								imute: Config.imuteNames[instrument.imute],
								octoff: Config.octoffNames[instrument.octoff],
								ipan: Config.ipanValues[instrument.ipan],
							});
						} else {
							throw new Error("Unrecognized instrument type");
						}
					}
				}
				
				const patternArray: Object[] = [];
				for (const pattern of this.channels[channel].patterns) {
					const noteArray: Object[] = [];
					for (const note of pattern.notes) {
						const pointArray: Object[] = [];
						for (const pin of note.pins) {
							pointArray.push({
								tick: pin.time + note.start,
								pitchBend: pin.interval,
								volume: Math.round(pin.volume * 100 / 3),
							});
						}
						
						noteArray.push({
							pitches: note.pitches,
							points: pointArray,
						});
					}
					
					patternArray.push({
						instrument: pattern.instrument + 1,
						notes: noteArray, 
					});
				}
				
				const sequenceArray: number[] = [];
				if (enableIntro) for (let i: number = 0; i < this.loopStart; i++) {
					sequenceArray.push(this.channels[channel].bars[i]);
				}
				for (let l: number = 0; l < loopCount; l++) for (let i: number = this.loopStart; i < this.loopStart + this.loopLength; i++) {
					sequenceArray.push(this.channels[channel].bars[i]);
				}
				if (enableOutro) for (let i: number = this.loopStart + this.loopLength; i < this.barCount; i++) {
					sequenceArray.push(this.channels[channel].bars[i]);
				}
				
				channelArray.push({
					type: isDrum ? "drum" : "pitch",
					octaveScrollBar: this.channels[channel].octave,
					instruments: instrumentArray,
					patterns: patternArray,
					sequence: sequenceArray,
				});
			}
			
			return {
				format: Song._format,
				version: Song._latestNepBoxVersion,
				theme: this.setSongTheme,
				scale: Config.scales[this.scale].name,
				mix: Config.mixNames[this.mix],
				sampleRate: Config.sampleRateNames[this.sampleRate],
				key: Config.keys[this.key].name,
				introBars: this.loopStart,
				loopBars: this.loopLength,
				beatsPerBar: this.beatsPerBar,
				ticksPerBeat: this.partsPerBeat,
				beatsPerMinute: this.getBeatsPerMinute(), // represents tempo
				reverb: this.reverb,
				blend: this.blend,
				riff: this.riff,
				detune: this.detune,
				muff: this.muff,
				//outroBars: this.barCount - this.loopStart - this.loopLength; // derive this from bar arrays?
				//patternCount: this.patternsPerChannel, // derive this from pattern arrays?
				//instrumentsPerChannel: this.instrumentsPerChannel, //derive this from instrument arrays?
				channels: channelArray,
			};
		}
		
		public fromJsonObject(jsonObject: any): void {
			this.initToDefault(true);
			if (!jsonObject) return;
			const format: any = jsonObject.format;
			const version: any = jsonObject.version;
			if (version > Song._format) return;
			
			this.scale = 11; // default to expert.
			if (jsonObject.scale != undefined) {
				if (format == "BeepBox") {
				const oldScaleNames: Dictionary<number> = {"romani :)": 8, "romani :(": 9};
				const scale: number = oldScaleNames[jsonObject.scale] != undefined ? oldScaleNames[jsonObject.scale] : Config.scales.map(scale=>scale.name).indexOf(jsonObject.scale);
				if (scale != -1) this.scale = scale;
				} else {
					this.scale = Config.scales.map(scale=>scale.name).indexOf(jsonObject["scale"]);
				}
			}

			if (jsonObject.theme != undefined) {
				if (format == "BeepBox") {
					if ((jsonObject["theme"] != "Nepbox") && (jsonObject["theme"] != "Laffey") && (jsonObject["theme"] != "ModBox")) {
						var themes = ["none", "modbox2", "artic", "Cinnamon Roll", "Ocean", "rainbow", "float", "windows", "grassland", "dessert", "kahootiest", "beambit", "egg", "Poniryoshka", "gameboy", "woodkid", "midnight", "snedbox", "unnamed", "piano", "halloween", "frozen"];
						var themeIndex = Config.oldThemeNames.indexOf(jsonObject["theme"]);
						this.setSongTheme = themes[themeIndex];
					} else {
						var themes = ["none", "nepbox", "laffey"];
						var oldThemes = ["ModBox", "Nepbox", "Laffey"];
						var themeIndex = oldThemes.indexOf(jsonObject["theme"]);
						this.setSongTheme = themes[themeIndex];
					}
				} else {
				this.setSongTheme = jsonObject["theme"];
				}
			}

			if (jsonObject.mix != undefined) {
				this.mix = Config.mixNames.indexOf(jsonObject.mix);
				if (this.mix == -1) this.mix = 1;
			}

			if (jsonObject.sampleRate != undefined) {
				this.sampleRate = Config.sampleRateNames.indexOf(jsonObject.sampleRate);
				if (this.sampleRate == -1) this.sampleRate = 2;
			}
			
			if (jsonObject.key != undefined) {
				if (format == "BeepBox") {
					if (typeof(jsonObject.key) == "number") {
						this.key = Config.oldKeys.length - 1 - (((jsonObject.key + 1200) >>> 0) % Config.oldKeys.length);
					} else if (typeof(jsonObject.key) == "string") {
						this.key = Config.keys.map(key=>key.name).indexOf(jsonObject.key);
					}
				} else {
					this.key = Config.keys.map(key=>key.name).indexOf(jsonObject.key);
				}
			}
			
			if (jsonObject.beatsPerMinute != undefined) {
				this.tempo = jsonObject.beatsPerMinute;
				this.tempo = clamp(Config.tempoMin, Config.tempoMax, this.tempo);
			}
			
			if (jsonObject.reverb != undefined) {
				this.reverb = clamp(0, Config.reverbRange, jsonObject.reverb | 0);
			}

			if (jsonObject.blend != undefined) {
				this.blend = clamp(0, Config.blendRange, jsonObject.blend | 0);
			}

			if (jsonObject.riff != undefined) {
				this.riff = clamp(0, Config.riffRange, jsonObject.riff | 0);
			}

			if (jsonObject.detune != undefined) {
				this.detune = clamp(0, Config.detuneRange, jsonObject.detune | 0);
			}

			if (jsonObject.muff != undefined) {
				this.muff = clamp(0, Config.muffRange, jsonObject.muff | 0);
			}
			
			if (jsonObject.beatsPerBar != undefined) {
				this.beatsPerBar = Math.max(Config.beatsPerBarMin, Math.min(Config.beatsPerBarMax, jsonObject.beatsPerBar | 0));
			}
			
			if (jsonObject.ticksPerBeat != undefined) {
				this.partsPerBeat = jsonObject.ticksPerBeat | 0;
				if (Config.partCounts.indexOf(this.partsPerBeat) == -1) {
					this.partsPerBeat = Config.partCounts[Config.partCounts.length - 1];
				}
			}
			
			let maxInstruments: number = 1;
			let maxPatterns: number = 1;
			let maxBars: number = 1;
			if (jsonObject.channels) {
				for (const channelObject of jsonObject.channels) {
					if (channelObject.instruments) maxInstruments = Math.max(maxInstruments, channelObject.instruments.length | 0);
					if (channelObject.patterns) maxPatterns = Math.max(maxPatterns, channelObject.patterns.length | 0);
					if (channelObject.sequence) maxBars = Math.max(maxBars, channelObject.sequence.length | 0);
				}
			}
			
			this.instrumentsPerChannel = maxInstruments;
			this.patternsPerChannel = maxPatterns;
			this.barCount = maxBars;
			
			if (jsonObject.introBars != undefined) {
				this.loopStart = clamp(0, this.barCount, jsonObject.introBars | 0);
			}
			if (jsonObject.loopBars != undefined) {
				this.loopLength = clamp(1, this.barCount - this.loopStart + 1, jsonObject.loopBars | 0);
			}
			
			let pitchChannelCount = 0;
			let drumChannelCount = 0;
			if (jsonObject.channels) {
				for (let channel: number = 0; channel < jsonObject.channels.length; channel++) {
					let channelObject: any = jsonObject.channels[channel];
					
					if (this.channels.length <= channel) this.channels[channel] = new Channel();
					
					if (channelObject.octaveScrollBar != undefined) {
						this.channels[channel].octave = clamp(0, 5, channelObject.octaveScrollBar | 0);
					}
					
					for (let i: number = this.channels[channel].instruments.length; i < this.instrumentsPerChannel; i++) {
						this.channels[channel].instruments[i] = new Instrument();
					}
					this.channels[channel].instruments.length = this.instrumentsPerChannel;
					
					for (let i: number = this.channels[channel].patterns.length; i < this.patternsPerChannel; i++) {
						this.channels[channel].patterns[i] = new Pattern();
					}
					this.channels[channel].patterns.length = this.patternsPerChannel;
					
					for (let i: number = 0; i < this.barCount; i++) {
						this.channels[channel].bars[i] = 1;
					}
					this.channels[channel].bars.length = this.barCount;
					
					let isDrum: boolean = false;
					if (channelObject.type) {
						isDrum = (channelObject.type == "drum");
					} else {
						// for older files, assume drums are channel 3.
						isDrum = (channel >= 3);
					}
					if (isDrum) drumChannelCount++; else pitchChannelCount++;
					
					for (let i: number = 0; i < this.instrumentsPerChannel; i++) {
						const instrument: Instrument = this.channels[channel].instruments[i];
						let instrumentObject: any = undefined;
						if (channelObject.instruments) instrumentObject = channelObject.instruments[i];
						if (instrumentObject == undefined) instrumentObject = {};
						
						const oldTransitionNames: Dictionary<number> = {"binary": 0};
						const transitionObject = instrumentObject.transition || instrumentObject.envelope; // the transition property used to be called envelope, so try that too.
						instrument.transition = oldTransitionNames[transitionObject] != undefined ? oldTransitionNames[transitionObject] : Config.transitionNames.indexOf(transitionObject);
						if (instrument.transition == -1) instrument.transition = 1;
						
						if (isDrum) {
							if (instrumentObject.volume != undefined) {
								instrument.volume = clamp(0, Config.volumeNames.length, Math.round(5 - (instrumentObject.volume | 0) / 20));
							} else {
								instrument.volume = 0;
							}
							instrument.wave = Config.drumNames.indexOf(instrumentObject.wave);
							if (instrument.wave == -1) instrument.wave = 1;
							instrument.imute = Config.imuteNames.indexOf(instrumentObject.imute);
							if (instrument.imute == -1) instrument.imute = 0;
							instrument.ipan = Config.ipanValues.indexOf(instrumentObject.ipan);
							if (instrument.ipan == -1) instrument.ipan = 4;
						} else {
							instrument.type = Config.instrumentTypeNames.indexOf(instrumentObject.type);
							if (instrument.type == null) instrument.type = InstrumentType.chip;
							
							if (instrument.type == InstrumentType.chip) {
								if (instrumentObject.volume != undefined) {
									instrument.volume = clamp(0, Config.volumeNames.length, Math.round(5 - (instrumentObject.volume | 0) / 20));
								} else {
									instrument.volume = 0;
								}
								instrument.wave = Config.waveNames.indexOf(instrumentObject.wave);
								if (instrument.wave == -1) instrument.wave = 1;
								
								const oldFilterNames: Dictionary<number> = {"sustain sharp": 1, "sustain medium": 2, "sustain soft": 3, "decay sharp": 4};
								instrument.filter = oldFilterNames[instrumentObject.filter] != undefined ? oldFilterNames[instrumentObject.filter] : Config.filterNames.indexOf(instrumentObject.filter);
								if (instrument.filter == -1) instrument.filter = 0;
								
								instrument.chorus = Config.chorusNames.indexOf(instrumentObject.chorus);
								if (instrument.chorus == -1) instrument.chorus = 0;
								instrument.effect = Config.effectNames.indexOf(instrumentObject.effect);
								if (instrument.effect == -1) instrument.effect = 0;
								instrument.harm = Config.harmNames.indexOf(instrumentObject.harm);
								if (instrument.harm == -1) instrument.harm = 0;
								instrument.octoff = Config.octoffNames.indexOf(instrumentObject.octoff);
								if (instrument.octoff == -1) instrument.octoff = 0;
								instrument.imute = Config.imuteNames.indexOf(instrumentObject.imute);
								if (instrument.imute == -1) instrument.imute = 0;
								instrument.ipan = Config.ipanValues.indexOf(instrumentObject.ipan);
								if (instrument.ipan == -1) instrument.ipan = 4;
							} else if (
								instrument.type == InstrumentType.pwm
								|| instrument.type == InstrumentType.noise
							) {
								if (instrument.type == InstrumentType.noise) {
									instrument.type = InstrumentType.pwm;
								}
								if (instrumentObject.volume != undefined) {
									instrument.volume = clamp(0, Config.volumeNames.length, Math.round(5 - (instrumentObject.volume | 0) / 20));
								} else {
									instrument.volume = 0;
								}
								instrument.wave = Config.pwmwaveNames.indexOf(instrumentObject.wave);
								if (instrument.wave == -1) instrument.wave = 1;
								
								const oldFilterNames: Dictionary<number> = {"sustain sharp": 1, "sustain medium": 2, "sustain soft": 3, "decay sharp": 4};
								instrument.filter = oldFilterNames[instrumentObject.filter] != undefined ? oldFilterNames[instrumentObject.filter] : Config.filterNames.indexOf(instrumentObject.filter);
								if (instrument.filter == -1) instrument.filter = 0;
								
								instrument.chorus = Config.chorusNames.indexOf(instrumentObject.chorus);
								if (instrument.chorus == -1) instrument.chorus = 0;
								instrument.effect = Config.effectNames.indexOf(instrumentObject.effect);
								if (instrument.effect == -1) instrument.effect = 0;
								instrument.harm = Config.harmNames.indexOf(instrumentObject.harm);
								if (instrument.harm == -1) instrument.harm = 0;
								instrument.octoff = Config.octoffNames.indexOf(instrumentObject.octoff);
								if (instrument.octoff == -1) instrument.octoff = 0;
								instrument.imute = Config.imuteNames.indexOf(instrumentObject.imute);
								if (instrument.imute == -1) instrument.imute = 0;
								instrument.ipan = Config.ipanValues.indexOf(instrumentObject.ipan);
								if (instrument.ipan == -1) instrument.ipan = 4;
							} else if (instrument.type == InstrumentType.fm) {
								instrument.effect = Config.effectNames.indexOf(instrumentObject.effect);
								if (instrument.effect == -1) instrument.effect = 0;

								instrument.octoff = Config.octoffNames.indexOf(instrumentObject.octoff);
								if (instrument.octoff == -1) instrument.octoff = 0;

								instrument.fmChorus = Config.fmChorusNames.indexOf(instrumentObject.fmChorus);
								if (instrument.fmChorus == -1) instrument.fmChorus = 0;
								
								instrument.algorithm = Config.operatorAlgorithmNames.indexOf(instrumentObject.algorithm);
								if (instrument.algorithm == -1) instrument.algorithm = 0;
								instrument.feedbackType = Config.operatorFeedbackNames.indexOf(instrumentObject.feedbackType);
								if (instrument.feedbackType == -1) instrument.feedbackType = 0;
								if (instrumentObject.feedbackAmplitude != undefined) {
									instrument.feedbackAmplitude = clamp(0, Config.operatorAmplitudeMax + 1, instrumentObject.feedbackAmplitude | 0);
								} else {
									instrument.feedbackAmplitude = 0;
								}
								instrument.feedbackEnvelope = Config.operatorEnvelopeNames.indexOf(instrumentObject.feedbackEnvelope);
								if (instrument.feedbackEnvelope == -1) instrument.feedbackEnvelope = 0;
								
								for (let j: number = 0; j < Config.operatorCount; j++) {
									const operator: Operator = instrument.operators[j];
									let operatorObject: any = undefined;
									if (instrumentObject.operators) operatorObject = instrumentObject.operators[j];
									if (operatorObject == undefined) operatorObject = {};
									
									operator.frequency = Config.operatorFrequencyNames.indexOf(operatorObject.frequency);
									if (operator.frequency == -1) operator.frequency = 0;
									if (operatorObject.amplitude != undefined) {
										operator.amplitude = clamp(0, Config.operatorAmplitudeMax + 1, operatorObject.amplitude | 0);
									} else {
										operator.amplitude = 0;
									}
									operator.envelope = Config.operatorEnvelopeNames.indexOf(operatorObject.envelope);
									if (operator.envelope == -1) operator.envelope = 0;
								}
								instrument.ipan = Config.ipanValues.indexOf(instrumentObject.ipan);
								if (instrument.ipan == -1) instrument.ipan = 4;
								instrument.imute = Config.imuteNames.indexOf(instrumentObject.imute);
								if (instrument.imute == -1) instrument.imute = 0;
							} else {
								throw new Error("Unrecognized instrument type.");
							}
						}
					}
				
					for (let i: number = 0; i < this.patternsPerChannel; i++) {
						const pattern: Pattern = this.channels[channel].patterns[i];
					
						let patternObject: any = undefined;
						if (channelObject.patterns) patternObject = channelObject.patterns[i];
						if (patternObject == undefined) continue;
					
						pattern.instrument = clamp(0, this.instrumentsPerChannel, (patternObject.instrument | 0) - 1);
					
						if (patternObject.notes && patternObject.notes.length > 0) {
							const maxNoteCount: number = Math.min(this.beatsPerBar * this.partsPerBeat, patternObject.notes.length >>> 0);
						
							///@TODO: Consider supporting notes specified in any timing order, sorting them and truncating as necessary. 
							let tickClock: number = 0;
							for (let j: number = 0; j < patternObject.notes.length; j++) {
								if (j >= maxNoteCount) break;
							
								const noteObject = patternObject.notes[j];
								if (!noteObject || !noteObject.pitches || !(noteObject.pitches.length >= 1) || !noteObject.points || !(noteObject.points.length >= 2)) {
									continue;
								}
							
								const note: Note = makeNote(0, 0, 0, 0);
								note.pitches = [];
								note.pins = [];
							
								for (let k: number = 0; k < noteObject.pitches.length; k++) {
									const pitch: number = noteObject.pitches[k] | 0;
									if (note.pitches.indexOf(pitch) != -1) continue;
									note.pitches.push(pitch);
									if (note.pitches.length >= 4) break;
								}
								if (note.pitches.length < 1) continue;
							
								let noteClock: number = tickClock;
								let startInterval: number = 0;
								for (let k: number = 0; k < noteObject.points.length; k++) {
									const pointObject: any = noteObject.points[k];
									if (pointObject == undefined || pointObject.tick == undefined) continue;
									const interval: number = (pointObject.pitchBend == undefined) ? 0 : (pointObject.pitchBend | 0);
									const time: number = pointObject.tick | 0;
									const volume: number = (pointObject.volume == undefined) ? 3 : Math.max(0, Math.min(3, Math.round((pointObject.volume | 0) * 3 / 100)));
								
									if (time > this.beatsPerBar * this.partsPerBeat) continue;
									if (note.pins.length == 0) {
										if (time < noteClock) continue;
										note.start = time;
										startInterval = interval;
									} else {
										if (time <= noteClock) continue;
									}
									noteClock = time;
								
									note.pins.push(makeNotePin(interval - startInterval, time - note.start, volume));
								}
								if (note.pins.length < 2) continue;
							
								note.end = note.pins[note.pins.length - 1].time + note.start;
							
								const maxPitch: number = isDrum ? Config.drumCount - 1 : Config.maxPitch;
								let lowestPitch: number = maxPitch;
								let highestPitch: number = 0;
								for (let k: number = 0; k < note.pitches.length; k++) {
									note.pitches[k] += startInterval;
									if (note.pitches[k] < 0 || note.pitches[k] > maxPitch) {
										note.pitches.splice(k, 1);
										k--;
									}
									if (note.pitches[k] < lowestPitch) lowestPitch = note.pitches[k];
									if (note.pitches[k] > highestPitch) highestPitch = note.pitches[k];
								}
								if (note.pitches.length < 1) continue;
							
								for (let k: number = 0; k < note.pins.length; k++) {
									const pin: NotePin = note.pins[k];
									if (pin.interval + lowestPitch < 0) pin.interval = -lowestPitch;
									if (pin.interval + highestPitch > maxPitch) pin.interval = maxPitch - highestPitch;
									if (k >= 2) {
										if (pin.interval == note.pins[k-1].interval && 
											pin.interval == note.pins[k-2].interval && 
											pin.volume == note.pins[k-1].volume && 
											pin.volume == note.pins[k-2].volume)
										{
											note.pins.splice(k-1, 1);
											k--;
										}    
									}
								}
							
								pattern.notes.push(note);
								tickClock = note.end;
							}
						}
					}
				
					for (let i: number = 0; i < this.barCount; i++) {
						this.channels[channel].bars[i] = channelObject.sequence ? Math.min(this.patternsPerChannel, channelObject.sequence[i] >>> 0) : 0;
					}
				}
			}
			
			this.pitchChannelCount = pitchChannelCount;
			this.drumChannelCount = drumChannelCount;
			this.channels.length = this.getChannelCount();
		}
		
		public getPattern(channel: number, bar: number): Pattern | null {
			const patternIndex: number = this.channels[channel].bars[bar];
			if (patternIndex == 0) return null;
			return this.channels[channel].patterns[patternIndex - 1];
		}
		
		public getPatternInstrument(channel: number, bar: number): number {
			const pattern: Pattern | null = this.getPattern(channel, bar);
			return pattern == null ? 0 : pattern.instrument;
		}

		public getPatternInstrumentMute(channel: number, bar: number): number {
			const pattern: Pattern | null = this.getPattern(channel, bar);
			const instrumentIndex: number = this.getPatternInstrument(channel, bar);
			const instrument: Instrument = this.channels[channel].instruments[instrumentIndex];
			return pattern == null ? 0 : instrument.imute;
		}

		public getPatternInstrumentVolume(channel: number, bar: number): number {
			const pattern: Pattern | null = this.getPattern(channel, bar);
			const instrumentIndex: number = this.getPatternInstrument(channel, bar);
			const instrument: Instrument = this.channels[channel].instruments[instrumentIndex];
			return pattern == null ? 0 : instrument.volume;
		}
		
		public getBeatsPerMinute(): number {
			return this.tempo;
		}
		
		private readonly _fingerprint: Array<string | number> = [];
		public getChannelFingerprint(bar: number): string {
			const channelCount: number = this.getChannelCount();
			let charCount: number = 0;
			for (let channel: number = 0; channel < channelCount; channel++) {
				if (channel < this.pitchChannelCount) {
					const instrumentIndex: number = this.getPatternInstrument(channel, bar);
					const instrument: Instrument = this.channels[channel].instruments[instrumentIndex];
					if (instrument.type == InstrumentType.chip) {
						this._fingerprint[charCount++] = "c";
					} else if (instrument.type == InstrumentType.fm) {
						this._fingerprint[charCount++] = "f"
						this._fingerprint[charCount++] = instrument.algorithm;
						this._fingerprint[charCount++] = instrument.feedbackType;
					} else if (instrument.type == InstrumentType.pwm) {
						this._fingerprint[charCount++] = "p";
					} else {
						throw new Error("Unknown instrument type.");
					}
				} else {
					this._fingerprint[charCount++] = "d";
				}
			}
			this._fingerprint.length = charCount;
			return this._fingerprint.join("");
		}
	}