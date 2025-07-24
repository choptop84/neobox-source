    import { SongTagCode, CharCode, } from "./tagCodes";
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

		private static readonly _oldestBeepboxVersion: number = 2;
		private static readonly _latestBeepboxVersion: number = 6;
		private static readonly _oldestNepBoxVersion: number = 1;
		private static readonly _latestNepBoxVersion: number = 1;
		private static readonly _variant = 0x6E; //"N" ~ nepbox

		private static readonly _base64CharCodeToInt: ReadonlyArray<number> = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,62,62,0,0,1,2,3,4,5,6,7,8,9,0,0,0,0,0,0,0,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,0,0,0,0,63,0,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,0,0,0,0,0]; // 62 could be represented by either "-" or "." for historical reasons. New songs should use "-".
		private static readonly _base64IntToCharCode: ReadonlyArray<number> = [48,49,50,51,52,53,54,55,56,57,97,98,99,100,101,102,103,104,105,106,107,108,109,110,111,112,113,114,115,116,117,118,119,120,121,122,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,45,95];
		
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
			if (string != undefined) {
				this.fromBase64String(string);
			} else {
				this.initToDefault(true);
			}
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
		
		public toBase64String(): string {
			let bits: BitFieldWriter;
			let buffer: number[] = [];
			
			const base64IntToCharCode: ReadonlyArray<number> = Song._base64IntToCharCode;
			
			buffer.push(Song._variant);
			buffer.push(base64IntToCharCode[Song._latestNepBoxVersion]);



			buffer.push(SongTagCode.channelCount, base64IntToCharCode[this.pitchChannelCount], base64IntToCharCode[this.drumChannelCount]);

			buffer.push(SongTagCode.setSongTheme);
			var encodedSongTheme: string = encodeURIComponent(this.setSongTheme);
        	buffer.push(base64IntToCharCode[encodedSongTheme.length >> 6], base64IntToCharCode[encodedSongTheme.length & 0x3f]);
			// Actual encoded string follows
			for (let i: number = 0; i < encodedSongTheme.length; i++) {
				buffer.push(encodedSongTheme.charCodeAt(i));
			}

			buffer.push(SongTagCode.scale, base64IntToCharCode[this.scale]);
			buffer.push(SongTagCode.mix, base64IntToCharCode[this.mix]);
			buffer.push(SongTagCode.sampleRate, base64IntToCharCode[this.sampleRate]);
			buffer.push(SongTagCode.key, base64IntToCharCode[this.key]);
			buffer.push(SongTagCode.loopStart, base64IntToCharCode[this.loopStart >> 6], base64IntToCharCode[this.loopStart & 0x3f]);
			buffer.push(SongTagCode.loopEnd, base64IntToCharCode[(this.loopLength - 1) >> 6], base64IntToCharCode[(this.loopLength - 1) & 0x3f]);
			buffer.push(SongTagCode.tempo, base64IntToCharCode[this.tempo >> 6], base64IntToCharCode[this.tempo & 63]);
			buffer.push(SongTagCode.reverb, base64IntToCharCode[this.reverb]);
			buffer.push(SongTagCode.blend, base64IntToCharCode[this.blend]);
			buffer.push(SongTagCode.riff, base64IntToCharCode[this.riff]);
			buffer.push(SongTagCode.detune, base64IntToCharCode[this.detune]);
			buffer.push(SongTagCode.muff, base64IntToCharCode[this.muff]);
			buffer.push(SongTagCode.beatCount, base64IntToCharCode[this.beatsPerBar - 1]);
			buffer.push(SongTagCode.barCount, base64IntToCharCode[(this.barCount - 1) >> 6], base64IntToCharCode[(this.barCount - 1) & 0x3f]);
			buffer.push(SongTagCode.patternCount, base64IntToCharCode[this.patternsPerChannel - 1]);
			buffer.push(SongTagCode.instrumentCount, base64IntToCharCode[this.instrumentsPerChannel - 1]);
			buffer.push(SongTagCode.rhythm, base64IntToCharCode[Config.partCounts.indexOf(this.partsPerBeat)]);
			
			buffer.push(SongTagCode.channelOctave);
			for (let channel: number = 0; channel < this.getChannelCount(); channel++) {
				buffer.push(base64IntToCharCode[this.channels[channel].octave]);
			}
			
			for (let channel: number = 0; channel < this.getChannelCount(); channel++) {
				for (let i: number = 0; i < this.instrumentsPerChannel; i++) {
					const instrument: Instrument = this.channels[channel].instruments[i];
					
					if (channel < this.pitchChannelCount) {
						buffer.push(SongTagCode.startInstrument, base64IntToCharCode[instrument.type]);
						if (instrument.type == InstrumentType.chip) {
							// chip
							buffer.push(SongTagCode.wave, base64IntToCharCode[instrument.wave]);
							buffer.push(SongTagCode.filter, base64IntToCharCode[instrument.filter]);
							buffer.push(SongTagCode.transition, base64IntToCharCode[instrument.transition]);
							buffer.push(SongTagCode.effect, base64IntToCharCode[instrument.effect]);
							buffer.push(SongTagCode.harm, base64IntToCharCode[instrument.harm]);
							buffer.push(SongTagCode.imute, base64IntToCharCode[instrument.imute]);
							buffer.push(SongTagCode.ipan, base64IntToCharCode[instrument.ipan]);
							buffer.push(SongTagCode.octoff, base64IntToCharCode[instrument.octoff]);
							buffer.push(SongTagCode.chorus,base64IntToCharCode[instrument.chorus]);
							buffer.push(SongTagCode.volume, base64IntToCharCode[instrument.volume]);
						} else if (instrument.type == InstrumentType.fm) {
							// FM
							buffer.push(SongTagCode.transition, base64IntToCharCode[instrument.transition]);
							buffer.push(SongTagCode.effect, base64IntToCharCode[instrument.effect]);
							buffer.push(SongTagCode.octoff, base64IntToCharCode[instrument.octoff]);
							buffer.push(SongTagCode.fmChorus, base64IntToCharCode[instrument.fmChorus]);
							buffer.push(SongTagCode.imute, base64IntToCharCode[instrument.imute]);
							buffer.push(SongTagCode.ipan, base64IntToCharCode[instrument.ipan]);
							buffer.push(SongTagCode.algorithm, base64IntToCharCode[instrument.algorithm]);
							buffer.push(SongTagCode.feedbackType, base64IntToCharCode[instrument.feedbackType]);
							buffer.push(SongTagCode.feedbackAmplitude, base64IntToCharCode[instrument.feedbackAmplitude]);
							buffer.push(SongTagCode.feedbackEnvelope, base64IntToCharCode[instrument.feedbackEnvelope]);
							buffer.push(SongTagCode.volume, base64IntToCharCode[instrument.volume]);
							
							buffer.push(SongTagCode.operatorFrequencies);
							for (let o: number = 0; o < Config.operatorCount; o++) {
								buffer.push(base64IntToCharCode[instrument.operators[o].frequency]);
							}
							buffer.push(SongTagCode.operatorAmplitudes);
							for (let o: number = 0; o < Config.operatorCount; o++) {
								buffer.push(base64IntToCharCode[instrument.operators[o].amplitude]);
							}
							buffer.push(SongTagCode.operatorEnvelopes);
							for (let o: number = 0; o < Config.operatorCount; o++) {
								buffer.push(base64IntToCharCode[instrument.operators[o].envelope]);
							}
						} else if (instrument.type == InstrumentType.pwm) {
							buffer.push(SongTagCode.wave, base64IntToCharCode[instrument.wave]);
							buffer.push(SongTagCode.filter, base64IntToCharCode[instrument.filter]);
							buffer.push(SongTagCode.transition, base64IntToCharCode[instrument.transition]);
							buffer.push(SongTagCode.effect, base64IntToCharCode[instrument.effect]);
							buffer.push(SongTagCode.harm, base64IntToCharCode[instrument.harm]);
							buffer.push(SongTagCode.imute, base64IntToCharCode[instrument.imute]);
							buffer.push(SongTagCode.ipan, base64IntToCharCode[instrument.ipan]);
							buffer.push(SongTagCode.octoff, base64IntToCharCode[instrument.octoff]);
							buffer.push(SongTagCode.chorus, base64IntToCharCode[instrument.chorus]);
							buffer.push(SongTagCode.volume, base64IntToCharCode[instrument.volume]);
						} else {
							throw new Error("Unknown instrument type.");
						}
					} else {
						// NOISE
						buffer.push(SongTagCode.startInstrument, base64IntToCharCode[InstrumentType.noise]);
						buffer.push(SongTagCode.wave, base64IntToCharCode[instrument.wave]);
						buffer.push(SongTagCode.transition, base64IntToCharCode[instrument.transition]);
						buffer.push(SongTagCode.volume, base64IntToCharCode[instrument.volume]);
						buffer.push(SongTagCode.imute, base64IntToCharCode[instrument.imute]);
						buffer.push(SongTagCode.harm, base64IntToCharCode[instrument.harm]);
						buffer.push(SongTagCode.octoff, base64IntToCharCode[instrument.octoff]);
						buffer.push(SongTagCode.ipan, base64IntToCharCode[instrument.ipan]);
					}
				}
			}
			
			buffer.push(SongTagCode.bars);
			bits = new BitFieldWriter();
			let neededBits: number = 0;
			while ((1 << neededBits) < this.patternsPerChannel + 1) neededBits++;
			for (let channel: number = 0; channel < this.getChannelCount(); channel++) for (let i: number = 0; i < this.barCount; i++) {
				bits.write(neededBits, this.channels[channel].bars[i]);
			}
			bits.encodeBase64(base64IntToCharCode, buffer);
			
			buffer.push(SongTagCode.patterns);
			bits = new BitFieldWriter();
			let neededInstrumentBits: number = 0;
			while ((1 << neededInstrumentBits) < this.instrumentsPerChannel) neededInstrumentBits++;
			for (let channel: number = 0; channel < this.getChannelCount(); channel++) {
				const isDrum: boolean = this.getChannelIsDrum(channel);
				const octaveOffset: number = isDrum ? 0 : this.channels[channel].octave * 12;
				let lastPitch: number = (isDrum ? 4 : 12) + octaveOffset;
				const recentPitches: number[] = isDrum ? [4,6,7,2,3,8,0,10] : [12, 19, 24, 31, 36, 7, 0];
				const recentShapes: string[] = [];
				for (let i: number = 0; i < recentPitches.length; i++) {
					recentPitches[i] += octaveOffset;
				}
				for (const p of this.channels[channel].patterns) {
					bits.write(neededInstrumentBits, p.instrument);
					
					if (p.notes.length > 0) {
						bits.write(1, 1);
						
						let curPart: number = 0;
						for (const t of p.notes) {
							if (t.start > curPart) {
								bits.write(2, 0); // rest
								bits.writePartDuration(t.start - curPart);
							}
							
							const shapeBits: BitFieldWriter = new BitFieldWriter();
							
							// 0: 1 pitch, 10: 2 pitches, 110: 3 pitches, 111: 4 pitches
							for (let i: number = 1; i < t.pitches.length; i++) shapeBits.write(1,1);
							if (t.pitches.length < 4) shapeBits.write(1,0);
							
							shapeBits.writePinCount(t.pins.length - 1);
							
							shapeBits.write(2, t.pins[0].volume); // volume
							
							let shapePart: number = 0;
							let startPitch: number = t.pitches[0];
							let currentPitch: number = startPitch;
							const pitchBends: number[] = [];
							for (let i: number = 1; i < t.pins.length; i++) {
								const pin: NotePin = t.pins[i];
								const nextPitch: number = startPitch + pin.interval;
								if (currentPitch != nextPitch) {
									shapeBits.write(1, 1);
									pitchBends.push(nextPitch);
									currentPitch = nextPitch;
								} else {
									shapeBits.write(1, 0);
								}
								shapeBits.writePartDuration(pin.time - shapePart);
								shapePart = pin.time;
								shapeBits.write(2, pin.volume);
							}
							
							const shapeString: string = String.fromCharCode.apply(null, shapeBits.encodeBase64(base64IntToCharCode, []));
							const shapeIndex: number = recentShapes.indexOf(shapeString);
							if (shapeIndex == -1) {
								bits.write(2, 1); // new shape
								bits.concat(shapeBits);
							} else {
								bits.write(1, 1); // old shape
								bits.writeLongTail(0, 0, shapeIndex);
								recentShapes.splice(shapeIndex, 1);
							}
							recentShapes.unshift(shapeString);
							if (recentShapes.length > 10) recentShapes.pop();
							
							const allPitches: number[] = t.pitches.concat(pitchBends);
							for (let i: number = 0; i < allPitches.length; i++) {
								const pitch: number = allPitches[i];
								const pitchIndex: number = recentPitches.indexOf(pitch);
								if (pitchIndex == -1) {
									let interval: number = 0;
									let pitchIter: number = lastPitch;
									if (pitchIter < pitch) {
										while (pitchIter != pitch) {
											pitchIter++;
											if (recentPitches.indexOf(pitchIter) == -1) interval++;
										}
									} else {
										while (pitchIter != pitch) {
											pitchIter--;
											if (recentPitches.indexOf(pitchIter) == -1) interval--;
										}
									}
									bits.write(1, 0);
									bits.writePitchInterval(interval);
								} else {
									bits.write(1, 1);
									bits.write(3, pitchIndex);
									recentPitches.splice(pitchIndex, 1);
								}
								recentPitches.unshift(pitch);
								if (recentPitches.length > 8) recentPitches.pop();
								
								if (i == t.pitches.length - 1) {
									lastPitch = t.pitches[0];
								} else {
									lastPitch = pitch;
								}
							}
							curPart = t.end;
						}
						
						if (curPart < this.beatsPerBar * this.partsPerBeat) {
							bits.write(2, 0); // rest
							bits.writePartDuration(this.beatsPerBar * this.partsPerBeat - curPart);
						}
					} else {
						bits.write(1, 0);
					}
				}
			}
			let stringLength: number = bits.lengthBase64();
			let digits: number[] = [];
			while (stringLength > 0) {
				digits.unshift(base64IntToCharCode[stringLength & 0x3f]);
				stringLength = stringLength >> 6;
			}
			buffer.push(base64IntToCharCode[digits.length]);
			Array.prototype.push.apply(buffer, digits); // append digits to buffer.
			bits.encodeBase64(base64IntToCharCode, buffer);
			
			// HACK: This breaks for strings longer than 65535. 
			if (buffer.length >= 65535) throw new Error("Song hash code too long.");
			return String.fromCharCode.apply(null, buffer);
		}
		
		public fromBase64String(compressed: string): void {
			if (compressed == null || compressed == "") {
				this.initToDefault(true);
				return;
			}
			let charIndex: number = 0;
			// skip whitespace.
			while (compressed.charCodeAt(charIndex) <= CharCode.SPACE) charIndex++;
			// skip hash mark.
			if (compressed.charCodeAt(charIndex) == CharCode.HASH) charIndex++;
			// if it starts with curly brace, treat it as JSON.
			if (compressed.charCodeAt(charIndex) == CharCode.LEFT_CURLY_BRACE) {
				this.fromJsonObject(JSON.parse(charIndex == 0 ? compressed : compressed.substring(charIndex)));
				return;
			}

			const variantTest: number = compressed.charCodeAt(charIndex);
        	let fromOld: boolean;
        	let fromNepBox: boolean;

			// Detect variant here. If version doesn't match known variant, assume it is a vanilla string which does not report variant.
			if (variantTest == 0x6E) { //"n"
				fromOld = false;
				fromNepBox = true;
				charIndex++;
			} else {
				fromOld = true;
				fromNepBox = false;
			}

			const version: number = Song._base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
			if (fromOld && (version == -1 || version > Song._latestBeepboxVersion || version < Song._oldestBeepboxVersion)) return;
			if (fromNepBox && (version == -1 || version > Song._latestNepBoxVersion || version < Song._oldestNepBoxVersion)) return;
			//const beforeTwo:   boolean = version < 2;
			const beforeThree: boolean = version < 3;
			const beforeFour:  boolean = version < 4;
			const beforeFive:  boolean = version < 5;
			const beforeSix:   boolean = version < 6;
			const base64CharCodeToInt: ReadonlyArray<number> = Song._base64CharCodeToInt;
			this.initToDefault((fromOld && beforeSix) || (fromNepBox));
			
			if (fromOld && beforeThree) {
				// Originally, the only instrument transition was "seamless" and the only drum wave was "retro".
				for (const channel of this.channels) channel.instruments[0].transition = 0;
				this.channels[3].instruments[0].wave = 0;
			}
			
			let instrumentChannelIterator: number = 0;
			let instrumentIndexIterator: number = -1;
			
			while (charIndex < compressed.length) {
				const command: number = compressed.charCodeAt(charIndex++);
				let channel: number;
				if (command == SongTagCode.channelCount) {
					this.pitchChannelCount = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
					this.drumChannelCount  = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
					this.pitchChannelCount = clamp(Config.pitchChannelCountMin, Config.pitchChannelCountMax + 1, this.pitchChannelCount);
					this.drumChannelCount = clamp(Config.drumChannelCountMin, Config.drumChannelCountMax + 1, this.drumChannelCount);
					for (let channelIndex = this.channels.length; channelIndex < this.getChannelCount(); channelIndex++) {
						this.channels[channelIndex] = new Channel();
					}
					this.channels.length = this.getChannelCount();
				} else if (command == SongTagCode.scale) {
					this.scale = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
					if ((fromOld && beforeThree) && this.scale == 10) this.scale = 11;
				} else if (command == SongTagCode.mix) {
					this.mix = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
				} else if (command == SongTagCode.key) {
						this.key = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
				} else if (command == SongTagCode.setSongTheme) {
					if (fromOld) {
						var themeIndex = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
						var themes = ["none", "modbox2", "artic", "Cinnamon Roll", "Ocean", "rainbow", "float", "windows", "grassland", "dessert", "kahootiest", "beambit", "egg", "Poniryoshka", "gameboy", "woodkid", "midnight", "snedbox", "unnamed", "piano", "halloween", "frozen"];
						this.setSongTheme = themes[themeIndex];
					} else {
						var songThemeLength = (base64CharCodeToInt[compressed.charCodeAt(charIndex++)] << 6) + base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
						this.setSongTheme = decodeURIComponent(compressed.substring(charIndex, charIndex + songThemeLength));
						charIndex += songThemeLength;
					}
				} else if (command == SongTagCode.loopStart) {
					if (fromOld && beforeFive) {
						this.loopStart = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
					} else {
						this.loopStart = (base64CharCodeToInt[compressed.charCodeAt(charIndex++)] << 6) + base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
					}
				} else if (command == SongTagCode.loopEnd) {
					if (fromOld && beforeFive) {
						this.loopLength = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
					} else {
						this.loopLength = (base64CharCodeToInt[compressed.charCodeAt(charIndex++)] << 6) + base64CharCodeToInt[compressed.charCodeAt(charIndex++)] + 1;
					}
				} else if (command == SongTagCode.tempo) {
					if (fromOld) {
						if (beforeFour) {
							this.tempo = [1, 4, 7, 10][base64CharCodeToInt[compressed.charCodeAt(charIndex++)]];
						} else {
							this.tempo = [88, 95, 103, 111, 120, 130, 140, 151, 163, 176, 190, 206, 222, 240, 259][base64CharCodeToInt[compressed.charCodeAt(charIndex++)]];
						}
					} else {
						this.tempo = (base64CharCodeToInt[compressed.charCodeAt(charIndex++)] << 6) + base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
					}
					this.tempo = clamp(Config.tempoMin, Config.tempoMax, this.tempo);
				} else if (command == SongTagCode.reverb) {
					this.reverb = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
					this.reverb = clamp(0, Config.reverbRange, this.reverb);
				} else if (command == SongTagCode.blend) {
					this.blend = clamp(0, Config.blendRange, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
				} else if (command == SongTagCode.riff) {
					this.riff = clamp(0, Config.riffRange, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
				} else if (command == SongTagCode.sampleRate) {
					this.sampleRate = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
				} else if (command == SongTagCode.detune) {
					this.detune = clamp(0, Config.detuneRange, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
				} else if (command == SongTagCode.muff) {
					this.muff = clamp(0, Config.muffRange, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
				} else if (command == SongTagCode.beatCount) {
					if (fromOld && beforeThree) {
						this.beatsPerBar = [6, 7, 8, 9, 10][base64CharCodeToInt[compressed.charCodeAt(charIndex++)]];
					} else {
						this.beatsPerBar = base64CharCodeToInt[compressed.charCodeAt(charIndex++)] + 1;
					}
					this.beatsPerBar = Math.max(Config.beatsPerBarMin, Math.min(Config.beatsPerBarMax, this.beatsPerBar));
				} else if (command == SongTagCode.barCount) {
					this.barCount = (base64CharCodeToInt[compressed.charCodeAt(charIndex++)] << 6) + base64CharCodeToInt[compressed.charCodeAt(charIndex++)] + 1;
					this.barCount = Math.max(Config.barCountMin, Math.min(Config.barCountMax, this.barCount));
					for (let channel = 0; channel < this.getChannelCount(); channel++) {
						for (let bar = this.channels[channel].bars.length; bar < this.barCount; bar++) {
							this.channels[channel].bars[bar] = 1;
						}
						this.channels[channel].bars.length = this.barCount;
					}
				} else if (command == SongTagCode.patternCount) {
					this.patternsPerChannel = base64CharCodeToInt[compressed.charCodeAt(charIndex++)] + 1;
					this.patternsPerChannel = Math.max(1, Math.min(Config.barCountMax, this.patternsPerChannel));
					for (let channel = 0; channel < this.getChannelCount(); channel++) {
						for (let pattern = this.channels[channel].patterns.length; pattern < this.patternsPerChannel; pattern++) {
							this.channels[channel].patterns[pattern] = new Pattern();
						}
						this.channels[channel].patterns.length = this.patternsPerChannel;
					}
				} else if (command == SongTagCode.instrumentCount) {
					this.instrumentsPerChannel = base64CharCodeToInt[compressed.charCodeAt(charIndex++)] + 1;
					this.instrumentsPerChannel = Math.max(Config.instrumentsPerChannelMin, Math.min(Config.instrumentsPerChannelMax, this.instrumentsPerChannel));
					for (let channel = 0; channel < this.getChannelCount(); channel++) {
						for (let instrument = this.channels[channel].instruments.length; instrument < this.instrumentsPerChannel; instrument++) {
							this.channels[channel].instruments[instrument] = new Instrument();
						}
						this.channels[channel].instruments.length = this.instrumentsPerChannel;
					}
				} else if (command == SongTagCode.rhythm) {
					this.partsPerBeat = Config.partCounts[base64CharCodeToInt[compressed.charCodeAt(charIndex++)]];
				} else if (command == SongTagCode.channelOctave) {
					if (fromOld && beforeThree) {
						channel = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
						this.channels[channel].octave = clamp(0, 5, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
					} else {
						for (channel = 0; channel < this.getChannelCount(); channel++) {
							this.channels[channel].octave = clamp(0, 5, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
						}
					}
				} else if (command == SongTagCode.startInstrument) {
					instrumentIndexIterator++;
					if (instrumentIndexIterator >= this.instrumentsPerChannel) {
						instrumentChannelIterator++;
						instrumentIndexIterator = 0;
					}
					const isPitchChannel: boolean = instrumentChannelIterator < this.pitchChannelCount;
					const instrument: Instrument = this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
					const rawInstrumentType: number = clamp(0, 4, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
					let instrumentType: number = rawInstrumentType;
					if (instrumentType == InstrumentType.noise && isPitchChannel) {
						instrumentType = InstrumentType.pwm;
					}
					instrument.setTypeAndReset(instrumentType);
				} else if (command == SongTagCode.wave) {
					if (fromOld && beforeThree) {
						channel = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
						this.channels[channel].instruments[0].wave = clamp(0, Config.waveNames.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
					} else if (fromOld && beforeSix) {
						for (channel = 0; channel < this.getChannelCount(); channel++) {
							const isDrums = (channel >= this.pitchChannelCount);
							for (let i: number = 0; i < this.instrumentsPerChannel; i++) {
								this.channels[channel].instruments[i].wave = clamp(0, isDrums ? Config.drumNames.length : Config.waveNames.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
							}
						}
					} else {
						const isDrums = (instrumentChannelIterator >= this.pitchChannelCount);
						this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].wave = clamp(0, isDrums ? Config.drumNames.length : Config.waveNames.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
					}
				} else if (command == SongTagCode.filter) {
					if (fromOld && beforeThree) {
						channel = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
						this.channels[channel].instruments[0].filter = [1, 3, 4, 5][clamp(0, Config.filterNames.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)])];
					} else if (fromOld && beforeSix) {
						for (channel = 0; channel < this.getChannelCount(); channel++) {
							for (let i: number = 0; i < this.instrumentsPerChannel; i++) {
								this.channels[channel].instruments[i].filter = clamp(0, Config.filterNames.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)] + 1);
							}
						}
					} else {
						this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].filter = clamp(0, Config.filterNames.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
					}
				} else if (command == SongTagCode.transition) {
					if (fromOld && beforeThree) {
						channel = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
						this.channels[channel].instruments[0].transition = clamp(0, Config.transitionNames.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
					} else if (fromOld && beforeSix) {
						for (channel = 0; channel < this.getChannelCount(); channel++) {
							for (let i: number = 0; i < this.instrumentsPerChannel; i++) {
								this.channels[channel].instruments[i].transition = clamp(0, Config.transitionNames.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
							}
						}
					} else {
						this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].transition = clamp(0, Config.transitionNames.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
					}
				} else if (command == SongTagCode.effect) {
					if (fromOld && beforeThree) {
						channel = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
						let effect: number = clamp(0, Config.effectNames.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
						if (effect == 1) effect = 3;
						else if (effect == 3) effect = 5;
						this.channels[channel].instruments[0].effect = effect;
					} else if (fromOld && beforeSix) {
						for (channel = 0; channel < this.getChannelCount(); channel++) {
							for (let i: number = 0; i < this.instrumentsPerChannel; i++) {
								this.channels[channel].instruments[i].effect = clamp(0, Config.effectNames.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
							}
						}
					} else {
						this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].effect = clamp(0, Config.effectNames.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
					}
				} else if (command == SongTagCode.chorus) {
					if (fromOld && beforeThree) {
						channel = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
						this.channels[channel].instruments[0].chorus = clamp(0, Config.chorusNames.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
					} else if (fromOld && beforeSix) {
						for (channel = 0; channel < this.getChannelCount(); channel++) {
							for (let i: number = 0; i < this.instrumentsPerChannel; i++) {
								this.channels[channel].instruments[i].chorus = clamp(0, Config.chorusNames.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
							}
						}
					} else {
						this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].chorus = clamp(0, Config.chorusNames.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
					}
				} else if (command == SongTagCode.harm) {
					// Harmony was added in this commit: https://github.com/ModdedBeepbox/modded-beepbox-2.3/commit/cd1cc3d1891eda506e77e7619822ec2a48f375f2
					// _latestVersion was 5 in that commit, so the beforeThree
					// if in the reading code shouldn't ever run. Thus, it has
					// been omitted here.
					if (fromOld && beforeSix) {
						for (channel = 0; channel < this.getChannelCount(); channel++) {
							for (let i: number = 0; i < this.instrumentsPerChannel; i++) {
								this.channels[channel].instruments[i].harm = clamp(0, Config.harmNames.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
							}
						}
					} else {
						this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].harm = clamp(0, Config.harmNames.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
					}
				} else if (command == SongTagCode.fmChorus) {
					// FM chorus was added in this commit: https://github.com/ModdedBeepbox/beta/commit/5c47acd9e5892709596d81df987a496f468b7115
					// Smaller diff: https://github.com/ModdedBeepbox/beta/compare/5427a7c491aae9fef15576bbc33a0d43ca18f758..5c47acd9e5892709596d81df987a496f468b7115
					// _latestVersion remained 6 before and after this, and the
					// tag code was never used for anything else previously, so
					// no backwards compatibility code is needed here.
					this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].fmChorus = clamp(0, Config.fmChorusNames.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
				} else if (command == SongTagCode.imute) {
					// Muting was added in this commit: https://github.com/ModdedBeepbox/3.0/commit/f177e34831ab85c58e0492ae47a5df80e709d9b4
					// _latestVersion remained 6 before and after this, and the
					// tag code was never used for anything else previously, so
					// no backwards compatibility code is needed here.
					this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].imute = clamp(0, Config.imuteNames.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
				} else if (command == SongTagCode.ipan) {
					// @TODO: Add SongTagCode.oldIpan = CharCode.M? Normally it
					// will be ignored if present on songs made before Oct 22, 2018
					// or so.
					this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].ipan = clamp(0, Config.ipanValues.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
				} else if (command == SongTagCode.octoff) {
					// Octave offset was first added in this commit: https://github.com/ModdedBeepbox/3.0/commit/54bdad302110cbde72b18f041091e53e3c35c189 (see BeepBox_files/5_channel.js)
					// It used CharCode.VERTICAL_LINE as the tag code value.
					// Later, it was changed to use CharCode.B in this commit: https://github.com/ModdedBeepbox/3.0/commit/84b9a7608c22addf01af2acebee6d5f6c65a5122
					// _latestVersion was 5, and the only major difference here
					// is that the octave offsets were pushed for every channel
					// one after another.
					// The beforeThree if was never needed.
					if (fromOld && beforeSix) {
						for (channel = 0; channel < this.getChannelCount(); channel++) {
							for (let i: number = 0; i < this.instrumentsPerChannel; i++) {
								this.channels[channel].instruments[i].octoff = clamp(0, Config.octoffNames.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
							}
						}
					} else {
						this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].octoff = clamp(0, Config.octoffNames.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
					}
				} else if (command == SongTagCode.volume) {
					if (fromOld && beforeThree) {
						channel = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
						this.channels[channel].instruments[0].volume = clamp(0, Config.volumeNames.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
					} else if (fromOld && beforeSix) {
						for (channel = 0; channel < this.getChannelCount(); channel++) {
							for (let i: number = 0; i < this.instrumentsPerChannel; i++) {
								this.channels[channel].instruments[i].volume = clamp(0, Config.volumeNames.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
							}
						}
					} else {
						this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].volume = clamp(0, Config.volumeNames.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
					}
				} else if (command == SongTagCode.algorithm) {
					this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].algorithm = clamp(0, Config.operatorAlgorithmNames.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
				} else if (command == SongTagCode.feedbackType) {
					this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].feedbackType = clamp(0, Config.operatorFeedbackNames.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
				} else if (command == SongTagCode.feedbackAmplitude) {
					this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].feedbackAmplitude = clamp(0, Config.operatorAmplitudeMax + 1, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
				} else if (command == SongTagCode.feedbackEnvelope) {
					this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].feedbackEnvelope = clamp(0, Config.operatorEnvelopeNames.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
				} else if (command == SongTagCode.operatorFrequencies) {
					for (let o: number = 0; o < Config.operatorCount; o++) {
						this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].operators[o].frequency = clamp(0, Config.operatorFrequencyNames.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
					}
				} else if (command == SongTagCode.operatorAmplitudes) {
					for (let o: number = 0; o < Config.operatorCount; o++) {
						this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].operators[o].amplitude = clamp(0, Config.operatorAmplitudeMax + 1, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
					}
				} else if (command == SongTagCode.operatorEnvelopes) {
					for (let o: number = 0; o < Config.operatorCount; o++) {
						this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].operators[o].envelope = clamp(0, Config.operatorEnvelopeNames.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
					}
				} else if (command == SongTagCode.bars) {
					let subStringLength: number;
					if (fromOld && beforeThree) {
						channel = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
						const barCount: number = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
						subStringLength = Math.ceil(barCount * 0.5);
						const bits: BitFieldReader = new BitFieldReader(base64CharCodeToInt, compressed, charIndex, charIndex + subStringLength);
						for (let i: number = 0; i < barCount; i++) {
							this.channels[channel].bars[i] = bits.read(3) + 1;
						}
					} else if (fromOld && beforeFive) {
						let neededBits: number = 0;
						while ((1 << neededBits) < this.patternsPerChannel) neededBits++;
						subStringLength = Math.ceil(this.getChannelCount() * this.barCount * neededBits / 6);
						const bits: BitFieldReader = new BitFieldReader(base64CharCodeToInt, compressed, charIndex, charIndex + subStringLength);
						for (channel = 0; channel < this.getChannelCount(); channel++) {
							for (let i: number = 0; i < this.barCount; i++) {
								this.channels[channel].bars[i] = bits.read(neededBits) + 1;
							}
						}
					} else {
						let neededBits: number = 0;
						while ((1 << neededBits) < this.patternsPerChannel + 1) neededBits++;
						subStringLength = Math.ceil(this.getChannelCount() * this.barCount * neededBits / 6);
						const bits: BitFieldReader = new BitFieldReader(base64CharCodeToInt, compressed, charIndex, charIndex + subStringLength);
						for (channel = 0; channel < this.getChannelCount(); channel++) {
							for (let i: number = 0; i < this.barCount; i++) {
								this.channels[channel].bars[i] = bits.read(neededBits);
							}
						}
					}
					charIndex += subStringLength;
				} else if (command == SongTagCode.patterns) {
					let bitStringLength: number = 0;
					if (fromOld && beforeThree) {
						channel = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
						
						// The old format used the next character to represent the number of patterns in the channel, which is usually eight, the default. 
						charIndex++; //let patternCount: number = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
						
						bitStringLength = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
						bitStringLength = bitStringLength << 6;
						bitStringLength += base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
					} else {
						channel = 0;
						let bitStringLengthLength: number = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
						while (bitStringLengthLength > 0) {
							bitStringLength = bitStringLength << 6;
							bitStringLength += base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
							bitStringLengthLength--;
						}
					}
					
					const bits: BitFieldReader = new BitFieldReader(base64CharCodeToInt, compressed, charIndex, charIndex + bitStringLength);
					charIndex += bitStringLength;
					
					let neededInstrumentBits: number = 0;
					while ((1 << neededInstrumentBits) < this.instrumentsPerChannel) neededInstrumentBits++;
					while (true) {
						const isDrum: boolean = this.getChannelIsDrum(channel);
						
						const octaveOffset: number = isDrum ? 0 : this.channels[channel].octave * 12;
						let note: Note | null = null;
						let pin: NotePin | null = null;
						let lastPitch: number = (isDrum ? 4 : 12) + octaveOffset;
						const recentPitches: number[] = isDrum ? [4,6,7,2,3,8,0,10] : [12, 19, 24, 31, 36, 7, 0];
						const recentShapes: any[] = [];
						for (let i: number = 0; i < recentPitches.length; i++) {
							recentPitches[i] += octaveOffset;
						}
						for (let i: number = 0; i < this.patternsPerChannel; i++) {
							const newPattern: Pattern = this.channels[channel].patterns[i];
							newPattern.reset();
							newPattern.instrument = bits.read(neededInstrumentBits);
							
							if (((fromOld && !beforeThree) || fromNepBox) && bits.read(1) == 0) continue;
							
							let curPart: number = 0;
							const newNotes: Note[] = newPattern.notes;
							while (curPart < this.beatsPerBar * this.partsPerBeat) {
								
								const useOldShape: boolean = bits.read(1) == 1;
								let newNote: boolean = false;
								let shapeIndex: number = 0;
								if (useOldShape) {
									shapeIndex = bits.readLongTail(0, 0);
								} else {
									newNote = bits.read(1) == 1;
								}
								
								if (!useOldShape && !newNote) {
									const restLength: number = bits.readPartDuration();
									curPart += restLength;
								} else {
									let shape: any;
									let pinObj: any;
									let pitch: number;
									if (useOldShape) {
										shape = recentShapes[shapeIndex];
										recentShapes.splice(shapeIndex, 1);
									} else {
										shape = {};
										
										shape.pitchCount = 1;
										while (shape.pitchCount < 4 && bits.read(1) == 1) shape.pitchCount++;
										
										shape.pinCount = bits.readPinCount();
										shape.initialVolume = bits.read(2);
										
										shape.pins = [];
										shape.length = 0;
										shape.bendCount = 0;
										for (let j: number = 0; j < shape.pinCount; j++) {
											pinObj = {};
											pinObj.pitchBend = bits.read(1) == 1;
											if (pinObj.pitchBend) shape.bendCount++;
											shape.length += bits.readPartDuration();
											pinObj.time = shape.length;
											pinObj.volume = bits.read(2);
											shape.pins.push(pinObj);
										}
									}
									recentShapes.unshift(shape);
									if (recentShapes.length > 10) recentShapes.pop();
									
									note = makeNote(0,curPart,curPart + shape.length, shape.initialVolume);
									note.pitches = [];
									note.pins.length = 1;
									const pitchBends: number[] = [];
									for (let j: number = 0; j < shape.pitchCount + shape.bendCount; j++) {
										const useOldPitch: boolean = bits.read(1) == 1;
										if (!useOldPitch) {
											const interval: number = bits.readPitchInterval();
											pitch = lastPitch;
											let intervalIter: number = interval;
											while (intervalIter > 0) {
												pitch++;
												while (recentPitches.indexOf(pitch) != -1) pitch++;
												intervalIter--;
											}
											while (intervalIter < 0) {
												pitch--;
												while (recentPitches.indexOf(pitch) != -1) pitch--;
												intervalIter++;
											}
										} else {
											const pitchIndex: number = bits.read(3);
											pitch = recentPitches[pitchIndex];
											recentPitches.splice(pitchIndex, 1);
										}
										
										recentPitches.unshift(pitch);
										if (recentPitches.length > 8) recentPitches.pop();
										
										if (j < shape.pitchCount) {
											note.pitches.push(pitch);
										} else {
											pitchBends.push(pitch);
										}
										
										if (j == shape.pitchCount - 1) {
											lastPitch = note.pitches[0];
										} else {
											lastPitch = pitch;
										}
									}
									
									pitchBends.unshift(note.pitches[0]);
									
									for (const pinObj of shape.pins) {
										if (pinObj.pitchBend) pitchBends.shift();
										pin = makeNotePin(pitchBends[0] - note.pitches[0], pinObj.time, pinObj.volume);
										note.pins.push(pin);
									}
									curPart = note.end;
									newNotes.push(note);
								}
							}
						}
						
						if (fromOld && beforeThree) {
							break;
						} else {
							channel++;
							if (channel >= this.getChannelCount()) break;
						}
					} // while (true)
				}
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