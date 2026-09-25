import React from "react";
import Svg, { Circle, ClipPath, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from "react-native-svg";
import { colors } from "@/theme/colors";

interface Props {
  width: number;
}

/**
 * Lienzo recortado sobre las coordenadas de la ilustración de referencia
 * (853 × 1280): el doctor se dibujó calcando la referencia elegida por el
 * equipo, así que conserva sus proporciones y formas orgánicas.
 */
const VB = { x: 30, y: 180, w: 760, h: 1000 };

/** Ancho / alto del dibujo, para dimensionarlo desde la pantalla. */
export const PROPORCION_ILUSTRACION = VB.w / VB.h;

/**
 * El doctor de TurnoSmart. Sigue de cerca la referencia visual: medio
 * cuerpo, saludo con la mano abierta, tablilla bajo el brazo, rostro sin
 * contorno, pelo corto simétrico pegado al cráneo, estetoscopio de trazo grueso y
 * bata con pliegues grises suaves. Solo cambian los colores: camisa
 * celeste, corbata acero 700, estetoscopio Campo (#1d2d3d), tablilla en
 * acero con un tilde de «cupo confirmado», líneas de la bata en gris
 * azulado. Piel y pelo quedan naturales, como en la referencia.
 *
 * Detrás, el arco celeste de la app; la cabeza sobresale por arriba y la
 * mano que saluda asoma por la izquierda para que no se vea encerrado.
 */
export function DoctoraIlustracion({ width }: Props) {
  const height = width / PROPORCION_ILUSTRACION;

  return (
    <Svg
      width={width}
      height={height}
      viewBox={`${VB.x} ${VB.y} ${VB.w} ${VB.h}`}
      accessibilityLabel="Un doctor te saluda"
    >
      <Defs>
        <LinearGradient id="arco" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={colors.accent200} />
          <Stop offset="1" stopColor="#e4f0fd" />
        </LinearGradient>
        <ClipPath id="cuello">
          <Path d="M386 468 C388 500 387 524 384 546 C414 572 464 572 494 544 C490 520 488 496 488 466 Z" />
        </ClipPath>
      </Defs>
      <Path d="M170 1180 V540 A300 300 0 0 1 770 540 V1180 Z" fill="url(#arco)" />
      {/* Bata: cuerpo con hombros y brazo derecho */}
      <Path
        d="M300 590 C330 562 360 540 385 527 L525 515 C560 528 640 560 700 604 C735 640 752 700 758 780 C762 850 760 930 750 980 C735 1030 700 1070 665 1100 L662 1180 L248 1180 C246 1080 248 960 252 860 C255 760 262 660 300 590 Z"
        fill="#ffffff"
        stroke="#d3dde8"
        strokeWidth="5"
        strokeLinejoin="round"
      />
      {/* Pliegues de la bata */}
      <Path
        d="M255 628 C254 680 254 740 258 800 M660 615 C640 640 626 680 620 730 C616 790 620 840 640 880"
        fill="none"
        stroke="#d3dde8"
        strokeWidth="5"
        strokeLinecap="round"
      />
      {/* Camisa */}
      <Path
        d="M375 527 C372 562 377 610 385 645 C392 690 402 742 420 795 C442 748 470 690 490 645 C505 608 515 572 525 520 Z"
        fill="#bcd9f2"
      />
      {/* Cuello (piel) y sombra bajo el mentón */}
      <Path
        d="M386 468 C388 500 387 524 384 546 C414 572 464 572 494 544 C490 520 488 496 488 466 Z"
        fill="#f5bf9b"
      />
      <Path d="M350 488 C372 512 404 522 440 518 C476 514 500 496 514 474 L514 502 C494 528 466 538 436 538 C402 538 374 526 350 510 Z" fill="#ea9870" clipPath="url(#cuello)" />
      {/* Cuello de la camisa */}
      <Path d="M384 530 L373 577 L392 624 L420 604 L436 578 C416 572 398 556 384 530 Z" fill="#bcd9f2" />
      <Path d="M520 520 L516 577 L467 627 L450 606 L436 578 C460 572 500 552 520 520 Z" fill="#bcd9f2" />
      <Path
        d="M374 578 L392 624 M516 578 L467 627"
        fill="none"
        stroke="#8db6d9"
        strokeWidth="6"
        strokeLinecap="round"
      />
      {/* Corbata */}
      <Path
        d="M423 628 L451 628 C454 662 454 700 452 724 L420 798 L397 730 C400 696 410 662 423 628 Z"
        fill="#416180"
      />
      <Path d="M412 597 C426 590 444 590 456 597 L450 628 C438 632 432 632 420 628 Z" fill="#3a5876" />
      {/* Solapas */}
      <Path
        d="M373 578 L338 628 L356 638 L350 650 L420 812 M516 578 L550 626 L532 638 L542 650 L432 812"
        fill="none"
        stroke="#d3dde8"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Bolsillos, línea central y botón */}
      <Path
        d="M262 1037 L337 1045 L329 1176 L262 1172 M512 1140 C514 1162 518 1178 530 1182 L632 1180 M400 1102 L400 1180"
        fill="none"
        stroke="#d3dde8"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx="425" cy="1155" r="9" fill="none" stroke="#d3dde8" strokeWidth="5" />
      {/* Estetoscopio */}
      <Path
        d="M386 528 C360 540 338 560 328 598 C321 624 318 648 318 668"
        fill="none"
        stroke="#1d2d3d"
        strokeWidth="14"
        strokeLinecap="round"
      />
      <Path
        d="M283 732 C280 700 290 672 318 668 C346 672 356 700 353 734"
        fill="none"
        stroke="#1d2d3d"
        strokeWidth="14"
        strokeLinecap="round"
      />
      <Path
        d="M283 734 C284 780 288 815 293 842 M353 736 C352 780 346 815 338 842"
        fill="none"
        stroke="#a9bbcd"
        strokeWidth="10"
        strokeLinecap="round"
      />
      <Ellipse cx="285" cy="848" rx="12" ry="9" fill="#1d2d3d" />
      <Ellipse cx="342" cy="850" rx="12" ry="9" fill="#1d2d3d" />
      <Path
        d="M520 516 C546 526 560 552 562 590 C564 640 556 690 546 730 C542 742 540 748 539 752"
        fill="none"
        stroke="#1d2d3d"
        strokeWidth="14"
        strokeLinecap="round"
      />
      <Circle cx="537" cy="763" r="31" fill="#b7c5d3" />
      <Circle cx="537" cy="763" r="17" fill="none" stroke="#1d2d3d" strokeWidth="8" />
      <Circle cx="537" cy="763" r="8" fill="#dfe7ef" />
      {/* Brazo izquierdo (el que saluda) */}
      <Path
        d="M100 762 C97 805 110 870 150 915 C175 938 206 946 236 936 C250 900 256 820 258 760 C262 690 278 624 304 588 C284 592 262 606 244 626 C224 650 205 690 190 730 Z"
        fill="#ffffff"
        stroke="#d3dde8"
        strokeWidth="5"
        strokeLinejoin="round"
      />
      <Path
        d="M195 732 C208 760 220 790 226 802 C232 818 238 832 242 846 M226 802 C232 808 238 814 244 820"
        fill="none"
        stroke="#d3dde8"
        strokeWidth="5"
        strokeLinecap="round"
      />
      {/* Puño de la camisa */}
      <Path d="M100 752 L186 721 C190 732 188 746 180 758 L112 782 C104 776 99 764 100 752 Z" fill="#bcd9f2" />
      {/* Mano que saluda: palma y dedos individuales */}
      <Path
        d="M52 632 C70 622 110 616 134 626 C150 650 170 690 184 722 L104 752 C88 730 66 690 52 632 Z"
        fill="#f7c7a5"
      />
      <G stroke="#f7c7a5" strokeLinecap="round" fill="none">
        <Path d="M62 648 L51 596" strokeWidth="20" />
        <Path d="M82 636 L69 574" strokeWidth="22" />
        <Path d="M102 630 L91 563" strokeWidth="22" />
        <Path d="M121 634 L113 570" strokeWidth="21" />
        <Path d="M150 694 C158 660 168 628 181 606" strokeWidth="24" />
      </G>
      <Path
        d="M80 575 L99 634 M102 568 L121 626 M80 655 C96 645 116 632 136 624 M156 648 C146 662 142 680 142 698"
        fill="none"
        stroke="#e39a78"
        strokeWidth="5"
        strokeLinecap="round"
      />
      {/* Tablilla */}
      <G transform="rotate(-2 494 955)">
        <Rect x="388" y="830" width="212" height="252" rx="15" fill="#5980a6" />
        <Rect x="410" y="858" width="167" height="204" rx="6" fill="#ffffff" />
        <Rect x="446" y="833" width="97" height="30" rx="9" fill="#1d2d3d" />
        <Rect x="463" y="818" width="64" height="22" rx="7" fill="#1d2d3d" />
        <Rect x="437" y="890" width="92" height="8" rx="4" fill="#d6ebff" />
        <Rect x="437" y="918" width="112" height="8" rx="4" fill="#d6ebff" />
        <Rect x="437" y="946" width="72" height="8" rx="4" fill="#d6ebff" />
        <Circle cx="552" cy="894" r="12" fill="#1d2d3d" />
        <Path
          d="M546 894 L550.5 898.5 L558 890"
          fill="none"
          stroke="#ffffff"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </G>
      {/* Antebrazo derecho cruzado */}
      <Path
        d="M548 985 C575 960 600 930 625 895 C645 868 670 850 700 845 C726 842 750 862 753 902 C756 950 740 992 714 1012 C690 1034 650 1060 600 1078 C594 1056 586 1034 570 1008 Z"
        fill="#ffffff"
        stroke="#d3dde8"
        strokeWidth="5"
        strokeLinejoin="round"
      />
      <Path d="M548 985 L568 981 C586 1000 597 1032 598 1070 L588 1072 C586 1040 574 1010 548 985 Z" fill="#bcd9f2" />
      {/* Mano sobre la tablilla */}
      <Path
        d="M457 1005 C480 996 520 993 552 1000 C566 1004 574 1010 580 1022 C588 1040 592 1058 588 1070 C576 1092 546 1108 505 1112 C475 1114 452 1102 441 1085 C436 1075 442 1066 455 1062 C470 1058 490 1050 508 1040 C494 1032 478 1027 463 1023 C452 1020 450 1009 457 1005 Z"
        fill="#f7c7a5"
      />
      <Path
        d="M455 1077 L497 1060 M472 1100 L515 1082 M500 1110 L532 1095"
        fill="none"
        stroke="#e39a78"
        strokeWidth="5"
        strokeLinecap="round"
      />
      {/* Orejas */}
      <Path d="M348 370 C312 360 297 378 300 400 C302 421 312 440 348 442 Z" fill="#f2b08a" />
      <Path d="M512 372 C560 364 585 376 583 402 C582 424 568 442 512 448 Z" fill="#f2b08a" />
      <Path d="M566 388 C557 396 552 408 553 420" fill="none" stroke="#dc8a62" strokeWidth="5" strokeLinecap="round" />
      {/* Cabeza calva y cara */}
      <Path
        d="M325 384 C315 326 318 272 344 244 C368 220 400 214 432 214 C466 214 498 222 520 246 C544 274 544 330 534 394 C531 412 528 420 526 428 C518 468 486 506 440 516 C400 521 362 506 342 472 C330 450 325 420 325 380 Z"
        fill="#f7c7a5"
      />
      {/* Pelo corto pegado al cráneo, simétrico sobre la cabeza (eje x = 430) */}
      <Path
        d="M328 362 C318 340 312 314 313 290 C315 254 340 224 378 208 C398 200 414 198 430 198 C446 198 462 200 482 208 C520 224 545 254 547 290 C548 314 542 340 532 362 L526 362 C525 344 526 330 528 318 C518 300 505 288 486 280 C468 274 450 272 430 272 C410 272 392 274 374 280 C355 288 342 300 332 318 C334 330 335 344 334 362 Z"
        fill="#6b3f2a"
      />
      {/* Patillas: la misma sombra de los dos lados */}
      <Path d="M328 362 C319 340 313 316 314 296 C320 318 326 340 334 362 Z" fill="#54301f" />
      <Path d="M532 362 C541 340 547 316 546 296 C540 318 534 340 526 362 Z" fill="#54301f" />
      {/* Raya fina y mechones */}
      <Path
        d="M398 274 C402 256 408 240 418 228 M366 244 C388 230 412 224 432 224 M456 234 C478 238 498 250 512 266"
        fill="none"
        stroke="#4a291b"
        strokeWidth="4.5"
        strokeLinecap="round"
      />
      <Path d="M384 218 C404 208 428 204 452 206" fill="none" stroke="#8a5638" strokeWidth="5" strokeLinecap="round" />
      {/* Cejas, ojos, nariz y sonrisa */}
      <Path
        d="M340 338 C348 328 372 325 386 333 C389 336 386 340 382 339 C370 335 354 337 344 342 C339 344 337 341 340 338 Z M447 332 C462 322 486 324 497 335 C498 339 494 341 490 339 C478 332 462 331 450 337 C446 339 444 335 447 332 Z"
        fill="#4a291b"
      />
      <Ellipse cx="368" cy="379" rx="9.5" ry="14.5" fill="#3a2a24" />
      <Ellipse cx="466" cy="379" rx="9.5" ry="14.5" fill="#3a2a24" />
      <Path
        d="M402 366 C406 385 402 402 394 415 C390 424 396 432 414 432"
        fill="none"
        stroke="#d27150"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <Path d="M388 457 C402 471 440 472 457 450" fill="none" stroke="#d27150" strokeWidth="6" strokeLinecap="round" />
    </Svg>
  );
}
