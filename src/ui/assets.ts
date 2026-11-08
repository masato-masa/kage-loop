// ChatGPT で描いた素材（refs/gen → scripts/slice-gen.mjs → src/assets/gen）
import ghost from '../assets/gen/ghost.png';
import hero from '../assets/gen/hero.png';
import heroCheer from '../assets/gen/heroCheer.png';
import exit from '../assets/gen/exit.png';
import gate0 from '../assets/gen/gate0.png';
import gate1 from '../assets/gen/gate1.png';
import gate2 from '../assets/gen/gate2.png';
import plate0 from '../assets/gen/plate0.png';
import plate1 from '../assets/gen/plate1.png';
import plate2 from '../assets/gen/plate2.png';
import start from '../assets/gen/start.png';

export const IMG = {
  hero,
  heroCheer,
  ghost,
  exit,
  start,
  plate: [plate0, plate1, plate2],
  gate: [gate0, gate1, gate2],
};
