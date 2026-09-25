import React from "react";
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from "react-native-svg";
import { colors } from "@/theme/colors";

interface Props {
  width: number;
}

// Estilo de la referencia: rellenos planos con líneas finas en un tono más
// oscuro del mismo color (nunca negro). Ropa y objetos en la paleta azul de
// TurnoSmart; piel y pelo naturales, que son la esencia del personaje.
const PIEL = "#f2c9a8";
const PIEL_LINEA = "#d49c7a";
const PIEL_SOMBRA = "#e6b390";
const PELO = "#5b3a29";
const PELO_LINEA = "#43291c";
const BATA = "#ffffff";
const BATA_LINEA = "#c7d4e2";
const CAMISA = "#cfe3f5";
const CAMISA_LINEA = "#9dbddb";
const CORBATA = colors.accent700;
const CORBATA_LINEA = colors.accent800;
const TUBO = colors.accent900;
const L = 1.4;

const VB_W = 300;
const VB_H = 340;

/**
 * El doctor de TurnoSmart, siguiendo la referencia elegida por el equipo:
 * medio cuerpo de frente, saluda con la mano abierta y sostiene una
 * tablilla con un tilde de «cupo confirmado». Bata blanca, camisa celeste,
 * corbata azul y estetoscopio al cuello. Detrás, el arco celeste de la app;
 * la mano que saluda asoma por fuera del arco para que el personaje no se
 * vea encerrado.
 */
