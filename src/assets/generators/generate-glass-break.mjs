import fs from 'node:fs';
fs.mkdirSync('src/assets/audio/ui/glass-break',{recursive:true});
for(let variant=0;variant<3;variant++){
 const rate=44100,n=Math.floor(rate*.95),samples=new Float64Array(n);let seed=947+variant*819;
 const rnd=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 for(let shard=0;shard<38;shard++){
  const start=shard===0?0:Math.floor((rnd()**1.9)*rate*.55),f=1400+rnd()*7400,decay=.012+rnd()*.085,amp=shard===0?1:.12+rnd()*.22;
  let previous=0;
  for(let i=start;i<n&&i<start+rate*.32;i++){
   const t=(i-start)/rate,noise=rnd()*2-1,high=noise-previous;previous=noise;
   samples[i]+=amp*Math.exp(-t/decay)*(Math.sin(2*Math.PI*f*t)*.35+Math.sin(2*Math.PI*f*1.43*t)*.18+high*.5)*Math.min(1,t/.00035);
  }
 }
 let peak=0;for(const v of samples)peak=Math.max(peak,Math.abs(v));
 const out=Buffer.alloc(44+n*2);out.write('RIFF');out.writeUInt32LE(out.length-8,4);out.write('WAVEfmt ',8);out.writeUInt32LE(16,16);out.writeUInt16LE(1,20);out.writeUInt16LE(1,22);out.writeUInt32LE(rate,24);out.writeUInt32LE(rate*2,28);out.writeUInt16LE(2,32);out.writeUInt16LE(16,34);out.write('data',36);out.writeUInt32LE(n*2,40);for(let i=0;i<n;i++)out.writeInt16LE(Math.round(samples[i]/peak*.94*32767),44+i*2);
 fs.writeFileSync('src/assets/audio/ui/glass-break/shatter-'+variant+'.wav',out);
}
