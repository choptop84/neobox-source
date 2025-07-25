export class Preferences {

    public static readonly defaultVisibleOctaves: number = 3;

    autoPlay: boolean = localStorage.getItem("autoPlay") == "true";
	autoFollow: boolean = localStorage.getItem("autoFollow") == "true";
	showFifth: boolean = localStorage.getItem("showFifth") != "false";
	showMore: boolean = localStorage.getItem("showMore") == "true";
	showLetters: boolean = localStorage.getItem("showLetters") != "false";
	showChannels: boolean = localStorage.getItem("showChannels") == "true";
	showScrollBar: boolean = localStorage.getItem("showScrollBar") != "false";
	showVolumeBar: boolean = localStorage.getItem("showVolumeBar") == "true";
	advancedSettings: boolean = localStorage.getItem("advancedSettings") != "false";
	visibleOctaves: number = localStorage.getItem("visibleOctaves") != null ? Number(localStorage.getItem("visibleOctaves")) : Preferences.defaultVisibleOctaves;
    layout: string = localStorage.getItem("layout") || "small";
	volume: number = localStorage.getItem("volume") != null ? Number(localStorage.getItem("volume")) : 75;

    save(): void {
		localStorage.setItem("autoPlay", this.autoPlay ? "true" : "false");
		localStorage.setItem("autoFollow", this.autoFollow ? "true" : "false");
		localStorage.setItem("showFifth", this.showFifth ? "true" : "false");
		localStorage.setItem("showMore", this.showMore ? "true" : "false");
		localStorage.setItem("showLetters", this.showLetters ? "true" : "false");
		localStorage.setItem("showChannels", this.showChannels ? "true" : "false");
		localStorage.setItem("showScrollBar", this.showScrollBar ? "true" : "false");
		localStorage.setItem("showVolumeBar", this.showVolumeBar ? "true" : "false");
		localStorage.setItem("advancedSettings", this.advancedSettings ? "true" : "false");
		localStorage.setItem("visibleOctaves", String(this.visibleOctaves));
		localStorage.setItem("volume", String(this.volume));
	}

}