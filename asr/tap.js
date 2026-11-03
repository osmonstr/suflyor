class Tap extends AudioWorkletProcessor{constructor(){super();this.b=new Float32Array(2048);this.n=0}
  process(i){const c=i[0]&&i[0][0];if(c){let k=0;while(k<c.length){const t=Math.min(c.length-k,2048-this.n);this.b.set(c.subarray(k,k+t),this.n);this.n+=t;k+=t;
    if(this.n===2048){this.port.postMessage(this.b,[this.b.buffer]);this.b=new Float32Array(2048);this.n=0}}}return true}}
registerProcessor('tap',Tap);
