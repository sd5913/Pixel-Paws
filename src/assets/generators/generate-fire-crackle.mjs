import fs from 'node:fs';
const rate=44100,length=rate*4,samples=new Float64Array(length);let seed=20261127,low=0;
const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
for(let i=0;i<length;i++){const noise=random()*2-1;low+=.06*(noise-low);samples[i]=low*.18;}
for(let c=0;c<58;c++){
 const start=Math.floor(random()*(length-rate*.14)),decay=.002+random()*.022,amp=.08+random()**3*.6,f=800+random()*4300;let previous=0;
 for(let i=0;i<rate*.14;i++){const t=i/rate,noise=random()*2-1;const filtered=noise*.7+previous*.3;previous=filtered;samples[start+i]+=amp*Math.exp(-t/decay)*(filtered*.8+Math.sin(2*Math.PI*f*t)*.2)*Math.min(1,t/.0005);}
}
let peak=0;for(const s of samples)peak=Math.max(peak,Math.abs(s));
const out=Buffer.alloc(44+length*2);out.write('RIFF');out.writeUInt32LE(out.length-8,4);out.write('WAVEfmt ',8);out.writeUInt32LE(16,16);out.writeUInt16LE(1,20);out.writeUInt16LE(1,22);out.writeUInt32LE(rate,24);out.writeUInt32LE(rate*2,28);out.writeUInt16LE(2,32);out.writeUInt16LE(16,34);out.write('data',36);out.writeUInt32LE(length*2,40);
for(let i=0;i<length;i++){const fade=Math.min(1,i/(rate*.025),(length-1-i)/(rate*.025));out.writeInt16LE(Math.round(samples[i]/peak*.8*fade*32767),44+i*2);}
fs.mkdirSync('src/assets/audio/ui/fire-crackle',{recursive:true});fs.writeFileSync('src/assets/audio/ui/fire-crackle/burning.wav',out);