export function DoctoraIlustracion({ width }: Props) {
  const height = (width * VB_H) / VB_W;

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${VB_W} ${VB_H}`} accessibilityLabel="Un doctor te saluda">
      <Defs>
        <LinearGradient id="arco" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={colors.accent200} />
          <Stop offset="1" stopColor="#e4f0fd" />
        </LinearGradient>
      </Defs>

      {/* Arco de fondo */}
      <Path d="M70 340 V172 A115 115 0 0 1 300 172 V340 Z" fill="url(#arco)" />

      <G strokeLinecap="round" strokeLinejoin="round">
        {/* Cuello */}
        <Rect x={177} y={148} width={26} height={30} rx={6} fill={PIEL_SOMBRA} stroke={PIEL_LINEA} strokeWidth={L} />

        {/* Bata: cuerpo */}
        <Path
          d="M104 340 C104 262 114 216 138 200 L172 174 L190 250 L208 174 L242 200 C266 216 276 262 276 340 Z"
          fill={BATA}
          stroke={BATA_LINEA}
          strokeWidth={L}
        />

        {/* Camisa, cuello y corbata */}
        <Path d="M170 176 L190 252 L210 176 Z" fill={CAMISA} stroke={CAMISA_LINEA} strokeWidth={L} />
        <Path
          d="M172 170 L190 186 L208 170 L203 162 L190 174 L177 162 Z"
          fill={CAMISA}
          stroke={CAMISA_LINEA}
          strokeWidth={L}
        />
        <Path d="M184 184 L196 184 L194 194 L186 194 Z" fill={CORBATA} stroke={CORBATA_LINEA} strokeWidth={L} />
        <Path d="M186 194 L194 194 L199 238 L190 250 L181 238 Z" fill={CORBATA} stroke={CORBATA_LINEA} strokeWidth={L} />

        {/* Solapas, línea central, botón y bolsillos */}
        <Path
          d="M172 174 L150 198 L160 214 L154 222 L190 262 M208 174 L230 198 L220 214 L226 222 L190 262"
          fill="none"
          stroke={BATA_LINEA}
          strokeWidth={L}
        />
        <Path d="M190 262 V340" stroke={BATA_LINEA} strokeWidth={L} />
        <Circle cx={190} cy={304} r={3.2} fill="none" stroke={BATA_LINEA} strokeWidth={L} />
        <Path d="M124 300 H158 V338 M222 300 H256" fill="none" stroke={BATA_LINEA} strokeWidth={L} />

        {/* Estetoscopio: olivas a la izquierda, campana a la derecha */}
        <Path
          d="M174 176 C158 198 150 236 156 268 M206 176 C224 196 232 214 232 226"
          fill="none"
          stroke={TUBO}
          strokeWidth={3.4}
        />
        <Path d="M156 268 L147 284 M156 268 L166 283" fill="none" stroke={TUBO} strokeWidth={3} />
        <Circle cx={146} cy={287} r={3.4} fill={TUBO} />
        <Circle cx={167} cy={286} r={3.4} fill={TUBO} />
        <Circle cx={232} cy={236} r={10} fill="#dbe5ef" stroke={TUBO} strokeWidth={2.6} />
        <Circle cx={232} cy={236} r={4.2} fill={colors.accent} />

        {/* Brazo izquierdo: brazo hacia abajo y antebrazo levantado */}
        <Path
          d="M140 198 C120 208 106 242 104 282 C105 296 124 298 128 287 C130 256 138 232 150 218 Z"
          fill={BATA}
          stroke={BATA_LINEA}
          strokeWidth={L}
        />
        <Path
          d="M104 292 C92 272 86 236 88 210 L112 208 C111 232 116 262 128 284 C124 296 110 298 104 292 Z"
          fill={BATA}
          stroke={BATA_LINEA}
          strokeWidth={L}
        />
        <Path d="M87 211 L113 209 L113 199 L87 201 Z" fill={CAMISA} stroke={CAMISA_LINEA} strokeWidth={L} />

        {/* Mano que saluda */}
        <Path
          d="M88 200 L87 166 C87 158 95 158 95 166 L95 150 C95 142 103 142 103 150 L103 147 C103 139 111 139 111 147 L111 156 C111 148 119 148 119 156 L119 180 L125 172 C129 166 137 170 133 178 L121 198 C117 204 111 206 103 206 L95 206 C90 206 88 204 88 200 Z"
          fill={PIEL}
          stroke={PIEL_LINEA}
          strokeWidth={L}
        />
        <Path d="M95 166 V178 M103 150 V176 M111 156 V177" fill="none" stroke={PIEL_LINEA} strokeWidth={1.1} />
        <Path d="M97 192 Q105 196 113 190" fill="none" stroke={PIEL_LINEA} strokeWidth={1.1} />

        {/* Brazo derecho */}
        <Path
          d="M240 198 C262 212 274 252 272 302 L252 302 C252 262 246 236 232 222 Z"
          fill={BATA}
          stroke={BATA_LINEA}
          strokeWidth={L}
        />

        {/* Tablilla con el tilde de cupo confirmado */}
        <G transform="rotate(-4 200 290)">
          <Rect
            x={166}
            y={248}
            width={66}
            height={84}
            rx={7}
            fill={colors.accent}
            stroke={colors.accent700}
            strokeWidth={L}
          />
          <Rect x={173} y={259} width={52} height={67} rx={3} fill="#ffffff" />
          <Rect x={186} y={241} width={26} height={13} rx={4} fill={TUBO} />
          <Circle cx={212} cy={275} r={8} fill={TUBO} />
          <Path d="M208 275 L211 278 L216.5 271.5" fill="none" stroke="#ffffff" strokeWidth={2} />
          <Rect x={180} y={268} width={22} height={4} rx={2} fill={colors.accent200} />
          <Rect x={180} y={278} width={16} height={4} rx={2} fill={colors.accent200} />
          <Rect x={180} y={288} width={36} height={4} rx={2} fill={colors.accent200} />
        </G>

        {/* Antebrazo derecho y mano sobre la tablilla */}
        <Path
          d="M272 300 C268 320 244 328 216 322 L214 304 C234 306 248 302 252 292 Z"
          fill={BATA}
          stroke={BATA_LINEA}
          strokeWidth={L}
        />
        <Path d="M217 303 L217 322 L209 322 L209 303 Z" fill={CAMISA} stroke={CAMISA_LINEA} strokeWidth={L} />
        <Path
          d="M209 304 C200 302 190 304 186 309 C184 313 188 315 194 314 L200 314 C194 318 194 322 200 323 L209 322 Z"
          fill={PIEL}
          stroke={PIEL_LINEA}
          strokeWidth={L}
        />

        {/* Orejas */}
        <Ellipse cx={159} cy={124} rx={6.5} ry={10} fill={PIEL} stroke={PIEL_LINEA} strokeWidth={L} />
        <Ellipse cx={221} cy={124} rx={6.5} ry={10} fill={PIEL} stroke={PIEL_LINEA} strokeWidth={L} />

        {/* Cara */}
        <Path
          d="M160 112 C160 90 173 80 190 80 C207 80 220 90 220 112 C220 136 208 158 190 158 C172 158 160 136 160 112 Z"
          fill={PIEL}
          stroke={PIEL_LINEA}
          strokeWidth={L}
        />

        {/* Pelo corto peinado de costado */}
        <Path
          d="M157 120 C151 92 166 70 192 69 C215 68 229 84 226 108 C225 114 223 119 221 123 C219 110 214 101 205 96 C192 104 173 104 163 97 C160 104 158 111 157 120 Z"
          fill={PELO}
          stroke={PELO_LINEA}
          strokeWidth={L}
        />
        <Path d="M176 80 Q193 75 208 86 M168 90 Q180 88 190 92" fill="none" stroke={PELO_LINEA} strokeWidth={1.1} />

        {/* Cejas, ojos, nariz y sonrisa */}
        <Path
          d="M170 108 Q176 104 182 107 M198 107 Q204 104 210 108"
          fill="none"
          stroke={PELO_LINEA}
          strokeWidth={2.2}
        />
        <Ellipse cx={176} cy={119} rx={2.7} ry={3.6} fill="#2b2b2d" />
        <Ellipse cx={204} cy={119} rx={2.7} ry={3.6} fill="#2b2b2d" />
        <Path d="M190 118 Q185 132 191 134" fill="none" stroke={PIEL_LINEA} strokeWidth={1.6} />
        <Path d="M178 142 Q190 151 202 142" fill="none" stroke="#b5634f" strokeWidth={1.9} />
      </G>
    </Svg>
  );
}
