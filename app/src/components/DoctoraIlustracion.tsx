import React from "react";
import Svg, { Circle, G, Path, Rect, Text as SvgText } from "react-native-svg";
import { colors } from "@/theme/colors";
import { fonts } from "@/theme/typography";

interface Props {
  width: number;
  /** Texto del globo de diálogo. */
  saludo?: string;
}

const TINTA = colors.text;
const PIEL = colors.accent200;
const AMBO = colors.accent;
const PELO = colors.accent900;
const BATA = "#ffffff";
const TRAZO = 1.6;

/**
 * La doctora de TurnoSmart: ilustración de trazo fino y relleno plano en
 * la paleta mono del sistema (bata blanca, ambo en acero, estetoscopio en
 * Campo). Sostiene una tablilla con el tilde de «cupo confirmado» y saluda
 * desde un globo de diálogo. Dos «+» de registro flotan junto al círculo
 * de fondo, la firma del sistema.
 *
 * El círculo de fondo se corta contra el borde derecho a propósito: la
 * pantalla alinea el SVG al borde para que la forma «salga» de la vista.
 */
export function DoctoraIlustracion({ width, saludo = "¡Hola!" }: Props) {
  const height = (width * 300) / 260;

  return (
    <Svg width={width} height={height} viewBox="0 0 260 300" accessibilityLabel="Ilustración: una doctora te saluda">
      {/* Fondo orgánico */}
      <Circle cx={196} cy={158} r={118} fill="#ffffff" />
      <Circle cx={196} cy={158} r={118} fill="none" stroke={colors.accent300} strokeWidth={1} strokeDasharray="2 5" />

      {/* Marcas «+» del sistema */}
      <G stroke={colors.accent} strokeWidth={1.6} strokeLinecap="square">
        <Path d="M64 150 h12 M70 144 v12" />
        <Path d="M232 40 h10 M237 35 v10" />
      </G>

      {/* Globo de diálogo */}
      <Rect x={14} y={14} width={86} height={44} rx={22} fill={PELO} />
      <Path d="M86 50 L104 70 L74 56 Z" fill={PELO} />
      <SvgText x={57} y={43} fontSize={21} fontFamily={fonts.heading} fill={colors.bg} textAnchor="middle">
        {saludo}
      </SvgText>
      <Path d="M104 70 L122 74" stroke={TINTA} strokeWidth={1} />

      {/* Piernas y zapatos */}
      <Rect x={129} y={236} width={15} height={50} rx={3} fill={AMBO} stroke={TINTA} strokeWidth={TRAZO} />
      <Rect x={150} y={236} width={15} height={50} rx={3} fill={AMBO} stroke={TINTA} strokeWidth={TRAZO} />
      <Rect x={122} y={284} width={24} height={10} rx={5} fill={PELO} stroke={TINTA} strokeWidth={TRAZO} />
      <Rect x={148} y={284} width={24} height={10} rx={5} fill={PELO} stroke={TINTA} strokeWidth={TRAZO} />

      {/* Brazo izquierdo (detrás de la bata) */}
      <Path
        d="M112 112 C100 140 98 176 100 212 C100 220 110 221 111 212 L116 150 Z"
        fill={BATA}
        stroke={TINTA}
        strokeWidth={TRAZO}
        strokeLinejoin="round"
      />
      <Circle cx={105} cy={218} r={7.5} fill={PIEL} stroke={TINTA} strokeWidth={TRAZO} />

      {/* Bata */}
      <Path
        d="M114 108 Q114 100 122 100 L172 100 Q180 100 180 108 L186 238 Q186 246 178 246 L116 246 Q108 246 108 238 Z"
        fill={BATA}
        stroke={TINTA}
        strokeWidth={TRAZO}
        strokeLinejoin="round"
      />
      {/* Ambo en V y solapas */}
      <Path d="M134 100 L147 122 L160 100 Z" fill={AMBO} stroke={TINTA} strokeWidth={TRAZO} strokeLinejoin="round" />
      <Path d="M134 100 L142 146 M160 100 L152 146" stroke={TINTA} strokeWidth={TRAZO} strokeLinecap="round" />
      <Path d="M147 146 L147 246" stroke={TINTA} strokeWidth={1} />
      {/* Bolsillo con lapicera */}
      <Rect x={122} y={164} width={18} height={15} rx={3} fill="none" stroke={TINTA} strokeWidth={1.2} />
      <Path d="M127 158 L127 167" stroke={AMBO} strokeWidth={2.4} strokeLinecap="round" />

      {/* Estetoscopio */}
      <Path
        d="M136 102 C130 124 132 142 142 150 M158 102 C166 122 166 138 160 150"
        fill="none"
        stroke={PELO}
        strokeWidth={3}
        strokeLinecap="round"
      />
      <Path d="M142 150 C146 156 156 156 160 150" fill="none" stroke={PELO} strokeWidth={3} strokeLinecap="round" />
      <Path d="M151 155 L151 170" stroke={PELO} strokeWidth={3} strokeLinecap="round" />
      <Circle cx={151} cy={176} r={7} fill={AMBO} stroke={PELO} strokeWidth={2.4} />

      {/* Cuello y cabeza */}
      <Rect x={140} y={86} width={14} height={16} fill={PIEL} stroke={TINTA} strokeWidth={TRAZO} />
      <Rect x={126} y={40} width={42} height={52} rx={21} fill={PIEL} stroke={TINTA} strokeWidth={TRAZO} />
      {/* Pelo: flequillo recto y rodete */}
      <Path
        d="M126 62 C126 45 135 38 147 38 C159 38 168 45 168 58 C160 56 150 52 143 47 C138 54 132 58 126 62 Z"
        fill={PELO}
        stroke={TINTA}
        strokeWidth={TRAZO}
        strokeLinejoin="round"
      />
      <Circle cx={165} cy={42} r={7.5} fill={PELO} stroke={TINTA} strokeWidth={TRAZO} />
      {/* Cara */}
      <Circle cx={140} cy={69} r={2} fill={TINTA} />
      <Circle cx={154} cy={69} r={2} fill={TINTA} />
      <Path d="M142 78 Q147 83 152 78" fill="none" stroke={TINTA} strokeWidth={1.4} strokeLinecap="round" />
      <Circle cx={135} cy={76} r={2.6} fill={colors.accent300} opacity={0.8} />
      <Circle cx={159} cy={76} r={2.6} fill={colors.accent300} opacity={0.8} />

      {/* Brazo derecho con la tablilla */}
      <Rect x={172} y={170} width={40} height={52} rx={5} fill="#ffffff" stroke={TINTA} strokeWidth={TRAZO} />
      <Rect x={184} y={165} width={16} height={8} rx={2} fill={PELO} />
      <Rect x={180} y={182} width={24} height={4} rx={2} fill={colors.accent300} />
      <Rect x={180} y={190} width={16} height={4} rx={2} fill={colors.accent200} />
      <Circle cx={192} cy={206} r={8} fill={PELO} />
      <Path
        d="M188 206 L191 209 L196 203"
        fill="none"
        stroke="#ffffff"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M178 112 C190 136 194 164 186 190 C184 196 176 196 176 188 L174 150 Z"
        fill={BATA}
        stroke={TINTA}
        strokeWidth={TRAZO}
        strokeLinejoin="round"
      />
      <Circle cx={180} cy={196} r={7.5} fill={PIEL} stroke={TINTA} strokeWidth={TRAZO} />
    </Svg>
  );
}
