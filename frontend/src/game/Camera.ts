export class Camera { x=0; update(targetX:number, viewportWidth:number, worldWidth:number):void { this.x=Math.max(0,Math.min(worldWidth-viewportWidth,targetX-viewportWidth*.34)); } }
