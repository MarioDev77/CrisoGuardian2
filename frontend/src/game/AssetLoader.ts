export class AssetLoader {
  private cache=new Map<string,HTMLImageElement>();
  load(src:string):Promise<HTMLImageElement>{const existing=this.cache.get(src);if(existing)return Promise.resolve(existing);return new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>{this.cache.set(src,img);resolve(img)};img.onerror=()=>reject(new Error(`Falha ao carregar asset: ${src}`));img.src=src;});}
  get(src:string):HTMLImageElement|undefined{return this.cache.get(src)}
  async preload(sources:string[]):Promise<void>{await Promise.all(sources.map(s=>this.load(s).catch(()=>undefined)));}
}
