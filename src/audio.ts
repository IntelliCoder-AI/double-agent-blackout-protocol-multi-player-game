let context:AudioContext|null=null;let master:GainNode|null=null;let drone:{oscillators:OscillatorNode[];gain:GainNode}|null=null;
export function ambience(enabled:boolean,emergency=false){try{
 if(!enabled){if(drone){for(const oscillator of drone.oscillators){oscillator.stop();oscillator.disconnect();}drone.gain.disconnect();drone=null;}return;}
 // A user-initiated UI sound creates/resumes the context; ambient audio never
 // attempts to unlock playback before a gesture.
 if(!context||context.state!=='running')return;
 if(!drone){const gain=context.createGain();gain.gain.value=.008;gain.connect(context.destination);const oscillators=[55,82.41,110.15].map(frequency=>{const oscillator=context!.createOscillator();oscillator.frequency.value=frequency;oscillator.connect(gain);oscillator.start();return oscillator;});drone={oscillators,gain};}
 drone.gain.gain.setTargetAtTime(emergency?.017:.006,context.currentTime,.6);drone.oscillators[1].frequency.setTargetAtTime(emergency?77.78:82.41,context.currentTime,1);
 }catch{/* Ambient audio is optional. */}}
export function sound(kind:'click'|'clue'|'alert'|'win'|'lose'|'reveal',enabled:boolean){if(!enabled)return;try{context??=new AudioContext();if(context.state==='suspended')void context.resume();if(!master){master=context.createGain();master.gain.value=.08;master.connect(context.destination);}const notes={click:[640],clue:[440,660,880],alert:[220,165,220],win:[440,554,659,880],lose:[220,207.65,146.83,110],reveal:[110,164.81,220,329.63]}[kind];notes.forEach((freq,i)=>{const osc=context!.createOscillator(),gain=context!.createGain(),at=context!.currentTime+i*.1;osc.type=kind==='alert'?'triangle':'sine';osc.frequency.value=freq;gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(.8,at+.008);gain.gain.exponentialRampToValueAtTime(.001,at+.2);osc.connect(gain);gain.connect(master!);osc.start(at);osc.stop(at+.22);});}catch{/* Audio is optional; all feedback is also visual. */}}
