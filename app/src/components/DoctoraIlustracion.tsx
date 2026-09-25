import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { ClipPath, Circle, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/theme/colors";
import { radius, sombra } from "@/theme/spacing";
import { heading, label } from "@/theme/typography";

interface Props {
  width: number;
}

// Tonos del retrato: planos, sin contornos; las sombras son el mismo tono un paso más oscuro.
const PIEL = "#ebc7ae";
const PIEL_SOMBRA = "#d9aa8c";
const BOCA = "#a8665a";
const PELO = colors.accent900;
const BATA = "#ffffff";
const BATA_SOMBRA = "#e3edf7";

/** Proporción del lienzo del retrato (ancho × alto). */
const VB_W = 300;
const VB_H = 340;

/**
 * Retrato editorial de la doctora de TurnoSmart: medio cuerpo recortado por
 * un arco, formas planas sin contornos y rasgos mínimos. Una tarjeta real
 * de la interfaz («Cupo confirmado») cruza el borde del arco: une la
 * ilustración con el producto y dice rapidez sin decoración extra.
 */
export function DoctoraIlustracion({ width }: Props) {
  const height = (width * VB_H) / VB_W;

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height} viewBox={`0 0 ${VB_W} ${VB_H}`} accessibilityLabel="Retrato de una doctora">
        <Defs>
          <LinearGradient id="arco" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.accent200} />
            <Stop offset="1" stopColor="#e4f0fd" />
          </LinearGradient>
          <ClipPath id="recorte">
            <Path d="M40 340 V160 A120 120 0 0 1 280 160 V340 Z" />
          </ClipPath>
        </Defs>

        {/* Todo el dibujo va corrido 20 px: el arco cierra en el borde derecho del lienzo. */}
        <G transform="translate(20 0)">
          {/* Arco */}
          <Path d="M40 340 V160 A120 120 0 0 1 280 160 V340 Z" fill="url(#arco)" />

          <G clipPath="url(#recorte)">
            {/* Pelo, capa de atrás */}
            <Path
              d="M124 118 C120 84 144 68 166 70 C194 72 206 98 204 132 C203 160 201 180 194 192 C188 197 180 195 176 188 L178 124 Z"
              fill={PELO}
            />

            {/* Cuello */}
            <Rect x={149} y={148} width={22} height={38} rx={8} fill={PIEL_SOMBRA} />

            {/* Bata */}
            <Path
              d="M88 340 C88 244 104 200 128 188 L146 180 L174 180 L194 188 C218 200 232 244 232 340 Z"
              fill={BATA}
            />
            <Path d="M202 200 C219 220 229 262 232 340 L210 340 C209 282 205 232 196 204 Z" fill={BATA_SOMBRA} />
            <Path d="M118 206 C104 232 97 282 96 340 L112 340 C113 290 116 246 124 214 Z" fill={BATA_SOMBRA} />

            {/* Ambo en V y solapas */}
            <Path d="M144 180 L160 214 L176 180 Z" fill={colors.accent} />
            <Path d="M144 180 L128 190 L151 262 L160 214 Z" fill={BATA_SOMBRA} />
            <Path d="M176 180 L192 190 L169 262 L160 214 Z" fill={BATA_SOMBRA} />

            {/* Estetoscopio */}
            <Path
              d="M141 184 C126 214 130 246 150 258 M179 184 C193 212 190 238 172 252"
              fill="none"
              stroke={PELO}
              strokeWidth={3.2}
              strokeLinecap="round"
            />
            <Path
              d="M150 258 C158 264 166 262 172 252"
              fill="none"
              stroke={PELO}
              strokeWidth={3.2}
              strokeLinecap="round"
            />
            <Path d="M161 262 L161 286" stroke={PELO} strokeWidth={3.2} strokeLinecap="round" />
            <Circle cx={161} cy={295} r={10} fill={colors.accent700} />
            <Circle cx={161} cy={295} r={4.5} fill="#cfdceb" />

            {/* Credencial */}
            <Rect x={196} y={244} width={24} height={14} rx={4} fill={colors.accent} />
            <Rect x={200} y={249} width={12} height={2.4} rx={1.2} fill="#ffffff" opacity={0.85} />

            {/* Cabeza */}
            <Ellipse cx={160} cy={122} rx={30} ry={36} fill={PIEL} />
            {/* Sombra del mentón sobre el cuello */}
            <Path
              d="M147 152 C154 160 166 160 172 152 L172 162 C164 168 154 168 147 162 Z"
              fill={PIEL_SOMBRA}
              opacity={0.9}
            />

            {/* Pelo, flequillo */}
            <Path
              d="M129 130 C126 101 143 83 168 84 L171 85 C160 93 151 105 147 119 C140 117 134 121 129 130 Z"
              fill={PELO}
            />
            <Path d="M167 84 C187 86 196 99 195 116 C189 105 181 97 169 89 Z" fill={PELO} />

            {/* Rostro: cejas, ojos, nariz, sonrisa */}
            <Path
              d="M142 115 Q147 112 152 114 M162 114 Q167 112 172 115"
              fill="none"
              stroke={PELO}
              strokeWidth={1.8}
              strokeLinecap="round"
            />
            <Circle cx={147} cy={125} r={2.3} fill={PELO} />
            <Circle cx={167} cy={125} r={2.3} fill={PELO} />
            <Path
              d="M157 128 Q153 137 157 139"
              fill="none"
              stroke={PIEL_SOMBRA}
              strokeWidth={1.8}
              strokeLinecap="round"
            />
            <Path d="M149 145 Q156 150 164 144" fill="none" stroke={BOCA} strokeWidth={1.8} strokeLinecap="round" />
            <Circle cx={142} cy={137} r={5} fill="#e7ad98" opacity={0.45} />
            <Circle cx={172} cy={137} r={5} fill="#e7ad98" opacity={0.45} />
          </G>
        </G>
      </Svg>

      {/* Tarjeta flotante: una pieza real de la interfaz, no decoración */}
      <View style={[styles.chip, { left: 0, bottom: height * 0.16 }]}>
        <View style={styles.check}>
          <Ionicons name="checkmark" size={16} color="#ffffff" />
        </View>
        <View>
          <Text style={label(9, colors.neutral600)}>Cupo confirmado</Text>
          <Text style={heading(16)}>Cardiología · 15:40</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    position: "absolute",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingLeft: 10,
    paddingRight: 16,
    borderRadius: radius.lg,
    backgroundColor: colors.superficie,
    borderWidth: 1,
    borderColor: colors.borde,
    ...sombra.md,
    shadowOpacity: 0.1,
  },
  check: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.accent900,
    alignItems: "center",
    justifyContent: "center",
  },
});
