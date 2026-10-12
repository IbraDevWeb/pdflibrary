/** Réglages visuels du livre — fonctions pures testables, 0 à 100. */
export function clampTone(value,defaultValue=0,min=0,max=100){
  const parsed=Number(value);
  return Number.isFinite(parsed)?Math.max(min,Math.min(max,Math.round(parsed))):defaultValue;
}
export function interpolateHex(start,end,ratio){
  const factor=Math.min(1,Math.max(0,ratio));
  const hex=number=>number.toString(16).padStart(2,'0');
  const channel=index=>{
    const a=parseInt(start.slice(index,index+2),16);
    const b=parseInt(end.slice(index,index+2),16);
    return Math.round(a+(b-a)*factor);
  };
  return '#'+hex(channel(1))+hex(channel(3))+hex(channel(5));
}
const THEMES={
  light:{paper:'#ffffff',warm:'#f3dab7',ink:'#2d322e',warmInk:'#443021'},
  sepia:{paper:'#f3ead7',warm:'#e9caa2',ink:'#503b27',warmInk:'#48301e'},
  dark:{paper:'#19231f',warm:'#30271f',ink:'#e3e7e1',warmInk:'#ecd3b9'}
};
export function readingPalette(theme='light',warmth=0,dimmer=100){
  const palette=THEMES[theme]||THEMES.light;
  const ratio=clampTone(warmth)/100;
  const darkness=1-clampTone(dimmer,100,60,100)/100;
  const background=interpolateHex(palette.paper,palette.warm,ratio);
  const paper=interpolateHex(background,'#080d0a',darkness*.8);
  return {
    paper,
    ink:interpolateHex(palette.ink,palette.warmInk,ratio),
    pdfTintOpacity:Math.round(ratio*36)/100,
    pdfDimmerOpacity:Math.round(darkness*68)/100
  };
}
export const THEMES_ALLOWED=Object.freeze(['light','sepia','dark']);
